import { useEffect, useMemo, useRef } from "react";

import { useAuth } from "../context/AuthContext";
import { useGame } from "../context/GameContext";
import { getPortfolioValue } from "../data/tradingState";
import { mockStockCompanies, StockCompany } from "../data/mockStocks";
import { pushNotification } from "../lib/notifications";
import { addInboxMessage } from "../lib/inbox";
import { money } from "../theme/design";

// A fictional AI rival: a deterministic buy-and-hold basket seeded off the
// same marketSeed as the rest of the market engine, so every player with the
// same seed faces the same rival. No real trading logic is simulated
// day-by-day — the rival's net worth is derived straight from the seeded
// price data, matching how the rest of mockStocks.ts is purely computed
// rather than stateful.
const RIVAL_BASKET_SIZE = 5;
export const RIVAL_STARTING_CASH = 2000;

export type RivalPosition = {
  company: StockCompany;
  /** Price the rival is treated as having bought at. */
  basis: number;
  price: number;
  shares: number;
  value: number;
  returnPct: number;
  /** Share of the rival's current net worth this position accounts for. */
  weightPct: number;
};

/**
 * Value the rival's equal-weight basket against a price lookup.
 *
 * Pure so the page and the hook agree, and so the maths can be tested without
 * standing up a provider. `priceOf` returning undefined means the stock has no
 * quote for the day being valued, in which case that slice is held as cash --
 * the same fallback the net-worth figure has always used.
 */
export function valueRivalBasket(
  basket: StockCompany[],
  basisOf: (company: StockCompany) => number,
  priceOf: (company: StockCompany) => number | undefined,
  startingCash = RIVAL_STARTING_CASH
): { total: number; positions: RivalPosition[] } {
  if (basket.length === 0) return { total: startingCash, positions: [] };
  const perStock = startingCash / basket.length;

  const raw = basket.map((company) => {
    const basis = basisOf(company);
    if (!(basis > 0)) {
      return { company, basis: 0, price: 0, shares: 0, value: perStock, returnPct: 0 };
    }
    const price = priceOf(company) ?? basis;
    const shares = perStock / basis;
    return { company, basis, price, shares, value: shares * price, returnPct: (price / basis - 1) * 100 };
  });

  const total = raw.reduce((sum, p) => sum + p.value, 0);
  return {
    total,
    positions: raw.map((p) => ({ ...p, weightPct: total > 0 ? (p.value / total) * 100 : 0 })),
  };
}

const RIVAL_NAMES = [
  "Vexa Quant", "Byte Capital", "Nomo Trading", "Ada Systematic",
  "Kessler Fund", "Delta Rival", "Onyx Algo", "Fenwick & Co",
];

const TAUNTS_AHEAD = [
  "just pulled ahead of you. Time to make a move.",
  "is outperforming your portfolio right now.",
  "took the lead — care to respond?",
];
const TAUNTS_BEHIND = [
  "just fell behind you. Nice trading.",
  "is now trailing your portfolio.",
  "lost the lead — you're back on top.",
];

