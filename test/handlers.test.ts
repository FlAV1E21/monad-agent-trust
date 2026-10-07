import { describe, it, expect } from "vitest";
import { createTestIndexer, TestHelpers } from "envio";
// handlers are auto-loaded via `handlers: src` in config.yaml

const [client, worker, validator] = TestHelpers.Addresses.mockAddresses;
const MON = 10n ** 18n;

describe("agent trust indexer", () => {
  it("registers an agent and derives reputation from attestations", async () => {
    const indexer = createTestIndexer();

    await indexer.process({
      chains: {
        10143: {
          simulate: [
            {
              contract: "AgentRegistry",
              event: "AgentRegistered",
              params: { agentId: 1n, owner: worker, metadataURI: "ipfs://agent-1" },
            },
            {
              contract: "AgentRegistry",
              event: "Attested",
              params: { agentId: 1n, validator, positive: true, tag: "paid-on-time" },
            },
            {
              contract: "AgentRegistry",
              event: "Attested",
              params: { agentId: 1n, validator: client, positive: false, tag: "late-proof" },
            },
          ],
        },
      },
    });

    const a = await indexer.Agent.getOrThrow("1");
    expect(a.positive).toBe(1);
    expect(a.negative).toBe(1);
    expect(a.score).toBe(0);
    expect(a.active).toBe(true);

    const att = await indexer.Attestation.get(`1-${validator}`);
    expect(att?.tag).toBe("paid-on-time");

    const s = await indexer.NetworkStats.getOrThrow("stats");
    expect(s.agents).toBe(1);
    expect(s.attestations).toBe(2);
  });

  it("aggregates escrow cash-flow into agent earnings and success rate", async () => {
    const indexer = createTestIndexer();

    await indexer.process({
      chains: {
        10143: {
          simulate: [
            {
              contract: "AgentRegistry",
              event: "AgentRegistered",
              params: { agentId: 7n, owner: worker, metadataURI: "ipfs://agent-7" },
            },
            {
              contract: "AgentEscrow",
              event: "TaskCreated",
              params: { id: 1n, client, agentId: 0n, reward: MON, acceptBy: 1_000_000n, specURI: "ipfs://spec" },
            },
            {
              contract: "AgentEscrow",
              event: "TaskAccepted",
              params: { id: 1n, agentId: 7n, worker },
            },
            {
              contract: "AgentEscrow",
              event: "ProofSubmitted",
              params: { id: 1n, proofURI: "ipfs://proof" },
            },
            {
              contract: "AgentEscrow",
              event: "Released",
              params: { id: 1n, to: worker, amount: MON },
            },
          ],
        },
      },
    });

    const t = await indexer.Task.getOrThrow("1");
    expect(t.status).toBe("Released");
    expect(t.agent_id).toBe("7");
    expect(t.worker).toBe(worker);
    expect(t.proofURI).toBe("ipfs://proof");

    const a = await indexer.Agent.getOrThrow("7");
    expect(a.tasksAccepted).toBe(1);
    expect(a.tasksCompleted).toBe(1);
    expect(a.successRateBps).toBe(10000);
    expect(a.earnedWei).toBe(MON);

    const s = await indexer.NetworkStats.getOrThrow("stats");
    expect(s.tasks).toBe(1);
    expect(s.volumeWei).toBe(MON);
    expect(s.releasedWei).toBe(MON);
    expect(s.refundedWei).toBe(0n);
  });

  it("tracks disputes and refunds separately from releases", async () => {
    const indexer = createTestIndexer();

    await indexer.process({
      chains: {
        10143: {
          simulate: [
            {
              contract: "AgentRegistry",
              event: "AgentRegistered",
              params: { agentId: 9n, owner: worker, metadataURI: "ipfs://agent-9" },
            },
            {
              contract: "AgentEscrow",
              event: "TaskCreated",
              params: { id: 2n, client, agentId: 9n, reward: 2n * MON, acceptBy: 2_000_000n, specURI: "ipfs://spec2" },
            },
            {
              contract: "AgentEscrow",
              event: "TaskAccepted",
              params: { id: 2n, agentId: 9n, worker },
            },
            {
              contract: "AgentEscrow",
              event: "ProofSubmitted",
              params: { id: 2n, proofURI: "ipfs://proof2" },
            },
            {
              contract: "AgentEscrow",
              event: "Disputed",
              params: { id: 2n, by: client },
            },
            {
              contract: "AgentEscrow",
              event: "Resolved",
              params: { id: 2n, payWorker: false },
            },
            {
              contract: "AgentEscrow",
              event: "Refunded",
              params: { id: 2n, to: client, amount: 2n * MON },
            },
          ],
        },
      },
    });

    const t = await indexer.Task.getOrThrow("2");
    expect(t.status).toBe("Refunded");

    const a = await indexer.Agent.getOrThrow("9");
    expect(a.tasksDisputed).toBe(1);
    expect(a.tasksCompleted).toBe(0);
    expect(a.earnedWei).toBe(0n);

    const s = await indexer.NetworkStats.getOrThrow("stats");
    expect(s.disputes).toBe(1);
    expect(s.refundedWei).toBe(2n * MON);
    expect(s.releasedWei).toBe(0n);
  });
});
