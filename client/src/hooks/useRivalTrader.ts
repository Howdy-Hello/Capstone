import { useEffect, useMemo, useRef } from "react";

import { useAuth } from "../context/AuthContext";
import { useGame } from "../context/GameContext";
import { getPortfolioValue } from "../data/tradingState";
import { getStockBySymbolForGameDay, mockStockCompanies, StockCompany } from "../data/mockStocks";
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
  const { account, stocks, gameDay, marketSeed } = useGame();

  const basket = useMemo(() => pickBasket(marketSeed, RIVAL_BASKET_SIZE), [marketSeed]);
  const rivalName = useMemo(() => pickName(marketSeed), [marketSeed]);

  const rivalNetWorth = useMemo(() => {
    const perStock = RIVAL_STARTING_CASH / basket.length;
    return basket.reduce((sum, company) => {
      const stock = getStockBySymbolForGameDay(company.symbol, gameDay, marketSeed);
      const currentPrice = stock?.currentPrice ?? company.startingPrice;
      const shares = perStock / company.startingPrice;
      return sum + shares * currentPrice;
    }, 0);
  }, [basket, gameDay, marketSeed]);

  const playerNetWorth = account.cash + getPortfolioValue(account, stocks);
  const playerAhead = playerNetWorth >= rivalNetWorth;
  const gapPct = rivalNetWorth > 0 ? ((playerNetWorth - rivalNetWorth) / rivalNetWorth) * 100 : 0;

  const prevAheadRef = useRef<boolean | null>(null);
  const lastTauntDayRef = useRef<number | null>(null);

  useEffect(() => {
    if (prevAheadRef.current === null) {
      prevAheadRef.current = playerAhead;
      return;
    }
    if (prevAheadRef.current !== playerAhead && lastTauntDayRef.current !== gameDay) {
      lastTauntDayRef.current = gameDay;
      const pool = playerAhead ? TAUNTS_BEHIND : TAUNTS_AHEAD;
      const line = pool[Math.floor(Math.random() * pool.length)];
      pushNotification({
        kind: "rival",
        title: rivalName,
        description: `${rivalName} ${line} (${money(rivalNetWorth)} vs your ${money(playerNetWorth)})`,
      });
      if (user) {
        addInboxMessage(user.id, {
          from: rivalName,
          subject: playerAhead ? "You just fell behind me" : "I just took the lead",
          body: `${rivalName} ${line} (${money(rivalNetWorth)} vs your ${money(playerNetWorth)})`,
          category: "rival",
        });
      }
    }
    prevAheadRef.current = playerAhead;
  }, [playerAhead, gameDay, rivalName, rivalNetWorth, playerNetWorth, user]);

  return { rivalName, rivalNetWorth, playerNetWorth, playerAhead, gapPct, basket };
}
