# DEMO SCRIPT — recorded & submitted ✅

**Final videos (submitted with the hackathon entry):**
- Technical demo (1:23): https://www.youtube.com/watch?v=uFxmlCdXODU
- Pitch (1:50, English voice-over): https://youtu.be/M8s9XujMGcM

The script below is the shot list that was used to record the technical demo
(screen recording, Windows Game Bar / ShareX, browser fullscreen, dark theme, 125% zoom).
Captions were kept as on-screen context; total runtime stayed under 2:00.

| Time | What happens on screen | On-screen caption |
|---|---|---|
| 0:00–0:08 | Open the live dapp URL, click **Connect wallet**, MetaMask pops, confirm, badge turns green "Monad testnet" | `Agent Trust Layer — live reputation for AI agents on Monad` |
| 0:08–0:18 | Scroll to leaderboard (already populated), point at "Data source: Envio HyperIndex" line | `Leaderboard served by an Envio HyperIndex indexer on Envio Cloud — not raw chain reads` |
| 0:18–0:30 | Registry panel: paste metadata URI, click **Register agent**, MetaMask confirm, tx hash appears in status line | `1. An AI agent registers on-chain (ERC-8004-inspired identity)` |
| 0:30–0:42 | Attest panel: agent id N, positive, tag `paid-on-time`, click **Send attestation**, confirm | `2. Anyone leaves one immutable attestation — reputation is derived on-chain` |
| 0:42–0:58 | Escrow panel: reward 0.01, window 60, click **Create task**, confirm | `3. Client locks payment in escrow — the contract is the only trusted party` |
| 0:58–1:10 | Click **Accept** (agent id N), confirm | `4. Only the owner of an active registered agent can take the job` |
| 1:10–1:22 | Click **Submit proof**, confirm | `5. Agent submits proof of work` |
| 1:22–1:34 | Click **Release**, confirm | `6. Client releases payment — or the agent claims it after a silent review window` |
| 1:34–1:46 | Click **Refresh**, watch the leaderboard row update: score, jobs done, success %, earned 0.01 MON | `7. HyperIndex aggregates events into trust scores — live` |
| 1:46–1:56 | Switch tab to **Envio Cloud dashboard**: synced status + run the agents GraphQL query, show updated score in the response | `Deployed on Envio Cloud · synced via HyperSync · handlers tested with createTestIndexer()` |
| 1:56–2:00 | Back to dapp, full leaderboard visible | `Agent Trust Layer · Monad testnet · MIT` |

## Recording checklist

- [ ] MetaMask shows **Monad Testnet** and balance > 0 (faucet MON) before recording
- [ ] Contract addresses and GraphQL URL already pasted into `index.html`, dapp published (live URL)
- [ ] Leaderboard already has 3+ agents and 2+ completed tasks (done off-camera beforehand)
- [ ] Envio Cloud dashboard tab already open and logged in (synced status visible)
- [ ] One full cycle (steps 3–6) already rehearsed once off-camera
- [ ] Browser zoom 110–125% so text is readable in the video
- [ ] Close personal tabs/notifications; hide bookmarks bar; clear wallet name if personal
- [ ] No seed phrase, no private keys visible anywhere
- [ ] Export as mp4, ≤ 2 minutes, 1080p; upload to YouTube as **Unlisted** (or Loom)

## Pitch text (paste into the submission form)

> Agent Trust Layer makes autonomous AI agents payable. Agents register an ERC-8004-inspired identity on Monad; anyone leaves one immutable attestation; an escrow contract holds payment and releases it by rules, not by trust — with refunds for dead workers and a claim path for silent clients. An Envio HyperIndex indexer is the product's engine: it fuses registry and escrow events into derived trust aggregates (score, success rate, earned wei, disputes) and network cash-flow stats, served over GraphQL from Envio Cloud and rendered live in the dapp leaderboard. Without the indexer those aggregates would cost O(events) chain reads per agent per page load. Repo includes Vitest suites run through Envio's createTestIndexer simulate mode (3/3 passing), a clean typecheck, deployed contracts on Monad testnet, and a 120-second end-to-end demo.
