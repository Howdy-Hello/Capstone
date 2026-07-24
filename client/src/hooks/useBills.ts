import { useEffect } from "react";

import { useAuth } from "../context/AuthContext";
import { useGame } from "../context/GameContext";
import { getPortfolioValue } from "../data/tradingState";
import { STORY_DAYS } from "../data/mockStocks";
import { pushNotification } from "../lib/notifications";
import { money } from "../theme/design";

// Every 7 days, rent/living costs come due — light pressure against just
// stockpiling cash and never trading. Scales gently with net worth so it
// stays a real cost without being punishing early on. Derived purely from
// gameDay (deterministic), so no Supabase table is needed — only a
// per-session "already charged this day" guard in localStorage.
const BILL_INTERVAL_DAYS = 7;
const BASE_BILL = 75;
const NET_WORTH_RATE = 0.01;
const MAX_BILL = 350;

function billsStorageKey(userId: string, sessionId: string) {
  return `stockpilot-bills-last-charged-${userId}-${sessionId}`;
}

function calcBillAmount(netWorth: number) {
  const amount = BASE_BILL + Math.max(0, netWorth) * NET_WORTH_RATE;
  return Math.round(Math.min(MAX_BILL, Math.max(BASE_BILL, amount)));
}

export function useBills() {
  const { user } = useAuth();
  const { account, stocks, gameDay, sessionId, addCash } = useGame();

  const netWorthNow = account.cash + getPortfolioValue(account, stocks);
  const remainder = gameDay % BILL_INTERVAL_DAYS;
  const nextBillDay = remainder === 0 ? gameDay + BILL_INTERVAL_DAYS : gameDay + (BILL_INTERVAL_DAYS - remainder);
  const nextBillAmount = calcBillAmount(netWorthNow);

  useEffect(() => {
    if (!user || !sessionId) return;
    if (gameDay <= STORY_DAYS) return;
    if (gameDay % BILL_INTERVAL_DAYS !== 0) return;

    const key = billsStorageKey(user.id, sessionId);
    const lastCharged = Number(localStorage.getItem(key) ?? "0");
    if (lastCharged >= gameDay) return;

    // Set the guard synchronously before the async debit so a re-render
    // (e.g. React StrictMode's double-invoke) can't charge twice.
    localStorage.setItem(key, String(gameDay));

    const netWorth = account.cash + getPortfolioValue(account, stocks);
    const bill = calcBillAmount(netWorth);
    const shortfall = bill > account.cash;

    void addCash(-bill).then(() => {
      pushNotification({
        kind: "bill",
        title: `Day ${gameDay}: Living costs due`,
        description: shortfall
          ? `${money(bill)} in rent & expenses billed — your cash couldn't fully cover it.`
          : `${money(bill)} in rent & expenses billed from your account.`,
      });
    });
  }, [user, sessionId, gameDay, account, stocks, addCash]);

  return { nextBillDay, nextBillAmount, billIntervalDays: BILL_INTERVAL_DAYS };
}
