import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Button, Chip, Container, Dialog, DialogActions, DialogContent, DialogTitle,
  CircularProgress, Grid, IconButton, LinearProgress, Stack, TextField, Typography,
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
import { Link as RouterLink, useNavigate } from "react-router-dom";

import {
  getOpeningStoryDays, getSeasonDay,
  SEASON_LENGTH, STORY_DAYS, Stock,
} from "../data/mockStocks";
import { getNetWorth, getPortfolioValue, getSharesOwned } from "../data/tradingState";
import { useGame } from "../context/GameContext";
import { D, CARD, MONO, money, pct } from "../theme/design";

const DEV_CONSOLE_ENABLED = process.env.NODE_ENV !== "production";
const BRIEFING_DISMISSED_KEY = "stockpilot-hide-opening-briefing";

export default function Game() {
  const navigate = useNavigate();
  const [briefingOpen, setBriefingOpen] = useState(false);
  const autoBriefingChecked = useRef(false);
  const [devConsoleOpen, setDevConsoleOpen] = useState(false);
  const [tradeMessage, setTradeMessage] = useState("");
  const [selectedSector, setSelectedSector] = useState("All");
  const trading = useGame();
  const { gameDay, setGameDay, stocks, news: todayNews } = trading;

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
  const seasonDay = getSeasonDay(gameDay);
  const portfolioValue = useMemo(() => getPortfolioValue(trading.account, stocks), [trading.account, stocks]);
  const netWorth = useMemo(() => getNetWorth(trading.account, stocks), [trading.account, stocks]);

  const marketSummary = useMemo(() => {
    const gainers = stocks.filter((s) => s.dayChangePercent >= 0).length;
    const losers = stocks.length - gainers;
    const averageMove = stocks.reduce((sum, s) => sum + s.dayChangePercent, 0) / stocks.length;
    return { gainers, losers, averageMove };
  }, [stocks]);

  useEffect(() => {
    if (!sectors.includes(selectedSector)) setSelectedSector("All");
  }, [selectedSector, sectors]);

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

  const handleNextDay = () => setGameDay((d) => d + 1);
  const handleDismissBriefing = () => {
    localStorage.setItem(BRIEFING_DISMISSED_KEY, "true");
    setBriefingOpen(false);
  };

  const handleBuyStock = async (stock: Stock) => {
    const ok = await trading.buyStock(stock);
    setTradeMessage(ok ? `Bought 1 share of ${stock.symbol} for ${money(stock.currentPrice)}.` : `Not enough cash to buy ${stock.symbol}.`);
  };
  const handleSellStock = async (stock: Stock) => {
    const ok = await trading.sellStock(stock);
    setTradeMessage(ok ? `Sold 1 share of ${stock.symbol} for ${money(stock.currentPrice)}.` : `You don't own any ${stock.symbol} shares.`);
  };

  const runConsoleCommand = (rawCommand: string) => {
    const command = rawCommand.trim();
    const tokens = command.split(/\s+/);
    const [name = "", arg1 = "", arg2 = ""] = tokens;
    const action = name.toLowerCase();

    if (!command) return "";

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
        void trading.resetAccount();
        setGameDay(1);
        if (localStorage.getItem(BRIEFING_DISMISSED_KEY) !== "true") {
          setBriefingOpen(true);
        }
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
      {DEV_CONSOLE_ENABLED && (
        <CommandConsole
          open={devConsoleOpen}
          onClose={() => setDevConsoleOpen(false)}
          onRun={runConsoleCommand}
        />
      )}

      {/* Hero */}
      <Box sx={{ bgcolor: D.surface, borderBottom: `1px solid ${D.border}` }}>
        <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={7}>
              <Chip label={`DAY ${gameDay}`} size="small"
                sx={{ bgcolor: gameDay <= STORY_DAYS ? D.redBg : D.brandBg, color: gameDay <= STORY_DAYS ? D.redText : D.brandText, border: `1px solid ${gameDay <= STORY_DAYS ? D.redBd : D.brandBd}`, fontWeight: 900, fontSize: 10, fontFamily: MONO, letterSpacing: 1, mb: 1.2 }} />
              <Typography sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 950, color: D.t1, letterSpacing: -1, mb: 1 }}>Stock Market Simulator</Typography>
              <Typography sx={{ fontSize: 13, color: D.t2, mb: 2.5 }}>
                Days 1–3 are story-driven. From Day 4, the deterministic pricing engine takes over.
              </Typography>
              <Stack direction="row" spacing={1.2} flexWrap="wrap" useFlexGap>
                <Button onClick={handleNextDay} variant="contained"
                  sx={{ bgcolor: D.brand, fontWeight: 800, textTransform: "none", borderRadius: 1.5, boxShadow: "none", "&:hover": { bgcolor: D.brandMid, boxShadow: "none" } }}>
                  Next Day →
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
                <Typography sx={{ fontSize: 32, fontWeight: 950, color: marketSummary.averageMove >= 0 ? D.greenText : D.redText, fontFamily: MONO, lineHeight: 1, mb: 1 }}>
                  {pct(marketSummary.averageMove)}
                </Typography>
                <Chip size="small" icon={marketSummary.averageMove >= 0 ? <TrendingUpIcon sx={{ fontSize: 14 }} /> : <TrendingDownIcon sx={{ fontSize: 14 }} />}
                  label={marketSummary.averageMove >= 0 ? "Positive Day" : "Negative Day"}
                  sx={{ bgcolor: marketSummary.averageMove >= 0 ? D.greenBg : D.redBg, color: marketSummary.averageMove >= 0 ? D.greenText : D.redText, border: `1px solid ${marketSummary.averageMove >= 0 ? D.greenBd : D.redBd}`, fontWeight: 800, mb: 2 }} />
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.8 }}>
                  <Typography sx={{ fontSize: 12, color: D.t3 }}>Season: Day {seasonDay}/{SEASON_LENGTH}</Typography>
                  <Typography sx={{ fontSize: 12, color: D.t3 }}>{((seasonDay / SEASON_LENGTH) * 100).toFixed(0)}%</Typography>
                </Stack>
                <LinearProgress variant="determinate" value={(seasonDay / SEASON_LENGTH) * 100}
                  sx={{ height: 5, borderRadius: 99, bgcolor: D.overlay, "& .MuiLinearProgress-bar": { bgcolor: D.brand, borderRadius: 99 } }} />
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
            { label: "Gainers",   val: `${marketSummary.gainers}/${stocks.length}`, icon: <TrendingUpIcon sx={{ fontSize: 20 }} />, up: true },
            { label: "Net Worth", val: money(netWorth),              icon: <NewspaperIcon sx={{ fontSize: 20 }} />,           up: netWorth >= 2000 },
          ].map((s) => (
            <Grid item xs={12} sm={6} md={3} key={s.label}>
              <Box sx={{ ...CARD, p: 2.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography sx={{ fontSize: 10.5, fontWeight: 900, letterSpacing: 0.8, color: D.t3, fontFamily: MONO, mb: 0.8 }}>{s.label.toUpperCase()}</Typography>
                    <Typography sx={{ fontSize: 20, fontWeight: 950, color: D.t1, fontFamily: MONO }}>{s.val}</Typography>
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
        {tradeMessage && (
          <Box sx={{ ...CARD, p: 2, mb: 2.5 }}>
            <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: D.t1 }}>{tradeMessage}</Typography>
          </Box>
        )}

        {/* Story mode notice */}
        {gameDay <= STORY_DAYS && (
          <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: D.redBg, border: `1px solid ${D.redBd}`, mb: 2.5 }}>
            <Stack direction="row" spacing={1.2} alignItems="center">
              <AutoStoriesIcon sx={{ color: D.redText, fontSize: 20 }} />
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: 14, color: D.t1 }}>Story Mode Active</Typography>
                <Typography sx={{ fontSize: 13, color: D.t2 }}>Days 1–3 are scripted to teach market movement. From Day 4, the formula engine takes over.</Typography>
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
                <Button onClick={handleNextDay} variant="contained" size="small"
                  sx={{ bgcolor: D.brand, fontWeight: 800, textTransform: "none", borderRadius: 1.5, boxShadow: "none", "&:hover": { bgcolor: D.brandMid, boxShadow: "none" } }}>
                  Next Day →
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
                  filteredStocks.map((stock) => (
                    <StockRow key={stock.stockId} stock={stock} gameDay={gameDay}
                      sharesOwned={getSharesOwned(trading.account, stock.symbol)}
                      onBuy={() => handleBuyStock(stock)}
                      onSell={() => handleSellStock(stock)}
                      onOpen={() => navigate(`/stocks/${stock.symbol}`, { state: { gameDay } })}
                    />
                  ))
                )}
              </Box>
            </Box>
          </Grid>

          {/* Right sidebar */}
          <Grid item xs={12} md={4}>
            <Stack spacing={2.5}>
              {/* Portfolio */}
              <Box sx={{ ...CARD, p: 0, overflow: "hidden" }}>
                <Stack direction="row" alignItems="center" sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${D.border}` }}>
                  <Typography sx={{ fontWeight: 900, fontSize: 15, color: D.t1 }}>Portfolio</Typography>
                </Stack>
                <Box sx={{ p: 2.5 }}>
                  {trading.account.holdings.length === 0 ? (
                    <Typography sx={{ fontSize: 13, color: D.t3 }}>No shares owned yet.</Typography>
                  ) : (
                    <Stack spacing={1}>
                      {trading.account.holdings.map((h) => {
                        const live = stocks.find((s) => s.symbol === h.symbol);
                        const val = (live?.currentPrice ?? h.averageCost) * h.shares;
                        return (
                          <Box key={h.symbol} sx={{ p: 1.8, borderRadius: 2, bgcolor: D.elevated, border: `1px solid ${D.border}` }}>
                            <Typography sx={{ fontWeight: 900, fontSize: 13.5, color: D.t1, fontFamily: MONO }}>{h.symbol} · {h.shares} share{h.shares === 1 ? "" : "s"}</Typography>
                            <Typography sx={{ fontSize: 12, color: D.t3 }}>Avg {money(h.averageCost)} · Value {money(val)}</Typography>
                          </Box>
                        );
                      })}
                    </Stack>
                  )}
                </Box>
              </Box>

              {/* Game loop */}
              <Box sx={{ bgcolor: D.elevated, border: `1px solid ${D.border}`, borderRadius: 2, p: 3 }}>
                <Typography sx={{ fontWeight: 900, fontSize: 15, color: D.t1, mb: 0.8 }}>Game Loop</Typography>
                <Typography sx={{ fontSize: 13, color: D.t3, mb: 2 }}>Seeded randomness, sector drift, volatility, and generated events from Day 4 onward.</Typography>
                <Stack spacing={1} sx={{ mb: 2 }}>
                  {[
                    "Use the first 3 days to learn the market story.",
                    "Open stock details before buying.",
                    "Compare P/E, growth, debt, and margin.",
                    "From Day 4, pricing is formula-based.",
                  ].map((tip) => (
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
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

function CommandConsole({ open, onClose, onRun }: {
  open: boolean;
  onClose: () => void;
  onRun: (command: string) => string;
}) {
  const [command, setCommand] = useState("");
  const [history, setHistory] = useState<string[]>(["session active"]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const submitCommand = () => {
    const trimmed = command.trim();
    if (!trimmed) return;

    const output = onRun(trimmed);
    setHistory((current) => [`> ${trimmed}`, output, ...current].slice(0, 8));
    setCommand("");
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
          value={command}
          placeholder=""
          onChange={(event) => setCommand(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submitCommand();
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

function StockRow({ stock, gameDay, sharesOwned, onBuy, onSell, onOpen }: {
  stock: Stock; gameDay: number; sharesOwned: number; onBuy: () => void; onSell: () => void; onOpen: () => void;
}) {
  const up = stock.dayChangePercent >= 0;
  return (
    <Box onClick={onOpen} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
      sx={{
        display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr auto", md: "1.4fr 0.9fr auto" },
        gap: 2, alignItems: "center", p: 2, mb: 1.2, borderRadius: 2,
        bgcolor: D.elevated, border: `1px solid ${D.border}`,
        cursor: "pointer", outline: "none",
        transition: "border-color 160ms, background-color 160ms",
        "&:hover": { borderColor: D.borderHi, bgcolor: D.overlay },
        "&:focus-visible": { boxShadow: `0 0 0 2px ${D.brand}` },
      }}
    >
      <Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
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
