# Hackathon1: Undertow — Follow the Evidence

**Submitted on 9 October 2026:** [view the Discord entry](https://discord.com/channels/710524439133028512/1557955284125618266). Authenticated API access and analysis were verified before posting.

## What it does

How much of your options-flow story hangs on one alert? Undertow maps Unusual Whales flow alerts, tests how the reading changes when each observation is removed, and saves a case another reviewer can reopen exactly. It gives market researchers a way to question an interpretation before trusting it.

## Demo

[Working screenshots and 90-second presentation](https://github.com/mosesfawole/undertow/blob/main/docs/DEMO.md)

In the explicitly fictional NVDA sample, removing a $1.8M call changes a Call-led reading into Put-led. The stress lab tests all 12 alerts: a second, smaller removal merely crosses the classification threshold. It shows the size of each effect, so a 70.3-point reversal and a 3.3-point threshold crossing are not presented as equivalent.

The synthetic TSLA sample retains its Put-led label through every individual removal. AAPL shows how a mixed reading can depend on two put alerts. The app never equates a stable label with a validated trading thesis.

Save a Markdown field note or a .json case containing the evidence, filter, replay position and exclusion. Reimport restores the investigation locally; source claims in imported files remain explicitly unverified.

## Built with

- UW endpoint: `GET /api/option-trades/flow-alerts` with `ticker_symbol`, `limit=200`, and `min_premium=10000`.
- Fields: `created_at`, `type`, `total_premium`, ask/bid premium, strike, expiry, volume, open interest, sweep and multi-leg flags.
- AI-assisted development; runtime analysis is deterministic JavaScript with traceable evidence. No runtime LLM or UW MCP use is claimed.
- Native JavaScript, SVG, CSS, Node.js HTTP proxy and Node's test runner. No external runtime packages.

## Source and local setup

[GitHub repository](https://github.com/mosesfawole/undertow)

```sh
git clone https://github.com/mosesfawole/undertow.git
cd undertow
npm start
```

Open `http://127.0.0.1:4173`. Requires Node 22.9+; tested with Node 24. The three synthetic cases need no key or installation step.

For personal API use, copy `.env.example` to `.env`, set `UW_API_KEY`, restart, and choose **Connect data**. Keys stay on the local server. The snapshot is limited to the latest returned UTC date and up to 200 alerts; it is not streaming or a full tape.

## Verification and limits

- 28 automated tests pass: parsing, missing/inconsistent fields, multi-leg handling, replay boundaries, influence rankings, case roundtrips and malformed files, mocked API/security/error paths, and a metadata-only connection checker.
- Browser checks cover scenario application, actual .json download and reimport, desktop and 390px mobile layouts, filters and replay boundaries.
- **Real authenticated UW request passed on 9 October 2026:** 200 normalized NVDA alerts, no rejected or duplicate rows. Statistics, linked narrative, every-alert removal, replay subsets, in-memory case roundtrip and Markdown export passed against the live sample. [Connection metadata](docs/live-api-check.json) · [Analysis metadata](docs/live-analysis-check.json).
- All published observations and screenshots are synthetic. Licensed API snapshots are for personal local use unless redistribution is permitted.
- The ±20% balance thresholds are descriptive heuristics. No price predictions, calibrated confidence, returns, or trader-intent claims.

## Submission record

The entry was published in `vibe-and-api-projects` with the required `Hackathon1:` title, `hackathon` and `dashboards` tags, two direct synthetic screenshot links, the demo page, GitHub repository and setup instructions. The published post was verified in Discord.

The confirmed deadline is **23 October 2026 at 11:59 p.m. Eastern** (24 October at 05:59 Berlin). Review the [official entry requirements and post-event obligations](docs/ENTRY-RULES.md). Publication records submission; it does not establish acceptance by judges or a prize result.

[Official event instructions](https://unusualwhales.com/information/2026-unusual-whales-hackathon)
