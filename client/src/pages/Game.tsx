import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Avatar, Box, Button, Chip, Container, Dialog, DialogActions, DialogContent, DialogTitle,
  CircularProgress, Divider, Grid, IconButton, LinearProgress, Stack, TextField, Typography,
} from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ShieldIcon from "@mui/icons-material/Shield";
import NewspaperIcon from "@mui/icons-material/Newspaper";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import StorefrontIcon from "@mui/icons-material/Storefront";
import CloseIcon from "@mui/icons-material/Close";
import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import CodeIcon from "@mui/icons-material/Code";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AllInclusiveIcon from "@mui/icons-material/AllInclusive";
import TimerIcon from "@mui/icons-material/Timer";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import FlagIcon from "@mui/icons-material/Flag";
import SportsMmaIcon from "@mui/icons-material/SportsMma";
import MilitaryTechIcon from "@mui/icons-material/MilitaryTech";
import { Link as RouterLink, useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import {
  getNewsCredibility, getOpeningStoryDays, STORY_DAYS, Stock,
} from "../data/mockStocks";
import { getNetWorth, getPortfolioValue, getSharesOwned } from "../data/tradingState";
import { GameMode, useGame } from "../context/GameContext";
import { useAchievements } from "../hooks/useAchievements";
import { useDailyGoals } from "../hooks/useDailyGoals";
import { useBills } from "../hooks/useBills";
import { useMissions } from "../hooks/useMissions";
import { useRivalTrader } from "../hooks/useRivalTrader";
import { useLevel } from "../hooks/useLevel";
import { fetchLeaderboard } from "../lib/api";
import { addInboxMessage } from "../lib/inbox";
import { useAuth } from "../context/AuthContext";
import { D, CARD, MONO, money, pct } from "../theme/design";

const DEV_CONSOLE_ENABLED = process.env.NODE_ENV !== "production";
const BRIEFING_DISMISSED_KEY = "stockpilot-hide-opening-briefing";
// Framer Motion 11 predates React 19's stricter JSX return type.
const MotionPresence = AnimatePresence as React.FC<React.PropsWithChildren<{
  initial?: boolean;
  mode?: "sync" | "popLayout" | "wait";
}>>;

type MiniLeaderEntry = { rank: number; username: string; net_worth: number; user_id: string };

export default function Game() {
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [briefingOpen, setBriefingOpen] = useState(false);
  const autoBriefingChecked = useRef(false);
  const [devConsoleOpen, setDevConsoleOpen] = useState(false);
  const [tradeMessage, setTradeMessage] = useState("");
  const [tradeDialog, setTradeDialog] = useState<{ stock: Stock; mode: "buy" | "sell" } | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedSector = searchParams.get("sector") ?? "All";
  const setSelectedSector = useCallback((sector: string) => {
    setSearchParams(sector === "All" ? {} : { sector }, { replace: true });
  }, [setSearchParams]);
  const [topPlayers, setTopPlayers] = useState<MiniLeaderEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const trading = useGame();
  const {
    achievementNotification,
    queuedNotificationCount,
    dismissAchievementNotification,
    achievementIds,
    devUnlockAchievements,
    devClearAchievements,
  } = useAchievements();
  const dailyGoals = useDailyGoals();
  const missions = useMissions();
  const bills = useBills();
  const rival = useRivalTrader();
  const level = useLevel();
  const [missionsHidden, setMissionsHidden] = useState(
    () => localStorage.getItem("stockpilot-missions-hidden") === "1"
  );
  const {
    gameDay, gameMode, isGameComplete, maxGameDay, setGameDay,
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
  const openingStories = useMemo(() => getOpeningStoryDays(), []);
  const portfolioValue = useMemo(() => getPortfolioValue(trading.account, stocks), [trading.account, stocks]);
  const netWorth = useMemo(() => getNetWorth(trading.account, stocks), [trading.account, stocks]);
  const portfolioPnL = useMemo(() =>
    trading.account.holdings.reduce((sum, h) => {
      const live = stocks.find((s) => s.symbol === h.symbol);
      return sum + ((live?.currentPrice ?? h.averageCost) - h.averageCost) * h.shares;
    }, 0),
    [trading.account.holdings, stocks],
  );

  const marketSummary = useMemo(() => {
    const gainers = stocks.filter((s) => s.dayChangePercent >= 0).length;
    const losers = stocks.length - gainers;
    const averageMove = stocks.length
      ? stocks.reduce((sum, s) => sum + s.dayChangePercent, 0) / stocks.length
      : 0;
    return { gainers, losers, averageMove };
  }, [stocks]);
  const modeLabel = gameMode === "limited_30" ? "30-Day Challenge" : "Infinite";
  const modeDescription = gameMode === "limited_30"
    ? "A focused 30-day scoring run. Rankings use your best net worth at the finish."
    : "An open-ended sandbox. Keep advancing days as long as you want.";
  const gameLoopTips = gameMode === "limited_30"
    ? [
        "Use the first 3 days to learn the market story.",
        "Build a position before the 30-day clock runs out.",
        "Your best net worth drives the leaderboard.",
        "Start a new challenge when Day 30 ends.",
      ]
    : [
        "Use the first 3 days to learn the market story.",
        "Open stock details before buying.",
        "Compare P/E, growth, debt, and margin.",
        "Advance as many days as you want.",
      ];

  useEffect(() => {
    if (!sectors.includes(selectedSector)) setSelectedSector("All");
  }, [selectedSector, sectors, setSelectedSector]);

  useEffect(() => {
    if (trading.loading || autoBriefingChecked.current) return;

    autoBriefingChecked.current = true;
    const briefingDismissed =
      localStorage.getItem(BRIEFING_DISMISSED_KEY) === "true";

    if (gameDay <= STORY_DAYS && !briefingDismissed) {
      setBriefingOpen(true);
    }
  }, [gameDay, trading.loading]);

  useEffect(() => {
    if (gameDay > STORY_DAYS) setBriefingOpen(false);
  }, [gameDay]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await syncSessionValue();
      if (cancelled) return;

      let rows: Array<{ user_id: string; best_net_worth: number | string; username: string | null; display_name: string | null }>;
      try {
        rows = await fetchLeaderboard(50);
      } catch {
        return;
      }
      if (cancelled) return;

      setTopPlayers(rows.slice(0, 5).map((r, i) => ({
        rank: i + 1,
        username: r.username ?? r.display_name ?? "Anonymous",
        net_worth: Number(r.best_net_worth),
        user_id: r.user_id,
      })));
      const myIdx = user ? rows.findIndex((r) => r.user_id === user.id) : -1;
      setMyRank(myIdx >= 0 ? myIdx + 1 : null);
    })();

    return () => {
      cancelled = true;
    };
  }, [netWorth, syncSessionValue, user]);

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
    if (!user || todayNews.length === 0) return;
    const top = [...todayNews].sort((a, b) => (a.importance === b.importance ? 0 : a.importance === "High" ? -1 : 1))[0];
    addInboxMessage(user.id, {
      id: `news-digest-${user.id}-day-${gameDay}`,
      from: top.source || "Market Wire",
      subject: `Day ${gameDay} market wrap: ${top.headline}`,
      body: `${top.body}\n\n${todayNews.length > 1 ? `${todayNews.length - 1} more stor${todayNews.length - 1 === 1 ? "y" : "ies"} moved the market today — check the News page.` : ""}`,
      category: "system",
    });
  }, [todayNews, gameDay, user]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) return;
      if (e.key === "ArrowRight" && !isGameComplete) {
        e.preventDefault();
        void setGameDay((d) => d + 1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isGameComplete, setGameDay]);

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

  if (trading.loading) {
    return (
      <Box sx={{ bgcolor: D.bg, minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <CircularProgress sx={{ color: D.brandText }} />
      </Box>
    );
  }

  const handleNextDay = () => {
    if (isGameComplete) return;
    void setGameDay((d) => d + 1);
  };
  const handleNewRun = (mode: GameMode) => {
    void trading.resetAccount(mode);
  };
  const handleDismissBriefing = () => {
    localStorage.setItem(BRIEFING_DISMISSED_KEY, "true");
    setBriefingOpen(false);
  };

  const handleBuyStock = (stock: Stock) => setTradeDialog({ stock, mode: "buy" });
  const handleSellStock = (stock: Stock) => setTradeDialog({ stock, mode: "sell" });

  const handleTradeConfirm = async (stock: Stock, mode: "buy" | "sell", quantity: number) => {
    const quote = trading.getTradeQuote(stock, mode, quantity);
    const fn = mode === "buy" ? trading.buyStock : trading.sellStock;
    const ok = await fn(stock, quantity);
    const shares = `${quantity} share${quantity === 1 ? "" : "s"}`;
    const total = money(quote.total);
    setTradeMessage(
      ok
        ? `${mode === "buy" ? "Bought" : "Sold"} ${shares} of ${stock.symbol} for ${total}.`
        : mode === "buy"
          ? `Not enough cash to buy ${shares} of ${stock.symbol}.`
          : `Not enough shares to sell.`
    );
    setTradeDialog(null);
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

    if (action === "cash" || action === "money") {
      const mode = arg1.toLowerCase();
      const amount = Number(arg2 || arg1);

      if (Number.isNaN(amount)) return "Rejected.";

      if (["increase", "inc", "add", "+", "up"].includes(mode)) {
        void trading.addCash(Math.abs(amount));
        return "Applied.";
      }

      if (["decrease", "dec", "subtract", "sub", "-", "down"].includes(mode)) {
        void trading.addCash(-Math.abs(amount));
        return "Applied.";
      }

      if (["set", "=", "to"].includes(mode)) {
        void trading.setCash(amount);
        return "Applied.";
      }

      if (arg1.startsWith("+") || arg1.startsWith("-")) {
        void trading.addCash(Number(arg1));
        return "Applied.";
      }

      void trading.setCash(amount);
      return "Applied.";
    }

    if (action === "day") {
      const mode = arg1.toLowerCase();
      const value = Number(arg2 || arg1);
      if (!arg1 || Number.isNaN(value) || value < 1) return "Rejected.";

      if (["increase", "inc", "add", "+", "up"].includes(mode)) {
        setGameDay((current) => Math.max(1, current + Math.floor(value)));
      } else if (["decrease", "dec", "subtract", "sub", "-", "down"].includes(mode)) {
        setGameDay((current) => Math.max(1, current - Math.floor(value)));
      } else {
        setGameDay(Math.floor(value));
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

    if (action === "shares") {
      const symbol = arg1.toUpperCase();
      const shares = Number(tokens[tokens.length - 1]);
      const stock = stocks.find((item) => item.symbol === symbol);
      if (!symbol || Number.isNaN(shares)) return "Rejected.";
      if (!stock) return `Unknown ticker: ${symbol}.`;
      void trading.setHolding(stock, shares);
      return "Applied.";
    }

    if (action === "reset") {
      const target = arg1.toLowerCase();
      if (target === "cash") {
        void trading.setCash(2000);
        return "Applied.";
      }
      if (target === "day") {
        setGameDay(1);
        if (localStorage.getItem(BRIEFING_DISMISSED_KEY) !== "true") {
          setBriefingOpen(true);
        }
        return "Applied.";
      }
      if (target === "all") {
        void trading.resetAccount(gameMode);
        setGameDay(1);
        if (localStorage.getItem(BRIEFING_DISMISSED_KEY) !== "true") {
          setBriefingOpen(true);
        }
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
      <OpeningBriefingDialog
        open={briefingOpen}
        onClose={() => setBriefingOpen(false)}
        onDontShowAgain={handleDismissBriefing}
        stories={openingStories}
      />
      {tradeDialog && (
        <TradeDialog
          stock={tradeDialog.stock}
          mode={tradeDialog.mode}
          cash={trading.account.cash}
          sharesOwned={getSharesOwned(trading.account, tradeDialog.stock.symbol)}
          getQuote={(qty) => trading.getTradeQuote(tradeDialog.stock, tradeDialog.mode, qty)}
          onClose={() => setTradeDialog(null)}
          onConfirm={(qty) => handleTradeConfirm(tradeDialog.stock, tradeDialog.mode, qty)}
        />
      )}
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

      {/* Hero */}
      <Box sx={{ bgcolor: D.surface, borderBottom: `1px solid ${D.border}` }}>
        <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={7}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.2 }}>
                <motion.div key={gameDay} initial={reduceMotion ? false : { opacity: 0, y: -8, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 420, damping: 24 }}>
                  <Chip label={`DAY ${gameDay}${maxGameDay ? ` / ${maxGameDay}` : ""}`} size="small"
                    sx={{ bgcolor: gameDay <= STORY_DAYS ? D.redBg : D.brandBg, color: gameDay <= STORY_DAYS ? D.redText : D.brandText, border: `1px solid ${gameDay <= STORY_DAYS ? D.redBd : D.brandBd}`, fontWeight: 900, fontSize: 10, fontFamily: MONO, letterSpacing: 1 }} />
                </motion.div>
                <Chip icon={gameMode === "limited_30" ? <TimerIcon sx={{ fontSize: 14 }} /> : <AllInclusiveIcon sx={{ fontSize: 14 }} />}
                  label={modeLabel} size="small"
                  sx={{ bgcolor: D.elevated, color: D.t2, border: `1px solid ${D.border}`, fontWeight: 900, fontSize: 10, fontFamily: MONO, letterSpacing: 1 }} />
                <Chip icon={<MilitaryTechIcon sx={{ fontSize: 14 }} />}
                  label={`LEVEL ${level.level} · ${level.progressPercent}%`} size="small"
                  sx={{ bgcolor: D.brandBg, color: D.brandText, border: `1px solid ${D.brandBd}`, fontWeight: 900, fontSize: 10, fontFamily: MONO, letterSpacing: 1 }} />
              </Stack>
              <Typography sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 950, color: D.t1, letterSpacing: -1, mb: 1 }}>Stock Market Simulator</Typography>
              <Typography sx={{ fontSize: 13, color: D.t2, mb: 2.5 }}>
                {modeDescription}
              </Typography>
              <Stack direction="row" spacing={1.2} flexWrap="wrap" useFlexGap>
                <motion.div whileHover={reduceMotion ? undefined : { y: -2 }} whileTap={reduceMotion ? undefined : { scale: 0.96 }}>
                  <Button onClick={handleNextDay} variant="contained" disabled={isGameComplete}
                    title={isGameComplete ? undefined : "Advance to next day (→)"}
                    sx={{ bgcolor: D.brand, fontWeight: 800, textTransform: "none", borderRadius: 1.5, boxShadow: "none", "&:hover": { bgcolor: D.brandMid, boxShadow: "0 8px 24px rgba(124,58,237,0.24)" }, "&.Mui-disabled": { bgcolor: D.overlay, color: D.t3 } }}>
                    {isGameComplete ? "Run Complete" : "Next Day →"}
                  </Button>
                </motion.div>
                <Button onClick={() => handleNewRun("infinite")} startIcon={<AllInclusiveIcon />}
                  sx={{ color: D.t2, border: `1px solid ${D.border}`, fontWeight: 700, textTransform: "none", borderRadius: 1.5, "&:hover": { color: D.t1, borderColor: D.borderHi, bgcolor: D.overlay } }}>
                  Infinite
                </Button>
                <Button onClick={() => handleNewRun("limited_30")} startIcon={<TimerIcon />}
                  sx={{ color: D.t2, border: `1px solid ${D.border}`, fontWeight: 700, textTransform: "none", borderRadius: 1.5, "&:hover": { color: D.t1, borderColor: D.borderHi, bgcolor: D.overlay } }}>
                  30-Day
                </Button>
                {gameDay <= STORY_DAYS && (
                  <Button onClick={() => setBriefingOpen(true)} startIcon={<AutoStoriesIcon />}
                    sx={{ color: D.t2, border: `1px solid ${D.border}`, fontWeight: 700, textTransform: "none", borderRadius: 1.5, "&:hover": { color: D.t1, borderColor: D.borderHi, bgcolor: D.overlay } }}>
                    Briefing
                  </Button>
                )}
              </Stack>
            </Grid>
            <Grid item xs={12} md={5}>
              <Box sx={{ ...CARD, p: 3 }}>
                <Typography sx={{ fontSize: 10.5, fontWeight: 900, color: D.t3, fontFamily: MONO, mb: 1 }}>MARKET STATUS</Typography>
                <motion.div key={`market-${gameDay}`} initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32 }}>
                  <Typography sx={{ fontSize: 32, fontWeight: 950, color: marketSummary.averageMove >= 0 ? D.greenText : D.redText, fontFamily: MONO, lineHeight: 1, mb: 1 }}>
                    {pct(marketSummary.averageMove)}
                  </Typography>
                </motion.div>
                <Chip size="small" icon={marketSummary.averageMove >= 0 ? <TrendingUpIcon sx={{ fontSize: 14 }} /> : <TrendingDownIcon sx={{ fontSize: 14 }} />}
                  label={marketSummary.averageMove >= 0 ? "Positive Day" : "Negative Day"}
                  sx={{ bgcolor: marketSummary.averageMove >= 0 ? D.greenBg : D.redBg, color: marketSummary.averageMove >= 0 ? D.greenText : D.redText, border: `1px solid ${marketSummary.averageMove >= 0 ? D.greenBd : D.redBd}`, fontWeight: 800, mb: 2 }} />
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.8 }}>
                  <Typography sx={{ fontSize: 12, color: D.t3 }}>{modeLabel}</Typography>
                  <Typography sx={{ fontSize: 12, color: D.t3 }}>Day {gameDay}{maxGameDay ? `/${maxGameDay}` : ""}</Typography>
                </Stack>
                <LinearProgress variant={maxGameDay ? "determinate" : "indeterminate"} value={maxGameDay ? (gameDay / maxGameDay) * 100 : undefined}
                  sx={{ height: 5, borderRadius: 99, bgcolor: D.overlay, "& .MuiLinearProgress-bar": { bgcolor: isGameComplete ? D.green : D.brand, borderRadius: 99 } }} />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        {trading.error && (
          <Box sx={{ p: 2, mb: 2.5, borderRadius: 2, bgcolor: D.redBg, border: `1px solid ${D.redBd}` }}>
            <Typography sx={{ color: D.redText, fontSize: 13, fontWeight: 800 }}>
              Supabase: {trading.error}
            </Typography>
          </Box>
        )}

        {/* Stat tiles */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: "Cash",      val: money(trading.account.cash), icon: <AccountBalanceWalletIcon sx={{ fontSize: 20 }} />, up: true },
            { label: "Portfolio", val: money(portfolioValue),        icon: <StorefrontIcon sx={{ fontSize: 20 }} />,          up: true },
            { label: "Mode",      val: gameMode === "limited_30" ? "30 Day" : "Infinite", icon: gameMode === "limited_30" ? <TimerIcon sx={{ fontSize: 20 }} /> : <AllInclusiveIcon sx={{ fontSize: 20 }} />, up: true },
            { label: "Net Worth", val: money(netWorth),              icon: <NewspaperIcon sx={{ fontSize: 20 }} />,           up: netWorth >= 2000 },
          ].map((s) => (
            <Grid item xs={12} sm={6} md={3} key={s.label}>
              <Box sx={{ ...CARD, p: 2.5, transition: "transform 180ms ease, border-color 180ms ease", "&:hover": { transform: reduceMotion ? "none" : "translateY(-3px)", borderColor: D.borderHi } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography sx={{ fontSize: 10.5, fontWeight: 900, letterSpacing: 0.8, color: D.t3, fontFamily: MONO, mb: 0.8 }}>{s.label.toUpperCase()}</Typography>
                    <motion.div key={s.val} initial={reduceMotion ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }}>
                      <Typography sx={{ fontSize: 20, fontWeight: 950, color: D.t1, fontFamily: MONO }}>{s.val}</Typography>
                    </motion.div>
                  </Box>
                  <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: s.up ? D.greenBg : D.redBg, color: s.up ? D.greenText : D.redText, display: "grid", placeItems: "center", flexShrink: 0 }}>
                    {s.icon}
                  </Box>
                </Stack>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Trade message */}
        <MotionPresence initial={false}>
          {tradeMessage && (() => {
            const ok = tradeMessage.startsWith("Bought") || tradeMessage.startsWith("Sold");
            return (
              <motion.div initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }} transition={{ type: "spring", stiffness: 420, damping: 30 }}>
                <Box sx={{ p: 2, mb: 2.5, borderRadius: 2, bgcolor: ok ? D.greenBg : D.redBg, border: `1px solid ${ok ? D.greenBd : D.redBd}`, boxShadow: `0 8px 28px ${ok ? D.greenBg : D.redBg}` }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: ok ? D.greenText : D.redText }}>{tradeMessage}</Typography>
                </Box>
              </motion.div>
            );
          })()}
        </MotionPresence>

        {isGameComplete && (
          <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: D.greenBg, border: `1px solid ${D.greenBd}`, mb: 2.5 }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1.5}>
              <Box>
                <Typography sx={{ fontWeight: 900, fontSize: 15, color: D.greenText }}>30-Day Challenge Complete</Typography>
                <Typography sx={{ fontSize: 13, color: D.t2 }}>Your Day 30 net worth is ready for the leaderboard. Start another challenge or switch to Infinite mode.</Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button onClick={() => handleNewRun("limited_30")} startIcon={<RestartAltIcon />}
                  sx={{ color: D.greenText, border: `1px solid ${D.greenBd}`, fontWeight: 800, textTransform: "none", borderRadius: 1.5 }}>
                  New 30-Day
                </Button>
                <Button onClick={() => handleNewRun("infinite")} startIcon={<AllInclusiveIcon />}
                  sx={{ color: D.brandText, border: `1px solid ${D.brandBd}`, fontWeight: 800, textTransform: "none", borderRadius: 1.5, bgcolor: D.brandBg }}>
                  Infinite Run
                </Button>
              </Stack>
            </Stack>
          </Box>
        )}

        {/* Story mode notice */}
        {gameDay <= STORY_DAYS && (
          <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: D.redBg, border: `1px solid ${D.redBd}`, mb: 2.5 }}>
            <Stack direction="row" spacing={1.2} alignItems="center">
              <AutoStoriesIcon sx={{ color: D.redText, fontSize: 20 }} />
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: 14, color: D.t1 }}>Story Mode Active</Typography>
                <Typography sx={{ fontSize: 13, color: D.t2 }}>Days 1-3 are scripted to teach market movement. {gameMode === "limited_30" ? "This challenge ends on Day 30." : "This run keeps going without a final day."}</Typography>
              </Box>
            </Stack>
          </Box>
        )}

        {/* Today's news */}
        {todayNews.length > 0 && (
          <Box sx={{ ...CARD, p: 0, overflow: "hidden", mb: 2.5 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 3, py: 2, borderBottom: `1px solid ${D.border}` }}>
              <ReportProblemIcon sx={{ color: D.amber, fontSize: 18 }} />
              <Typography sx={{ fontWeight: 900, fontSize: 15, color: D.t1 }}>Today's Market News</Typography>
            </Stack>
            <Box sx={{ p: 2.5 }}>
              <Grid container spacing={2}>
                {todayNews.map((n) => (
                    <Grid item xs={12} md={6} key={n.newsId}>
                      <Box sx={{ p: 2, borderRadius: 2, bgcolor: D.elevated, border: `1px solid ${D.border}` }}>
                        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                          <Chip size="small" label={n.importance}
                            sx={{ bgcolor: n.importance === "High" ? D.redBg : D.greenBg, color: n.importance === "High" ? D.redText : D.greenText, fontWeight: 800, fontSize: 10 }} />
                          {(() => {
                            const c = getNewsCredibility(n);
                            const fg = c.rating === "high" ? D.greenText : c.rating === "medium" ? D.amber : D.redText;
                            const bg = c.rating === "high" ? D.greenBg : c.rating === "medium" ? D.amberBg : D.redBg;
                            return <Chip size="small" label={`${c.label} · ${c.score}%`} sx={{ bgcolor: bg, color: fg, fontWeight: 800, fontSize: 10 }} />;
                          })()}
                        </Stack>
                        <Typography sx={{ fontWeight: 800, fontSize: 14, color: D.t1, mb: 0.5 }}>{n.headline}</Typography>
                        <Typography sx={{ fontSize: 12.5, color: D.t3, lineHeight: 1.6, mb: 1 }}>{n.body}</Typography>
                        <Typography sx={{ fontSize: 11, color: D.t3, fontFamily: MONO }}>Related: {n.relatedTickers.join(", ")}</Typography>
                      </Box>
                    </Grid>
                ))}
              </Grid>
            </Box>
          </Box>
        )}

        <Grid container spacing={3}>
          {/* Stock market table */}
          <Grid item xs={12} md={8}>
            <Box sx={{ ...CARD, p: 0, overflow: "hidden" }}>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1} sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${D.border}` }}>
                <Box>
                  <Typography sx={{ fontWeight: 900, fontSize: 16, color: D.t1 }}>Market</Typography>
                  <Typography sx={{ fontSize: 12.5, color: D.t3 }}>
                    {filteredStocks.length} of {stocks.length} stocks shown. Click any stock to view details and chart.
                  </Typography>
                </Box>
                <Button onClick={handleNextDay} variant="contained" size="small" disabled={isGameComplete}
                  sx={{ bgcolor: D.brand, fontWeight: 800, textTransform: "none", borderRadius: 1.5, boxShadow: "none", "&:hover": { bgcolor: D.brandMid, boxShadow: "none" }, "&.Mui-disabled": { bgcolor: D.overlay, color: D.t3 } }}>
                  {isGameComplete ? "Complete" : "Next Day →"}
                </Button>
              </Stack>
              <Box sx={{ p: 2 }}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                  {sectors.map((sector) => {
                    const selected = sector === selectedSector;
                    const count = sectorCounts.get(sector) ?? 0;

                    return (
                      <Chip
                        key={sector}
                        label={`${sector} (${count})`}
                        clickable
                        onClick={() => setSelectedSector(sector)}
                        sx={{
                          height: 30,
                          borderRadius: 1.5,
                          bgcolor: selected ? D.brandBg : D.elevated,
                          border: `1px solid ${selected ? D.brandBd : D.border}`,
                          color: selected ? D.brandText : D.t2,
                          fontWeight: 900,
                          fontSize: 11.5,
                          "&:hover": { bgcolor: selected ? D.brandBg : D.overlay, borderColor: selected ? D.brandBd : D.borderHi },
                          "& .MuiChip-label": { px: 1.2 },
                        }}
                      />
                    );
                  })}
                </Stack>
                {filteredStocks.length === 0 ? (
                  <Box sx={{ p: 2, borderRadius: 2, bgcolor: D.elevated, border: `1px solid ${D.border}` }}>
                    <Typography sx={{ fontSize: 13, color: D.t3 }}>No stocks match this sector.</Typography>
                  </Box>
                ) : (
                  <MotionPresence mode="popLayout" initial={false}>
                    {filteredStocks.map((stock, index) => (
                      <StockRow key={stock.stockId} stock={stock} gameDay={gameDay}
                        animationIndex={index}
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
          </Grid>

          {/* Right sidebar */}
          <Grid item xs={12} md={4}>
            <Stack spacing={2.5}>
              {/* Portfolio */}
              <Box sx={{ ...CARD, p: 0, overflow: "hidden" }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${D.border}` }}>
                  <Typography sx={{ fontWeight: 900, fontSize: 15, color: D.t1 }}>Portfolio</Typography>
                  {trading.account.holdings.length > 0 && (
                    <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: portfolioPnL >= 0 ? D.greenText : D.redText, fontFamily: MONO }}>
                      {portfolioPnL >= 0 ? "+" : ""}{money(portfolioPnL)} P/L
                    </Typography>
                  )}
                </Stack>
                <Box sx={{ p: 2.5 }}>
                  {trading.account.holdings.length === 0 ? (
                    <Box sx={{ textAlign: "center", py: 1.5 }}>
                      <Typography sx={{ fontSize: 13, color: D.t3, mb: 1 }}>No shares owned yet.</Typography>
                      <Typography sx={{ fontSize: 12, color: D.t3 }}>Buy a stock from the market to start building your portfolio.</Typography>
                    </Box>
                  ) : (
                    <Stack spacing={1}>
                      {trading.account.holdings.map((h) => {
                        const live = stocks.find((s) => s.symbol === h.symbol);
                        const currentPrice = live?.currentPrice ?? h.averageCost;
                        const val = currentPrice * h.shares;
                        const pnl = (currentPrice - h.averageCost) * h.shares;
                        const pnlPct = h.averageCost > 0 ? ((currentPrice - h.averageCost) / h.averageCost) * 100 : 0;
                        const up = pnl >= 0;
                        return (
                          <Box key={h.symbol} sx={{ p: 1.8, borderRadius: 2, bgcolor: D.elevated, border: `1px solid ${up ? D.greenBd : D.redBd}` }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                              <Box>
                                <Typography sx={{ fontWeight: 900, fontSize: 13.5, color: D.t1, fontFamily: MONO }}>
                                  {h.symbol}
                                  <Typography component="span" sx={{ fontWeight: 500, fontSize: 11.5, color: D.t3, ml: 0.8 }}>× {h.shares}</Typography>
                                </Typography>
                                <Typography sx={{ fontSize: 11.5, color: D.t3 }}>Avg {money(h.averageCost)}</Typography>
                              </Box>
                              <Box sx={{ textAlign: "right" }}>
                                <Typography sx={{ fontWeight: 800, fontSize: 13, color: D.t1, fontFamily: MONO }}>{money(val)}</Typography>
                                <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: up ? D.greenText : D.redText }}>
                                  {pnl >= 0 ? "+" : ""}{money(pnl)} ({pct(pnlPct, 1)})
                                </Typography>
                              </Box>
                            </Stack>
                            <Button size="small" onClick={() => navigate(`/stocks/${h.symbol}`, { state: { gameDay } })}
                              sx={{ mt: 0.8, color: D.brandText, fontSize: 11, fontWeight: 700, textTransform: "none", p: 0, minWidth: "auto", height: "auto", lineHeight: 1 }}>
                              View details →
                            </Button>
                          </Box>
                        );
                      })}
                    </Stack>
                  )}
                </Box>
              </Box>

              {/* Watchlist */}
              <Box sx={{ ...CARD, p: 0, overflow: "hidden" }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${D.border}` }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <StarIcon sx={{ fontSize: 18, color: D.amber }} />
                    <Typography sx={{ fontWeight: 900, fontSize: 15, color: D.t1 }}>Watchlist</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {trading.watchlistStocks.length >= 2 && (
                      <Button component={RouterLink} to={`/compare?left=${trading.watchlistStocks[0].symbol}&right=${trading.watchlistStocks[1].symbol}`} size="small"
                        sx={{ color: D.brandText, fontSize: 11, fontWeight: 800, textTransform: "none", px: 0.5 }}>
                        Compare
                      </Button>
                    )}
                    <Chip label={`${trading.watchlistStocks.length}`} size="small" sx={{ bgcolor: D.overlay, color: D.t3, fontWeight: 900, fontSize: 10 }} />
                  </Stack>
                </Stack>
                <Box sx={{ p: 2.5 }}>
                  {trading.watchlistStocks.length === 0 ? (
                    <Box sx={{ textAlign: "center", py: 1.5 }}>
                      <Typography sx={{ fontSize: 13, color: D.t3, mb: 1 }}>No watched stocks yet.</Typography>
                      <Typography sx={{ fontSize: 12, color: D.t3 }}>Use the star beside a ticker to track it without buying shares.</Typography>
                    </Box>
                  ) : (
                    <Stack spacing={1}>
                      {trading.watchlistStocks.map((watched) => {
                        const up = watched.dayChangePercent >= 0;
                        const sharesOwned = getSharesOwned(trading.account, watched.symbol);
                        return (
                          <Box key={watched.symbol} sx={{ p: 1.6, borderRadius: 2, bgcolor: D.elevated, border: `1px solid ${D.border}` }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 900, fontSize: 13.5, color: D.t1, fontFamily: MONO }}>{watched.symbol}</Typography>
                                <Typography sx={{ fontSize: 11.5, color: D.t3 }} noWrap>{watched.name}</Typography>
                                <Typography sx={{ fontSize: 11, color: D.t3 }}>{sharesOwned > 0 ? `${sharesOwned} owned` : "Not owned"}</Typography>
                              </Box>
                              <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                                <Typography sx={{ fontWeight: 800, fontSize: 13, color: D.t1, fontFamily: MONO }}>{money(watched.currentPrice)}</Typography>
                                <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: up ? D.greenText : D.redText }}>
                                  {pct(watched.dayChangePercent)}
                                </Typography>
                              </Box>
                            </Stack>
                            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                              <Button size="small" component={RouterLink} to={`/compare?left=${watched.symbol}&right=${trading.watchlistStocks.find((item) => item.symbol !== watched.symbol)?.symbol ?? stocks.find((item) => item.symbol !== watched.symbol)?.symbol ?? watched.symbol}`}
                                sx={{ color: D.greenText, fontSize: 11, fontWeight: 700, textTransform: "none", p: 0, minWidth: "auto" }}>
                                Compare
                              </Button>
                              <Button size="small" onClick={() => navigate(`/stocks/${watched.symbol}`, { state: { gameDay } })}
                                sx={{ color: D.brandText, fontSize: 11, fontWeight: 700, textTransform: "none", p: 0, minWidth: "auto" }}>
                                Details
                              </Button>
                              <Button size="small" onClick={() => trading.removeFromWatchlist(watched)}
                                sx={{ color: D.t3, fontSize: 11, fontWeight: 700, textTransform: "none", p: 0, minWidth: "auto" }}>
                                Remove
                              </Button>
                            </Stack>
                          </Box>
                        );
                      })}
                    </Stack>
                  )}
                </Box>
              </Box>

              {/* Beginner missions */}
              {missions.loaded && !missionsHidden && missions.completedCount < missions.totalCount && (
                <Box sx={{ ...CARD, p: 0, overflow: "hidden" }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${D.border}` }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <FlagIcon sx={{ fontSize: 18, color: D.greenText }} />
                      <Typography sx={{ fontWeight: 900, fontSize: 15, color: D.t1 }}>Getting Started</Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Chip label={`${missions.completedCount}/${missions.totalCount}`} size="small"
                        sx={{ bgcolor: D.overlay, color: D.t3, fontWeight: 900, fontSize: 10 }} />
                      <IconButton size="small" title="Hide checklist"
                        onClick={() => { localStorage.setItem("stockpilot-missions-hidden", "1"); setMissionsHidden(true); }}
                        sx={{ color: D.t3, p: 0.4, "&:hover": { color: D.t1 } }}>
                        <CloseIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Stack>
                  </Stack>
                  <Box sx={{ p: 2.5 }}>
                    <Typography sx={{ fontSize: 11.5, color: D.t3, mb: 1.5 }}>A quick checklist to learn the ropes.</Typography>
                    <Stack spacing={1.2}>
                      {missions.missions.map((m) => (
                        <Box key={m.id} sx={{ p: 1.6, borderRadius: 2, bgcolor: D.elevated, border: `1px solid ${m.done ? D.greenBd : D.border}` }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                            <Stack direction="row" spacing={0.8} alignItems="center">
                              {m.done && <CheckCircleIcon sx={{ fontSize: 14, color: D.greenText }} />}
                              <Typography sx={{ fontSize: 13, fontWeight: 800, color: m.done ? D.greenText : D.t1 }}>{m.title}</Typography>
                            </Stack>
                            <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: D.t3, fontFamily: MONO }}>+{m.rewardXp} XP</Typography>
                          </Stack>
                          <Typography sx={{ fontSize: 11.5, color: D.t3, mb: 0.8 }}>{m.description}</Typography>
                          <LinearProgress variant="determinate" value={m.progress}
                            sx={{ height: 5, borderRadius: 99, bgcolor: D.overlay, "& .MuiLinearProgress-bar": { bgcolor: m.done ? D.green : D.brand, borderRadius: 99 } }} />
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                </Box>
              )}

              {/* Daily goals */}
              <Box sx={{ ...CARD, p: 0, overflow: "hidden" }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${D.border}` }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CheckCircleIcon sx={{ fontSize: 18, color: D.brandText }} />
                    <Typography sx={{ fontWeight: 900, fontSize: 15, color: D.t1 }}>Daily Goals</Typography>
                  </Stack>
                  <Chip label={`${dailyGoals.completedCount}/${dailyGoals.goals.length}`} size="small"
                    sx={{ bgcolor: dailyGoals.completedCount === dailyGoals.goals.length ? D.greenBg : D.overlay, color: dailyGoals.completedCount === dailyGoals.goals.length ? D.greenText : D.t3, fontWeight: 900, fontSize: 10 }} />
                </Stack>
                <Box sx={{ p: 2.5 }}>
                  <Typography sx={{ fontSize: 11.5, color: D.t3, mb: 1.5 }}>Fresh objectives each day. Day {gameDay} · {dailyGoals.totalXp} XP earned.</Typography>
                  <Stack spacing={1.2}>
                    {dailyGoals.goals.map((g) => (
                      <Box key={g.id} sx={{ p: 1.6, borderRadius: 2, bgcolor: D.elevated, border: `1px solid ${g.done ? D.greenBd : D.border}` }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                          <Stack direction="row" spacing={0.8} alignItems="center">
                            {g.done && <CheckCircleIcon sx={{ fontSize: 14, color: D.greenText }} />}
                            <Typography sx={{ fontSize: 13, fontWeight: 800, color: g.done ? D.greenText : D.t1 }}>{g.title}</Typography>
                          </Stack>
                          <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: D.t3, fontFamily: MONO }}>+{g.rewardXp} XP</Typography>
                        </Stack>
                        <Typography sx={{ fontSize: 11.5, color: D.t3, mb: 0.8 }}>{g.description}</Typography>
                        <LinearProgress variant="determinate" value={g.progress}
                          sx={{ height: 5, borderRadius: 99, bgcolor: D.overlay, "& .MuiLinearProgress-bar": { bgcolor: g.done ? D.green : D.brand, borderRadius: 99 } }} />
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </Box>

              {/* Next bill */}
              <Box sx={{ bgcolor: D.elevated, border: `1px solid ${D.border}`, borderRadius: 2, p: 3 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.8 }}>
                  <ReceiptLongIcon sx={{ fontSize: 18, color: D.redText }} />
                  <Typography sx={{ fontWeight: 900, fontSize: 15, color: D.t1 }}>Living Costs</Typography>
                </Stack>
                <Typography sx={{ fontSize: 13, color: D.t3, mb: 1.5 }}>
                  Rent & expenses come due every {bills.billIntervalDays} days, scaled to your net worth.
                </Typography>
                <Stack direction="row" justifyContent="space-between" alignItems="center"
                  sx={{ p: 1.6, borderRadius: 2, bgcolor: D.surface, border: `1px solid ${D.border}` }}>
                  <Typography sx={{ fontSize: 12.5, color: D.t2 }}>
                    Next bill: Day {bills.nextBillDay}
                  </Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 900, color: D.redText, fontFamily: MONO }}>
                    ~{money(bills.nextBillAmount)}
                  </Typography>
                </Stack>
              </Box>

              {/* Rival trader */}
              <Box sx={{ bgcolor: D.elevated, border: `1px solid ${D.border}`, borderRadius: 2, p: 3 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.8 }}>
                  <SportsMmaIcon sx={{ fontSize: 18, color: "#F59E0B" }} />
                  <Typography sx={{ fontWeight: 900, fontSize: 15, color: D.t1 }}>{rival.rivalName}</Typography>
                  <Chip label={rival.playerAhead ? "YOU LEAD" : "THEY LEAD"} size="small"
                    sx={{ bgcolor: rival.playerAhead ? D.greenBg : D.redBg, color: rival.playerAhead ? D.greenText : D.redText, fontWeight: 900, fontSize: 9.5 }} />
                </Stack>
                <Typography sx={{ fontSize: 12.5, color: D.t3, mb: 1.5 }}>
                  A rival trader running a fixed {rival.basket.length}-stock strategy since Day 1.
                </Typography>
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography sx={{ fontSize: 12, color: D.t3 }}>You</Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 900, color: D.t1, fontFamily: MONO }}>{money(rival.playerNetWorth)}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography sx={{ fontSize: 12, color: D.t3 }}>{rival.rivalName}</Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 900, color: D.t1, fontFamily: MONO }}>{money(rival.rivalNetWorth)}</Typography>
                  </Stack>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: rival.playerAhead ? D.greenText : D.redText, mt: 0.3 }}>
                    {rival.playerAhead ? "+" : ""}{rival.gapPct.toFixed(1)}% vs rival
                  </Typography>
                </Stack>
              </Box>

              {/* Game loop */}
              <Box sx={{ bgcolor: D.elevated, border: `1px solid ${D.border}`, borderRadius: 2, p: 3 }}>
                <Typography sx={{ fontWeight: 900, fontSize: 15, color: D.t1, mb: 0.8 }}>Game Loop</Typography>
                <Typography sx={{ fontSize: 13, color: D.t3, mb: 2 }}>{gameMode === "limited_30" ? "Beat the market before Day 30 ends." : "Seeded randomness, sector drift, and volatility keep the market running indefinitely."}</Typography>
                <Stack spacing={1} sx={{ mb: 2 }}>
                  {gameLoopTips.map((tip) => (
                    <Stack key={tip} direction="row" spacing={1} alignItems="flex-start">
                      <Box sx={{ width: 4, height: 4, borderRadius: "50%", bgcolor: D.brandText, mt: 0.8, flexShrink: 0 }} />
                      <Typography sx={{ fontSize: 12.5, color: D.t2, lineHeight: 1.6 }}>{tip}</Typography>
                    </Stack>
                  ))}
                </Stack>
                <Button fullWidth component={RouterLink} to="/news" state={{ gameDay }} startIcon={<NewspaperIcon />}
                  sx={{ color: D.brandText, border: `1px solid ${D.brandBd}`, fontWeight: 700, textTransform: "none", borderRadius: 1.5, bgcolor: D.brandBg, "&:hover": { bgcolor: "rgba(124,58,237,0.15)" } }}>
                  Open News Page
                </Button>
              </Box>

              {/* Risk guide */}
              <Box sx={{ ...CARD, p: 3 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                  <ShieldIcon sx={{ fontSize: 18, color: D.brandText }} />
                  <Typography sx={{ fontWeight: 900, fontSize: 15, color: D.t1 }}>Risk Guide</Typography>
                </Stack>
                <Typography sx={{ fontSize: 13, color: D.t3, mb: 2 }}>Higher-risk stocks move more aggressively.</Typography>
                <Stack spacing={1}>
                  {[
                    { level: "Low",    text: "Stable movement, smaller upside and downside." },
                    { level: "Medium", text: "Balanced movement with moderate volatility." },
                    { level: "High",   text: "Bigger moves, higher profit and loss potential." },
                  ].map((r) => (
                    <Box key={r.level} sx={{ p: 1.5, borderRadius: 2, bgcolor: D.elevated, border: `1px solid ${D.border}` }}>
                      <Typography sx={{ fontWeight: 800, fontSize: 13, color: D.t1 }}>{r.level} Risk</Typography>
                      <Typography sx={{ fontSize: 12.5, color: D.t3 }}>{r.text}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>

              {/* Mini Leaderboard */}
              <Box sx={{ ...CARD, p: 0, overflow: "hidden" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${D.border}` }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <EmojiEventsIcon sx={{ fontSize: 17, color: "#F59E0B" }} />
                    <Typography sx={{ fontWeight: 900, fontSize: 15, color: D.t1 }}>Top Traders</Typography>
                  </Stack>
                  <Button component={RouterLink} to="/leaderboard" size="small"
                    sx={{ color: D.brandText, fontSize: 11, fontWeight: 700, textTransform: "none", px: 0.5 }}>
                    View All →
                  </Button>
                </Stack>
                <Box sx={{ p: 2.5 }}>
                  {myRank !== null && (
                    <Box sx={{ p: 1.5, mb: 1.5, borderRadius: 2, bgcolor: D.brandBg, border: `1px solid ${D.brandBd}` }}>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: D.brandText }}>Your rank: #{myRank}</Typography>
                    </Box>
                  )}
                  {topPlayers.length === 0 ? (
                    <Typography sx={{ fontSize: 13, color: D.t3 }}>No ranked runs yet.</Typography>
                  ) : (
                    <Stack spacing={1}>
                      {topPlayers.map((p) => (
                        <Stack key={p.user_id} direction="row" spacing={1.5} alignItems="center">
                          <Avatar sx={{ width: 28, height: 28, bgcolor: p.rank <= 3 ? "#7C3AED" : D.overlay, fontSize: 12, fontWeight: 900 }}>
                            {p.username[0]?.toUpperCase()}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontSize: 13, fontWeight: 800, color: user?.id === p.user_id ? D.brandText : D.t1 }} noWrap>
                              {p.username}{user?.id === p.user_id ? " (You)" : ""}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                            <Typography sx={{ fontSize: 10.5, color: D.t3, fontFamily: MONO }}>#{p.rank}</Typography>
                            <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: D.t2, fontFamily: MONO }}>{money(p.net_worth)}</Typography>
                          </Box>
                        </Stack>
                      ))}
                    </Stack>
                  )}
                </Box>
              </Box>
            </Stack>
          </Grid>
        </Grid>
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
            boxShadow: "0 20px 60px rgba(0,0,0,0.48), 0 0 28px rgba(124,58,237,0.16)",
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
              <Typography sx={{ fontSize: 10, fontWeight: 950, letterSpacing: 1.1, color: D.brandText, fontFamily: MONO }}>
                ACHIEVEMENT UNLOCKED
              </Typography>
              <Typography sx={{ mt: 0.35, fontSize: 16, fontWeight: 950, color: D.t1 }}>
                {achievement.title}
              </Typography>
              <Typography sx={{ mt: 0.35, fontSize: 12.5, lineHeight: 1.5, color: D.t2 }}>
                {achievement.description}
              </Typography>
              <Chip
                size="small"
                label={achievement.reward}
                sx={{ mt: 1.1, height: 23, bgcolor: D.greenBg, color: D.greenText, border: `1px solid ${D.greenBd}`, fontSize: 10.5, fontWeight: 900 }}
              />
              <Typography sx={{ mt: 0.8, fontSize: 10.5, color: D.t3 }}>
                {achievement.achievedByPercent.toFixed(1)}% of players unlocked this
              </Typography>
              {queuedCount > 1 && (
                <Typography component="span" sx={{ ml: 1, fontSize: 10.5, color: D.t3 }}>
                  +{queuedCount - 1} more
                </Typography>
              )}
            </Box>
            <IconButton size="small" aria-label="Dismiss achievement notification" onClick={onClose} sx={{ mt: -0.5, mr: -0.5, color: D.t3, "&:hover": { color: D.t1, bgcolor: D.overlay } }}>
              <CloseIcon sx={{ fontSize: 17 }} />
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
          <CodeIcon sx={{ fontSize: 17, color: D.brandText }} />
          <Typography sx={{ fontWeight: 900, fontSize: 12, color: D.t2, fontFamily: MONO }}>dev</Typography>
        </Stack>
        <IconButton size="small" onClick={onClose} sx={{ color: D.t3, "&:hover": { color: D.t1 } }}>
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
          inputProps={{ sx: { fontFamily: MONO, fontSize: 13 } }}
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
            <Typography key={`${line}-${index}`} sx={{ fontSize: 11.5, color: line.startsWith(">") ? D.brandText : D.t2, fontFamily: MONO, lineHeight: 1.7 }}>
              {line}
            </Typography>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function StockRow({ stock, gameDay, animationIndex, sharesOwned, watchlisted, onBuy, onSell, onToggleWatchlist, onOpen }: {
  stock: Stock; gameDay: number; animationIndex: number; sharesOwned: number; watchlisted: boolean; onBuy: () => void; onSell: () => void; onToggleWatchlist: () => void; onOpen: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const up = stock.dayChangePercent >= 0;
  return (
    <Box component={motion.div} layout={!reduceMotion} initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -16 }} transition={{ duration: 0.22, delay: Math.min(animationIndex * 0.025, 0.16), layout: { type: "spring", stiffness: 420, damping: 34 } }}
      onClick={onOpen} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
      sx={{
        display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr auto", md: "1.4fr 0.9fr auto" },
        gap: 2, alignItems: "center", p: 2, mb: 1.2, borderRadius: 2,
        bgcolor: D.elevated, border: `1px solid ${D.border}`,
        cursor: "pointer", outline: "none",
        transition: "border-color 160ms, background-color 160ms, transform 160ms",
        "&:hover": { borderColor: D.borderHi, bgcolor: D.overlay, transform: reduceMotion ? "none" : "translateX(3px)" },
        "&:focus-visible": { boxShadow: `0 0 0 2px ${D.brand}` },
      }}
    >
      <Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <IconButton
            size="small"
            title={watchlisted ? "Remove from watchlist" : "Add to watchlist"}
            aria-label={watchlisted ? "Remove from watchlist" : "Add to watchlist"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleWatchlist();
            }}
            sx={{
              width: 34,
              height: 34,
              borderRadius: 1.5,
              color: watchlisted ? D.amber : D.t3,
              border: `1px solid ${watchlisted ? D.amber : D.border}`,
              bgcolor: watchlisted ? D.amberBg : D.elevated,
              "&:hover": { color: D.amber, borderColor: D.amber, bgcolor: D.amberBg },
            }}
          >
            <MotionPresence mode="wait" initial={false}>
              <motion.span key={watchlisted ? "watched" : "unwatched"} initial={reduceMotion ? false : { scale: 0.4, rotate: -25 }} animate={{ scale: 1, rotate: 0 }} exit={reduceMotion ? undefined : { scale: 0.4, rotate: 25 }} transition={{ type: "spring", stiffness: 520, damping: 22 }} style={{ display: "grid" }}>
                {watchlisted ? <StarIcon sx={{ fontSize: 17 }} /> : <StarBorderIcon sx={{ fontSize: 17 }} />}
              </motion.span>
            </MotionPresence>
          </IconButton>
          <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: up ? D.greenBg : D.redBg, color: up ? D.greenText : D.redText, display: "grid", placeItems: "center", flexShrink: 0 }}>
            <ShowChartIcon sx={{ fontSize: 18 }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 900, fontSize: 14, color: D.t1, fontFamily: MONO }}>{stock.symbol}</Typography>
            <Typography sx={{ fontSize: 12, color: D.t3 }}>{stock.name} · {stock.sector} · {stock.riskLevel} Risk</Typography>
            <Typography sx={{ fontSize: 11, color: D.t3, fontFamily: MONO }}>P/E {stock.fundamentals.peRatio} · Growth {stock.fundamentals.revenueGrowth}% · Day {gameDay}</Typography>
            {sharesOwned > 0 && <Typography sx={{ fontSize: 11.5, color: D.brandText, fontWeight: 800 }}>You own {sharesOwned} share{sharesOwned === 1 ? "" : "s"}</Typography>}
          </Box>
        </Stack>
      </Box>

      <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
        <Typography sx={{ fontWeight: 900, fontSize: 14.5, color: D.t1, fontFamily: MONO }}>{money(stock.currentPrice)}</Typography>
        <Typography sx={{ fontSize: 13, color: up ? D.greenText : D.redText, fontWeight: 800 }}>{pct(stock.dayChangePercent)}</Typography>
        <Typography sx={{ fontSize: 11.5, color: D.t3 }}>{stock.dayChange >= 0 ? "+" : ""}{money(stock.dayChange)} today</Typography>
      </Box>

      <Stack direction="row" spacing={1} justifyContent={{ xs: "flex-start", md: "flex-end" }}>
        <Button size="small" variant="contained" onClick={(e) => { e.stopPropagation(); onBuy(); }}
          sx={{ bgcolor: D.green, color: "#fff", fontWeight: 800, fontSize: 12, textTransform: "none", borderRadius: 1.5, boxShadow: "none", minWidth: 52, "&:hover": { bgcolor: "#16A34A", boxShadow: "none" } }}>
          Buy
        </Button>
        <Button size="small" variant="contained" disabled={sharesOwned === 0} onClick={(e) => { e.stopPropagation(); onSell(); }}
          sx={{ bgcolor: D.red, color: "#fff", fontWeight: 800, fontSize: 12, textTransform: "none", borderRadius: 1.5, boxShadow: "none", minWidth: 52, "&:hover": { bgcolor: "#DC2626", boxShadow: "none" }, "&.Mui-disabled": { bgcolor: D.overlay, color: D.t3 } }}>
          Sell
        </Button>
      </Stack>
    </Box>
  );
}

