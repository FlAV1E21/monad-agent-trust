// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./AgentRegistry.sol";

/// @title AgentEscrow
/// @notice Trust-minimised payment escrow between a client and a registered AI agent.
///         Lifecycle: Open -> Accepted -> Submitted -> Released.
///         Trustlessness comes from three timeouts:
///           - refundUnaccepted: client money back if nobody accepts by acceptBy
///           - refundNoProof:    client money back if worker accepts but never submits
///           - claimAfterReview: worker gets paid if client goes silent after proof
///         Plus an arbiter-gated dispute path for the rest.
contract AgentEscrow {
    enum Status { Open, Accepted, Submitted, Released, Refunded, Disputed, Resolved }

    struct Task {
        address client;
        uint256 agentId; // 0 = open to any registered agent until accepted
        address worker; // owner address of the accepted agent
        uint256 reward;
        uint64 acceptBy;
        uint64 submitBy;
        uint64 reviewUntil;
        string specURI;
        string proofURI;
        Status status;
    }

    AgentRegistry public immutable registry;
    address public arbiter;
    uint64 public immutable workWindow; // submitBy = acceptBy + workWindow
    uint64 public immutable reviewWindow; // reviewUntil = proof time + reviewWindow

    Task[] private _tasks; // taskId = index + 1

    event TaskCreated(uint256 indexed id, address indexed client, uint256 agentId, uint256 reward, uint64 acceptBy, string specURI);
    event TaskAccepted(uint256 indexed id, uint256 indexed agentId, address indexed worker);
    event ProofSubmitted(uint256 indexed id, string proofURI);
    event Released(uint256 indexed id, address indexed to, uint256 amount);
    event Refunded(uint256 indexed id, address indexed to, uint256 amount);
    event Disputed(uint256 indexed id, address indexed by);
    event Resolved(uint256 indexed id, bool payWorker);

    error BadId();
    error BadStatus();
    error TooEarly();
    error TooLate();
    error NotClient();
    error NotWorker();
    error NotArbiter();
    error NoReward();
    error EmptyURI();

    constructor(address registry_, address arbiter_, uint64 workWindow_, uint64 reviewWindow_) {
        registry = AgentRegistry(registry_);
        arbiter = arbiter_;
        workWindow = workWindow_;
        reviewWindow = reviewWindow_;
    }

    /// @notice Client locks reward. agentId=0 opens the task to any registered agent.
    function createTask(uint256 agentId, string calldata specURI, uint64 acceptBy)
        external
        payable
        returns (uint256 id)
    {
        if (msg.value == 0) revert NoReward();
        if (bytes(specURI).length == 0) revert EmptyURI();
        if (acceptBy <= block.timestamp) revert TooLate();
        _tasks.push(
            Task({
                client: msg.sender,
                agentId: agentId,
                worker: address(0),
                reward: msg.value,
                acceptBy: acceptBy,
                submitBy: acceptBy + workWindow,
                reviewUntil: 0,
                specURI: specURI,
                proofURI: "",
                status: Status.Open
            })
        );
        id = _tasks.length;
        emit TaskCreated(id, msg.sender, agentId, msg.value, acceptBy, specURI);
    }

    /// @notice Only the owner of an active registered agent may accept.
    function accept(uint256 id, uint256 agentId) external {
        Task storage t = _task(id);
        if (t.status != Status.Open) revert BadStatus();
        if (block.timestamp > t.acceptBy) revert TooLate();
        (address owner, , bool active) = registry.agent(agentId);
        if (!active || owner != msg.sender) revert NotWorker();
        t.agentId = agentId;
        t.worker = msg.sender;
        t.status = Status.Accepted;
        emit TaskAccepted(id, agentId, msg.sender);
    }

    function submitProof(uint256 id, string calldata proofURI) external {
        Task storage t = _task(id);
        if (t.status != Status.Accepted) revert BadStatus();
        if (t.worker != msg.sender) revert NotWorker();
        if (block.timestamp > t.submitBy) revert TooLate();
        if (bytes(proofURI).length == 0) revert EmptyURI();
        t.proofURI = proofURI;
        t.reviewUntil = uint64(block.timestamp) + reviewWindow;
        t.status = Status.Submitted;
        emit ProofSubmitted(id, proofURI);
    }

    /// @notice Client approves the proof and pays.
    function release(uint256 id) external {
        Task storage t = _task(id);
        if (t.status != Status.Submitted) revert BadStatus();
        if (msg.sender != t.client) revert NotClient();
        uint256 amount = t.reward;
        _settle(t, t.worker, Status.Released);
        emit Released(id, t.worker, amount);
    }

    /// @notice Trustlessness: silent client after the review window => worker can claim.
    function claimAfterReview(uint256 id) external {
        Task storage t = _task(id);
        if (t.status != Status.Submitted) revert BadStatus();
        if (msg.sender != t.worker) revert NotWorker();
        if (block.timestamp <= t.reviewUntil) revert TooEarly();
        uint256 amount = t.reward;
        _settle(t, t.worker, Status.Released);
        emit Released(id, t.worker, amount);
    }

    /// @notice Nobody accepted in time => client refund.
    function refundUnaccepted(uint256 id) external {
        Task storage t = _task(id);
        if (t.status != Status.Open) revert BadStatus();
        if (msg.sender != t.client) revert NotClient();
        if (block.timestamp <= t.acceptBy) revert TooEarly();
        uint256 amount = t.reward;
        _settle(t, t.client, Status.Refunded);
        emit Refunded(id, t.client, amount);
    }

    /// @notice Accepted but no proof in time => client refund.
    function refundNoProof(uint256 id) external {
        Task storage t = _task(id);
        if (t.status != Status.Accepted) revert BadStatus();
        if (msg.sender != t.client) revert NotClient();
        if (block.timestamp <= t.submitBy) revert TooEarly();
        uint256 amount = t.reward;
        _settle(t, t.client, Status.Refunded);
        emit Refunded(id, t.client, amount);
    }

    function dispute(uint256 id) external {
        Task storage t = _task(id);
        if (t.status != Status.Submitted) revert BadStatus();
        if (msg.sender != t.client && msg.sender != t.worker) revert NotClient();
        t.status = Status.Disputed;
        emit Disputed(id, msg.sender);
    }

    function resolve(uint256 id, bool payWorker) external {
        Task storage t = _task(id);
        if (t.status != Status.Disputed) revert BadStatus();
        if (msg.sender != arbiter) revert NotArbiter();
        address to = payWorker ? t.worker : t.client;
        uint256 amount = t.reward;
        _settle(t, to, Status.Resolved);
        emit Resolved(id, payWorker);
        emit Released(id, to, amount);
    }

    function setArbiter(address next) external {
        if (msg.sender != arbiter) revert NotArbiter();
        arbiter = next;
    }

    // ---- views ----
    function taskCount() external view returns (uint256) { return _tasks.length; }
    function statusOf(uint256 id) external view returns (Status) { return _task(id).status; }
    function rewardOf(uint256 id) external view returns (uint256) { return _task(id).reward; }
    function workerOf(uint256 id) external view returns (address) { return _task(id).worker; }
    function clientOf(uint256 id) external view returns (address) { return _task(id).client; }
    function agentIdOf(uint256 id) external view returns (uint256) { return _task(id).agentId; }
    function deadlinesOf(uint256 id) external view returns (uint64 acceptBy, uint64 submitBy, uint64 reviewUntil) {
        Task storage t = _task(id);
        return (t.acceptBy, t.submitBy, t.reviewUntil);
    }

    // ---- internals ----
    function _task(uint256 id) internal view returns (Task storage t) {
        if (id == 0 || id > _tasks.length) revert BadId();
        t = _tasks[id - 1];
    }

    /// @dev checks-effects-interactions: state first, then external call.
    function _settle(Task storage t, address to, Status next) private {
        uint256 amount = t.reward;
        t.status = next;
        t.reward = 0;
        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert NoReward();
    }
}
