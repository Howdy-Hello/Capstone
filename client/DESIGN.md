# StockPilot design

## Direction
- Direction: the student's own system, "APEX TERMINAL": a calm trading desk for people learning to invest with virtual money.
- Idea: on this site, **one trading day** becomes **the layout**. The day bar says where the run stands and offers the one action that moves it on.
- The live thing: a turn-based market with fictional companies. Read the news, decide, close the market, read the recap.

## Colour palette and roles
Light theme shown. Dark and the other presets live in `src/context/ThemeContext.tsx`, and `src/theme/contrast.test.ts` measures every preset.

| Token | Hex | Role |
|---|---|---|
| bg / surface | #FFFFFF | page and card ground |
| elevated / overlay | #F7F7F7 / #EFEFEF | rows and quiet controls |
| t1 / t2 / t3 | #111111 / #333333 / #555555 | text, in order of weight |
| brand | #7C3AED | the student's violet: logo, current state, the one filled action |
| green | #047857 | gains and buying |
| red | #D92D3A | losses and selling |
| amber | #8A5A00 | risk and breaking news |

Violet comes from the student's existing brand, so it's a deliberate choice rather than a default. Green and red mean money only. Risk is one amber scale: Low is quiet, Medium is amber text, High has an amber tint. Count badges are ink rather than red. Button text on a solid fill comes from `readableOn()`.

## Typography
- Roboto carries headings and text. Herdy chose it on 6 Nov 2026 because the app already asked for it and it's what the code had declared from the start.
- Roboto Mono is for prices, tickers and short data labels only.
- Both are self-hosted through `@fontsource` (`src/index.tsx`).
- Scale: 12 (labels), 14 (body), 16 (section titles), 18, 20, 32 (page titles), 44 (net worth). Home's headline runs 40 to 60.
- Tracking: -0.02em on headings of 26px and up, and on Home's headline. Text under 12px isn't allowed, and inputs are 16px on phones.

## Layout
- `DayBar` opens Game, Dashboard, Stock, News, the Watchlist and the signed-in 404, with net worth as the largest figure on the page. On Game it sticks under the header on desktop, and Close Market is a bottom bar on phones.
- Market rows are plain list rows on the title's edge. Buy and Sell stay neutral until hovered, so a list of 21 stocks doesn't read as 21 instructions.
- On a stock page the trade ticket comes straight after the price, and on phones Buy and Sell are a bottom bar.
- Home shows one illustrative turn, then Learn's own "How a Turn Works" steps.
- Phone stat cards sit two across.

## Motion
One job: a figure settles when it changes. Pages don't fade in, cards don't lift on hover and charts don't draw in. Lists on Dashboard and Leaderboard animate a new row in. Everything respects reduced motion through `MotionConfig` in `src/App.tsx`.
