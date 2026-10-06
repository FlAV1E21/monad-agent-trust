import { indexer } from "envio";
import type { EvmOnEventContext, Agent, NetworkStats } from "envio";

const STATS_ID = "stats";

async function loadStats(context: EvmOnEventContext): Promise<NetworkStats> {
  const existing = await context.NetworkStats.get(STATS_ID);
  if (existing) return existing;
  return {
    id: STATS_ID,
    agents: 0,
    tasks: 0,
    attestations: 0,
    volumeWei: BigInt(0),
    releasedWei: BigInt(0),
    refundedWei: BigInt(0),
    disputes: 0,
  };
}

function successRate(accepted: number, completed: number): number {
  return accepted === 0 ? 0 : Math.floor((completed * 10000) / accepted);
}

// ---------------------------------------------------------------- registry

indexer.onEvent(
  { contract: "AgentRegistry", event: "AgentRegistered" },
  async ({ event, context }) => {
    context.Agent.set({
      id: event.params.agentId.toString(),
      owner: event.params.owner,
      metadataURI: event.params.metadataURI,
      registeredAt: BigInt(event.block.timestamp),
      active: true,
      positive: 0,
      negative: 0,
      score: 0,
      earnedWei: BigInt(0),
      tasksAccepted: 0,
      tasksCompleted: 0,
      tasksDisputed: 0,
      successRateBps: 0,
    });
    const s = await loadStats(context);
    context.NetworkStats.set({ ...s, agents: s.agents + 1 });
  }
);

indexer.onEvent(
  { contract: "AgentRegistry", event: "AgentStatus" },
  async ({ event, context }) => {
    const a = await context.Agent.get(event.params.agentId.toString());
    if (!a) return;
    context.Agent.set({ ...a, active: event.params.active });
  }
);

indexer.onEvent(
  { contract: "AgentRegistry", event: "Attested" },
  async ({ event, context }) => {
    const agentId = event.params.agentId.toString();
    const a = await context.Agent.get(agentId);
    if (!a) return;
    const positive = a.positive + (event.params.positive ? 1 : 0);
    const negative = a.negative + (event.params.positive ? 0 : 1);
    context.Agent.set({ ...a, positive, negative, score: positive - negative });

    context.Attestation.set({
      id: `${agentId}-${event.params.validator}`,
      agent_id: agentId,
      validator: event.params.validator,
      positive: event.params.positive,
      tag: event.params.tag,
      at: BigInt(event.block.timestamp),
    });

    const s = await loadStats(context);
    context.NetworkStats.set({ ...s, attestations: s.attestations + 1 });
  }
);

// ------------------------------------------------------------------ escrow

indexer.onEvent(
  { contract: "AgentEscrow", event: "TaskCreated" },
  async ({ event, context }) => {
    context.Task.set({
      id: event.params.id.toString(),
      client: event.params.client,
      agent_id: event.params.agentId > 0 ? event.params.agentId.toString() : undefined,
      worker: undefined,
      rewardWei: event.params.reward,
      status: "Open",
      specURI: event.params.specURI,
      proofURI: undefined,
      acceptBy: BigInt(event.params.acceptBy),
      createdAt: BigInt(event.block.timestamp),
      settledAt: undefined,
    });
    const s = await loadStats(context);
    context.NetworkStats.set({
      ...s,
      tasks: s.tasks + 1,
      volumeWei: s.volumeWei + event.params.reward,
    });
  }
);

indexer.onEvent(
  { contract: "AgentEscrow", event: "TaskAccepted" },
  async ({ event, context }) => {
    const t = await context.Task.get(event.params.id.toString());
    if (!t) return;
    const agentId = event.params.agentId.toString();
    context.Task.set({ ...t, agent_id: agentId, worker: event.params.worker, status: "Accepted" });

    const a: Agent | undefined = await context.Agent.get(agentId);
    if (a) {
      const accepted = a.tasksAccepted + 1;
      context.Agent.set({
        ...a,
        tasksAccepted: accepted,
        successRateBps: successRate(accepted, a.tasksCompleted),
      });
    }
  }
);

indexer.onEvent(
  { contract: "AgentEscrow", event: "ProofSubmitted" },
  async ({ event, context }) => {
    const t = await context.Task.get(event.params.id.toString());
    if (!t) return;
    context.Task.set({ ...t, proofURI: event.params.proofURI, status: "Submitted" });
  }
);

indexer.onEvent(
  { contract: "AgentEscrow", event: "Released" },
  async ({ event, context }) => {
    const t = await context.Task.get(event.params.id.toString());
    if (!t) return;
    context.Task.set({ ...t, status: "Released", settledAt: BigInt(event.block.timestamp) });

    if (t.agent_id) {
      const a = await context.Agent.get(t.agent_id);
      if (a) {
        const completed = a.tasksCompleted + 1;
        context.Agent.set({
          ...a,
          earnedWei: a.earnedWei + event.params.amount,
          tasksCompleted: completed,
          successRateBps: successRate(a.tasksAccepted, completed),
        });
      }
    }
    const s = await loadStats(context);
    context.NetworkStats.set({ ...s, releasedWei: s.releasedWei + event.params.amount });
  }
);

indexer.onEvent(
  { contract: "AgentEscrow", event: "Refunded" },
  async ({ event, context }) => {
    const t = await context.Task.get(event.params.id.toString());
    if (!t) return;
    context.Task.set({ ...t, status: "Refunded", settledAt: BigInt(event.block.timestamp) });

    const s = await loadStats(context);
    context.NetworkStats.set({ ...s, refundedWei: s.refundedWei + event.params.amount });
  }
);

indexer.onEvent(
  { contract: "AgentEscrow", event: "Disputed" },
  async ({ event, context }) => {
    const t = await context.Task.get(event.params.id.toString());
    if (!t) return;
    context.Task.set({ ...t, status: "Disputed" });

    if (t.agent_id) {
      const a = await context.Agent.get(t.agent_id);
      if (a) context.Agent.set({ ...a, tasksDisputed: a.tasksDisputed + 1 });
    }
    const s = await loadStats(context);
    context.NetworkStats.set({ ...s, disputes: s.disputes + 1 });
  }
);

indexer.onEvent(
  { contract: "AgentEscrow", event: "Resolved" },
  async ({ event, context }) => {
    const t = await context.Task.get(event.params.id.toString());
    if (!t) return;
    context.Task.set({ ...t, status: "Resolved", settledAt: BigInt(event.block.timestamp) });
  }
);
