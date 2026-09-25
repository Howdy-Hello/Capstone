import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../context/AuthContext";
import { useGame } from "../context/GameContext";
import { getNewsCredibility, MarketNews, Stock, StockPriceHistory } from "../data/mockStocks";
import { pushNotification } from "../lib/notifications";
import { addInboxMessage } from "../lib/inbox";

// No LLM is wired into this project — the "advisor" is a rule-based read of
// data already in the game state (momentum, fundamentals, risk, recent
// credible news), purchasable with in-game cash since that's the only
// currency the game has. One consult per stock per game day, to keep it a
// deliberate purchase rather than something to spam.
export type AdvisorDefinition = {
  id: string;
  name: string;
  role: string;
  cost: number;
  description: string;
  features: string[];
};

export const ADVISORS: AdvisorDefinition[] = [
  { id: "riley", name: "Riley", role: "Trading Intern", cost: 100, description: "A friendly guide for learning market fundamentals.", features: ["Basic metric explanations", "Risk-level warnings", "2-point stock reports"] },
  { id: "morgan", name: "Morgan", role: "Market Analyst", cost: 350, description: "Researches momentum, fundamentals, and credible news.", features: ["Full stock reports", "Momentum analysis", "News credibility checks"] },
  { id: "avery", name: "Avery", role: "Portfolio Manager", cost: 750, description: "Focuses on allocation, cash reserves, and concentration risk.", features: ["Full stock reports", "Portfolio perspective", "Living-cost awareness"] },
  { id: "jordan", name: "Jordan", role: "Senior Strategist", cost: 1500, description: "The most complete assistant for experienced players.", features: ["Full stock reports", "Advanced risk context", "Decision-focused guidance"] },
];

export type AdvisorReport = {
  symbol: string;
  gameDay: number;
  verdict: "Bullish" | "Neutral" | "Cautious";
  summary: string;
  points: string[];
  advisorName: string;
};

// Scoped to the run: keyed by user alone, a report taken on day 4 of one run
// put the same stock on cooldown on day 4 of the next.
function cooldownKey(userId: string, sessionId: string | null, symbol: string) {
  return `stockpilot-advisor-lastday-${userId}-${sessionId ?? "none"}-${symbol}`;
}

function buildReport(
  stock: Stock,
  history: StockPriceHistory[],
  relatedNews: MarketNews[],
  gameDay: number,
  advisor: AdvisorDefinition,
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
    points.unshift(`Classified High risk (volatility ${(stock.volatility * 100).toFixed(1)}%) — expect bigger daily swings.`);
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

  return { symbol: stock.symbol, gameDay, verdict, summary, points: points.slice(0, advisor.id === "riley" ? 2 : 4), advisorName: advisor.name };
}

export function ownershipKey(sessionId: string) {
  return `stockpilot-advisors-${sessionId}`;
}

type OwnedAdvisor = { id: string; hiredDay: number };

function readOwnership(sessionId: string): OwnedAdvisor[] {
  try {
    const raw = JSON.parse(localStorage.getItem(ownershipKey(sessionId)) ?? "[]") as Array<string | OwnedAdvisor>;
    // Entries written before hiredDay existed count as hired on day 1.
    return raw.map((entry) => typeof entry === "string" ? { id: entry, hiredDay: 1 } : entry);
  } catch {
    return [];
  }
}

/**
 * Advisors hired in this run as of `gameDay`. Restoring a save rewinds the day
 * (and refunds the hiring cost) in the same session, so hires from after the
 * restored day are dropped rather than kept for free.
 */
export function readOwnedAdvisorIds(sessionId: string, gameDay: number): string[] {
  const owned = readOwnership(sessionId);
  const kept = owned.filter((entry) => entry.hiredDay <= gameDay);
  if (kept.length !== owned.length) {
    localStorage.setItem(ownershipKey(sessionId), JSON.stringify(kept));
  }
  return kept.map((entry) => entry.id);
}

export function useAdvisor() {
  const { user } = useAuth();
  const { account, gameDay, sessionId, addCash, getHistory, getRelatedNews } = useGame();
  const [report, setReport] = useState<AdvisorReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [ownedIds, setOwnedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!sessionId) return setOwnedIds([]);
    setOwnedIds(readOwnedAdvisorIds(sessionId, gameDay));
  }, [gameDay, sessionId]);

  const ownedAdvisors = useMemo(() => ADVISORS.filter((advisor) => ownedIds.includes(advisor.id)), [ownedIds]);
  const activeAdvisor = ownedAdvisors[ownedAdvisors.length - 1] ?? null;

  const hire = useCallback(async (advisor: AdvisorDefinition) => {
    if (!user || !sessionId || advisor.id !== "riley" || ownedIds.includes(advisor.id) || account.cash < advisor.cost) return false;
    if (!(await addCash(-advisor.cost))) return false;
    const next = [...readOwnership(sessionId), { id: advisor.id, hiredDay: gameDay }];
    localStorage.setItem(ownershipKey(sessionId), JSON.stringify(next));
    setOwnedIds(next.map((entry) => entry.id));
    pushNotification({ kind: "advisor", title: `${advisor.name} joined your team`, description: `${advisor.role} hired for $${advisor.cost.toLocaleString()}.` });
    addInboxMessage(user.id, {
      id: `advisor-welcome-${sessionId}-${advisor.id}`,
      from: `${advisor.name} · ${advisor.role}`,
      subject: "Welcome — let's learn the market together",
      body: `Hi! I'm Riley, your Rookie Advisor for this run.\n\nI can explain stock fundamentals, flag high-risk situations, and prepare one beginner-friendly report per stock each game day. Open any stock and choose “Ask Riley” to get started.\n\nI provide educational guidance, not guaranteed predictions, and I will never place a trade for you.`,
      category: "advisor",
    });
    return true;
  }, [account.cash, addCash, gameDay, ownedIds, sessionId, user]);

  const isOnCooldown = useCallback((symbol: string) => {
    if (!user) return true;
    const raw = localStorage.getItem(cooldownKey(user.id, sessionId, symbol));
    return raw !== null && Number(raw) === gameDay;
  }, [user, gameDay, sessionId]);

  const consult = useCallback(async (stock: Stock) => {
    if (!user || !activeAdvisor || isOnCooldown(stock.symbol)) return null;
    setLoading(true);
    const history = getHistory(stock.symbol);
    const relatedNews = getRelatedNews(stock.symbol);
    const built = buildReport(stock, history, relatedNews, gameDay, activeAdvisor);
    localStorage.setItem(cooldownKey(user.id, sessionId, stock.symbol), String(gameDay));
    setReport(built);
    setLoading(false);
    pushNotification({
      kind: "advisor",
      title: `Advisor report: ${stock.symbol}`,
      description: built.summary,
    });
    addInboxMessage(user.id, {
      id: `advisor-report-${sessionId}-${activeAdvisor.id}-${stock.symbol}-${gameDay}`,
      from: `${activeAdvisor.name} · ${activeAdvisor.role}`,
      subject: `${stock.symbol} beginner report — Day ${gameDay}`,
      body: `${built.summary}\n\n${built.points.map((point) => `• ${point}`).join("\n")}\n\nUse this report as a research starting point, not a guaranteed buy or sell signal.`,
      category: "advisor",
    });
    return built;
  }, [user, activeAdvisor, isOnCooldown, getHistory, getRelatedNews, gameDay, sessionId]);

  return { report, loading, isOnCooldown, consult, hire, ownedIds, ownedAdvisors, activeAdvisor };
}
