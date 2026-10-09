# Activate organizer-provided API access

The organizer reply supplied by the user offers one month of API Advanced using a promo code. That offer is not an API bearer token. The code is intentionally omitted from source files.

**Local access is now verified:** on 9 October 2026, the configured token successfully loaded 200 usable NVDA alerts through Undertow's proxy. See [verification metadata](docs/live-api-check.json). The setup instructions below are for other users or a future token change; the account's billing terms have not been inspected by the assistant.

1. Open [official API pricing](https://unusualwhales.com/pricing?product=api), sign into your account, and select the **monthly API Advanced** plan.
2. Apply the code from Lex's email in the checkout promotion-code field, if offered. Confirm that the displayed total for the first month is **$0** and review the next renewal date and amount. If the checkout does not show the promised discount, stop before completing it and clarify with the organizer.
3. After activation, open the [official API token page](https://unusualwhales.com/dashboard/api) and obtain your token. The [official API documentation](https://api.unusualwhales.com/docs) identifies this page for token management.
4. Save that token after `UW_API_KEY=` in this project's local `.env` file. Keep `PORT=4173`. Do not put the promo code in that field. The `.env` file is Git-ignored.
5. Run `npm run check:api -- NVDA --record`. It makes one provider request through Undertow's proxy and normalization path. It prints only verification metadata and saves that metadata to `docs/live-api-check.json`. An empty sample or invalid response does not pass live-analysis verification.
6. Restart Undertow, open http://127.0.0.1:4173/, and choose **Connect data → Load real alerts** for the visual check.

Checked October 9, 2026: the public API pricing page lists API Advanced at **$375/month**, billed monthly, and says subscriptions auto-renew. The organizer-specific discount, renewal date and actual amount must be confirmed in the account's checkout; these have not been inspected or accepted by the assistant. No paid subscription has been authorized here.

Public API terms restrict personal-tier redistribution. Keep authenticated market snapshots local; public demo assets should continue using the fictional examples. The checker saves no raw alerts, prices or alert identifiers.
