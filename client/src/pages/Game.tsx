import DecisionNote from "../components/learning/DecisionNote";
import RunProgressBar from "../components/RunProgressBar";
import ConfirmDialog from "../components/ConfirmDialog";
import DayRecapCard from "../components/DayRecapCard";
import TodayGoalCard from "../components/TodayGoalCard";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ButtonBase,
  Box, Button, Chip, Container, Dialog, DialogActions, DialogContent, DialogTitle,
  CircularProgress, Divider, IconButton, Stack, TextField, Typography,
} from "@mui/material";
import NewspaperIcon from "@mui/icons-material/Newspaper";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import CloseIcon from "@mui/icons-material/Close";
import CodeIcon from "@mui/icons-material/Code";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import AllInclusiveIcon from "@mui/icons-material/AllInclusive";
import TimerIcon from "@mui/icons-material/Timer";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import StorefrontIcon from "@mui/icons-material/Storefront";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import { Link as RouterLink, useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { getNewsCredibility, STORY_DAYS, Stock } from "../data/mockStocks";
import { getMaxAffordableQuantity, getNetWorth, getPortfolioValue, getSharesOwned } from "../data/tradingState";
import { GameMode, MARKET_CLOSED_MESSAGE, useGame, STARTING_CASH, WEEKLY_BILL_TOTAL } from "../context/GameContext";
import { buildDayRecap, overnightShares, positionChangeToday } from "../lib/dayRecap";
import { useAchievements } from "../hooks/useAchievements";
import { useDailyGoals } from "../hooks/useDailyGoals";
import { useStockAlerts } from "../hooks/useStockAlerts";
import { useMissions } from "../hooks/useMissions";
import { useRivalTrader } from "../hooks/useRivalTrader";
import { useLevel } from "../hooks/useLevel";
import { addInboxMessage } from "../lib/inbox";
import { useAuth } from "../context/AuthContext";
import { D, CARD, MONO, money, pct, readableOn, isFlat } from "../theme/design";
import { TradeJournalInput } from "../lib/tradeJournal";
import { getTutorialProgress, updateTutorialProgress } from "../lib/tutorial";
import { usePageTitle } from "../lib/usePageTitle";

const DEV_CONSOLE_ENABLED = process.env.NODE_ENV !== "production";
// Framer Motion 11 predates React 19's stricter JSX return type.
const MotionPresence = AnimatePresence as React.FC<React.PropsWithChildren<{
  initial?: boolean;
  mode?: "sync" | "popLayout" | "wait";
}>>;

const NEWS_COLLAPSED_KEY = "stockpilot:news-collapsed";
const RECAP_DISMISSED_KEY = "stockpilot:recap-dismissed";

export default function Game() {
  usePageTitle("Market");
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tutorialPromptOpen, setTutorialPromptOpen] = useState(false);
  const [devConsoleOpen, setDevConsoleOpen] = useState(false);
  const [tradeMessage, setTradeMessage] = useState("");
  const [tradeDialog, setTradeDialog] = useState<{ stock: Stock; mode: "buy" | "sell" } | null>(null);
  // BUG-054: starting a run pauses the current one for good, so it is confirmed.
  const [newRunConfirm, setNewRunConfirm] = useState<GameMode | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedSector = searchParams.get("sector") ?? "All";
  const setSelectedSector = useCallback((sector: string) => {
    setSearchParams(sector === "All" ? {} : { sector }, { replace: true });
  }, [setSearchParams]);
  const trading = useGame();
  const {
    achievementNotification,
    queuedNotificationCount,
    dismissAchievementNotification,
    achievementIds,
    devUnlockAchievements,
    devClearAchievements,
  } = useAchievements();
  // Goals and missions are presented on /game/goals, but their progress is
  // earned here, so the hooks stay mounted for the completions they record.
  // Today's next goal is also shown on this page.
  const daily = useDailyGoals();
  useMissions();
  const rival = useRivalTrader();
  useStockAlerts();
  // Kept mounted for its level-up side effects; the level chip moved off this page.
  useLevel();
  const {
    advancing, gameDay, gameMode, isGameComplete, marketPhase, maxGameDay, setGameDay, closeMarket,
    stocks, news: todayNews, syncSessionValue,
  } = trading;

  const sectors = useMemo(() => ["All", ...Array.from(new Set(stocks.map((stock) => stock.sector))).sort()], [stocks]);
  const sectorCounts = useMemo(() => {
    const counts = new Map<string, number>([["All", stocks.length]]);
    stocks.forEach((stock) => counts.set(stock.sector, (counts.get(stock.sector) ?? 0) + 1));
    return counts;
  }, [stocks]);
  const filteredStocks = useMemo(
    () => selectedSector === "All" ? stocks : stocks.filter((stock) => stock.sector === selectedSector),
    [selectedSector, stocks],
  );
  const portfolioValue = useMemo(() => getPortfolioValue(trading.account, stocks), [trading.account, stocks]);
  const netWorth = useMemo(() => getNetWorth(trading.account, stocks), [trading.account, stocks]);
  const portfolioPnL = useMemo(() =>
    trading.account.holdings.reduce((sum, h) => {
      const live = stocks.find((s) => s.symbol === h.symbol);
      return sum + ((live?.currentPrice ?? h.averageCost) - h.averageCost) * h.shares;
    }, 0),
    [trading.account.holdings, stocks],
  );
  // Testers read the since-purchase figure as today's move; both are shown,
  // labelled. Shares bought today were bought at today's price, so only the
  // shares held overnight count toward today's move.
  const portfolioToday = useMemo(() =>
    trading.account.holdings.reduce((sum, h) => (
      sum + positionChangeToday(h, stocks.find((s) => s.symbol === h.symbol), trading.tradedToday)
    ), 0),
    [trading.account.holdings, stocks, trading.tradedToday],
  );

  // Start-of-day recap, so each advance has a result to react to. While the
  // market is open, `todayNews` is yesterday's brief: the news behind today's prices.
  const dayRecap = useMemo(() => buildDayRecap({
    day: gameDay,
    holdings: trading.account.holdings,
    stocks,
    tradedToday: trading.tradedToday,
    news: todayNews,
    // The server's figure when this browser made the advance; otherwise the
    // weekly schedule (one cycle on arrival at every 7th day).
    bill: trading.latestBill?.day === gameDay ? trading.latestBill.total : gameDay % 7 === 0 ? WEEKLY_BILL_TOTAL : 0,
    rivalCurve: rival.equityCurve,
  }), [gameDay, trading.account.holdings, stocks, trading.tradedToday, todayNews, trading.latestBill, rival.equityCurve]);
  const recapKey = `${trading.sessionId}:${gameDay}`;
  const [recapDismissed, setRecapDismissed] = useState(() => {
    try { return localStorage.getItem(RECAP_DISMISSED_KEY) ?? ""; } catch { return ""; }
  });
  const dismissRecap = () => {
    setRecapDismissed(recapKey);
    try { localStorage.setItem(RECAP_DISMISSED_KEY, recapKey); } catch { /* per-browser preference only */ }
  };
  const showRecap = dayRecap !== null && marketPhase === "market_open" && !advancing && recapDismissed !== recapKey;
  const showGoals = !isGameComplete && daily.goals.length > 0;

  const marketAverage = stocks.length
    ? stocks.reduce((sum, stock) => sum + stock.dayChangePercent, 0) / stocks.length
    : 0;
  const marketFlat = isFlat(marketAverage);
  const marketUp = marketAverage > 0;
  const marketColor = marketFlat ? D.t2 : marketUp ? D.greenText : D.redText;
  const netReturn = ((netWorth - STARTING_CASH) / STARTING_CASH) * 100;
  // BUG-060: after the close, trades are refused until the next day.
  const marketClosed = marketPhase === "after_hours";
  const modeLabel = gameMode === "limited_30" ? "30-Day Challenge" : "Infinite";
  useEffect(() => {
    if (!sectors.includes(selectedSector)) setSelectedSector("All");
  }, [selectedSector, sectors, setSelectedSector]);

  useEffect(() => {
    if (!trading.loading && user && !getTutorialProgress(user.id).prompted) setTutorialPromptOpen(true);
  }, [trading.loading, user]);

  useEffect(() => {
    // Cash and prices can settle in separate renders after an advance.
    const timer = window.setTimeout(() => { void syncSessionValue(); }, 800);
    return () => window.clearTimeout(timer);
  }, [netWorth, syncSessionValue]);

  useEffect(() => {
    if (!tradeMessage) return;
    const t = setTimeout(() => setTradeMessage(""), 3500);
    return () => clearTimeout(t);
  }, [tradeMessage]);

  useEffect(() => {
    if (!achievementNotification) return;
    const timeout = window.setTimeout(dismissAchievementNotification, 4000);
    return () => window.clearTimeout(timeout);
  }, [achievementNotification, dismissAchievementNotification]);

  // Once per day, drop the day's top headline into the inbox as a market
  // flavor email — a persistent record of "why did the market do that"
  // alongside the mission/bill/rival/achievement messages.
  useEffect(() => {
    // While trading, `todayNews` is yesterday's brief, already filed under yesterday.
    if (!user || !marketClosed || todayNews.length === 0) return;
    const top = [...todayNews].sort((a, b) => (a.importance === b.importance ? 0 : a.importance === "High" ? -1 : 1))[0];
    addInboxMessage(user.id, {
      id: `news-digest-${user.id}-day-${gameDay}`,
      from: top.source || "Market Wire",
      subject: `Day ${gameDay} after hours: ${top.headline}`,
      body: `${top.body}\n\n${todayNews.length > 1 ? `${todayNews.length - 1} more stor${todayNews.length - 1 === 1 ? "y" : "ies"} may affect the next session — check the News page.` : ""}`,
      category: "system",
    });
  }, [todayNews, gameDay, marketClosed, user]);

  // A dialog opened on one day must not trade on the next.
  useEffect(() => {
    setTradeDialog(null);
  }, [gameDay]);

  useEffect(() => {
    if (!DEV_CONSOLE_ENABLED) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (isTyping) return;

      if (event.key === "~" || event.code === "Backquote") {
        event.preventDefault();
        setDevConsoleOpen((open) => !open);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Closing the market swaps this button's label and action to "Advance", so
  // without a pause a double click closed the market and skipped the
  // after-hours window in one go.
  const lastAdvanceClickRef = useRef(0);
  const [closing, setClosing] = useState(false);
  // Testers had to reopen the brief every day; it now stays as they left it.
  const [newsCollapsed, setNewsCollapsed] = useState(() => {
    // Start with a one-headline preview on phones until the player chooses.
    try {
      const saved = localStorage.getItem(NEWS_COLLAPSED_KEY);
      return saved === null ? window.matchMedia("(max-width: 899.95px)").matches : saved === "1";
    } catch { return false; }
  });
  const toggleNews = () => setNewsCollapsed((was) => {
    try { localStorage.setItem(NEWS_COLLAPSED_KEY, was ? "0" : "1"); } catch { /* per-browser preference only */ }
    return !was;
  });
  const handleNextDay = () => {
    if (isGameComplete || advancing || closing) return;
    const now = Date.now();
    if (now - lastAdvanceClickRef.current < 600) return;
    lastAdvanceClickRef.current = now;
    if (marketPhase === "market_open") {
      // The close has its own server wait; without a label the button looked frozen.
      setClosing(true);
      void closeMarket().finally(() => setClosing(false));
      return;
    }
    void setGameDay((d) => d + 1);
  };
  const handleNextDayRef = useRef(handleNextDay);
  handleNextDayRef.current = handleNextDay;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) return;
      // Held keys auto-repeat and would step close -> advance -> close...;
      // an open dialog (focus on its container div) must not move the day
      // underneath the trade it is quoting.
      if (e.repeat || tradeDialog || newRunConfirm || advancing) return;
      if (e.key === "ArrowRight" && !isGameComplete) {
        e.preventDefault();
        handleNextDayRef.current();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [advancing, isGameComplete, newRunConfirm, tradeDialog]);

  if (trading.loading) {
    return (
      <Box sx={{ bgcolor: D.bg, minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <CircularProgress sx={{ color: D.brandText }} />
      </Box>
    );
  }

  const advanceLabel = advancing
    ? "Advancing…"
    : closing
      ? "Closing market…"
      : marketPhase === "market_open"
      ? "Close Market & Reveal News"
      : "Advance to Next Day";
  // No new run while nothing is loaded: after a failed load the page shows a
  // placeholder Day 1 account, and a new run would pause the real one.
  const newRunDisabled = trading.loading || trading.actionPending || !trading.sessionId;
  const confirmNewRun = () => {
    if (!newRunConfirm) return;
    const mode = newRunConfirm;
    // Close first: resetAccount puts the page into its loading state, and a
    // refusal (e.g. the daily run cap) is shown in the page's error banner.
    setNewRunConfirm(null);
    void trading.resetAccount(mode);
  };
  const dismissTutorial = () => {
    if (user) updateTutorialProgress(user.id, { prompted: true });
    setTutorialPromptOpen(false);
  };
  const startTutorial = () => {
    dismissTutorial();
    navigate("/tutorial?course=ui");
  };

  const handleBuyStock = (stock: Stock) => setTradeDialog({ stock, mode: "buy" });
  const handleSellStock = (stock: Stock) => setTradeDialog({ stock, mode: "sell" });

  const handleTradeConfirm = async (stock: Stock, mode: "buy" | "sell", quantity: number, journal?: TradeJournalInput) => {
    const quote = trading.getTradeQuote(stock, mode, quantity);
    const fn = mode === "buy" ? trading.buyStock : trading.sellStock;
    const ok = await fn(stock, quantity, journal);
    const shares = `${quantity} share${quantity === 1 ? "" : "s"}`;
    const total = money(quote.total);
    setTradeMessage(
      ok
        ? `${mode === "buy" ? "Bought" : "Sold"} ${shares} of ${stock.symbol} for ${total}.`
        : "Trade could not be completed. Check the message below and try again."
    );
    if (ok) setTradeDialog(null);
  };

  const runConsoleCommand = async (rawCommand: string) => {
    const command = rawCommand.trim();
    const tokens = command.split(/\s+/);
    const [name = "", arg1 = "", arg2 = ""] = tokens;
    const action = name.toLowerCase();

    if (!command) return "";

    const normalizeAchievementId = (value: string) =>
      value.trim().toLowerCase().replace(/-/g, "_");

    if (action === "achievements" && !arg1) {
      return `Achievement IDs: ${achievementIds.join(", ")}.`;
    }

    if (action === "achieve" || action === "achievement" || action === "achievements") {
      const operation = arg1.toLowerCase();

      if (["all", "gather", "unlockall"].includes(operation)) {
        return (await devUnlockAchievements("all")).message;
      }
      if (["clear", "remove", "delete"].includes(operation)) {
        if (!arg2) return "Usage: achievement clear <id|all>.";
        return (await devClearAchievements(
          arg2.toLowerCase() === "all" ? "all" : normalizeAchievementId(arg2)
        )).message;
      }
      if (["unlock", "add"].includes(operation)) {
        if (!arg2) return "Usage: achievement unlock <id|all>.";
        return (await devUnlockAchievements(
          arg2.toLowerCase() === "all" ? "all" : normalizeAchievementId(arg2)
        )).message;
      }
      if (operation) {
        return (await devUnlockAchievements(normalizeAchievementId(operation))).message;
      }
      return `Achievement IDs: ${achievementIds.join(", ")}.`;
    }

    if (
      action === "gather"
      && arg1.toLowerCase() === "all"
      && ["achievement", "achievements"].includes(arg2.toLowerCase())
    ) {
      return (await devUnlockAchievements("all")).message;
    }

    if (
      action === "clear"
      && ["achievement", "achievements"].includes(arg1.toLowerCase())
    ) {
      if (!arg2) return "Usage: clear achievement <id|all>.";
      return (await devClearAchievements(
        arg2.toLowerCase() === "all" ? "all" : normalizeAchievementId(arg2)
      )).message;
    }

    if (
      action === "clear"
      && arg1.toLowerCase() === "all"
      && ["achievement", "achievements"].includes(arg2.toLowerCase())
    ) {
      return (await devClearAchievements("all")).message;
    }

    if (
      action === "seed"
      || action === "marketseed"
      || action === "stockpilotseed"
      || action === "stockpilotseed()"
    ) {
      const arcs = trading.storyArcs.length ? trading.storyArcs.join(", ") : "none";
      return `Seed ${trading.marketSeed} | Mode ${gameMode} | Day ${gameDay} | Arcs ${arcs}${trading.sessionId ? ` | Session ${trading.sessionId}` : ""}`;
    }

    if (action === "cash" || action === "money" || action === "shares") {
      // Cash and holdings are server-authoritative; the dev console can't
      // write them any more than a player can.
      return "Disabled: cash and holdings are managed by the game server.";
    }

    if (action === "day") {
      const mode = arg1.toLowerCase();
      const value = Number(arg2 || arg1);
      if (!arg1 || Number.isNaN(value) || value < 1) return "Rejected.";

      if (["increase", "inc", "add", "+", "up"].includes(mode)) {
        void setGameDay((current) => current + Math.floor(value));
      } else if (["decrease", "dec", "subtract", "sub", "-", "down"].includes(mode)) {
        return "Rejected: days only move forward.";
      } else {
        if (Math.floor(value) < gameDay) return "Rejected: days only move forward.";
        void setGameDay(Math.floor(value));
      }

      return "Applied.";
    }

    if (action === "next") {
      const value = Number(arg1);
      const days = arg1 ? value : 1;
      if (Number.isNaN(days)) return "Rejected.";
      setGameDay((current) => Math.max(1, current + Math.floor(days)));
      return "Applied.";
    }

    if (action === "reset") {
      const target = arg1.toLowerCase();
      if (target === "cash" || target === "day") {
        return "Rejected: start a new run with `reset all`.";
      }
      if (target === "all") {
        void trading.resetAccount(gameMode);
        return "Applied.";
      }
      if (target === "infinite") {
        void trading.resetAccount("infinite");
        return "Applied.";
      }
      if (target === "limited" || target === "30") {
        void trading.resetAccount("limited_30");
        return "Applied.";
      }
      return "Rejected.";
    }

    return `Rejected: ${name}.`;
  };

  return (
    <Box sx={{ bgcolor: D.bg, minHeight: "100vh" }}>
      <Dialog onClose={dismissTutorial} open={tutorialPromptOpen} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: D.surface, border: `1px solid ${D.border}`, borderRadius: 3 } }}>
        <DialogContent sx={{ p: { xs: 3, md: 4 }, textAlign: "center" }}>
          <Box sx={{ width: 58, height: 58, mx: "auto", mb: 2, borderRadius: 3, bgcolor: D.brandBg, color: D.brandText, display: "grid", placeItems: "center" }}><ShowChartIcon sx={{ fontSize: 30 }} /></Box>
          <Typography sx={{ color: D.t1, fontSize: 24, fontWeight: 900 }}>Welcome to StockPilot</Typography>
          <Typography sx={{ color: D.t3, fontSize: 14, lineHeight: 1.7, mt: 1 }}>See where to find the market, place trades, and read reports. You can replay the tour from Settings.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, justifyContent: "center" }}>
          <Button onClick={dismissTutorial} sx={{ color: D.t3, textTransform: "none", fontWeight: 700 }}>Skip for now</Button>
          <Button onClick={startTutorial} variant="contained" sx={{ bgcolor: D.brand, textTransform: "none", fontWeight: 900, boxShadow: "none" }}>Start tour</Button>
        </DialogActions>
      </Dialog>
      {tradeDialog && (
        <TradeDialog
          error={trading.error}
          stock={trading.getStock(tradeDialog.stock.symbol) ?? tradeDialog.stock}
          mode={tradeDialog.mode}
          cash={trading.account.cash}
          sharesOwned={getSharesOwned(trading.account, tradeDialog.stock.symbol)}
          marketClosed={marketClosed}
          getQuote={(qty) => trading.getTradeQuote(tradeDialog.stock, tradeDialog.mode, qty)}
          onClose={() => setTradeDialog(null)}
          onConfirm={(qty, journal) => handleTradeConfirm(tradeDialog.stock, tradeDialog.mode, qty, journal)}
        />
      )}
      <ConfirmDialog
        open={newRunConfirm !== null}
        title={newRunConfirm === "limited_30" ? "Start a new 30-Day run?" : "Start a new Infinite run?"}
        confirmLabel="Start new run"
        tone="danger"
        secondaryAction={{ label: "Save first", onClick: () => { setNewRunConfirm(null); navigate("/save-load"); } }}
        onConfirm={confirmNewRun}
        onClose={() => setNewRunConfirm(null)}
      >
        <Typography component="p" sx={{ fontSize: 14, color: D.t2, mb: 1.5 }}>
          Your current {modeLabel} run ends here and can't be resumed:{" "}
          <Box component="strong" sx={{ color: D.t1 }}>Day {gameDay}, net worth {money(netWorth)}</Box>.
        </Typography>
        <Typography component="p" sx={{ fontSize: 14, color: D.t2 }}>
          Save it first if you might want to come back to it. The new run starts on Day 1 with fresh cash and uses one of today's run starts.
        </Typography>
      </ConfirmDialog>
      {DEV_CONSOLE_ENABLED && (
        <CommandConsole
          open={devConsoleOpen}
          onClose={() => setDevConsoleOpen(false)}
          onRun={runConsoleCommand}
        />
      )}
      <AchievementUnlockToast
        achievement={achievementNotification}
        queuedCount={queuedNotificationCount}
        onClose={dismissAchievementNotification}
      />

      <Box component="header" sx={{ bgcolor: D.surface, borderBottom: `1px solid ${D.border}` }}>
        <Container maxWidth="xl" sx={{ py: { xs: 2.5, md: 3 } }}>
          <Box sx={{ display: "grid", alignItems: "center", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 7fr) minmax(0, 5fr)" }, gap: { xs: 2.5, md: 4 } }}>
            <Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                <Chip label={`DAY ${gameDay}${maxGameDay ? ` / ${maxGameDay}` : ""}`} size="small"
                  sx={{ bgcolor: D.brandBg, color: D.brandText, border: `1px solid ${D.brandBd}`, fontWeight: 800, fontSize: 12, fontFamily: MONO }} />
                <Chip icon={gameMode === "limited_30" ? <TimerIcon /> : <AllInclusiveIcon />} label={modeLabel} size="small"
                  sx={{ bgcolor: D.elevated, color: D.t2, border: `1px solid ${D.border}`, fontWeight: 800, fontSize: 12 }} />
                <Chip label={marketClosed ? "AFTER HOURS" : "MARKET OPEN"} size="small"
                  sx={{ bgcolor: marketClosed ? D.amberBg : D.greenBg, color: marketClosed ? D.amber : D.greenText, border: `1px solid ${marketClosed ? D.amber : D.greenBd}`, fontWeight: 800, fontSize: 12, fontFamily: MONO }} />
              </Stack>
              <Typography component="h1" sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 900, color: D.t1, letterSpacing: "-0.02em", mb: 2 }}>
                Stock Market Simulator
              </Typography>
              <Stack direction="row" gap={1} flexWrap="wrap">
                <Button data-tour="next-day" onClick={handleNextDay} variant="contained" disabled={isGameComplete || advancing || closing}
                  title={isGameComplete ? undefined : marketClosed ? "Advance to next day (→)" : "Close the market and reveal news (→)"}
                  sx={{ minHeight: 44, bgcolor: D.brand, fontWeight: 800, textTransform: "none", borderRadius: 1.5, boxShadow: "none", "&:hover": { bgcolor: D.brandMid, boxShadow: "none" }, "&.Mui-disabled": { bgcolor: D.overlay, color: D.t3 } }}>
                  {isGameComplete ? "Run Complete" : advanceLabel}
                </Button>
                {!isGameComplete && ([
                  { mode: "infinite", label: "New Infinite run", icon: <AllInclusiveIcon /> },
                  { mode: "limited_30", label: "New 30-Day run", icon: <TimerIcon /> },
                ] as const).map(({ mode, label, icon }) => (
                  <Button key={mode} variant="outlined" startIcon={icon} onClick={() => setNewRunConfirm(mode)} disabled={newRunDisabled}
                    sx={{ minHeight: 44, color: D.t2, borderColor: D.borderHi, fontWeight: 700, textTransform: "none", borderRadius: 1.5 }}>
                    {label}
                  </Button>
                ))}
              </Stack>
            </Box>
            <Box sx={{ pl: { md: 3 }, borderLeft: { md: `1px solid ${D.border}` } }}>
              <Typography sx={{ fontSize: 12, fontWeight: 800, color: D.t3, fontFamily: MONO }}>MARKET STATUS</Typography>
              <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap" sx={{ mt: 0.5, mb: 1.5 }}>
                <Typography sx={{ fontSize: 32, lineHeight: 1.1, fontWeight: 800, fontFamily: MONO, color: marketColor }}>{pct(marketAverage)}</Typography>
                <Chip size="small" label={marketFlat ? "Flat Day" : marketUp ? "Positive Day" : "Negative Day"}
                  sx={{ bgcolor: marketFlat ? D.elevated : marketUp ? D.greenBg : D.redBg, color: marketColor, fontWeight: 800 }} />
              </Stack>
              <RunProgressBar day={gameDay} maxDay={maxGameDay} height={5} color={isGameComplete ? D.green : D.brand} />
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        {trading.error && (
          <Box role="alert" sx={{ p: 2, mb: 2.5, borderRadius: 2, bgcolor: D.redBg, border: `1px solid ${D.redBd}` }}>
            <Typography sx={{ color: D.redText, fontSize: 14, fontWeight: 800 }}>
              {trading.error}
            </Typography>
            <Button disabled={trading.actionPending} onClick={() => { void trading.reloadSession().catch(() => {}); }}>Retry</Button>
          </Box>
        )}

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))" }, gap: { xs: 1, sm: 2 }, mb: 2 }}>
          {[
            { label: "Cash", value: trading.account.cash, icon: <AccountBalanceWalletIcon /> },
            { label: "Portfolio value", value: portfolioValue, icon: <StorefrontIcon /> },
            { label: "Net worth", value: netWorth, icon: netReturn < 0 ? <TrendingDownIcon /> : <TrendingUpIcon />, sub: `${pct(netReturn)} since Day 1` },
          ].map(({ label, value, icon, sub }) => (
            <Box key={label} data-tour={sub ? "net-worth" : undefined}
              sx={{ ...CARD, display: "flex", justifyContent: "space-between", gap: 1, p: { xs: 1.5, sm: 2.5 }, gridColumn: { xs: sub ? "1 / -1" : "auto", sm: "auto" } }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 800, color: D.t3, fontFamily: MONO, textTransform: "uppercase" }}>{label}</Typography>
                <Typography sx={{ mt: 0.5, fontSize: { xs: 17, sm: 20 }, fontWeight: 800, color: D.t1, fontFamily: MONO, overflowWrap: "anywhere" }}>{money(value)}</Typography>
                {sub && <Typography sx={{ fontSize: 12, fontWeight: 800, color: isFlat(netReturn) ? D.t2 : netReturn > 0 ? D.greenText : D.redText }}>{sub}</Typography>}
              </Box>
              <Box sx={{ display: { xs: "none", sm: "grid" }, placeItems: "center", width: 36, height: 36, flexShrink: 0, bgcolor: D.brandBg, color: D.brandText, borderRadius: 2, "& svg": { fontSize: 20 } }}>{icon}</Box>
            </Box>
          ))}
        </Box>

        <Stack component="nav" aria-label="Market shortcuts" direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>
          <Button href="#game-portfolio" size="small" sx={{ display: { md: "none" }, minHeight: 40, color: D.brandText, textTransform: "none" }}>Portfolio</Button>
          {showGoals && <Button href="#today-goal" size="small" sx={{ display: { md: "none" }, minHeight: 40, color: D.brandText, textTransform: "none" }}>Goal</Button>}
          <Button component={RouterLink} to="/game/watchlist" startIcon={<StarBorderIcon />} size="small" sx={{ minHeight: 40, color: D.brandText, textTransform: "none" }}>
            Watchlist{trading.watchlistStocks.length > 0 && ` (${trading.watchlistStocks.length})`}
          </Button>
          <Button href="#game-tools" size="small" sx={{ minHeight: 40, color: D.brandText, textTransform: "none" }}>Game tools</Button>
        </Stack>

        <MotionPresence initial={false}>
          {trading.latestBill && (
            <motion.div initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Box sx={{ p: 2, mb: 2.5, borderRadius: 2, bgcolor: D.redBg, border: `1px solid ${D.redBd}` }}>
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1}>
                  <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 900, color: D.redText }}>
                      Bills paid: −{money(trading.latestBill.paid)}
                    </Typography>
                    <Typography sx={{ fontSize: 14, color: D.t2 }}>
                      {trading.latestBill.cycles > 1 ? `${trading.latestBill.cycles} weekly cycles were due. ` : ""}
                      {trading.latestBill.shortfall > 0
                        ? `${money(trading.latestBill.shortfall)} is still owed: it counts against your net worth and is collected from your cash on the next day.`
                        : "Rent, food, and utilities were deducted from your cash."}
                    </Typography>
                  </Box>
                  <IconButton onClick={trading.clearLatestBill} size="small" sx={{ color: D.t3 }} aria-label="Dismiss bill notice">
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Box>
            </motion.div>
          )}
        </MotionPresence>

        <MotionPresence initial={false}>
          {tradeMessage && (() => {
            const ok = tradeMessage.startsWith("Bought") || tradeMessage.startsWith("Sold");
            return (
              <motion.div initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }} transition={{ type: "spring", stiffness: 420, damping: 30 }}>
                <Box sx={{ p: 2, mb: 2.5, borderRadius: 2, bgcolor: ok ? D.greenBg : D.redBg, border: `1px solid ${ok ? D.greenBd : D.redBd}`, boxShadow: `0 8px 28px ${ok ? D.greenBg : D.redBg}` }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 800, color: ok ? D.greenText : D.redText }}>{tradeMessage}</Typography>
                </Box>
              </motion.div>
            );
          })()}
        </MotionPresence>

        {isGameComplete && (
          <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: D.greenBg, border: `1px solid ${D.greenBd}`, mb: 2.5 }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1.5}>
              <Box>
                <Typography sx={{ fontWeight: 900, fontSize: 16, color: D.greenText }}>30-Day Challenge Complete</Typography>
                <Typography sx={{ fontSize: 14, color: D.t2 }}>Your Day 30 net worth is ready for the leaderboard. Start another challenge or switch to Infinite mode.</Typography>
              </Box>
              {/* A finished challenge has nothing left to lose, so these start the run directly. */}
              <Stack direction="row" spacing={1}>
                <Button onClick={() => { void trading.resetAccount("limited_30"); }} disabled={newRunDisabled} startIcon={<RestartAltIcon />}
                  sx={{ color: D.greenText, border: `1px solid ${D.greenBd}`, fontWeight: 800, textTransform: "none", borderRadius: 1.5 }}>
                  New 30-Day
                </Button>
                <Button onClick={() => { void trading.resetAccount("infinite"); }} disabled={newRunDisabled} startIcon={<AllInclusiveIcon />}
                  sx={{ color: D.brandText, border: `1px solid ${D.brandBd}`, fontWeight: 800, textTransform: "none", borderRadius: 1.5, bgcolor: D.brandBg }}>
                  Infinite Run
                </Button>
              </Stack>
            </Stack>
          </Box>
        )}

        {!trading.loading && !trading.verifiedRun && <Typography sx={{ color: D.t3, mb: 2 }}>This older run is practice-only. Start a new run to earn achievements and enter the leaderboards.</Typography>}

        {showRecap && dayRecap && (
          <Box sx={{ mb: 2 }}>
            <DayRecapCard key={recapKey} recap={dayRecap}
              rival={{ name: rival.rivalName, playerAhead: rival.playerAhead, gap: Math.abs(rival.playerNetWorth - rival.rivalNetWorth) }}
              onOpenStock={(symbol) => navigate(`/stocks/${symbol}`, { state: { gameDay } })}
              onDismiss={dismissRecap} />
          </Box>
        )}

        <Box sx={{
          display: "grid", alignItems: "start", gap: 2,
          gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 2fr) minmax(0, 1fr)" },
          gridTemplateAreas: { xs: '"news" "stocks" "portfolio"', md: '"stocks news" "stocks portfolio"' },
          gridTemplateRows: { md: "auto 1fr" },
        }}>
          <Box component="section" aria-label="After-hours news" sx={{ ...CARD, gridArea: "news" }}>
            {todayNews.length > 0 ? (
              <Box component="details" open={!newsCollapsed} data-tour="today-news"
                onToggle={(e: React.SyntheticEvent<HTMLDetailsElement>) => {
                  if (e.target === e.currentTarget && e.currentTarget.open === newsCollapsed) toggleNews();
                }}
                sx={{
                  "& > summary": { cursor: "pointer", listStyle: "none", p: { xs: 1.5, md: 2 } },
                  "& > summary::-webkit-details-marker": { display: "none" },
                  "& > summary:focus-visible": { outline: `2px solid ${D.brand}`, outlineOffset: -2 },
                  "&[open] > summary .news-chevron": { transform: "rotate(180deg)" },
                }}>
                <Box component="summary">
                  <Stack component="span" direction="row" alignItems="center" spacing={1}>
                    <NewspaperIcon sx={{ fontSize: 18, color: D.brandText }} />
                    <Typography component="span" sx={{ flex: 1, color: D.t1, fontSize: 16, fontWeight: 800 }}>After-hours news</Typography>
                    <ExpandMoreIcon className="news-chevron" sx={{ fontSize: 20, color: D.t3 }} />
                  </Stack>
                  <Typography component="span" sx={{ display: "block", color: D.t3, fontSize: 12, mt: 0.5 }}>
                    Day {marketClosed ? gameDay : gameDay - 1} · {todayNews.length} {todayNews.length === 1 ? "story" : "stories"}
                  </Typography>
                  {newsCollapsed && <Typography component="span" noWrap sx={{ display: "block", color: D.t2, fontSize: 14, mt: 0.5 }}>{todayNews[0].headline}</Typography>}
                </Box>
                {todayNews.map((story) => {
                  const credibility = getNewsCredibility(story);
                  return (
                    <Box component="details" key={story.newsId} data-tour={story.relatedTickers.includes("CAI") ? "tutorial-news" : undefined}
                      sx={{ borderTop: `1px solid ${D.border}`, "& > summary": { cursor: "pointer", color: D.t1, p: 2, fontSize: 14, fontWeight: 700 }, "& > summary:focus-visible": { outline: `2px solid ${D.brand}`, outlineOffset: -2 } }}>
                      <Box component="summary">
                        {story.headline}
                        <Typography component="span" sx={{ display: "block", mt: 0.5, color: credibility.rating === "low" ? D.amber : D.t3, fontSize: 12, fontWeight: 500 }}
                          title="Source reliability">
                          {story.importance === "High" && <Box component="span" sx={{ color: D.amber, fontWeight: 800 }}>Breaking news · </Box>}
                          {credibility.rating === "low" ? "Unreliable source" : credibility.rating === "medium" ? "Fairly reliable" : "Reliable source"}
                          {story.relatedTickers.length > 0 && ` · ${story.relatedTickers.join(", ")}`}
                        </Typography>
                      </Box>
                      <Typography sx={{ px: 2, pb: 2, fontSize: 14, lineHeight: 1.65, color: D.t2 }}>{story.body}</Typography>
                    </Box>
                  );
                })}
                <Box sx={{ px: 2, py: 0.75, borderTop: `1px solid ${D.border}` }}>
                  <Button component={RouterLink} to="/news" size="small" sx={{ px: 0, minHeight: 40, color: D.brandText, textTransform: "none" }}>Open News</Button>
                </Box>
              </Box>
            ) : (
              <Box sx={{ p: 2 }}>
                <Typography component="h2" sx={{ color: D.t1, fontSize: 16, fontWeight: 800 }}>After-hours news</Typography>
                <Typography sx={{ mt: 0.5, color: D.t3, fontSize: 14 }}>News appears after the market closes.</Typography>
              </Box>
            )}
          </Box>

          {/* Stock market table */}
          <Box component="section" aria-labelledby="market-stocks" data-tour="market-list" sx={{ ...CARD, gridArea: "stocks" }}>
            <Box sx={{ px: { xs: 2, sm: 3 }, py: 2, borderBottom: `1px solid ${D.border}` }}>
              <Typography id="market-stocks" component="h2" sx={{ fontWeight: 900, fontSize: 20, color: D.t1 }}>Stocks</Typography>
              {marketClosed ? (
                <Typography role="status" sx={{ fontSize: 14, color: D.amber, fontWeight: 700, mt: 0.5 }}>{MARKET_CLOSED_MESSAGE}</Typography>
              ) : !isGameComplete && gameDay <= STORY_DAYS && (
                <Typography sx={{ fontSize: 14, color: D.t3, mt: 0.5 }}>Open a stock to review its chart and risk before you trade. You can also hold cash.</Typography>
              )}
            </Box>
            <Box sx={{ px: { xs: 2, sm: 3 }, pt: 2, pb: 1 }}>
              <Stack direction="row" spacing={1} useFlexGap sx={{ mb: 1, flexWrap: { xs: "nowrap", md: "wrap" }, overflowX: { xs: "auto", md: "visible" }, scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" }, "& > *": { flexShrink: 0 } }}>
                {sectors.map((sector) => {
                  const selected = sector === selectedSector;
                  const count = sectorCounts.get(sector) ?? 0;

                  return (
                    <Chip
                      key={sector}
                      label={`${sector} (${count})`}
                      clickable
                      aria-pressed={selected}
                      onClick={() => setSelectedSector(sector)}
                      sx={{
                        height: 30,
                        borderRadius: 1.5,
                        bgcolor: selected ? D.brandBg : D.elevated,
                        border: `1px solid ${selected ? D.brandBd : D.border}`,
                        color: selected ? D.brandText : D.t2,
                        fontWeight: 900,
                        fontSize: 12,
                        "&:hover": { bgcolor: selected ? D.brandBg : D.overlay, borderColor: selected ? D.brandBd : D.borderHi },
                        "& .MuiChip-label": { px: 1.2 },
                      }}
                    />
                  );
                })}
              </Stack>
              {filteredStocks.length === 0 ? (
                <Box sx={{ p: 2, borderRadius: 2, bgcolor: D.elevated, border: `1px solid ${D.border}` }}>
                  <Typography sx={{ fontSize: 14, color: D.t3 }}>No stocks match this sector.</Typography>
                </Box>
              ) : (
                <MotionPresence mode="popLayout" initial={false}>
                  {filteredStocks.map((stock, index) => (
                    <StockRow key={stock.stockId} stock={stock}
                      animationIndex={index}
                      marketClosed={marketClosed}
                      sharesOwned={getSharesOwned(trading.account, stock.symbol)}
                      watchlisted={trading.isWatchlisted(stock.symbol)}
                      onToggleWatchlist={() => trading.toggleWatchlist(stock)}
                      onBuy={() => handleBuyStock(stock)}
                      onSell={() => handleSellStock(stock)}
                      onOpen={() => navigate(`/stocks/${stock.symbol}`, { state: { gameDay } })}
                    />
                  ))}
                </MotionPresence>
              )}
            </Box>
          </Box>

          <Stack spacing={2} sx={{ gridArea: "portfolio", minWidth: 0 }}>
            <Box component="section" id="game-portfolio" aria-label="Portfolio" tabIndex={-1} sx={{ ...CARD, scrollMarginTop: 80 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${D.border}` }}>
                <Typography component="h2" sx={{ fontWeight: 900, fontSize: 16, color: D.t1 }}>Portfolio</Typography>
                {trading.account.holdings.length > 0 && (
                  <Box sx={{ textAlign: "right" }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 800, color: portfolioToday >= 0 ? D.greenText : D.redText, fontFamily: MONO }}>
                      {portfolioToday >= 0 ? "+" : ""}{money(portfolioToday)} today
                    </Typography>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: portfolioPnL >= 0 ? D.greenText : D.redText, fontFamily: MONO }}>
                      {portfolioPnL >= 0 ? "+" : ""}{money(portfolioPnL)} since bought
                    </Typography>
                  </Box>
                )}
              </Stack>
              <Box sx={{ p: 2.5 }}>
                {trading.account.holdings.length === 0 ? (
                  <Typography sx={{ fontSize: 14, color: D.t3 }}>No shares owned yet.</Typography>
                ) : (
                  <Stack spacing={1}>
                    {trading.account.holdings.map((h) => {
                      const live = stocks.find((s) => s.symbol === h.symbol);
                      const currentPrice = live?.currentPrice ?? h.averageCost;
                      const val = currentPrice * h.shares;
                      const pnl = (currentPrice - h.averageCost) * h.shares;
                      const pnlPct = h.averageCost > 0 ? ((currentPrice - h.averageCost) / h.averageCost) * 100 : 0;
                      const heldOvernight = Math.min(h.shares, overnightShares(h.symbol, h.shares, trading.tradedToday));
                      const today = (live?.dayChange ?? 0) * heldOvernight;
                      const up = today >= 0;
                      return (
                        <Box key={h.symbol} sx={{ p: 1.8, borderRadius: 2, bgcolor: D.elevated, border: `1px solid ${up ? D.greenBd : D.redBd}` }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                            <Box>
                              <Typography sx={{ fontWeight: 900, fontSize: 14, color: D.t1, fontFamily: MONO }}>
                                {h.symbol}
                                <Typography component="span" sx={{ fontWeight: 500, fontSize: 12, color: D.t3, ml: 0.8 }}>× {h.shares}</Typography>
                              </Typography>
                              <Typography sx={{ fontSize: 12, color: D.t3 }}>Avg {money(h.averageCost)}</Typography>
                            </Box>
                            <Box sx={{ textAlign: "right" }}>
                              <Typography sx={{ fontWeight: 800, fontSize: 14, color: D.t1, fontFamily: MONO }}>{money(val)}</Typography>
                              {heldOvernight > 0 ? (
                                <Typography sx={{ fontSize: 12, fontWeight: 800, color: up ? D.greenText : D.redText }}>
                                  {today >= 0 ? "+" : ""}{money(today)} today ({pct(live?.dayChangePercent ?? 0, 1)})
                                </Typography>
                              ) : (
                                <Typography sx={{ fontSize: 12, fontWeight: 800, color: D.t3 }}>Bought today</Typography>
                              )}
                              <Typography sx={{ fontSize: 12, fontWeight: 700, color: pnl >= 0 ? D.greenText : D.redText }}>
                                {pnl >= 0 ? "+" : ""}{money(pnl)} since bought ({pct(pnlPct, 1)})
                              </Typography>
                            </Box>
                          </Stack>
                          <Button size="small" onClick={() => navigate(`/stocks/${h.symbol}`, { state: { gameDay } })}
                            sx={{ mt: 0.8, color: D.brandText, fontSize: 12, fontWeight: 700, textTransform: "none", p: 0, minWidth: "auto", minHeight: 24, height: "auto", lineHeight: 1 }}>
                            View details →
                          </Button>
                        </Box>
                      );
                    })}
                  </Stack>
                )}
              </Box>
            </Box>

            {showGoals && (
              <Box id="today-goal" tabIndex={-1} sx={{ scrollMarginTop: 80 }}>
                <TodayGoalCard day={gameDay} goals={daily.goals} completedCount={daily.completedCount}
                  error={daily.persistenceError} onRetry={daily.retryPersistence} />
              </Box>
            )}
            <Box component="details" sx={{ ...CARD, color: D.t1, "& > summary": { cursor: "pointer", p: 2, fontWeight: 700 } }}>
              <Box component="summary">Record a decision to wait</Box>
              <Box sx={{ px: 2, pb: 2 }}><DecisionNote kind="wait" /></Box>
            </Box>
            <Box component="section" id="game-tools" aria-labelledby="game-tools-heading" tabIndex={-1}
              sx={{ ...CARD, p: 2, scrollMarginTop: 80 }}>
              <Typography id="game-tools-heading" component="h2" sx={{ fontSize: 16, fontWeight: 800 }}>Game tools</Typography>
              <Stack direction="row" useFlexGap flexWrap="wrap" columnGap={1}>
                {[
                  { to: "/game/goals", label: "Goals & missions" },
                  { to: "/game/advisor", label: "Advisors" },
                  { to: "/game/living-costs", label: "Living costs" },
                  { to: "/rival", label: "Rival trader" },
                  { to: "/leaderboard", label: "Leaderboard" },
                  { to: "/learn", label: "Investing guide" },
                ].map(({ to, label }) => (
                  <Button key={to} component={RouterLink} to={to} size="small" sx={{ minHeight: 40, color: D.t2, textTransform: "none" }}>{label}</Button>
                ))}
              </Stack>
            </Box>
          </Stack>
        </Box>
        <Typography sx={{ color: D.t2, fontSize: 12, mt: 2.5, maxWidth: "75ch" }}>Fictional companies and synthetic prices. The after-hours news window pauses price reactions for learning; real markets may react immediately. Game risk scores and analyst ratings are illustrative.</Typography>
      </Container>
    </Box>
  );
}

function AchievementUnlockToast({ achievement, queuedCount, onClose }: {
  achievement: ReturnType<typeof useAchievements>["achievementNotification"];
  queuedCount: number;
  onClose: () => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <MotionPresence mode="wait">
      {achievement && (
        <Box
          component={motion.aside}
          key={achievement.id}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 80, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 60, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          role="status"
          aria-live="polite"
          sx={{
            position: "fixed",
            zIndex: 1500,
            top: { xs: 74, md: 82 },
            right: { xs: 12, md: 24 },
            width: { xs: "calc(100% - 24px)", sm: 380 },
            overflow: "hidden",
            borderRadius: 2.5,
            bgcolor: D.elevated,
            border: `1px solid ${D.brandBd}`,
            boxShadow: `0 20px 60px rgba(0,0,0,0.38), 0 0 28px ${D.brandBg}`,
          }}
        >
          <Box sx={{ height: 3, bgcolor: D.brand }} />
          <Stack direction="row" spacing={1.6} alignItems="flex-start" sx={{ p: 2 }}>
            <Box sx={{
              width: 44, height: 44, borderRadius: 2, flexShrink: 0,
              display: "grid", placeItems: "center",
              color: D.brandText, bgcolor: D.brandBg,
              border: `1px solid ${D.brandBd}`,
            }}>
              <WorkspacePremiumIcon />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.1, color: D.brandText, fontFamily: MONO }}>
                ACHIEVEMENT UNLOCKED
              </Typography>
              <Typography sx={{ mt: 0.35, fontSize: 16, fontWeight: 900, color: D.t1 }}>
                {achievement.title}
              </Typography>
              <Typography sx={{ mt: 0.35, fontSize: 14, lineHeight: 1.5, color: D.t2 }}>
                {achievement.description}
              </Typography>
              <Chip
                size="small"
                label={achievement.reward}
                sx={{ mt: 1.1, height: 23, bgcolor: D.greenBg, color: D.greenText, border: `1px solid ${D.greenBd}`, fontSize: 12, fontWeight: 900 }}
              />
              <Typography sx={{ mt: 0.8, fontSize: 12, color: D.t3 }}>
                {achievement.achievedByPercent.toFixed(1)}% of players unlocked this
              </Typography>
              {queuedCount > 1 && (
                <Typography component="span" sx={{ ml: 1, fontSize: 12, color: D.t3 }}>
                  +{queuedCount - 1} more
                </Typography>
              )}
            </Box>
            <IconButton size="small" aria-label="Dismiss achievement notification" onClick={onClose} sx={{ mt: -0.5, mr: -0.5, color: D.t3, "&:hover": { color: D.t1, bgcolor: D.overlay } }}>
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Stack>
        </Box>
      )}
    </MotionPresence>
  );
}

function CommandConsole({ open, onClose, onRun }: {
  open: boolean;
  onClose: () => void;
  onRun: (command: string) => string | Promise<string>;
}) {
  const [command, setCommand] = useState("");
  const [history, setHistory] = useState<string[]>(["session active"]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const submitCommand = async () => {
    const trimmed = command.trim();
    if (!trimmed || running) return;

    setCommand("");
    setRunning(true);
    try {
      const output = await onRun(trimmed);
      setHistory((current) => [`> ${trimmed}`, output, ...current].slice(0, 8));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Command failed.";
      setHistory((current) => [`> ${trimmed}`, message, ...current].slice(0, 8));
    } finally {
      setRunning(false);
    }
  };

  if (!open) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        left: { xs: 12, md: 24 },
        right: { xs: 12, md: "auto" },
        bottom: { xs: 12, md: 24 },
        width: { xs: "auto", md: 520 },
        zIndex: 1400,
        ...CARD,
        overflow: "hidden",
        boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${D.border}` }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <CodeIcon sx={{ fontSize: 18, color: D.brandText }} />
          <Typography sx={{ fontWeight: 900, fontSize: 12, color: D.t2, fontFamily: MONO }}>dev</Typography>
        </Stack>
        <IconButton size="small" aria-label="Close developer console" onClick={onClose} sx={{ color: D.t3, "&:hover": { color: D.t1 } }}>
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Stack>

      <Box sx={{ p: 2 }}>
        <TextField
          autoFocus
          fullWidth
          size="small"
          disabled={running}
          value={command}
          placeholder={running ? "Running…" : ""}
          onChange={(event) => setCommand(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void submitCommand();
            }
          }}
          inputProps={{ sx: { fontFamily: MONO, fontSize: 14 } }}
          sx={{
            mb: 1,
            "& .MuiOutlinedInput-root": {
              bgcolor: D.bg,
              color: D.t1,
              borderRadius: 1.5,
              "& fieldset": { borderColor: D.border },
              "&:hover fieldset": { borderColor: D.borderHi },
              "&.Mui-focused fieldset": { borderColor: D.brand },
            },
          }}
        />

        <Box sx={{ minHeight: 96, maxHeight: 148, overflow: "auto", p: 1.3, borderRadius: 1.5, bgcolor: D.bg, border: `1px solid ${D.border}` }}>
          {history.map((line, index) => (
            <Typography key={`${line}-${index}`} sx={{ fontSize: 12, color: line.startsWith(">") ? D.brandText : D.t2, fontFamily: MONO, lineHeight: 1.7 }}>
              {line}
            </Typography>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function StockRow({ stock, animationIndex, marketClosed, sharesOwned, watchlisted, onBuy, onSell, onToggleWatchlist, onOpen }: {
  stock: Stock; animationIndex: number; marketClosed: boolean; sharesOwned: number; watchlisted: boolean; onBuy: () => void; onSell: () => void; onToggleWatchlist: () => void; onOpen: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const up = stock.dayChangePercent >= 0;
  const risk = stock.riskLevel === "High" ? { fg: D.amber, bg: D.amberBg }
    : stock.riskLevel === "Medium" ? { fg: D.amber, bg: "transparent" }
    : { fg: D.t3, bg: "transparent" };
  return (
    <Box data-tour={stock.symbol === "CAI" ? "tutorial-stock" : animationIndex === 0 ? "first-stock" : undefined} component={motion.div} layout={!reduceMotion} initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -16 }} transition={{ duration: 0.22, delay: Math.min(animationIndex * 0.025, 0.16), layout: { type: "spring", stiffness: 420, damping: 34 } }}
      onClick={onOpen}
      sx={{
        display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr) auto auto", md: "1.4fr 0.9fr auto" },
        gap: { xs: 1, sm: 2 }, alignItems: "center", py: { xs: 1.25, sm: 1.5 },
        borderBottom: `1px solid ${D.border}`, "&:last-of-type": { borderBottom: "none" },
        cursor: "pointer", outline: "none",
        transition: "background-color 160ms",
        "&:hover": { bgcolor: D.elevated },
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={{ xs: 0.5, sm: 1.5 }} alignItems="center">
          <IconButton
            size="small"
            title={watchlisted ? "Remove from watchlist" : "Add to watchlist"}
            aria-label={watchlisted ? "Remove from watchlist" : "Add to watchlist"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleWatchlist();
            }}
            sx={{
              width: { xs: 32, sm: 34 },
              height: { xs: 44, sm: 34 },
              flexShrink: 0,
              borderRadius: 1.5,
              color: watchlisted ? D.amber : D.t3,
              border: { xs: "none", sm: `1px solid ${watchlisted ? D.amber : D.border}` },
              bgcolor: watchlisted ? D.amberBg : D.elevated,
              "&:hover": { color: D.amber, borderColor: D.amber, bgcolor: D.amberBg },
            }}
          >
            {watchlisted ? <StarIcon sx={{ fontSize: 18 }} /> : <StarBorderIcon sx={{ fontSize: 18 }} />}

          </IconButton>
          {/* Testers found the old row's P/E, growth and day labels confusing;
              those figures live on the stock's page now. */}
          {/* The row's click opens the stock; this is the keyboard and screen-reader way in. */}
          <ButtonBase aria-label={`Open ${stock.name}`} sx={{ display: "block", textAlign: "left", minWidth: 0, minHeight: 24, borderRadius: 1, "&:focus-visible": { outline: `2px solid ${D.brand}`, outlineOffset: 2 } }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography component="span" sx={{ fontWeight: 900, fontSize: 14, color: D.t1, fontFamily: MONO }}>{stock.symbol}</Typography>
              <Chip size="small" label={<>{stock.riskLevel}<Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}> risk</Box></>} title="How much this stock's price tends to swing"
                sx={{ height: 20, fontSize: 12, fontWeight: 800, bgcolor: risk.bg, color: risk.fg }} />
            </Stack>
            <Typography noWrap component="span" sx={{ display: "block", fontSize: 14, color: D.t2 }}>{stock.name}<Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}> · {stock.sector}</Box></Typography>
            {sharesOwned > 0 && <Typography component="span" sx={{ display: "block", fontSize: 12, color: D.t2, fontWeight: 800 }}>You own {sharesOwned} share{sharesOwned === 1 ? "" : "s"}</Typography>}
          </ButtonBase>
        </Stack>
      </Box>

      <Box sx={{ textAlign: "right" }}>
        <Typography sx={{ fontWeight: 900, fontSize: 14, color: D.t1, fontFamily: MONO }}>{money(stock.currentPrice)}</Typography>
        <Typography sx={{ fontSize: 14, color: isFlat(stock.dayChangePercent) ? D.t2 : up ? D.greenText : D.redText, fontWeight: 800 }}>{pct(stock.dayChangePercent)}</Typography>
        <Typography sx={{ display: { xs: "none", sm: "block" }, fontSize: 12, color: D.t3 }}>{stock.dayChange > 0 ? "+" : ""}{money(stock.dayChange)} today</Typography>
      </Box>

      <Stack direction="row" spacing={1} justifyContent="flex-end">
        <Button size="small" variant="outlined" disabled={marketClosed} onClick={(e) => { e.stopPropagation(); onBuy(); }}
          sx={{ color: D.t1, borderColor: D.borderHi, fontWeight: 800, fontSize: 12, textTransform: "none", borderRadius: 1.5, boxShadow: "none", minWidth: { xs: 44, sm: 52 }, minHeight: { xs: 44, sm: 36 }, px: { xs: 0.5, sm: 1 }, "&:hover": { color: readableOn(D.green), bgcolor: D.green, borderColor: D.green, boxShadow: "none" }, "&.Mui-disabled": { borderColor: D.border, color: D.t3 } }}>
          Buy
        </Button>
        <Button size="small" variant="outlined" disabled={marketClosed || sharesOwned === 0} onClick={(e) => { e.stopPropagation(); onSell(); }}
          sx={{ color: D.t1, borderColor: D.borderHi, fontWeight: 800, fontSize: 12, textTransform: "none", borderRadius: 1.5, boxShadow: "none", minWidth: { xs: 44, sm: 52 }, minHeight: { xs: 44, sm: 36 }, px: { xs: 0.5, sm: 1 }, "&:hover": { color: readableOn(D.red), bgcolor: D.red, borderColor: D.red, boxShadow: "none" }, "&.Mui-disabled": { borderColor: D.border, color: D.t3 } }}>
          Sell
        </Button>
      </Stack>
    </Box>
  );
}

function TradeDialog({ stock, mode, cash, sharesOwned, marketClosed, getQuote, onClose, onConfirm, error }: {
  error: string | null;
  stock: Stock;
  mode: "buy" | "sell";
  marketClosed: boolean;
  cash: number;
  sharesOwned: number;
  getQuote: (quantity: number) => { basePrice: number; effectivePrice: number; slippage: number; total: number };
  onClose: () => void;
  onConfirm: (quantity: number, journal?: TradeJournalInput) => Promise<void>;
}) {
  const reduceMotion = useReducedMotion();
  // Max has to be priced *with* slippage. Spending the whole cash balance is
  // ~100% of net worth, far past SLIPPAGE_THRESHOLD, so floor(cash / price)
  // always costs more than the cash on hand -- Max set a quantity whose total
  // exceeded the balance and the confirm button rendered permanently disabled.
  // getQuote's total is non-decreasing in quantity, so binary-search the
  // largest affordable one instead of dividing at the base price.
  const maxQty = useMemo(() => {
    if (mode !== "buy") return Math.max(0, sharesOwned);
    // Clamp to 1 so the stepper stays usable; canConfirm still blocks the buy.
    return Math.max(
      1,
      getMaxAffordableQuantity(cash, stock.currentPrice, (q) => getQuote(q).total)
    );
  }, [cash, getQuote, mode, sharesOwned, stock.currentPrice]);
  const [quantity, setQuantity] = useState(1);
  // onConfirm resolves the trade RPC before closing the dialog, so without this
  // the confirm button stays live for the whole round trip and a double-click
  // sends two execute_trade calls, spending twice what the dialog showed.
  const [submitting, setSubmitting] = useState(false);
  const [thesis, setThesis] = useState("");
  const [exitPlan, setExitPlan] = useState("");
  const [horizonDays, setHorizonDays] = useState(3);
  const qty = Math.min(Math.max(1, quantity), maxQty);
  const quote = getQuote(qty);
  const total = quote.total;
  const hasSlippage = quote.slippage > 0.001;
  const canConfirm = mode === "buy" ? cash >= total : sharesOwned >= qty;
  const isBuy = mode === "buy";

  const adjust = (delta: number) => setQuantity((q) => Math.min(maxQty, Math.max(1, q + delta)));

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { bgcolor: D.surface, border: `1px solid ${D.border}`, borderRadius: 3, overflow: "hidden" } }}>
      <DialogTitle sx={{ bgcolor: D.elevated, borderBottom: `1px solid ${D.border}`, p: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography sx={{ fontWeight: 900, fontSize: 18, color: D.t1 }}>
              {isBuy ? "Buy" : "Sell"} {stock.symbol}
            </Typography>
            <Typography sx={{ fontSize: 14, color: D.t3 }}>{stock.name}</Typography>
          </Box>
          <IconButton size="small" aria-label="Close trade dialog" onClick={onClose} sx={{ color: D.t3, "&:hover": { color: D.t1 } }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ bgcolor: D.bg, p: 2.5 }}>
        {error && <Typography role="alert" sx={{ color: D.redText, mb: 2 }}>{error}</Typography>}
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Stack direction="row" justifyContent="space-between">
            <Typography sx={{ fontSize: 14, color: D.t3 }}>Price per share</Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 800, color: D.t1, fontFamily: MONO }}>{money(stock.currentPrice)}</Typography>
          </Stack>
          {isBuy ? (
            <Stack direction="row" justifyContent="space-between">
              <Typography sx={{ fontSize: 14, color: D.t3 }}>Available cash</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 800, color: D.t1, fontFamily: MONO }}>{money(cash)}</Typography>
            </Stack>
          ) : (
            <Stack direction="row" justifyContent="space-between">
              <Typography sx={{ fontSize: 14, color: D.t3 }}>Shares owned</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 800, color: D.t1, fontFamily: MONO }}>{sharesOwned}</Typography>
            </Stack>
          )}

          <Divider sx={{ borderColor: D.border }} />

          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 900, color: D.t3, fontFamily: MONO, mb: 1.2 }}>QUANTITY</Typography>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <IconButton size="small" aria-label="Decrease share quantity" onClick={() => adjust(-1)} disabled={qty <= 1}
                sx={{ bgcolor: D.elevated, border: `1px solid ${D.border}`, color: D.t2, borderRadius: 1.5,
                  "&:hover": { bgcolor: D.overlay, color: D.t1 }, "&.Mui-disabled": { color: D.t3 } }}>
                <RemoveIcon sx={{ fontSize: 16 }} />
              </IconButton>
              <TextField
                size="small"
                value={qty}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!Number.isNaN(v)) setQuantity(v);
                }}
                inputProps={{ min: 1, max: maxQty, "aria-label": "Share quantity", sx: { textAlign: "center", fontFamily: MONO, fontWeight: 900, fontSize: 18, py: 0.8 } }}
                sx={{
                  width: 80,
                  "& .MuiOutlinedInput-root": {
                    bgcolor: D.elevated, color: D.t1, borderRadius: 1.5,
                    "& fieldset": { borderColor: D.border },
                    "&:hover fieldset": { borderColor: D.borderHi },
                    "&.Mui-focused fieldset": { borderColor: D.brand },
                  },
                }}
              />
              <IconButton size="small" aria-label="Increase share quantity" onClick={() => adjust(1)} disabled={qty >= maxQty}
                sx={{ bgcolor: D.elevated, border: `1px solid ${D.border}`, color: D.t2, borderRadius: 1.5,
                  "&:hover": { bgcolor: D.overlay, color: D.t1 }, "&.Mui-disabled": { color: D.t3 } }}>
                <AddIcon sx={{ fontSize: 16 }} />
              </IconButton>
              <Button size="small" onClick={() => setQuantity(maxQty)} disabled={qty >= maxQty}
                sx={{ color: D.brandText, fontSize: 12, fontWeight: 800, textTransform: "none", px: 1 }}>
                Max
              </Button>
            </Stack>
            {quantity > maxQty && (
              <Typography role="status" sx={{ mt: 1, fontSize: 14, color: D.t2 }}>
                {isBuy
                  ? `Changed to ${maxQty}: the most your cash covers, including execution costs.`
                  : `Changed to ${maxQty}: the number of shares you own.`}
              </Typography>
            )}
          </Box>

          <Box sx={{ p: 2, borderRadius: 2, bgcolor: isBuy ? D.greenBg : D.redBg, border: `1px solid ${isBuy ? D.greenBd : D.redBd}` }}>
            <Stack direction="row" justifyContent="space-between">
              <Typography sx={{ fontSize: 14, color: D.t2, fontWeight: 700 }}>
                {isBuy ? "Total cost" : "Total proceeds"}
              </Typography>
              <motion.div key={total} initial={reduceMotion ? false : { opacity: 0, scale: 0.9, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 500, damping: 28 }}>
                <Typography sx={{ fontSize: 18, fontWeight: 900, color: isBuy ? D.greenText : D.redText, fontFamily: MONO }}>
                  {money(total)}
                </Typography>
              </motion.div>
            </Stack>
            {isBuy && (
              <Typography sx={{ fontSize: 12, color: D.t3, mt: 0.5 }}>
                Remaining: {money(cash - total)}
              </Typography>
            )}
          </Box>

          {hasSlippage && (
            <Box sx={{ p: 1.6, borderRadius: 2, bgcolor: D.amberBg, border: `1px solid ${D.amber}` }}>
              <Typography sx={{ fontSize: 12, color: D.amber, fontWeight: 700 }}>
                This trade is large relative to your net worth, so this game applies a {(quote.slippage * 100).toFixed(1)}% execution penalty
                ({money(quote.effectivePrice)}/share instead of {money(quote.basePrice)}). This account-size penalty is a game-balancing rule. Real execution costs depend on market conditions and the order.
              </Typography>
            </Box>
          )}

          <Box sx={{ p: 2, borderRadius: 2, bgcolor: D.elevated, border: `1px solid ${D.border}` }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 900, color: D.t1 }}>Decision journal</Typography>
                <Typography sx={{ fontSize: 12, color: D.t3 }}>Optional · a price-outcome review arrives at your horizon. Reflect on your plan on the Dashboard.</Typography>
              </Box>
              <Chip size="small" label="LEARNING" sx={{ bgcolor: D.brandBg, color: D.brandText, fontSize: 12, fontWeight: 900, fontFamily: MONO }} />
            </Stack>
            <TextField fullWidth size="small" multiline minRows={2} value={thesis} onChange={(event) => setThesis(event.target.value.slice(0, 500))}
              placeholder={isBuy ? "Why do you expect this investment to work?" : "Why are you exiting now?"}
              inputProps={{ "aria-label": "Reason for this decision" }}
              sx={{ mb: 1.25, "& .MuiOutlinedInput-root": { color: D.t1, fontSize: 14, bgcolor: D.surface, "& fieldset": { borderColor: D.border }, "&:hover fieldset": { borderColor: D.borderHi }, "&.Mui-focused fieldset": { borderColor: D.brand } } }} />
            <Typography sx={{ fontSize: 12, fontWeight: 900, color: D.t3, fontFamily: MONO, mb: .75 }}>TIME HORIZON</Typography>
            <Stack direction="row" spacing={.75} sx={{ mb: 1.25 }}>
              {[{ label: "3 days", days: 3 }, { label: "10 days", days: 10 }, { label: "30 days", days: 30 }].map((item) => (
                <Button key={item.days} size="small" onClick={() => setHorizonDays(item.days)}
                  sx={{ minWidth: 0, px: 1.2, py: .45, borderRadius: 99, textTransform: "none", fontSize: 12, fontWeight: 800, color: horizonDays === item.days ? D.brandText : D.t3, bgcolor: horizonDays === item.days ? D.brandBg : "transparent", border: `1px solid ${horizonDays === item.days ? D.brandBd : D.border}` }}>
                  {item.label}
                </Button>
              ))}
            </Stack>
            <TextField fullWidth size="small" value={exitPlan} onChange={(event) => setExitPlan(event.target.value.slice(0, 500))}
              placeholder="What would prove this decision wrong?"
              inputProps={{ "aria-label": "Trade exit rule" }}
              sx={{ "& .MuiOutlinedInput-root": { color: D.t1, fontSize: 14, bgcolor: D.surface, "& fieldset": { borderColor: D.border }, "&:hover fieldset": { borderColor: D.borderHi }, "&.Mui-focused fieldset": { borderColor: D.brand } } }} />
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ bgcolor: D.elevated, borderTop: `1px solid ${D.border}`, p: 2 }}>
        {marketClosed && (
          <Typography role="status" sx={{ mr: "auto", fontSize: 14, color: D.amber, fontWeight: 800 }}>
            {MARKET_CLOSED_MESSAGE}
          </Typography>
        )}
        <Button onClick={onClose}
          sx={{ color: D.t3, fontWeight: 700, textTransform: "none", borderRadius: 1.5, "&:hover": { color: D.t1, bgcolor: D.overlay } }}>
          Cancel
        </Button>
        <Button variant="contained" disabled={!canConfirm || submitting || marketClosed}
          onClick={async () => {
            if (submitting) return;
            setSubmitting(true);
            try { await onConfirm(qty, (thesis.trim() || exitPlan.trim()) ? { thesis, horizonDays, exitPlan } : undefined); }
            finally { setSubmitting(false); }
          }}
          sx={{
            bgcolor: isBuy ? D.green : D.red, color: readableOn(isBuy ? D.green : D.red), fontWeight: 800, textTransform: "none",
            borderRadius: 1.5, boxShadow: "none", px: 3,
            "&:hover": { bgcolor: isBuy ? D.green : D.red, filter: "brightness(0.9)", boxShadow: "none" },
            "&.Mui-disabled": { bgcolor: D.overlay, color: D.t3 },
          }}>
          {isBuy ? "Buy" : "Sell"} {qty} share{qty === 1 ? "" : "s"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
