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
const RIVAL_STARTING_CASH = 2000;

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
  const { account, stocks, gameDay, marketSeed, loading, sessionId } = useGame();

  const basket = useMemo(() => pickBasket(marketSeed, RIVAL_BASKET_SIZE), [marketSeed]);
  const rivalName = useMemo(() => pickName(marketSeed), [marketSeed]);

  const rivalNetWorth = useMemo(() => {
    // An empty basket or a zero-priced company would divide to Infinity and
    // render the rival's net worth as NaN. Hold the cash instead.
    if (basket.length === 0) return RIVAL_STARTING_CASH;
    const perStock = RIVAL_STARTING_CASH / basket.length;
    return basket.reduce((sum, company) => {
      // Price the rival from the same market the player trades, not from
      // mockStocks' generator. In limited_30 `stocks` IS getStocksForGameDay,
      // so this is the identical series and nothing changes; in infinite mode
      // the player's prices come from the database plus GameContext's
      // continuation generator, which mockStocks does not reproduce -- the two
      // series drifted far enough apart that the head-to-head number, the gap
      // percentage and the taunts all described a market nobody was playing.
      const live = stocks.find((item) => item.symbol === company.symbol);
      // Cost basis has to come from the same engine as the price, or the
      // rival's return is measured against a baseline from the other market.
      const basis = live?.startingPrice ?? company.startingPrice;
      if (basis <= 0) return sum + perStock;
      const currentPrice = live?.currentPrice ?? basis;
      return sum + (perStock / basis) * currentPrice;
    }, 0);
  }, [basket, stocks]);

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
        id: `rival-${gameDay}`,
        kind: "rival",
        title: rivalName,
        description: `${rivalName} ${line} (${money(rivalNetWorth)} vs your ${money(playerNetWorth)})`,
      });
      if (user) {
        addInboxMessage(user.id, {
          id: `rival-${gameDay}`,
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

  return { rivalName, rivalNetWorth, playerNetWorth, playerAhead, gapPct, basket };
}
