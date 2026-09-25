import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useGame, WEEKLY_BILL_TOTAL } from "../context/GameContext";
import { readOwnedAdvisorIds } from "../hooks/useAdvisor";
import { addInboxMessage } from "../lib/inbox";
import { pushNotification } from "../lib/notifications";
import { money } from "../theme/design";

export default function AdvisorEffects() {
  const { user } = useAuth();
  const { account, gameDay, sessionId, stocks } = useGame();

  useEffect(() => {
    if (!user || !sessionId || gameDay < 2) return;
    if (!readOwnedAdvisorIds(sessionId, gameDay).includes("riley")) return;

    const mover = [...stocks].sort((a, b) => Math.abs(b.dayChangePercent) - Math.abs(a.dayChangePercent))[0];
    const highRiskOwned = account.holdings.filter((holding) => stocks.find((stock) => stock.symbol === holding.symbol)?.riskLevel === "High");
    const nextBillDay = (Math.floor(gameDay / 7) + 1) * 7;
    const cashNote = account.cash < WEEKLY_BILL_TOTAL
      ? `Your ${money(account.cash)} cash balance is below the next ${money(WEEKLY_BILL_TOTAL)} living-cost bill. Consider keeping more cash available before Day ${nextBillDay}.`
      : `Your cash currently covers the next ${money(WEEKLY_BILL_TOTAL)} living-cost bill due on Day ${nextBillDay}.`;
    const riskNote = highRiskOwned.length
      ? `You own high-risk ${highRiskOwned.map((holding) => holding.symbol).join(", ")}. Larger price swings are normal for these positions.`
      : "You currently hold no stocks classified as High risk.";

    addInboxMessage(user.id, {
      id: `advisor-riley-briefing-${sessionId}-day-${gameDay}`,
      from: "Riley · Rookie Advisor",
      subject: `Day ${gameDay} beginner briefing`,
      body: `Here is your quick check-in.\n\n${mover ? `${mover.symbol} is today's biggest mover at ${mover.dayChangePercent >= 0 ? "+" : ""}${mover.dayChangePercent.toFixed(1)}%. A large move is a reason to research—not a reason to trade by itself.\n\n` : ""}${cashNote}\n\n${riskNote}\n\nTip: review a company's growth, debt, and recent news together before making a decision.`,
      category: "advisor",
    });

    if (account.cash < WEEKLY_BILL_TOTAL) {
      const alertKey = `stockpilot-advisor-riley-cash-alert-${sessionId}-${gameDay}`;
      if (!localStorage.getItem(alertKey)) {
        localStorage.setItem(alertKey, "1");
        pushNotification({ id: `advisor-riley-cash-${sessionId}-day-${gameDay}`, kind: "advisor", title: "Riley: protect your cash reserve", description: `You have ${money(account.cash)} cash and a ${money(WEEKLY_BILL_TOTAL)} bill coming on Day ${nextBillDay}.` });
      }
    }
  }, [account.cash, account.holdings, gameDay, sessionId, stocks, user]);

  return null;
}
