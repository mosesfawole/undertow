# Undertow
### Follow the evidence beneath unusual options flow.

Undertow turns an options-flow alert sample into an interactive investigation. Replay the session, inspect source fields, compare alternative explanations, and remove the largest alert to see whether the reading survives.

**The central question: does your market story survive without one influential alert?**

[See the working demo screenshots](docs/DEMO.md) · [Submission draft](SUBMISSION.md)

**Start here:** run `npm start`, then open **http://127.0.0.1:4173**.

## Run

Requires Node.js 22.9+ (built and tested with Node 24). There are no external packages, build tools, accounts or API keys required for the demo.

```sh
npm start
```

On Windows, you can also double-click **START-UNDERTOW.cmd**, then open the address printed in the terminal. Keep that terminal running while using the app. Ctrl+C stops it.

The server binds to 127.0.0.1 only. It is a personal local app, not a public deployment.

## Try the signature moment

1. Open the NVDA sample, **The whale in the room**.
2. The sample initially reads **Call-led**, with **$4.31M** observed alert premium.
3. Inspect the **$1.8M** call at **11:00 ET**.
4. Choose **Remove the biggest alert**. The remaining **$2.51M** reads **Put-led**.
5. Restore it, replay the session, pin the alert, and write down what evidence would change your mind.
6. Export a field note containing the source label, replay cutoff, filters, excluded alert and evidence IDs.

All three sample sessions are **fabricated illustrations**, not historical trades. Their real ticker symbols do not imply real market activity.

## What works

- Three distinct sample investigations: NVDA (concentrated call), TSLA (put demand), AAPL (mixed).
- Interactive SVG evidence map: time on the horizontal axis, ask share on the vertical axis, premium represented by circle area (small dots have a minimum visible size).
- Replay and premium filters recalculate the ledger, statistics and narrative from the revealed subset.
- Source-linked evidence inspection, including missing fields and multi-leg flags.
- Largest-alert counterfactual across the visible sample.
- Story Stress Lab: remove each revealed alert in turn, rank classification and balance changes, and apply any scenario.
- Reproducible .json case export/import restores the evidence, filters, replay position and excluded alert. Files stay in the browser; imported source claims are clearly unverified.
- Browser-local notebook with editable notes and persistence.
- Field-note preview, Markdown download and copy fallback.
- Responsive mobile layout, keyboard-operable controls, labelled dialogs, reduced-motion support.
- Documented Unusual Whales REST adapter, local environment key, bounded 60-second cache and explicit error states.
- Transparent methodology; no LLM subscription required.

## A demo with three different outcomes

| Synthetic case | Baseline | Single removals that change the label | What it demonstrates |
| --- | --- | --- | --- |
| NVDA | Call-led | 2 of 12 | Removing the $1.8M call gives Put-led; removing a $235K call gives Two-sided near the threshold. |
| TSLA | Put-led | 0 of 12 | The label survives every individual removal; that does not establish trader intent. |
| AAPL | Two-sided | 2 of 12 | Removing either of two put alerts shifts the remaining balance to Call-led. |

The lab always tests the full revealed sample before your manual exclusion. The exported Markdown stress test instead applies to the exported, post-exclusion subset and says so. Counts are not probabilities or confidence scores. These are leave-one-out tests, not tests of related groups or alternative thresholds.

To reproduce the signature result, choose **Open a saved case** and open `docs/examples/nvda-without-whale.json`. It restores the fictional NVDA sample with the whale excluded.

## Connect your Unusual Whales API key

1. Copy `.env.example` to `.env` in this folder.
2. Put your own key in the local file:

```dotenv
UW_API_KEY=your_key_here
PORT=4173
```

3. Restart the app.
4. Click **Demo waters** in the top bar (or **Connect data**), then **Check connection**.
5. Enter a ticker and choose **Load real alerts**.

The status check only confirms a key is configured. Loading an actual ticker verifies authorization. The key never goes to the browser, into exported notes, or into application logs. Do not paste it into a chat or commit `.env`.

An organizer promo code is redeemed at checkout; the separate API token belongs in `UW_API_KEY`. See [API-ACTIVATION.md](API-ACTIVATION.md) for the organizer-offer setup and verified token-management link.

After configuring the token, run `npm run check:api -- NVDA --record`. This exercises the same proxy and normalizer as the application, and saves only verification metadata to `docs/live-api-check.json`. Exit code 0 means a nonempty authenticated sample passed; exit code 2 means access or usable-data verification remains incomplete. An empty response does not count as a successful live-analysis check.

Check the current plan, discount and renewal terms in your account before activating access. The organizer supplied a one-month Advanced offer; the public monthly Advanced price was $375 when checked on 9 October 2026. API trial keys are eligible for the hackathon according to its official project page.

