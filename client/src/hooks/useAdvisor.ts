import { useCallback, useState } from "react";

import { useAuth } from "../context/AuthContext";
import { useGame } from "../context/GameContext";
import { getNewsCredibility, MarketNews, Stock, StockPriceHistory } from "../data/mockStocks";
import { pushNotification } from "../lib/notifications";

// No LLM is wired into this project — the "advisor" is a rule-based read of
// data already in the game state (momentum, fundamentals, risk, recent
// credible news), purchasable with in-game cash since that's the only
// currency the game has. One consult per stock per game day, to keep it a
// deliberate purchase rather than something to spam.
export const ADVISOR_COST = 25;

export type AdvisorReport = {
  symbol: string;
  gameDay: number;
  verdict: "Bullish" | "Neutral" | "Cautious";
  summary: string;
  points: string[];
};

function cooldownKey(userId: string, symbol: string) {
  return `stockpilot-advisor-lastday-${userId}-${symbol}`;
}

function buildReport(
  stock: Stock,
  history: StockPriceHistory[],
  relatedNews: MarketNews[],
  gameDay: number
): AdvisorReport {
  const points: string[] = [];
  let score = 0;

  const recent = history.slice(-5);
  if (recent.length >= 2) {
    const trendPct = ((recent[recent.length - 1].closePrice - recent[0].closePrice) / recent[0].closePrice) * 100;
    if (trendPct > 3) {
      score += 1;
      points.push(`Up ${trendPct.toFixed(1)}% over the last ${recent.length} days — short-term momentum is positive.`);
    } else if (trendPct < -3) {
      score -= 1;
      points.push(`Down ${Math.abs(trendPct).toFixed(1)}% over the last ${recent.length} days — short-term momentum is negative.`);
    } else {
      points.push(`Roughly flat over the last ${recent.length} days (${trendPct >= 0 ? "+" : ""}${trendPct.toFixed(1)}%).`);
    }
  }

  const { peRatio, revenueGrowth, profitMargin, debtToEquity, analystRating } = stock.fundamentals;
  if (revenueGrowth > 15) {
    score += 1;
    points.push(`Revenue growth of ${revenueGrowth.toFixed(1)}% is strong for the sector.`);
  } else if (revenueGrowth < 3) {
    score -= 1;
    points.push(`Revenue growth is sluggish at ${revenueGrowth.toFixed(1)}%.`);
  }

  if (debtToEquity > 1.5) {
    score -= 1;
    points.push(`Debt/Equity of ${debtToEquity.toFixed(2)} is on the high side — more balance-sheet risk.`);
  }

  if (analystRating === "Strong Buy" || analystRating === "Buy") score += 1;
  else if (analystRating === "Sell") score -= 1;
  points.push(`Analyst consensus: ${analystRating}, P/E ${peRatio.toFixed(1)}, margin ${profitMargin.toFixed(1)}%.`);

  if (stock.riskLevel === "High") {
    points.push(`Classified High risk (volatility ${(stock.volatility * 100).toFixed(1)}%) — expect bigger daily swings.`);
  }

  const recentCredible = relatedNews
    .filter((n) => n.gameDay >= gameDay - 3)
    .map((n) => ({ n, credibility: getNewsCredibility(n) }))
    .filter((x) => x.credibility.rating !== "low")
    .sort((a, b) => b.n.gameDay - a.n.gameDay)[0];

  if (recentCredible) {
    points.push(`Recent ${recentCredible.credibility.label.toLowerCase()} report (Day ${recentCredible.n.gameDay}): "${recentCredible.n.headline}"`);
    score += recentCredible.n.marketTone === "Bullish" ? 1 : recentCredible.n.marketTone === "Bearish" ? -1 : 0;
  }

  const verdict: AdvisorReport["verdict"] = score >= 2 ? "Bullish" : score <= -2 ? "Cautious" : "Neutral";
  const summary = verdict === "Bullish"
    ? `${stock.symbol} is showing more positive signals than negative right now.`
    : verdict === "Cautious"
    ? `${stock.symbol} is showing more warning signs than positive signals right now.`
    : `${stock.symbol}'s signals are mixed — no strong lean either way.`;

  return { symbol: stock.symbol, gameDay, verdict, summary, points: points.slice(0, 4) };
}

export function useAdvisor() {
  const { user } = useAuth();
  const { account, gameDay, addCash, getHistory, getRelatedNews } = useGame();
  const [report, setReport] = useState<AdvisorReport | null>(null);
  const [loading, setLoading] = useState(false);

  const canAfford = account.cash >= ADVISOR_COST;

  const isOnCooldown = useCallback((symbol: string) => {
    if (!user) return true;
    const raw = localStorage.getItem(cooldownKey(user.id, symbol));
    return raw !== null && Number(raw) === gameDay;
  }, [user, gameDay]);

  const consult = useCallback(async (stock: Stock) => {
    if (!user || !canAfford || isOnCooldown(stock.symbol)) return null;
    setLoading(true);
    const history = getHistory(stock.symbol);
    const relatedNews = getRelatedNews(stock.symbol);
    const built = buildReport(stock, history, relatedNews, gameDay);
    await addCash(-ADVISOR_COST);
    localStorage.setItem(cooldownKey(user.id, stock.symbol), String(gameDay));
    setReport(built);
    setLoading(false);
    pushNotification({
      kind: "advisor",
      title: `Advisor report: ${stock.symbol}`,
      description: built.summary,
    });
    return built;
  }, [user, canAfford, isOnCooldown, getHistory, getRelatedNews, gameDay, addCash]);

  return { report, loading, canAfford, isOnCooldown, consult, cost: ADVISOR_COST };
}
