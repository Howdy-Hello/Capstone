# StockPilot beginner experience changes

> **Superseded (2026-10-08):** The migration this file asks you to apply was never applied and was removed. It depended on objects that only exist in Howdy-Hello's unapplied design. Its gameplay pieces were rebuilt on the live schema in `supabase/migrations/202610080005_reconcile_gameplay.sql`; see `FIXES_APPLIED_2026-10-08.md`.

October 7, 2026. Implemented in the existing React app and applied to the main Capstone checkout.

The first visit now leads to a public practice decision rather than registration. A learner can research, choose a small purchase, wait, or avoid a stock, reveal a scripted result, and reflect. One decision is enough to finish; two extra scenarios are optional. Practice buys and sells reconcile inside a disposable account and never reset a saved run. Gameplay tutorial links open this isolated lesson. Website and advanced control tours remain available.

## Changes

| Review concern | Implemented experience |
| --- | --- |
| Risk-taking and growth rewarded as learning goals | Daily goals record research, comparison, risk review, a plan, or a reason to wait. No stock purchase is needed. Learning notes count practice; they do not automatically grade reasoning. |
| Green comparison values imply a winner | Neutral values with explanations of expectations, valuation, earnings quality, yield, volume, risk, and comparability. A comparison note can be recorded beneath the table. |
| Spending mistaken for investment losses | A tracked account breakdown shows opening value, investment gain/loss, actual bills paid, advisor spending, rewards, and ending value. Net-worth change is labeled separately. The misleading benchmark performance gap was removed; market price change is clearly labeled as context with different cash-flow assumptions. |
| Price movement treated as proof of good reasoning | Inbox feedback is called a price-outcome review. Portfolio adds structured reflection on new evidence, exit rules, position size, and luck. |
| Dense onboarding and jargon | Primary navigation emphasizes Learn, Market, and Portfolio, with other tools grouped under menus. The initial prompt leads to practice; the navigation tour is optional. Definitions appear beside metrics and charts. |
| Simulation rules mistaken for real markets | Fictional companies, synthetic prices, game scores/ratings, paused news reactions, and the account-size execution penalty are labeled where used. |
| Missing investing curriculum | A public Investing Path explores goals, ETFs/index funds, diversification, monthly contributions, compounding, fees, and an illustrative shock. Separate market, limit, and stop-order exercises plus four comprehension checkpoints are interactive. |
| Missing preparation for real money | A topic checklist links to official Canadian and U.S. resources for cash needs, registration, scams, costs, and account/tax rules. Completion is not certification of readiness. |

## Persistence and release

Apply `supabase/migrations/202610080004_learning_and_account_breakdown.sql` after the existing gameplay integrity migration. Deploy the updated client with it. This migration was tested against a disposable PostgreSQL engine; it has not been applied to production.

Learning notes are owned by the user and scoped to the active session and day. Notes cannot refer to another run's trade journal. Daily goal completion requires the corresponding note (or two watched stocks). Learning credit does not add competitive XP or grant cash rewards.

Actual spending is recorded atomically inside the existing checked bill, advisor, and reward operations. Trades remain internal cash-to-stock transfers; execution costs are included in investment gains/losses. Account flow totals are aggregated in PostgreSQL so API row limits cannot truncate old bills. New snapshots preserve learning notes, journal associations, tracked flows, and reward reconciliation. Historical expenses are not guessed: old runs start at the first tracked value and old save slots start at their restored value. Administrative cash adjustments outside the checked game operations are not part of this ledger.

Guest lesson decisions and public exercise/checkpoint answers last for the visit only, as explained on the page. Signed-in learning notes are stored in the database. The portfolio shows the latest 20 learning notes (up to 1,000 loaded) and up to 50 trade plans; realized P/L is explicitly limited to 500 recorded trades. Long-term scenarios are illustrative assumptions, not forecasts, and omit taxes, inflation, and separately modeled dividends.

## Validation

- Client: 87 tests across 16 suites, plus TypeScript and the production build.
- Database: all migrations on disposable PostgreSQL; no-trade goal completion, note length/decision validation, exact and partial bill payments, no duplicate advisor spending, save restoration, journal remapping, reward reconciliation, and cross-account access restrictions.
- Local browser: guest lesson load, a decision to wait, a practice buy/sell with reconciled cash/shares/loss, reflection and completion after one scenario, the investing path, a stop filling below its trigger, and all four learning checkpoints. Practice and order layouts inspected at 390px width.
- Authenticated production trading, deployed database state, and a complete production/mobile accessibility audit remain unverified. No production deployment was performed.

## Educational references

- [Investor.gov: types of orders](https://www.investor.gov/introduction-investing/investing-basics/how-stock-markets-work/types-orders)
- [Ontario Securities Commission: getting started](https://www.getsmarteraboutmoney.ca/learning-path/getting-started/getting-started-with-investing/)
- [Canadian Securities Administrators: registration](https://www.securities-administrators.ca/registration/)
- [Canada Revenue Agency: registered savings plans](https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/registered-savings-plans.html)
