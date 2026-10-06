# DEMO SCRIPT — 120 seconds, no voice needed

Record your screen (Windows: **Win + G** → record). Browser fullscreen, dark theme.
Captions below are shown as on-screen text (I will give you the exact strings).
Do not improvise; follow the timings. Total must stay under 2:00.

| Time | What happens on screen | On-screen caption |
|---|---|---|
| 0:00–0:08 | Open `web/index.html`, click **Connect wallet**, MetaMask pops, confirm, badge turns green "Monad testnet" | `Agent Trust Layer — live reputation for AI agents on Monad` |
| 0:08–0:18 | Scroll to leaderboard, point at the "Data source: Envio HyperIndex" line | `Leaderboard is served by an Envio HyperIndex indexer, not raw chain reads` |
| 0:18–0:30 | In Registry panel: paste metadata URI, click **Register agent**, MetaMask confirm, tx hash appears in status line | `1. An AI agent registers on-chain (ERC-8004-inspired identity)` |
| 0:30–0:42 | Attest panel: agent id 1, positive, tag `paid-on-time`, click **Send attestation**, confirm | `2. Anyone leaves one immutable attestation — reputation is derived on-chain` |
| 0:42–0:58 | Escrow panel: reward 0.01, window 60, click **Create task**, confirm | `3. Client locks payment in escrow — the contract is the only trusted party` |
| 0:58–1:10 | Click **Accept** (agent id 1), confirm | `4. Only the owner of an active registered agent can take the job` |
| 1:10–1:22 | Click **Submit proof**, confirm | `5. Agent submits proof of work` |
| 1:22–1:34 | Click **Release**, confirm | `6. Client releases payment — or the agent can claim it after a silent review window` |
| 1:34–1:50 | Click **Refresh**, watch the leaderboard row update: score, jobs done, success 100%, earned 0.01 MON | `7. HyperIndex aggregates the events: score, success rate, earnings — live` |
| 1:50–2:00 | Scroll the task table showing status Released, then the repo README tests section | `Built with Envio HyperIndex · Monad testnet · MIT` |

## Recording checklist

- [ ] MetaMask shows **Monad Testnet** and balance > 0 (faucet MON) before recording
- [ ] Contract addresses and GraphQL URL already pasted into `index.html`
- [ ] One full cycle (steps 3–6) already done once off-camera, so the leaderboard is not empty at 0:08
- [ ] Browser zoom 110–125% so text is readable in the video
- [ ] No seed phrase, no private keys visible anywhere (MetaMask popup shows only confirm buttons)
- [ ] Export as mp4, ≤ 2 minutes, 1080p

## Pitch text (paste into the submission form)

> Agent Trust Layer makes autonomous AI agents payable. Agents register an ERC-8004-inspired identity on Monad; anyone leaves one immutable attestation; an escrow contract holds payment and releases it by rules, not by trust — with refunds for dead workers and a claim path for silent clients. An Envio HyperIndex indexer is the product's engine: it fuses registry and escrow events into derived trust aggregates (score, success rate, earned wei, disputes) and network cash-flow stats, served over GraphQL and rendered live in the dapp leaderboard. Without the indexer those aggregates would cost O(events) chain reads per agent per load. Repo includes Vitest suites run through Envio's createTestIndexer simulate mode, a clean typecheck, and a 120-second end-to-end demo on Monad testnet.
