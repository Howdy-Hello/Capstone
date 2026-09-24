import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Button, Chip, LinearProgress, Stack, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import { motion, useReducedMotion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useGame } from "../context/GameContext";
import { getSharesOwned } from "../data/tradingState";
import { TUTORIAL_REQUEST_KEY, TUTORIAL_START_EVENT, TutorialCourse, updateTutorialProgress } from "../lib/tutorial";
import { D, MONO } from "../theme/design";

type TourDecision = {
  options: Array<{ label: string; correct: boolean; feedback: string }>;
};

type TourStep = {
  route: (symbol: string) => string;
  selector: string;
  title: string;
  body: string;
  requireAction?: boolean;
  actionHint?: string;
  waitFor?: "holding" | "after_hours" | "day2" | "sold";
  decision?: TourDecision;
  setupRun?: boolean;
};

const game = () => "/game";
const stock = (symbol: string) => `/stocks/${symbol}`;

const uiSteps: TourStep[] = [
  { route: () => "/dashboard", selector: "[data-tour='market-movers']", title: "Start on your dashboard", body: "The dashboard summarizes your portfolio, sector exposure, market movers, and current news. Use it as your quick daily overview." },
  { route: game, selector: "[data-tour='game-menu']", title: "Explore the Game menu", body: "Game opens the Market directly. Use its arrow to reach Watchlist, Player Level, Goals & Missions, Living Costs, and Advisors." },
  { route: game, selector: "[data-tour='market-list']", title: "Browse the Market", body: "Sector filters narrow the list. Every stock row opens a detailed page, while the buttons on the right let you trade directly." },
  { route: game, selector: "[data-tour='first-stock'], [data-tour='tutorial-stock']", title: "Open Stock Details", body: "Click this stock row to see its chart, fundamentals, news, alerts, trading controls, and advisor report.", requireAction: true, actionHint: "Click the highlighted stock" },
  { route: stock, selector: "[data-tour='chart-toggle']", title: "Use view controls", body: "Controls beside section titles change how information is displayed. This one switches between area and candlestick charts.", requireAction: true, actionHint: "Switch the chart view" },
  { route: () => "/game/watchlist", selector: "[data-tour='watchlist-page']", title: "Return to saved stocks", body: "Watchlist is your research queue. Open details, compare candidates, or remove a stock without changing your holdings." },
  { route: () => "/inbox", selector: "[data-tour='inbox-page']", title: "Check your Inbox", body: "Market news, bills, missions, achievements, advisor reports, and system messages are organized into folders here." },
  { route: () => "/settings", selector: "[data-tour='tutorial-settings']", title: "Find help in Settings", body: "You can replay the Website, Gameplay, or Advanced Tools tutorial here whenever you need a refresher." },
];

