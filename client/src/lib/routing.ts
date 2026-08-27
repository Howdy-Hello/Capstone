export type AuthMode = "login" | "signup" | "reset";

export function resolveAuthMode(requestedMode: string | null): AuthMode {
  return requestedMode === "signup" || requestedMode === "reset" ? requestedMode : "login";
}

type SymbolRecord = { symbol: string };

export function resolveComparisonSymbols(
  stocks: SymbolRecord[],
  watchlist: SymbolRecord[],
  requestedLeft: string | null,
  requestedRight: string | null,
) {
  const symbols = new Set(stocks.map((stock) => stock.symbol));
  const left = requestedLeft && symbols.has(requestedLeft)
    ? requestedLeft
    : watchlist.find((stock) => symbols.has(stock.symbol))?.symbol ?? stocks[0]?.symbol ?? "";
  const right = requestedRight && symbols.has(requestedRight) && requestedRight !== left
    ? requestedRight
    : watchlist.find((stock) => symbols.has(stock.symbol) && stock.symbol !== left)?.symbol
      ?? stocks.find((stock) => stock.symbol !== left)?.symbol
      ?? stocks[0]?.symbol
      ?? "";
  return { left, right };
}
