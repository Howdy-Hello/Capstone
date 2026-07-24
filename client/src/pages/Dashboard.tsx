import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Button, Chip, CircularProgress, Container, Divider, Grid, LinearProgress, Stack, Typography,
} from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import AssessmentIcon from "@mui/icons-material/Assessment";
import PieChartIcon from "@mui/icons-material/PieChart";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import { Link as RouterLink } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from "recharts";

import { Stock } from "../data/mockStocks";
import { getNetWorth, getPortfolioValue } from "../data/tradingState";
import { useGame } from "../context/GameContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { D, CARD, MONO, money, pct } from "../theme/design";

// Framer Motion 11 predates React 19's stricter JSX return type.
const MotionPresence = AnimatePresence as React.FC<React.PropsWithChildren<{
  initial?: boolean;
  mode?: "sync" | "popLayout" | "wait";
}>>;

type TradeRecord = {
  id: string;
  game_day: number;
  trade_type: "buy" | "sell";
  quantity: number;
  price_per_share: number;
  total_amount: number;
  executed_at: string;
  stocks: { symbol: string; company_name: string } | null;
};

const PIE_COLORS = [D.green, D.brand, D.amber, "#38BDF8", "#F87171", "#A78BFA"];

function StatTile({ label, value, icon, up, index = 0 }: { label: string; value: string; icon: React.ReactNode; up?: boolean; index?: number }) {
  const reduceMotion = useReducedMotion();
  const color = up === undefined ? D.brandText : up ? D.greenText : D.redText;
  const bg = up === undefined ? D.brandBg : up ? D.greenBg : D.redBg;
  return (
    <Box component={motion.div} initial={reduceMotion ? undefined : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, delay: Math.min(index * 0.06, 0.24) }}
      sx={{ ...CARD, p: 2.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography sx={{ fontSize: 10.5, fontWeight: 900, letterSpacing: 0.8, color: D.t3, fontFamily: MONO, mb: 0.8 }}>{label.toUpperCase()}</Typography>
          <motion.div key={value} initial={reduceMotion ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }}>
            <Typography sx={{ fontSize: 22, fontWeight: 950, color: D.t1, fontFamily: MONO }}>{value}</Typography>
          </motion.div>
        </Box>
        <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: bg, color, display: "grid", placeItems: "center", flexShrink: 0 }}>
          {icon}
        </Box>
      </Stack>
    </Box>
  );
}