const gameSteps: TourStep[] = [
  { route: game, selector: "[data-tour='net-worth']", title: "Start a two-day practice run", body: "This hands-on scenario starts a fresh 30-day run. Each market session resolves yesterday’s information; after-hours news gives you evidence for tomorrow. Your current run is replaced only when you press the button below.", setupRun: true },
  { route: game, selector: "[data-tour='next-day']", title: "Day 1 · Close the market", body: "Prices are settled for Day 1. Close the market to reveal information for the next session.", waitFor: "after_hours", actionHint: "Click Close Market & Reveal News" },
  { route: game, selector: "[data-tour='tutorial-news']", title: "Day 1 · Read tomorrow’s catalyst", body: "Closed Ai reports stronger enterprise demand after hours. It is verified, high-importance evidence for Day 2—not a guaranteed price move." },
  { route: game, selector: "[data-tour='market-list']", title: "Day 1 · Compare the market", body: "The catalyst has not been priced into tomorrow’s session yet. Compare risk, valuation, growth, and available cash before acting." },
  { route: game, selector: "[data-tour='tutorial-stock']", title: "Day 1 · Investigate Closed Ai", body: "Open CAI to verify the numbers behind the headline before you invest.", requireAction: true, actionHint: "Click the highlighted CAI row" },
  { route: stock, selector: "[data-tour='stock-price']", title: "Day 1 · Read price and risk", body: "CAI is still near $100 because the after-hours catalyst points to the next session. High Risk warns that even strong evidence can produce a sharp reversal." },
  { route: stock, selector: "[data-tour='stock-values']", title: "Day 1 · Check the supporting values", body: "Compare price, P/E, revenue growth, and volume. CAI has strong growth, but its high P/E means optimism is already priced in—so keep the first position small." },
  { route: stock, selector: "[data-tour='trade-panel']", title: "Day 1 · Make the call", body: "The news is verified and growth is strong, but the outcome is still uncertain and valuation is high. What is the best first action?", decision: { options: [
    { label: "Buy 1 share", correct: true, feedback: "Good choice: take a small position while limiting high-risk exposure." },
    { label: "Spend all available cash", correct: false, feedback: "Too risky. CAI is volatile and expensive, and you still need cash for future opportunities and living costs." },
    { label: "Ignore all verified news", correct: false, feedback: "News should not decide a trade alone, but verified company news is meaningful evidence when the values support it." },
  ] } },
  { route: stock, selector: "[data-tour='tutorial-buy']", title: "Day 1 · Buy your first share", body: "Leave the quantity at 1, review the total and remaining cash, then place the trade.", waitFor: "holding", actionHint: "Click Buy 1 share to continue" },
  { route: game, selector: "[data-tour='next-day']", title: "Open Day 2", body: "You now own CAI. Advance the day to see how the market resolves yesterday’s catalyst.", waitFor: "day2", actionHint: "Click Advance to Next Day" },
  { route: game, selector: "[data-tour='tutorial-stock']", title: "Day 2 · Check the result", body: "CAI rose to about $104.80 after yesterday’s demand report. The signal helped, but it was evidence rather than certainty.", requireAction: true, actionHint: "Click CAI to inspect the position" },
  { route: stock, selector: "[data-tour='stock-price']", title: "Day 2 · Separate outcome from process", body: "The gain resolved yesterday’s prediction. Return to the market and close today’s session before deciding what tomorrow may bring." },
  { route: game, selector: "[data-tour='next-day']", title: "Day 2 · Reveal new information", body: "Close the market to receive the next after-hours report.", waitFor: "after_hours", actionHint: "Click Close Market & Reveal News" },
  { route: game, selector: "[data-tour='tutorial-news']", title: "Day 2 · The story changes", body: "A major customer paused its rollout. This verified update weakens the original growth thesis and signals risk for Day 3." },
  { route: game, selector: "[data-tour='tutorial-stock']", title: "Day 2 · Reassess before the move", body: "CAI is still near $104.80 because the new report arrived after hours. Open it and decide whether to act before Day 3.", requireAction: true, actionHint: "Click CAI to inspect the position" },
  { route: stock, selector: "[data-tour='trade-panel']", title: "Day 2 · Choose an exit", body: "The verified report contradicts the reason you bought. What should you do before the next session?", decision: { options: [
    { label: "Sell the share", correct: true, feedback: "Correct. Exit because the thesis changed—not simply because the price is red." },
    { label: "Hold and hope", correct: false, feedback: "Hope is not a plan. The verified update directly weakens the growth thesis used for this trade." },
    { label: "Buy more because it is cheaper", correct: false, feedback: "A lower price is not automatically better when the underlying reason for buying has weakened." },
  ] } },
  { route: stock, selector: "[data-tour='tutorial-sell']", title: "Day 2 · Complete the exit", body: "Sell the one CAI share. This closes the full loop: research, buy, monitor new evidence, reassess, and act.", waitFor: "sold", actionHint: "Click Sell 1 share to finish" },
];

const advancedSteps: TourStep[] = [
  { route: () => "/dashboard", selector: "[data-tour='market-movers']", title: "Scan market movers", body: "Use this chart to find unusual activity, then investigate the company and related news instead of trading from movement alone." },
  { route: () => "/game/watchlist", selector: "[data-tour='watchlist-page']", title: "Build a research queue", body: "The watchlist lets you monitor candidates without spending cash. From here you can compare stocks or open their details." },
  { route: stock, selector: "[data-tour='chart-toggle']", title: "Read OHLC candles", body: "A green candle closes above its open; red closes below. The wick spans the full high-to-low range for that day.", requireAction: true, actionHint: "Switch to Candles to continue" },
  { route: stock, selector: "[data-tour='price-alerts']", title: "Monitor without staring", body: "Create alerts for price thresholds, percentage moves, or new highs and lows. Alerts report an event—they do not recommend a trade." },
  { route: () => "/game/advisor", selector: "[data-tour='advisor-page']", title: "Hire an advisor", body: "Riley costs game cash and adds beginner reports, risk warnings, and daily briefings for the current run." },
  { route: stock, selector: "[data-tour='trade-journal']", title: "Record your reasoning", body: "Write a thesis, time horizon, and exit rule before trading. Later debriefs compare the result with your original plan." },
];