function hash(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickBasket(marketSeed: string, size: number): StockCompany[] {
  return mockStockCompanies
    .filter((company) => company.isActive)
    .map((company) => ({ company, key: hash(`${marketSeed}:rival:${company.symbol}`) }))
    .sort((a, b) => a.key - b.key)
    .slice(0, size)
    .map((entry) => entry.company);
}

function pickName(marketSeed: string) {
  return RIVAL_NAMES[hash(`${marketSeed}:rival-name`) % RIVAL_NAMES.length];
}

export function useRivalTrader() {
  const { user } = useAuth();
  const { account, stocks, gameDay, marketSeed, loading, sessionId, getHistory } = useGame();

  const basket = useMemo(() => pickBasket(marketSeed, RIVAL_BASKET_SIZE), [marketSeed]);
  const rivalName = useMemo(() => pickName(marketSeed), [marketSeed]);

  // Priced from the same market the player trades, not mockStocks' generator.
  // In limited_30 `stocks` IS getStocksForGameDay, so this is the identical
  // series; in infinite mode the player's prices come from the database plus
  // GameContext's continuation generator, which mockStocks does not reproduce.
  // The cost basis has to come from that same engine or the rival's return is
  // measured against a baseline from the other market.
  const { total: rivalNetWorth, positions } = useMemo(() => valueRivalBasket(
    basket,
    (company) => stocks.find((item) => item.symbol === company.symbol)?.startingPrice ?? company.startingPrice,
    (company) => stocks.find((item) => item.symbol === company.symbol)?.currentPrice
  ), [basket, stocks]);

  // The rival is a buy-and-hold basket, so its value on any past day is fully
  // determined by that day's closes -- no stored history needed.
  const equityCurve = useMemo(() => {
    if (basket.length === 0 || gameDay < 1) return [];
    const closesBySymbol = new Map(
      basket.map((company) => [
        company.symbol,
        new Map(getHistory(company.symbol).map((point) => [point.gameDay, point.closePrice])),
      ])
    );
    const basisOf = (company: StockCompany) =>
      stocks.find((item) => item.symbol === company.symbol)?.startingPrice ?? company.startingPrice;

    const days: { day: number; rival: number }[] = [];
    for (let day = 1; day <= gameDay; day += 1) {
      const { total } = valueRivalBasket(
        basket,
        basisOf,
        (company) => closesBySymbol.get(company.symbol)?.get(day)
      );
      days.push({ day, rival: Number(total.toFixed(2)) });
    }
    return days;
  }, [basket, stocks, getHistory, gameDay]);

  const playerNetWorth = account.cash + getPortfolioValue(account, stocks);
  const playerAhead = playerNetWorth >= rivalNetWorth;
  const gapPct = rivalNetWorth > 0 ? ((playerNetWorth - rivalNetWorth) / rivalNetWorth) * 100 : 0;

  const prevAheadRef = useRef<boolean | null>(null);
  const lastTauntDayRef = useRef<number | null>(null);

  useEffect(() => {
    // Do not baseline against a half-loaded game. Before loadOrCreateSession
    // resolves, `account` is still the $2,000 default and `stocks` is empty, so
    // the first comparison is meaningless; when the real cash and holdings
    // land, playerAhead flips and the effect reports it as a genuine crossover,
    // firing a toast and a permanent inbox email on every single mount.
    // `loading` alone is not enough -- the provider briefly reports false while
    // `user` is still null, and a child effect runs before the parent's -- so
    // wait for a real session and a populated market too.
    if (loading || !sessionId || stocks.length === 0) return;
    if (prevAheadRef.current === null) {
      prevAheadRef.current = playerAhead;
      return;
    }
    if (prevAheadRef.current !== playerAhead) {
      // Already taunted today: leave prevAheadRef untouched so the crossover is
      // reported on the next day advance. Updating it here would mark the change
      // as handled and drop the taunt entirely.
      if (lastTauntDayRef.current === gameDay) return;
      lastTauntDayRef.current = gameDay;
      const pool = playerAhead ? TAUNTS_BEHIND : TAUNTS_AHEAD;
      // Seeded, not Math.random: every player on this seed faces the same rival
      // saying the same thing, which is the premise documented at the top.
      const line = pool[hash(`${marketSeed}:taunt:${gameDay}`) % pool.length];
      pushNotification({
        id: `rival-${sessionId}-${gameDay}`,
        kind: "rival",
        title: rivalName,
        description: `${rivalName} ${line} (${money(rivalNetWorth)} vs your ${money(playerNetWorth)})`,
      });
      if (user) {
        addInboxMessage(user.id, {
          id: `rival-${sessionId}-${gameDay}`,
          from: rivalName,
          // The sender is the rival, so the subject is written from their side:
          // playerAhead means the rival lost the lead.
          subject: playerAhead ? "I just fell behind you" : "I just took the lead",
          body: `${rivalName} ${line} (${money(rivalNetWorth)} vs your ${money(playerNetWorth)})`,
          category: "rival",
        });
      }
    }
    prevAheadRef.current = playerAhead;
  }, [playerAhead, gameDay, rivalName, rivalNetWorth, playerNetWorth, marketSeed, loading, sessionId, stocks.length, user]);

  return { rivalName, rivalNetWorth, playerNetWorth, playerAhead, gapPct, basket, positions, equityCurve };
}