### API contract

```http
GET https://api.unusualwhales.com/api/option-trades/flow-alerts
    ?ticker_symbol=NVDA&limit=200&min_premium=10000
Authorization: Bearer YOUR_API_KEY
```

The server normalizes the documented `data` array, sorts timestamps, removes duplicate alert IDs, filters to the requested ticker and keeps only the latest returned UTC date. This is a **partial snapshot**, not a full session or streaming feed. It does not paginate earlier trades. Provider errors never silently switch to synthetic data.

**Live API access verified on 9 October 2026:** the authenticated endpoint returned 200 usable NVDA alerts for the latest returned UTC date, 8 October, with no rejected or duplicate rows. Analysis, every-alert removal, replay subsets, in-memory case roundtrip and field-note export also passed against that sample. See [connection metadata](docs/live-api-check.json) and [analysis metadata](docs/live-analysis-check.json). These files contain verification counts and results, not licensed observations or credentials.

Official references:
- [Flow Alerts schema](https://api.unusualwhales.com/docs/api/option-trade/flow-alerts)
- [API access and pricing](https://unusualwhales.com/public-api)
- [Hackathon submission instructions](https://unusualwhales.com/information/2026-unusual-whales-hackathon)

## How the reading works

For alerts with known ask/bid premium and no multi-leg flag:

```text
balance = (ask-call premium - ask-put premium) / total ask premium

balance >  0.20   → Call-led
balance < -0.20   → Put-led
otherwise        → Two-sided
no usable ask premium → Unclear
```

These are transparent **descriptive heuristics**, not trained models or calibrated confidence scores. They never estimate a probability of profit.

- Ask-side execution does not prove opening intent.
- Multi-leg alerts remain in observed totals but are excluded from directional side aggregation.
- Missing or inconsistent side totals stay unknown.
- Zero open interest produces an unknown volume/OI ratio.
- Open interest is a prior-close snapshot; volume/OI does not prove a new position.
- Alerts may overlap, so summed alert premium is not guaranteed to be unique dollars traded.
- The app cannot infer trader identity, inside information, intent or future returns.
- SVG scaling uses the loaded sample's time and premium extent; replay hides future observations and keeps future observations out of statistics and narrative. It is an exploratory replay, not a blind backtest.

## Files

- `server.mjs` — local HTTP server, static allowlist and API proxy.
- `lib/engine.mjs` — normalization, statistics, narratives, influence analysis and export.
- `lib/casefile.mjs` — versioned case export, validation and reconstruction.
- `public/app.mjs` — UI and interaction state.
- `public/demo.mjs` — explicitly synthetic cases.
- `public/styles.css` — responsive visual design.
- `test/engine.test.mjs` — analysis and server integration tests.
- `SUBMISSION.md` — draft entry and 90-second demo script.

## Verification

```sh
npm test
```

28 automated tests cover normalization, deduplication, chronological replay prefixes, malformed and missing data, multi-leg exclusion, the sample counterfactual, empty data, export provenance, missing credentials, protected local files, documented query parameters, caching, input validation, cross-origin rejection, upstream errors, session filtering, every-alert influence rankings, insufficient evidence, immutable replay subsets, case roundtrips, export field allowlists, malformed case rejection, and the connection-check command's success, authentication-failure, empty-sample and changed-schema cases.

Browser checks covered desktop and 390px mobile layouts, all three cases, slider boundaries, premium filters, removing/restoring the largest alert, alert details, notebook persistence, the field guide, a downloaded Markdown export, export preview and missing-key feedback. No JavaScript errors were observed during these checks. The v1.1 browser pass also checked arbitrary exclusions, actual case download and reimport, restored provenance and replay boundaries. A live desktop smoke test on 9 October loaded 200 API alerts, rendered all 200 removal scenarios, applied an exclusion to leave 199 alerts, and verified the export preview and live source label. See [live browser verification](docs/live-ui-check.json).

## Before submitting

The source and demo are ready for review. The hackathon entry itself has not been posted.

1. Confirm the exact deadline with the organizer. Hacklist listed 23 October 2026, but the official page only said “one month” when checked.
2. Live access and analysis have been verified locally. Each reviewer needs their own API access for live data; the synthetic demo remains available without a key.
3. Review the working screenshots in `docs/DEMO.md` and the GitHub source repository. The official page accepts images instead of a video.
4. Use synthetic data for a public hosted demo unless you have data redistribution permission. The official API page restricts personal-tier redistribution.
5. Review the draft in `SUBMISSION.md`, which includes the repository and screenshot links, then submit through the organizer's prescribed channel.
