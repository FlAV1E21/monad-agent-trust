// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AgentRegistry
/// @notice ERC-8004-inspired identity & reputation registry for autonomous AI agents.
///         Agents register with a metadata URI; third parties leave one attestation
///         each (positive/negative with a tag). Reputation is derived on-chain.
contract AgentRegistry {
    struct Agent {
        address owner;
        string metadataURI;
        uint64 registeredAt;
        bool active;
    }

    struct Attestation {
        address validator;
        bool positive;
        string tag;
        uint64 at;
    }

    Agent[] private _agents; // agentId = index + 1
    mapping(uint256 => Attestation[]) private _atts;
    mapping(uint256 => mapping(address => bool)) public hasAttested;

    event AgentRegistered(uint256 indexed agentId, address indexed owner, string metadataURI);
    event AgentStatus(uint256 indexed agentId, bool active);
    event Attested(uint256 indexed agentId, address indexed validator, bool positive, string tag);

    error BadId();
    error EmptyURI();
    error AlreadyAttested();
    error NotOwner();

    /// @notice Register a new agent. Returns 1-based agentId.
    function registerAgent(string calldata metadataURI) external returns (uint256 agentId) {
        if (bytes(metadataURI).length == 0) revert EmptyURI();
        _agents.push(Agent(msg.sender, metadataURI, uint64(block.timestamp), true));
        agentId = _agents.length;
        emit AgentRegistered(agentId, msg.sender, metadataURI);
    }

    /// @notice One attestation per (agent, validator). Immutable afterwards.
    function attest(uint256 agentId, bool positive, string calldata tag) external {
        _checkId(agentId);
        if (hasAttested[agentId][msg.sender]) revert AlreadyAttested();
        hasAttested[agentId][msg.sender] = true;
        _atts[agentId].push(Attestation(msg.sender, positive, tag, uint64(block.timestamp)));
        emit Attested(agentId, msg.sender, positive, tag);
    }

    /// @notice Owner can pause/resume the agent (e.g. key rotation window).
    function setActive(uint256 agentId, bool active) external {
        _checkId(agentId);
        if (_agents[agentId - 1].owner != msg.sender) revert NotOwner();
        _agents[agentId - 1].active = active;
        emit AgentStatus(agentId, active);
    }

    function agent(uint256 id)
        external
        view
        returns (address owner, string memory metadataURI, bool active)
    {
        _checkId(id);
        Agent storage a = _agents[id - 1];
        return (a.owner, a.metadataURI, a.active);
    }

    function reputation(uint256 id)
        external
        view
        returns (uint256 positive, uint256 negative, int256 score)
    {
        _checkId(id);
        Attestation[] storage list = _atts[id];
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i].positive) positive++;
            else negative++;
        }
        score = int256(positive) - int256(negative);
    }

    function attestations(uint256 id) external view returns (Attestation[] memory) {
        _checkId(id);
        return _atts[id];
    }

    function agentCount() external view returns (uint256) {
        return _agents.length;
    }

    function _checkId(uint256 id) internal view {
        if (id == 0 || id > _agents.length) revert BadId();
    }
}
