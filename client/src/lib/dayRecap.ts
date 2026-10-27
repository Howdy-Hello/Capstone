import type { MarketNews, Stock } from "../data/mockStocks";
import type { PortfolioHolding } from "../data/tradingState";

/** Shares traded today, keyed "buy:SYMBOL" / "sell:SYMBOL" as GameContext tracks them. */
export type TradedToday = Record<string, number>;

/**
 * Shares of `symbol` held at yesterday's close. Prices only move between days,
 * so these are the shares that saw today's move; shares bought today were
 * bought at today's price and have not moved yet.
 */
export function overnightShares(symbol: string, sharesNow: number, traded: TradedToday) {
  return Math.max(0, sharesNow - (traded[`buy:${symbol}`] ?? 0) + (traded[`sell:${symbol}`] ?? 0));
}

/** Today's move on the part of a current position that was held overnight. */
export function positionChangeToday(
  holding: Pick<PortfolioHolding, "symbol" | "shares">,
  stock: Pick<Stock, "dayChange"> | undefined,
  traded: TradedToday
) {
  if (!stock) return 0;
  return stock.dayChange * Math.min(holding.shares, overnightShares(holding.symbol, holding.shares, traded));
}

export type RecapMover = { symbol: string; name: string; changePct: number; change: number };

export type DayRecap = {
  day: number;
  /** Overnight move of every share held at yesterday's close, shares sold since included. */
  stocksChange: number;
  /** stocksChange against those shares' value at yesterday's close; null with no shares held. */
  stocksChangePct: number | null;
  /** Living costs charged on arrival at this day. */
  bill: number;
  netWorthChange: number;
  /** Positions held overnight, best % move first. */
  movers: RecapMover[];
  /** With no shares held overnight: the market's biggest move, so the recap still says what happened. */
  marketTopMover: RecapMover | null;
  marketAverageMovePct: number;
  /** A story from yesterday's brief about the move that concerned the player most. */
  story: MarketNews | null;
  /** The rival's change since yesterday's close; null when its curve lacks either day. */
  rivalChange: number | null;
};

const cents = (n: number) => Math.round(n * 100) / 100;

function toMover(stock: Stock, change = stock.dayChange): RecapMover {
  return { symbol: stock.symbol, name: stock.name, changePct: stock.dayChangePercent, change };
}

/** What happened between yesterday's close and today's, for the player's run. */
export function buildDayRecap(input: {
  day: number;
  holdings: Array<Pick<PortfolioHolding, "symbol" | "shares">>;
  stocks: Stock[];
  tradedToday: TradedToday;
  /** The brief published after yesterday's close: the news behind today's prices. */
  news: MarketNews[];
  bill: number;
  rivalCurve: Array<{ day: number; rival: number }>;
}): DayRecap | null {
  const { day, holdings, stocks, tradedToday, news, bill, rivalCurve } = input;
  if (day <= 1 || stocks.length === 0) return null;

  // Shares sold today were held overnight too, so a position closed today still counts.
  const symbols = new Set(holdings.map((holding) => holding.symbol));
  Object.keys(tradedToday).forEach((key) => {
    if (key.startsWith("sell:")) symbols.add(key.slice("sell:".length));
  });

  const movers: RecapMover[] = [];
  let stocksChange = 0;
  let valueAtClose = 0;
  symbols.forEach((symbol) => {
    const stock = stocks.find((item) => item.symbol === symbol);
    const sharesNow = holdings.find((holding) => holding.symbol === symbol)?.shares ?? 0;
    const shares = overnightShares(symbol, sharesNow, tradedToday);
    if (!stock || shares <= 0) return;
    const change = stock.dayChange * shares;
    stocksChange += change;
    valueAtClose += (stock.currentPrice - stock.dayChange) * shares;
    movers.push(toMover(stock, cents(change)));
  });
  movers.sort((a, b) => b.changePct - a.changePct);

  const topMarketStock = stocks.reduce<Stock | null>(
    (top, stock) => (!top || Math.abs(stock.dayChangePercent) > Math.abs(top.dayChangePercent) ? stock : top),
    null
  );
  const marketTopMover = movers.length === 0 && topMarketStock ? toMover(topMarketStock) : null;

  // Explain the move that mattered most to the player: their biggest in
  // dollars, else the market's biggest. Big news first when several match.
  const focus = movers.length
    ? movers.reduce((top, mover) => (Math.abs(mover.change) > Math.abs(top.change) ? mover : top))
    : marketTopMover;
  const related = focus ? news.filter((item) => item.relatedTickers.includes(focus.symbol)) : [];
  const story = related.find((item) => item.importance === "High") ?? related[0] ?? null;

  const rivalToday = rivalCurve.find((point) => point.day === day);
  const rivalYesterday = rivalCurve.find((point) => point.day === day - 1);

  return {
    day,
    stocksChange: cents(stocksChange),
    stocksChangePct: valueAtClose > 0 ? (stocksChange / valueAtClose) * 100 : null,
    bill,
    netWorthChange: cents(stocksChange - bill),
    movers,
    marketTopMover,
    marketAverageMovePct: stocks.reduce((sum, stock) => sum + stock.dayChangePercent, 0) / stocks.length,
    story,
    rivalChange: rivalToday && rivalYesterday ? cents(rivalToday.rival - rivalYesterday.rival) : null,
  };
}
