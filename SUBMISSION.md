# Hackathon1: Undertow — Follow the Evidence

Draft entry. Not submitted. Authenticated API verification remains pending.

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

- 22 automated tests pass: parsing, missing/inconsistent fields, multi-leg handling, replay boundaries, influence rankings, case roundtrips and malformed files, and mocked API/security/error paths.
- Browser checks cover scenario application, actual .json download and reimport, desktop and 390px mobile layouts, filters and replay boundaries.
- **Real authenticated UW request: pending API access.** The adapter has been tested against the documented response shape with mocks.
- All published observations and screenshots are synthetic. Licensed API snapshots are for personal local use unless redistribution is permitted.
- The ±20% balance thresholds are descriptive heuristics. No price predictions, calibrated confidence, returns, or trader-intent claims.

## Remaining entry steps

1. Obtain UW API access (trial keys are eligible), verify one real request, and update the validation statement above.
2. Confirm the exact cutoff with the organizer. The official page, checked 8 October 2026, still says only “one month.” Hacklist's 23 October listing is not official confirmation.
3. Post the entry with screenshots and repository link in the organizer's `vibe-and-api-projects` channel using the `Hackathon1:` title prefix.

[Official event instructions](https://unusualwhales.com/information/2026-unusual-whales-hackathon)