function visibleTarget(selector: string) {
  return Array.from(document.querySelectorAll<HTMLElement>(selector)).find((element) => {
    // Reveal collapsed news when the guided lesson needs its article.
    const details = element.closest("details");
    if (details) details.open = true;
    const box = element.getBoundingClientRect();
    return box.width > 0 && box.height > 0;
  }) ?? null;
}

export default function GuidedTutorial() {
  const { user } = useAuth();
  const { stocks, account, gameDay, marketPhase, resetAccount } = useGame();
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const [course, setCourse] = useState<TutorialCourse | null>(null);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [complete, setComplete] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [decisionFeedback, setDecisionFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [burst, setBurst] = useState<{ id: number; x: number; y: number } | null>(null);
  const symbol = stocks.find((item) => item.symbol === "CAI")?.symbol ?? "CAI";
  const tutorialShares = getSharesOwned(account, symbol);
  const steps = course === "advanced" ? advancedSteps : course === "game" ? gameSteps : uiSteps;
  const step = course ? steps[index] : null;

  const start = useCallback((nextCourse: TutorialCourse) => {
    setCourse(nextCourse);
    setIndex(0);
    setComplete(false);
    setAdvancing(false);
    setPreparing(false);
    setDecisionFeedback(null);
    setBurst(null);
  }, []);

  useEffect(() => {
    const onStart = (event: Event) => start((event as CustomEvent<TutorialCourse>).detail);
    window.addEventListener(TUTORIAL_START_EVENT, onStart);
    return () => window.removeEventListener(TUTORIAL_START_EVENT, onStart);
  }, [start]);

  useEffect(() => {
    const requested = sessionStorage.getItem(TUTORIAL_REQUEST_KEY) as TutorialCourse | null;
    if (!requested) return;
    sessionStorage.removeItem(TUTORIAL_REQUEST_KEY);
    start(requested);
  }, [location.pathname, start]);

  useEffect(() => {
    if (!step) return;
    const targetRoute = step.route(symbol);
    if (location.pathname !== targetRoute) navigate(targetRoute);
  }, [location.pathname, navigate, step, symbol]);

  useEffect(() => {
    if (!step || location.pathname !== step.route(symbol)) return;
    let target: HTMLElement | null = null;
    let scrolled = false;
    const update = () => {
      target = visibleTarget(step.selector);
      if (!target) return;
      if (!scrolled) {
        scrolled = true;
        target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      }
      window.setTimeout(() => target && setRect(target.getBoundingClientRect()), reduceMotion ? 0 : 220);
    };
    const timer = window.setInterval(update, 180);
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => { window.clearInterval(timer); window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); };
  }, [location.pathname, reduceMotion, step, symbol]);

  const finish = useCallback(() => {
    if (user && course) updateTutorialProgress(user.id, course === "ui" ? { prompted: true, uiComplete: true } : course === "game" ? { prompted: true, gameComplete: true } : { prompted: true, advancedComplete: true });
    setComplete(true);
    setRect(null);
  }, [course, user]);

  const next = useCallback(() => {
    if (advancing) return;
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    setBurst({ id: Date.now(), x, y });
    setAdvancing(true);
    window.setTimeout(() => {
      if (index === steps.length - 1) finish();
      else { setIndex((value) => value + 1); setRect(null); setDecisionFeedback(null); }
      setBurst(null);
      setAdvancing(false);
    }, reduceMotion ? 0 : 340);
  }, [advancing, finish, index, rect, reduceMotion, steps.length]);

  useEffect(() => {
    if (course !== "game" || !step?.waitFor || advancing) return;
    const completeAction = step.waitFor === "holding"
      ? tutorialShares > 0
      : step.waitFor === "after_hours"
        ? marketPhase === "after_hours"
      : step.waitFor === "day2"
        ? gameDay >= 2
        : tutorialShares === 0;
    if (completeAction) next();
  }, [advancing, course, gameDay, marketPhase, next, step, tutorialShares]);

  useEffect(() => {
    if (!step?.requireAction) return;
    let target: HTMLElement | null = null;
    const connect = () => {
      const found = visibleTarget(step.selector);
      if (!found || found === target) return;
      target?.removeEventListener("click", next);
      target = found;
      target.addEventListener("click", next, { once: true });
    };
    const timer = window.setInterval(connect, 180);
    connect();
    return () => { window.clearInterval(timer); target?.removeEventListener("click", next); };
  }, [location.pathname, next, step]);

  const close = () => {
    if (user) updateTutorialProgress(user.id, { prompted: true });
    setCourse(null);
    setComplete(false);
    setRect(null);
    setBurst(null);
  };

  const prepareGameRun = async () => {
    if (preparing) return;
    setPreparing(true);
    navigate("/game", { replace: true });
    await resetAccount("limited_30");
    setPreparing(false);
    next();
  };

  const choose = (option: TourDecision["options"][number]) => {
    setDecisionFeedback({ ok: option.correct, text: option.feedback });
    if (option.correct) window.setTimeout(next, reduceMotion ? 0 : 520);
  };

  const tooltipPosition = useMemo(() => {
    if (!rect) return { top: 90, left: 16 };
    const width = Math.min(360, window.innerWidth - 32);
    const left = Math.max(16, Math.min(window.innerWidth - width - 16, rect.left + rect.width / 2 - width / 2));
    const below = rect.bottom + 16;
    return { left, top: below + 260 < window.innerHeight ? below : Math.max(16, rect.top - 250) };
  }, [rect]);

  if (!course) return null;

  if (complete) return (
    <Box sx={{ position: "fixed", inset: 0, zIndex: 1700, bgcolor: "rgba(0,0,0,.72)", display: "grid", placeItems: "center", p: 2 }}>
      {!reduceMotion && Array.from({ length: 22 }, (_, i) => {
        const angle = (Math.PI * 2 * i) / 22;
        const distance = 100 + (i % 5) * 24;
        return <Box key={i} component={motion.div} initial={{ opacity: 1, x: 0, y: 0, rotate: 0 }} animate={{ opacity: 0, x: Math.cos(angle) * distance, y: Math.sin(angle) * distance + 60, rotate: 240 }} transition={{ duration: 1.15, delay: i * .018, ease: [.45, 0, .55, 1] }} sx={{ position: "fixed", left: "50%", top: "43%", width: i % 3 === 0 ? 9 : 6, height: i % 2 === 0 ? 12 : 7, borderRadius: 1, bgcolor: i % 3 === 0 ? D.green : i % 3 === 1 ? D.brand : D.amber, pointerEvents: "none" }} />;
      })}
      <Box component={motion.div} initial={reduceMotion ? false : { opacity: 0, scale: .82 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .38, ease: [.45, 0, .55, 1] }} sx={{ width: "min(500px, 100%)", bgcolor: D.surface, border: `1px solid ${D.greenBd}`, borderRadius: 3, p: 4, textAlign: "center" }}>
        <CheckCircleIcon sx={{ color: D.green, fontSize: 70 }} />
        <Typography sx={{ color: D.t1, fontSize: 25, fontWeight: 950 }}>{course === "ui" ? "Website tour complete" : course === "game" ? "Gameplay tutorial complete" : "Advanced tools complete"}</Typography>
        <Typography sx={{ color: D.t3, my: 1.5 }}>You explored the real StockPilot interface and its key tools.</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="center">
          {course === "ui" && <Button variant="contained" onClick={() => start("game")} sx={{ bgcolor: D.brand, textTransform: "none", fontWeight: 900 }}>Learn how to play</Button>}
          {course === "game" && <Button variant="contained" onClick={() => start("advanced")} sx={{ bgcolor: D.brand, textTransform: "none", fontWeight: 900 }}>Continue to advanced</Button>}
          <Button onClick={close} sx={{ color: D.t1, border: `1px solid ${D.border}`, textTransform: "none", fontWeight: 800 }}>Finish</Button>
        </Stack>
      </Box>
    </Box>
  );

  return (
    <>
      {burst && !reduceMotion && Array.from({ length: 14 }, (_, i) => {
        const angle = (Math.PI * 2 * i) / 14;
        const distance = 44 + (i % 4) * 12;
        return <Box key={`${burst.id}-${i}`} component={motion.div} initial={{ opacity: 1, x: 0, y: 0, scale: .6, rotate: 0 }} animate={{ opacity: 0, x: Math.cos(angle) * distance, y: Math.sin(angle) * distance + 20, scale: 1, rotate: 180 }} transition={{ duration: .55, delay: i * .012, ease: [.45, 0, .55, 1] }} sx={{ position: "fixed", zIndex: 1650, pointerEvents: "none", left: burst.x, top: burst.y, width: i % 3 === 0 ? 7 : 5, height: i % 2 === 0 ? 9 : 5, borderRadius: .5, bgcolor: i % 3 === 0 ? D.green : i % 3 === 1 ? D.brand : D.amber }} />;
      })}
      {rect && <Box sx={{ position: "fixed", zIndex: 1600, pointerEvents: "none", left: Math.max(4, rect.left - 6), top: Math.max(4, rect.top - 6), width: rect.width + 12, height: rect.height + 12, borderRadius: 2, border: `2px solid ${D.brandText}`, boxShadow: "0 0 0 9999px rgba(0,0,0,.72), 0 0 24px rgba(124,58,237,.65)", transition: "all 300ms cubic-bezier(.45,0,.55,1)" }} />}
      <Box component={motion.div} key={`${course}-${index}`} initial={reduceMotion ? false : { opacity: 0, y: 10, scale: .985 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: .3, ease: [.45, 0, .55, 1] }} sx={{ position: "fixed", zIndex: 1601, width: "min(360px, calc(100vw - 32px))", ...tooltipPosition, bgcolor: D.surface, border: `1px solid ${D.brandBd}`, borderRadius: 3, p: 2.5, boxShadow: "0 18px 55px rgba(0,0,0,.45)", transition: "top 300ms cubic-bezier(.45,0,.55,1), left 300ms cubic-bezier(.45,0,.55,1)" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}><Chip label={`${course.toUpperCase()} · ${index + 1}/${steps.length}`} size="small" sx={{ bgcolor: D.brandBg, color: D.brandText, fontFamily: MONO, fontWeight: 900, fontSize: 9.5 }} /><Button onClick={close} aria-label="Exit tutorial" sx={{ minWidth: 30, p: .5, color: D.t3 }}><CloseIcon fontSize="small" /></Button></Stack>
        <LinearProgress variant="determinate" value={((index + 1) / steps.length) * 100} sx={{ mb: 1.8, height: 4, borderRadius: 99, bgcolor: D.overlay, "& .MuiLinearProgress-bar": { bgcolor: D.brand } }} />
        <Typography sx={{ color: D.t1, fontSize: 17, fontWeight: 950 }}>{step?.title}</Typography>
        <Typography sx={{ color: D.t2, fontSize: 12.5, lineHeight: 1.65, my: 1 }}>{step?.body}</Typography>
        {step?.actionHint && <Typography sx={{ color: D.greenText, fontSize: 11.5, fontWeight: 900, mb: 1.5 }}>{step.actionHint}</Typography>}
        {step?.decision && <Stack spacing={.8} sx={{ my: 1.5 }}>{step.decision.options.map((option) => <Button key={option.label} disabled={advancing || decisionFeedback?.ok} onClick={() => choose(option)} sx={{ justifyContent: "flex-start", color: D.t1, bgcolor: D.elevated, border: `1px solid ${D.border}`, textTransform: "none", fontWeight: 800, "&:hover": { bgcolor: D.overlay, borderColor: D.brandBd } }}>{option.label}</Button>)}</Stack>}
        {decisionFeedback && <Typography sx={{ color: decisionFeedback.ok ? D.greenText : D.redText, bgcolor: decisionFeedback.ok ? D.greenBg : D.redBg, border: `1px solid ${decisionFeedback.ok ? D.greenBd : D.redBd}`, borderRadius: 1.5, p: 1.2, mb: 1.5, fontSize: 11.5, fontWeight: 750 }}>{decisionFeedback.text}</Typography>}
        {step?.setupRun && <Button fullWidth disabled={preparing || advancing} onClick={prepareGameRun} variant="contained" sx={{ my: 1.2, bgcolor: D.brand, textTransform: "none", fontWeight: 900, boxShadow: "none" }}>{preparing ? "Preparing Day 1…" : "Start fresh tutorial run"}</Button>}
        <Stack direction="row" justifyContent="space-between"><Button disabled={index === 0 || advancing || preparing} onClick={() => { setIndex((value) => value - 1); setRect(null); setDecisionFeedback(null); }} sx={{ color: D.t3, textTransform: "none" }}>Back</Button>{!step?.requireAction && !step?.waitFor && !step?.decision && !step?.setupRun && <Button disabled={advancing} onClick={next} variant="contained" sx={{ bgcolor: D.brand, textTransform: "none", fontWeight: 900, boxShadow: "none" }}>{index === steps.length - 1 ? "Complete" : "Next"}</Button>}</Stack>
      </Box>
    </>
  );
}