function TradeDialog({ stock, mode, cash, sharesOwned, getQuote, onClose, onConfirm }: {
  stock: Stock;
  mode: "buy" | "sell";
  cash: number;
  sharesOwned: number;
  getQuote: (quantity: number) => { basePrice: number; effectivePrice: number; slippage: number; total: number };
  onClose: () => void;
  onConfirm: (quantity: number) => void;
}) {
  const reduceMotion = useReducedMotion();
  const maxQty = mode === "buy"
    ? Math.max(1, Math.floor(cash / stock.currentPrice))
    : Math.max(0, sharesOwned);
  const [quantity, setQuantity] = useState(1);
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
            <Typography sx={{ fontWeight: 900, fontSize: 17, color: D.t1 }}>
              {isBuy ? "Buy" : "Sell"} {stock.symbol}
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: D.t3 }}>{stock.name}</Typography>
          </Box>
          <IconButton size="small" onClick={onClose} sx={{ color: D.t3, "&:hover": { color: D.t1 } }}>
            <CloseIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ bgcolor: D.bg, p: 2.5 }}>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Stack direction="row" justifyContent="space-between">
            <Typography sx={{ fontSize: 13, color: D.t3 }}>Price per share</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 800, color: D.t1, fontFamily: MONO }}>{money(stock.currentPrice)}</Typography>
          </Stack>
          {isBuy ? (
            <Stack direction="row" justifyContent="space-between">
              <Typography sx={{ fontSize: 13, color: D.t3 }}>Available cash</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 800, color: D.t1, fontFamily: MONO }}>{money(cash)}</Typography>
            </Stack>
          ) : (
            <Stack direction="row" justifyContent="space-between">
              <Typography sx={{ fontSize: 13, color: D.t3 }}>Shares owned</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 800, color: D.t1, fontFamily: MONO }}>{sharesOwned}</Typography>
            </Stack>
          )}

          <Divider sx={{ borderColor: D.border }} />

          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 900, color: D.t3, fontFamily: MONO, mb: 1.2 }}>QUANTITY</Typography>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <IconButton size="small" onClick={() => adjust(-1)} disabled={qty <= 1}
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
                inputProps={{ min: 1, max: maxQty, sx: { textAlign: "center", fontFamily: MONO, fontWeight: 900, fontSize: 18, py: 0.8 } }}
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
              <IconButton size="small" onClick={() => adjust(1)} disabled={qty >= maxQty}
                sx={{ bgcolor: D.elevated, border: `1px solid ${D.border}`, color: D.t2, borderRadius: 1.5,
                  "&:hover": { bgcolor: D.overlay, color: D.t1 }, "&.Mui-disabled": { color: D.t3 } }}>
                <AddIcon sx={{ fontSize: 16 }} />
              </IconButton>
              <Button size="small" onClick={() => setQuantity(maxQty)} disabled={qty >= maxQty}
                sx={{ color: D.brandText, fontSize: 11, fontWeight: 800, textTransform: "none", px: 1 }}>
                Max
              </Button>
            </Stack>
          </Box>

          <Box sx={{ p: 2, borderRadius: 2, bgcolor: isBuy ? D.greenBg : D.redBg, border: `1px solid ${isBuy ? D.greenBd : D.redBd}` }}>
            <Stack direction="row" justifyContent="space-between">
              <Typography sx={{ fontSize: 13, color: D.t2, fontWeight: 700 }}>
                {isBuy ? "Total cost" : "Total proceeds"}
              </Typography>
              <motion.div key={total} initial={reduceMotion ? false : { opacity: 0, scale: 0.9, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 500, damping: 28 }}>
                <Typography sx={{ fontSize: 18, fontWeight: 950, color: isBuy ? D.greenText : D.redText, fontFamily: MONO }}>
                  {money(total)}
                </Typography>
              </motion.div>
            </Stack>
            {isBuy && (
              <Typography sx={{ fontSize: 11.5, color: D.t3, mt: 0.5 }}>
                Remaining: {money(cash - total)}
              </Typography>
            )}
          </Box>

          {hasSlippage && (
            <Box sx={{ p: 1.6, borderRadius: 2, bgcolor: D.amberBg, border: `1px solid ${D.amber}` }}>
              <Typography sx={{ fontSize: 12, color: D.amber, fontWeight: 700 }}>
                This trade is large relative to your net worth, so it's getting a {(quote.slippage * 100).toFixed(1)}% worse fill
                ({money(quote.effectivePrice)}/share instead of {money(quote.basePrice)}). Split it into smaller trades to avoid the penalty.
              </Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ bgcolor: D.elevated, borderTop: `1px solid ${D.border}`, p: 2 }}>
        <Button onClick={onClose}
          sx={{ color: D.t3, fontWeight: 700, textTransform: "none", borderRadius: 1.5, "&:hover": { color: D.t1, bgcolor: D.overlay } }}>
          Cancel
        </Button>
        <Button variant="contained" disabled={!canConfirm} onClick={() => onConfirm(qty)}
          sx={{
            bgcolor: isBuy ? D.green : D.red, color: "#fff", fontWeight: 800, textTransform: "none",
            borderRadius: 1.5, boxShadow: "none", px: 3,
            "&:hover": { bgcolor: isBuy ? "#16A34A" : "#DC2626", boxShadow: "none" },
            "&.Mui-disabled": { bgcolor: D.overlay, color: D.t3 },
          }}>
          {isBuy ? "Buy" : "Sell"} {qty} share{qty === 1 ? "" : "s"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function OpeningBriefingDialog({ open, onClose, onDontShowAgain, stories }: {
  open: boolean;
  onClose: () => void;
  onDontShowAgain: () => void;
  stories: ReturnType<typeof getOpeningStoryDays>;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { bgcolor: D.surface, border: `1px solid ${D.border}`, borderRadius: 3, overflow: "hidden" } }}>
      <DialogTitle sx={{ bgcolor: D.elevated, borderBottom: `1px solid ${D.border}`, p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <AutoStoriesIcon sx={{ color: D.brandText, fontSize: 20 }} />
              <Typography sx={{ fontWeight: 900, fontSize: 18, color: D.t1 }}>Opening Market Briefing</Typography>
            </Stack>
            <Typography sx={{ fontSize: 13, color: D.t3 }}>Days 1–3 are scripted to teach how news affects prices.</Typography>
          </Box>
          <IconButton onClick={onClose} sx={{ color: D.t3, "&:hover": { color: D.t1 } }}><CloseIcon /></IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ bgcolor: D.bg, p: 3 }}>
        <Stack spacing={2}>
          {stories.map((story) => (
            <Box key={story.gameDay} sx={{ p: 3, borderRadius: 2, bgcolor: D.surface, border: `1px solid ${D.border}` }}>
              <Chip label={`Day ${story.gameDay}`} size="small"
                sx={{ bgcolor: story.gameDay <= STORY_DAYS ? D.redBg : D.brandBg, color: story.gameDay <= STORY_DAYS ? D.redText : D.brandText, fontWeight: 900, fontSize: 10, mb: 1.5 }} />
              <Typography sx={{ fontWeight: 900, fontSize: 16, color: D.t1, mb: 0.5 }}>{story.title}</Typography>
              <Typography sx={{ fontSize: 13, color: D.t2, mb: 2, lineHeight: 1.7 }}>{story.summary}</Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ p: 2, borderRadius: 2, bgcolor: D.greenBg, border: `1px solid ${D.greenBd}` }}>
                    <Typography sx={{ fontWeight: 900, fontSize: 12, color: D.greenText, fontFamily: MONO, mb: 1 }}>LIKELY RISING</Typography>
                    <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
                      {story.rising.map((s) => <Chip key={s} label={s} size="small" sx={{ bgcolor: D.green, color: "#fff", fontWeight: 900, fontSize: 11, fontFamily: MONO }} />)}
                    </Stack>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ p: 2, borderRadius: 2, bgcolor: D.redBg, border: `1px solid ${D.redBd}` }}>
                    <Typography sx={{ fontWeight: 900, fontSize: 12, color: D.redText, fontFamily: MONO, mb: 1 }}>LIKELY FALLING</Typography>
                    <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
                      {story.falling.map((s) => <Chip key={s} label={s} size="small" sx={{ bgcolor: D.red, color: "#fff", fontWeight: 900, fontSize: 11, fontFamily: MONO }} />)}
                    </Stack>
                  </Box>
                </Grid>
              </Grid>

              <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: D.elevated, border: `1px solid ${D.border}` }}>
                <Typography sx={{ fontSize: 13, color: D.brandText, fontWeight: 700 }}>Trader hint: {story.playerHint}</Typography>
              </Box>
            </Box>
          ))}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ bgcolor: D.elevated, borderTop: `1px solid ${D.border}`, p: 2.5 }}>
        <Button onClick={onDontShowAgain}
          sx={{ mr: "auto", color: D.t3, fontWeight: 700, textTransform: "none", borderRadius: 1.5, "&:hover": { color: D.t1, bgcolor: D.overlay } }}>
          Don't show again
        </Button>
        <Button onClick={onClose} variant="contained"
          sx={{ bgcolor: D.brand, fontWeight: 800, textTransform: "none", borderRadius: 1.5, boxShadow: "none", px: 3, "&:hover": { bgcolor: D.brandMid, boxShadow: "none" } }}>
          Start Trading →
        </Button>
      </DialogActions>
    </Dialog>
  );
}
