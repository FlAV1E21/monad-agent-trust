# Agent Trust Layer

**Live reputation and trust-minimised payments for autonomous AI agents on Monad.**
Built for the **Best Use of Envio** bounty · Monad Metropolis hackathon · track: Trust, Identity & AI Infrastructure.

An AI agent economy has one unsolved problem: *why would anyone pay an agent they don't trust?*
This project answers it with three pieces that feed each other:

1. **`AgentRegistry`** — ERC-8004-inspired on-chain identity: agents register with a metadata URI; any address leaves exactly one immutable attestation (positive/negative + tag). Reputation is derived on-chain.
2. **`AgentEscrow`** — payment escrow where the *contract* is the only trusted party: three timeouts (refund-unaccepted, refund-no-proof, claim-after-silent-review) plus an arbiter-gated dispute path.
3. **`agent-trust-indexer` (Envio HyperIndex)** — the engine of the product: it turns raw registry/escrow events into **derived trust aggregates** (score, success rate in bps, earned wei, dispute count) and network-wide cash-flow stats, served over GraphQL and rendered live in the dapp leaderboard.

The indexer is not a bolt-on. The leaderboard, the agent cards and the "is this agent safe to pay?" answer **do not exist without it** — reading those aggregates from raw chain state would require O(attestations + tasks) calls per agent per page load.

---

## How Envio is used (depth, not decoration)

| Judging criterion | Where it is met |
|---|---|
| **Depth of use** | Non-trivial schema: 4 entities, 2 relations (`Agent ↔ Attestation`, `Agent ↔ Task`), plus **derived/aggregated entities**: per-agent `score`, `successRateBps`, `earnedWei`, counters, and a singleton `NetworkStats` (volume, released, refunded, disputes) updated across 10 event types |
| **Working product** | `web/index.html` polls the HyperIndex GraphQL endpoint every 15 s and renders the leaderboard + task feed; an on-chain read is kept only as a *fallback check*, which makes the indexer's role obvious in the demo |
| **Originality** | Reputation for *agents* (not wallets/DeFi): attestations + escrow outcomes fused into one trust score that gates payment decisions |
| **Craft** | `pnpm test` runs 3 Vitest suites through Envio's own `createTestIndexer()` simulate mode (happy path, reputation math, dispute/refund path); `pnpm typecheck` is clean; handlers are pure read-modify-write, reorg-safe and preload-safe |

Schema highlights (`schema.graphql`):

- `Agent` — derived trust aggregates (`score = positive − negative`, `successRateBps = completed/accepted`)
- `Attestation` — immutable one-per-validator verdicts, related to `Agent`
- `Task` — escrow lifecycle mirror (`Open → Accepted → Submitted → Released/Refunded/Disputed/Resolved`)
- `NetworkStats` — singleton aggregate: locked volume, released, refunded, disputes

Handlers (`src/handlers.ts`) are registered with `indexer.onEvent(...)` for all 10 events of the two contracts.

---

## Repository layout

```
config.yaml          HyperIndex config: chains (Monad testnet 10143), contracts, events
schema.graphql       entities + relations + derived aggregates
src/handlers.ts      event handlers (indexer.onEvent)
test/handlers.test.ts  Vitest suites via createTestIndexer() simulate mode
contracts/           Solidity 0.8.24 sources (compiled clean, optimizer on)
web/index.html       single-file dapp: leaderboard from HyperIndex GraphQL + escrow actions
DEMO.md              120-second demo script
```

## Run it

Contracts (Monad testnet, chain id `10143`, RPC `https://testnet-rpc.monad.xyz`, faucet `https://faucet.monad.xyz`):

```bash
forge build   # or paste contracts/*.sol into Remix and compile 0.8.24
# deploy AgentRegistry(), then AgentEscrow(registry, arbiter, workWindow, reviewWindow)
# e.g. workWindow = 7 days, reviewWindow = 2 days
```

Indexer (requires Node ≥ 22):

```bash
pnpm install
# put your two deployed addresses into config.yaml
pnpm codegen
pnpm test          # 3 suites, simulate mode, no network needed
pnpm typecheck
# deploy:
npx envio-cloud login            # browser login
npx envio-cloud indexer add --name agent-trust-indexer --repo FIAV1E21/monad-agent-trust --branch main
npx envio-cloud deployment status agent-trust-indexer <commit> --watch-till-synced
```

Dapp: open `web/index.html`, paste the two contract addresses and the Envio Cloud GraphQL URL into the CONFIG block, serve statically (GitHub Pages works).

Example GraphQL query the dapp runs:

```graphql
{
  agents(orderBy: score, orderDirection: desc, first: 10) {
    id score positive negative tasksCompleted successRateBps earnedWei active
  }
  tasks(orderBy: createdAt, orderDirection: desc, first: 6) {
    id status client worker rewardWei
  }
}
```

## Trust model (contracts)

- Client locks reward at `createTask`; `agentId = 0` opens the task to any registered agent.
- Only the **owner of an active registered agent** may `accept`.
- Money leaves the escrow in exactly four ways: `release` (client approves), `claimAfterReview` (client silent past `reviewUntil`), `refundUnaccepted`, `refundNoProof`, or `resolve` by the arbiter after `dispute`.
- Checks-effects-interactions everywhere; state is settled before any external call.

## Deployment record

| Item | Value |
|---|---|
| AgentRegistry (Monad testnet) | `0x…` filled at submission |
| AgentEscrow (Monad testnet) | `0x…` filled at submission |
| HyperIndex GraphQL endpoint | filled at submission |
| License | MIT |

## AI disclosure

This project was built solo with AI assistance (code drafting, docs research). Every contract, handler and test was reviewed, compiled and executed by the author before submission; the test suites and the live demo are the proof of work.