export default function Dashboard() {
  const reduceMotion = useReducedMotion();
  const trading = useGame();
  const { user, profile } = useAuth();
  const { gameDay, stocks, news } = trading;
  const modeLabel = trading.gameMode === "limited_30" ? "30-day challenge" : "infinite session";
  const [tradeHistory, setTradeHistory] = useState<TradeRecord[]>([]);
  const [tradeHistoryLoading, setTradeHistoryLoading] = useState(true);

  const playerName =
    profile?.display_name
    || profile?.username
    || user?.email?.split("@")[0]
    || "Trader";
  const portfolioValue = useMemo(() => getPortfolioValue(trading.account, stocks), [trading.account, stocks]);
  const netWorth = useMemo(() => getNetWorth(trading.account, stocks), [trading.account, stocks]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setTradeHistoryLoading(true);
    supabase
      .from("trades")
      .select("id, game_day, trade_type, quantity, price_per_share, total_amount, executed_at, stocks(symbol, company_name)")
      .eq("user_id", user.id)
      .order("executed_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (cancelled) return;
        setTradeHistory((data ?? []) as unknown as TradeRecord[]);
        setTradeHistoryLoading(false);
      });
    return () => { cancelled = true; };
  }, [user]);

  const holdings = useMemo(() => trading.account.holdings.map((h) => {
    const stock = stocks.find((s) => s.symbol === h.symbol);
    const currentPrice = stock?.currentPrice ?? h.averageCost;
    const marketValue = currentPrice * h.shares;
    const costBasis = h.averageCost * h.shares;
    const profitLoss = marketValue - costBasis;
    const profitLossPercent = costBasis > 0 ? (profitLoss / costBasis) * 100 : 0;
    return { ...h, stock, currentPrice, marketValue, costBasis, profitLoss, profitLossPercent };
  }), [trading.account.holdings, stocks]);

  const marketSummary = useMemo(() => {
    const gainers = stocks.filter((s) => s.dayChangePercent >= 0).length;
    const averageMove = stocks.length
      ? stocks.reduce((sum, s) => sum + s.dayChangePercent, 0) / stocks.length
      : 0;
    const strongest = [...stocks].sort((a, b) => b.dayChangePercent - a.dayChangePercent)[0];
    const weakest = [...stocks].sort((a, b) => a.dayChangePercent - b.dayChangePercent)[0];
    return { gainers, losers: stocks.length - gainers, averageMove, strongest, weakest };
  }, [stocks]);

  const sectorExposure = useMemo(() => {
    const exp = new Map<string, number>();
    holdings.forEach((h) => exp.set(h.stock?.sector ?? "Unknown", (exp.get(h.stock?.sector ?? "Unknown") ?? 0) + h.marketValue));
    if (trading.account.cash > 0) exp.set("Cash", trading.account.cash);
    return Array.from(exp, ([name, value]) => ({ name, value: Number(value.toFixed(2)) }));
  }, [holdings, trading.account.cash]);

  const movers = useMemo(() => [...stocks].sort((a, b) => Math.abs(b.dayChangePercent) - Math.abs(a.dayChangePercent)).slice(0, 8), [stocks]);
  const returnPct = ((netWorth - 2000) / 2000) * 100;

  if (trading.loading) {
    return (
      <Box sx={{ bgcolor: D.bg, minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <CircularProgress sx={{ color: D.brandText }} />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: D.bg, minHeight: "100vh" }}>
      {/* Header */}
      <Box sx={{ bgcolor: D.surface, borderBottom: `1px solid ${D.border}` }}>
        <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
          <motion.div initial={reduceMotion ? undefined : { opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={2}>
              <Box>
                <Chip label={`DAY ${gameDay}`} size="small" sx={{ bgcolor: D.brandBg, color: D.brandText, border: `1px solid ${D.brandBd}`, fontWeight: 900, fontSize: 10, fontFamily: MONO, letterSpacing: 1, mb: 1 }} />
                <Typography sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 950, color: D.t1, letterSpacing: -1 }}>
                  {playerName}&apos;s Dashboard
                </Typography>
                <Typography sx={{ fontSize: 13, color: D.t2, mt: 0.5 }}>Live portfolio view for Game Day {gameDay} · {modeLabel}</Typography>
              </Box>
              <Box sx={{ ...CARD, p: 2.5, minWidth: 280 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 900, color: D.t3, fontFamily: MONO }}>SESSION STATUS</Typography>
                  <Typography sx={{ fontSize: 11, color: D.t3, fontFamily: MONO }}>DAY {gameDay}{trading.maxGameDay ? `/${trading.maxGameDay}` : ""}</Typography>
                </Stack>
                <LinearProgress variant={trading.maxGameDay ? "determinate" : "indeterminate"} value={trading.maxGameDay ? (gameDay / trading.maxGameDay) * 100 : undefined}
                  sx={{ height: 6, borderRadius: 99, bgcolor: D.overlay, "& .MuiLinearProgress-bar": { bgcolor: D.brand, borderRadius: 99 } }} />
              </Box>
            </Stack>
          </motion.div>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
        {/* Stat tiles */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: "Cash",         value: money(trading.account.cash), icon: <AccountBalanceWalletIcon sx={{ fontSize: 20 }} />, up: undefined },
            { label: "Portfolio",    value: money(portfolioValue),        icon: <PieChartIcon sx={{ fontSize: 20 }} />,            up: undefined },
            { label: "Net Worth",    value: money(netWorth),              icon: <AssessmentIcon sx={{ fontSize: 20 }} />,          up: returnPct >= 0 },
            { label: "Total Return", value: pct(returnPct, 2),            icon: returnPct >= 0 ? <TrendingUpIcon sx={{ fontSize: 20 }} /> : <TrendingDownIcon sx={{ fontSize: 20 }} />, up: returnPct >= 0 },
          ].map((s, i) => (
            <Grid item xs={12} sm={6} md={3} key={s.label}>
              <StatTile {...s} index={i} />
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={3}>
          {/* Holdings */}
          <Grid item xs={12} lg={8}>
            <Box sx={{ ...CARD, p: 0, overflow: "hidden" }}>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1} sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${D.border}` }}>
                <Box>
                  <Typography sx={{ fontWeight: 900, fontSize: 16, color: D.t1 }}>Holdings</Typography>
                  <Typography sx={{ fontSize: 12.5, color: D.t3 }}>Marked to Day {gameDay} prices.</Typography>
                </Box>
                <motion.div whileHover={reduceMotion ? undefined : { y: -2 }} whileTap={reduceMotion ? undefined : { scale: 0.96 }}>
                  <Button component={RouterLink} to="/game" size="small" variant="contained"
                    sx={{ bgcolor: D.brand, fontWeight: 800, fontSize: 13, textTransform: "none", borderRadius: 1.5, boxShadow: "none", "&:hover": { bgcolor: D.brandMid, boxShadow: "none" } }}>
                    Trade →
                  </Button>
                </motion.div>
              </Stack>
              <Box sx={{ p: 2.5 }}>
                {holdings.length === 0 ? (
                  <Box sx={{ p: 3, borderRadius: 2, bgcolor: D.elevated, border: `1px solid ${D.border}`, textAlign: "center" }}>
                    <Typography sx={{ fontWeight: 800, color: D.t2, mb: 0.5 }}>No positions yet</Typography>
                    <Typography sx={{ fontSize: 13, color: D.t3 }}>Buy shares on the Game page and they'll appear here.</Typography>
                  </Box>
                ) : (
                  <Stack spacing={1.2}>
                    <MotionPresence mode="popLayout" initial={false}>
                    {holdings.map((h, index) => {
                      const up = h.profitLoss >= 0;
                      const alloc = netWorth > 0 ? (h.marketValue / netWorth) * 100 : 0;
                      return (
                        <Box key={h.symbol} component={motion.div} layout={!reduceMotion}
                          initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -16 }}
                          transition={{ duration: 0.22, delay: Math.min(index * 0.025, 0.16), layout: { type: "spring", stiffness: 420, damping: 34 } }}
                          sx={{ p: 2, borderRadius: 2, bgcolor: D.elevated, border: `1px solid ${D.border}` }}>
                          <Grid container spacing={1.5} alignItems="center">
                            <Grid item xs={12} md={4}>
                              <Stack direction="row" spacing={1.5} alignItems="center">
                                <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: up ? D.greenBg : D.redBg, color: up ? D.greenText : D.redText, display: "grid", placeItems: "center", flexShrink: 0 }}>
                                  <ShowChartIcon sx={{ fontSize: 18 }} />
                                </Box>
                                <Box>
                                  <Typography sx={{ fontWeight: 900, fontSize: 14, color: D.t1, fontFamily: MONO }}>{h.symbol}</Typography>
                                  <Typography sx={{ fontSize: 11.5, color: D.t3 }}>{h.name}</Typography>
                                </Box>
                              </Stack>
                            </Grid>
                            {[
                              { label: "Shares", val: h.shares.toString() },
                              { label: "Price",  val: money(h.currentPrice) },
                              { label: "Value",  val: money(h.marketValue) },
                            ].map((m) => (
                              <Grid item xs={4} md={2} key={m.label}>
                                <Typography sx={{ fontSize: 10.5, fontWeight: 900, color: D.t3, fontFamily: MONO }}>{m.label.toUpperCase()}</Typography>
                                <Typography sx={{ fontSize: 13, fontWeight: 800, color: D.t1, fontFamily: MONO }}>{m.val}</Typography>
                              </Grid>
                            ))}
                            <Grid item xs={12} md={2}>
                              <Typography sx={{ fontSize: 10.5, fontWeight: 900, color: D.t3, fontFamily: MONO }}>P/L</Typography>
                              <Typography sx={{ fontSize: 13, fontWeight: 800, color: up ? D.greenText : D.redText, fontFamily: MONO }}>
                                {h.profitLoss >= 0 ? "+" : ""}{money(h.profitLoss)}
                              </Typography>
                              <Typography sx={{ fontSize: 11, color: up ? D.greenText : D.redText }}>{pct(h.profitLossPercent)}</Typography>
                            </Grid>
                          </Grid>
                          <Box sx={{ mt: 1.5 }}>
                            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                              <Typography sx={{ fontSize: 10.5, color: D.t3 }}>Allocation</Typography>
                              <Typography sx={{ fontSize: 10.5, color: D.t3 }}>{alloc.toFixed(1)}%</Typography>
                            </Stack>
                            <LinearProgress variant="determinate" value={Math.min(100, alloc)}
                              sx={{ height: 4, borderRadius: 99, bgcolor: D.border, "& .MuiLinearProgress-bar": { bgcolor: up ? D.green : D.red, borderRadius: 99 } }} />
                          </Box>
                          <Stack direction="row" spacing={1} sx={{ mt: 1.2 }}>
                            <Button size="small" component={RouterLink} to={`/stocks/${h.symbol}`}
                              sx={{ color: D.brandText, fontSize: 11, fontWeight: 700, textTransform: "none", px: 1.2, py: 0.4, borderRadius: 1.2, bgcolor: D.brandBg, border: `1px solid ${D.brandBd}`, "&:hover": { bgcolor: "rgba(124,58,237,0.15)" } }}>
                              View Chart →
                            </Button>
                            <Button size="small" component={RouterLink} to="/game"
                              sx={{ color: D.t2, fontSize: 11, fontWeight: 700, textTransform: "none", px: 1.2, py: 0.4, borderRadius: 1.2, border: `1px solid ${D.border}`, "&:hover": { color: D.t1, borderColor: D.borderHi } }}>
                              Trade
                            </Button>
                          </Stack>
                        </Box>
                      );
                    })}
                    </MotionPresence>
                  </Stack>
                )}
              </Box>
            </Box>
          </Grid>

          {/* Allocation pie */}
          <Grid item xs={12} lg={4}>
            <Box sx={{ ...CARD, p: 0, overflow: "hidden" }}>
              <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${D.border}` }}>
                <Typography sx={{ fontWeight: 900, fontSize: 16, color: D.t1 }}>Allocation</Typography>
                <Typography sx={{ fontSize: 12.5, color: D.t3 }}>Cash and sector exposure.</Typography>
              </Box>
              <Box sx={{ px: 2.5, py: 2 }}>
                <Box sx={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <RTooltip
                        contentStyle={{ backgroundColor: D.elevated, border: `1px solid ${D.border}`, borderRadius: 8, color: D.t1 }}
                        formatter={(val: any) => [money(Number(val)), ""]}
                      />
                      <Pie data={sectorExposure} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={2}>
                        {sectorExposure.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
                <Divider sx={{ borderColor: D.border, my: 1.5 }} />
                <Stack spacing={0.8}>
                  {sectorExposure.map((e, i) => (
                    <Stack key={e.name} direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: D.t2 }}>{e.name}</Typography>
                      </Stack>
                      <Typography sx={{ fontSize: 12, color: D.t3, fontFamily: MONO }}>{money(e.value)}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            </Box>
          </Grid>

          {/* Market movers bar chart */}
          <Grid item xs={12} lg={7}>
            <Box sx={{ ...CARD, p: 0, overflow: "hidden" }}>
              <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${D.border}` }}>
                <Typography sx={{ fontWeight: 900, fontSize: 16, color: D.t1 }}>Market Movers</Typography>
                <Typography sx={{ fontSize: 12.5, color: D.t3 }}>Top 8 absolute moves today.</Typography>
              </Box>
              <Box sx={{ p: 2.5, height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={movers} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={D.border} />
                    <XAxis type="number" tickFormatter={(v) => `${Number(v).toFixed(0)}%`} tick={{ fill: D.t3, fontSize: 11 }} />
                    <YAxis type="category" dataKey="symbol" width={52} tick={{ fill: D.t2, fontSize: 12, fontFamily: MONO }} />
                    <RTooltip contentStyle={{ backgroundColor: D.elevated, border: `1px solid ${D.border}`, borderRadius: 8, color: D.t1 }} formatter={(v: any) => [`${Number(v).toFixed(2)}%`, "Move"]} />
                    <Bar dataKey="dayChangePercent" radius={[0, 4, 4, 0]}>
                      {movers.map((s) => <Cell key={s.symbol} fill={s.dayChangePercent >= 0 ? D.green : D.red} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          </Grid>

          {/* Today's news */}
          <Grid item xs={12} lg={5}>
            <Box sx={{ ...CARD, p: 0, overflow: "hidden" }}>
              <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${D.border}` }}>
                <Typography sx={{ fontWeight: 900, fontSize: 16, color: D.t1 }}>Today's News</Typography>
                <Typography sx={{ fontSize: 12.5, color: D.t3 }}>Game Day {gameDay} market events.</Typography>
              </Box>
              <Box sx={{ p: 2.5 }}>
                {news.length === 0 ? (
                  <Typography sx={{ fontSize: 13, color: D.t3, py: 1 }}>No major news today. Prices still move from drift and volatility.</Typography>
                ) : (
                  <Stack spacing={1.2}>
                    <MotionPresence mode="popLayout" initial={false}>
                    {news.slice(0, 5).map((item, index) => (
                        <Box key={item.newsId} component={motion.div} layout={!reduceMotion}
                          initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -16 }}
                          transition={{ duration: 0.22, delay: Math.min(index * 0.025, 0.16), layout: { type: "spring", stiffness: 420, damping: 34 } }}
                          sx={{ p: 1.8, borderRadius: 2, bgcolor: D.elevated, border: `1px solid ${D.border}` }}>
                          <Stack direction="row" spacing={1} sx={{ mb: 0.8 }} flexWrap="wrap" useFlexGap>
                            <Chip size="small" label={item.importance}
                              sx={{ bgcolor: item.importance === "High" ? D.redBg : D.amberBg, color: item.importance === "High" ? D.redText : D.amber, border: `1px solid ${item.importance === "High" ? D.redBd : "rgba(245,158,11,0.3)"}`, fontWeight: 800, fontSize: 10 }} />
                            {item.relatedTickers.slice(0, 3).map((t) => (
                              <Chip key={t} size="small" label={t} sx={{ bgcolor: D.overlay, color: D.brandText, fontWeight: 800, fontSize: 10, fontFamily: MONO }} />
                            ))}
                          </Stack>
                          <Typography sx={{ fontWeight: 800, fontSize: 13.5, color: D.t1, mb: 0.4 }}>{item.headline}</Typography>
                          <Typography sx={{ fontSize: 12.5, color: D.t3, lineHeight: 1.6 }}>{item.body}</Typography>
                        </Box>
                    ))}
                    </MotionPresence>
                  </Stack>
                )}
                <motion.div whileHover={reduceMotion ? undefined : { y: -2 }} whileTap={reduceMotion ? undefined : { scale: 0.98 }}>
                  <Button fullWidth variant="outlined" component={RouterLink} to="/news" sx={{ mt: 2, color: D.brandText, borderColor: D.brandBd, fontWeight: 800, fontSize: 13, textTransform: "none", borderRadius: 1.5, "&:hover": { bgcolor: D.brandBg } }}>
                    Open News →
                  </Button>
                </motion.div>
              </Box>
            </Box>
          </Grid>

          {/* Market callouts */}
          <Grid item xs={12}>
            <Box sx={{ bgcolor: D.elevated, border: `1px solid ${D.border}`, borderRadius: 2, p: 3 }}>
              <Grid container spacing={3}>
                {([
                  { label: "STRONGEST", stock: marketSummary.strongest, up: true },
                  { label: "WEAKEST",   stock: marketSummary.weakest,   up: false },
                ] as { label: string; stock?: Stock; up: boolean }[]).map(({ label, stock, up }) => (
                  stock ? (
                    <Grid item xs={12} md={4} key={label}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: up ? D.greenBg : D.redBg, color: up ? D.greenText : D.redText, display: "grid", placeItems: "center", flexShrink: 0 }}>
                          {up ? <TrendingUpIcon /> : <TrendingDownIcon />}
                        </Box>
                        <Box>
                          <Typography sx={{ fontSize: 10.5, fontWeight: 900, color: D.t3, fontFamily: MONO }}>{label}</Typography>
                          <Typography sx={{ fontSize: 18, fontWeight: 950, color: D.t1, fontFamily: MONO }}>{stock.symbol} {pct(stock.dayChangePercent)}</Typography>
                          <Typography sx={{ fontSize: 12, color: D.t3 }}>{stock.name}</Typography>
                        </Box>
                      </Stack>
                    </Grid>
                  ) : null
                ))}
                <Grid item xs={12} md={4}>
                  <Box>
                    <Typography sx={{ fontSize: 10.5, fontWeight: 900, color: D.t3, fontFamily: MONO, mb: 0.8 }}>MARKET BREADTH</Typography>
                    <Typography sx={{ fontSize: 20, fontWeight: 950, color: D.t1 }}>
                      <Box component="span" sx={{ color: D.greenText }}>{marketSummary.gainers} up</Box>
                      {" / "}
                      <Box component="span" sx={{ color: D.redText }}>{marketSummary.losers} down</Box>
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, color: D.t3, mt: 0.5 }}>Broad rally vs. concentrated move.</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Grid>
        </Grid>

        {/* ── Trade History ─────────────────────────────────────────────── */}
        <Box sx={{ ...CARD, p: 0, overflow: "hidden", mt: 3 }}>
          <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${D.border}` }}>
            <Typography sx={{ fontWeight: 900, fontSize: 16, color: D.t1 }}>Trade History</Typography>
            <Typography sx={{ fontSize: 12.5, color: D.t3 }}>Your last 20 executed buys and sells.</Typography>
          </Box>
          <Box sx={{ p: 2.5 }}>
            {tradeHistoryLoading ? (
              <Box sx={{ display: "grid", placeItems: "center", py: 4 }}>
                <CircularProgress sx={{ color: D.brandText }} />
              </Box>
            ) : tradeHistory.length === 0 ? (
              <Box sx={{ p: 3, borderRadius: 2, bgcolor: D.elevated, border: `1px dashed ${D.borderHi}`, textAlign: "center" }}>
                <Typography sx={{ fontWeight: 800, fontSize: 15, color: D.t1, mb: 0.5 }}>No trades yet.</Typography>
                <Typography sx={{ fontSize: 13, color: D.t3, mb: 2 }}>Buy your first stock to start your trading log.</Typography>
                <Button component={RouterLink} to="/game" variant="contained"
                  sx={{ bgcolor: D.brand, fontWeight: 800, textTransform: "none", borderRadius: 1.5, boxShadow: "none", "&:hover": { bgcolor: D.brandMid, boxShadow: "none" } }}>
                  Go to Market →
                </Button>
              </Box>
            ) : (
              <Stack spacing={1}>
                <MotionPresence mode="popLayout" initial={false}>
                {tradeHistory.map((t, index) => {
                  const isBuy = t.trade_type === "buy";
                  const sym   = t.stocks?.symbol ?? "—";
                  return (
                    <Box key={t.id} component={motion.div} layout={!reduceMotion}
                      initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -16 }}
                      transition={{ duration: 0.22, delay: Math.min(index * 0.025, 0.16), layout: { type: "spring", stiffness: 420, damping: 34 } }}
                      sx={{ p: 1.8, borderRadius: 2, bgcolor: D.elevated, border: `1px solid ${D.border}` }}>
                      <Grid container spacing={1.5} alignItems="center">
                        <Grid item xs="auto">
                          <Chip size="small" label={isBuy ? "BUY" : "SELL"}
                            sx={{ bgcolor: isBuy ? D.greenBg : D.redBg, color: isBuy ? D.greenText : D.redText, border: `1px solid ${isBuy ? D.greenBd : D.redBd}`, fontWeight: 900, fontSize: 10, fontFamily: MONO, minWidth: 40 }} />
                        </Grid>
                        <Grid item xs>
                          <Stack direction="row" spacing={0.8} alignItems="center">
                            <Typography sx={{ fontWeight: 900, fontSize: 13.5, color: D.t1, fontFamily: MONO }}>{sym}</Typography>
                            <Typography sx={{ fontSize: 12, color: D.t3 }}>{t.stocks?.company_name ?? ""}</Typography>
                          </Stack>
                        </Grid>
                        <Grid item xs={4} sm={2}>
                          <Typography sx={{ fontSize: 10.5, color: D.t3 }}>Qty</Typography>
                          <Typography sx={{ fontSize: 13, fontWeight: 800, color: D.t1, fontFamily: MONO }}>{t.quantity}</Typography>
                        </Grid>
                        <Grid item xs={4} sm={2}>
                          <Typography sx={{ fontSize: 10.5, color: D.t3 }}>Price</Typography>
                          <Typography sx={{ fontSize: 13, fontWeight: 800, color: D.t1, fontFamily: MONO }}>{money(t.price_per_share)}</Typography>
                        </Grid>
                        <Grid item xs={4} sm={2}>
                          <Typography sx={{ fontSize: 10.5, color: D.t3 }}>Total</Typography>
                          <Typography sx={{ fontSize: 13, fontWeight: 800, color: isBuy ? D.redText : D.greenText, fontFamily: MONO }}>
                            {isBuy ? "−" : "+"}{money(t.total_amount)}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={2}>
                          <Typography sx={{ fontSize: 11.5, color: D.brandText, fontFamily: MONO, fontWeight: 700 }}>Day {t.game_day}</Typography>
                          <Typography sx={{ fontSize: 11, color: D.t3 }}>{new Date(t.executed_at).toLocaleDateString()}</Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  );
                })}
                </MotionPresence>
              </Stack>
            )}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
