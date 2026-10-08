import DecisionNote from "../components/learning/DecisionNote";
import React, { useEffect, useMemo } from "react";
import {
  Box, Button, Chip, CircularProgress, Container, Grid, MenuItem,
  Stack, TextField, Typography,
} from "@mui/material";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import StarIcon from "@mui/icons-material/Star";
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer,
  Tooltip as RTooltip, XAxis, YAxis,
} from "recharts";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { getSharesOwned } from "../data/tradingState";
import { useGame } from "../context/GameContext";
import { resolveComparisonSymbols } from "../lib/routing";
import { CARD, D, MONO, money, pct } from "../theme/design";
import { usePageTitle } from "../lib/usePageTitle";

// Framer Motion 11 predates React 19's stricter JSX return type.
const MotionPresence = AnimatePresence as React.FC<React.PropsWithChildren<{
  initial?: boolean;
  mode?: "sync" | "popLayout" | "wait";
}>>;

type Metric = {
  label: string;
  left: string;
  right: string;
  note: string;
};

export default function CompareStocks() {
  usePageTitle("Compare stocks");
  const reduceMotion = useReducedMotion();
  const trading = useGame();
  const { getHistory } = trading;
  const [params, setParams] = useSearchParams();
  const requestedLeft = params.get("left");
  const requestedRight = params.get("right");
  const resolved = useMemo(
    () => resolveComparisonSymbols(trading.stocks, trading.watchlistStocks, requestedLeft, requestedRight),
    [requestedLeft, requestedRight, trading.stocks, trading.watchlistStocks],
  );
  const leftSymbol = resolved.left;
  const rightSymbol = resolved.right;

  useEffect(() => {
    if (trading.loading || trading.stocks.length === 0) return;
    if (requestedLeft === leftSymbol && requestedRight === rightSymbol) return;
    const next = new URLSearchParams();
    if (leftSymbol) next.set("left", leftSymbol);
    if (rightSymbol) next.set("right", rightSymbol);
    setParams(next, { replace: true });
  }, [leftSymbol, requestedLeft, requestedRight, rightSymbol, setParams, trading.loading, trading.stocks.length]);

  const selectStock = (side: "left" | "right", symbol: string) => {
    const next = new URLSearchParams();
    next.set("left", side === "left" ? symbol : leftSymbol);
    next.set("right", side === "right" ? symbol : rightSymbol);
    setParams(next);
  };

  const left = trading.getStock(leftSymbol);
  const right = trading.getStock(rightSymbol);
  const leftHistory = useMemo(() => (
    left ? getHistory(left.symbol) : []
  ), [getHistory, left]);
  const rightHistory = useMemo(() => (
    right ? getHistory(right.symbol) : []
  ), [getHistory, right]);

  const chartData = useMemo(() => {
    const byDay = new Map<number, { gameDay: number; left?: number; right?: number }>();
    leftHistory.forEach((point) => {
      byDay.set(point.gameDay, { ...(byDay.get(point.gameDay) ?? { gameDay: point.gameDay }), left: point.closePrice });
    });
    rightHistory.forEach((point) => {
      byDay.set(point.gameDay, { ...(byDay.get(point.gameDay) ?? { gameDay: point.gameDay }), right: point.closePrice });
    });
    return Array.from(byDay.values()).sort((a, b) => a.gameDay - b.gameDay);
  }, [leftHistory, rightHistory]);

  const metrics = useMemo<Metric[]>(() => {
    if (!left || !right) return [];
    return [
      { label: "Current Price", left: money(left.currentPrice), right: money(right.currentPrice), note: "A lower share price does not mean a cheaper business." },
      { label: "Day Move", left: pct(left.dayChangePercent), right: pct(right.dayChangePercent), note: "One-day movement describes a result; it does not recommend a purchase." },
      { label: "P/E Ratio", left: left.fundamentals.peRatio.toFixed(1), right: right.fundamentals.peRatio.toFixed(1), note: "Price \u00f7 annual earnings per share. Lower can reflect lower growth expectations or weaker earnings prospects, as well as a lower valuation." },
      { label: "EPS", left: money(left.fundamentals.eps), right: money(right.fundamentals.eps), note: "Earnings per share. Share counts differ; compare earnings quality and trends instead of ranking businesses by raw EPS." },
      { label: "Revenue Growth", left: pct(left.fundamentals.revenueGrowth), right: pct(right.fundamentals.revenueGrowth), note: "Sales growth can help, but investigate costs and whether it becomes sustainable profit." },
      { label: "Profit Margin", left: pct(left.fundamentals.profitMargin), right: pct(right.fundamentals.profitMargin), note: "The share of revenue kept as profit. Compare similar businesses and investigate changes over time." },
      { label: "Debt / Equity", left: left.fundamentals.debtToEquity.toFixed(2), right: right.fundamentals.debtToEquity.toFixed(2), note: "Debt relative to shareholder equity. Capital needs differ by industry; leverage can amplify losses." },
      { label: "Dividend Yield", left: pct(left.fundamentals.dividendYield), right: pct(right.fundamentals.dividendYield), note: "Dividend relative to price. A high yield can reflect a falling price or an expected cut; it is not guaranteed income." },
      { label: "Volatility", left: pct(left.volatility * 100), right: pct(right.volatility * 100), note: "A game parameter describing price movement. Less volatility does not mean no risk." },
      { label: "Volume", left: left.volume.toLocaleString(), right: right.volume.toLocaleString(), note: "Shares traded. Activity and liquidity are different from investment quality." },
      { label: "Risk Level", left: left.riskLevel, right: right.riskLevel, note: "An illustrative game classification, not a probability of loss." },
      { label: "Sector", left: left.sector, right: right.sector, note: "Compare similar businesses; sectors have different economics and exposures." },
      { label: "Analyst Rating", left: left.fundamentals.analystRating, right: right.fundamentals.analystRating, note: "An illustrative game opinion. Investigate the evidence and uncertainty yourself." },
      { label: "Shares Owned", left: getSharesOwned(trading.account, left.symbol).toString(), right: getSharesOwned(trading.account, right.symbol).toString(), note: "Your exposure matters alongside the business case." },
    ];
  }, [left, right, trading.account]);

  if (trading.loading) {
    return (
      <Box sx={{ bgcolor: D.bg, minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <CircularProgress sx={{ color: D.brandText }} />
      </Box>
    );
  }

  const sameStock = Boolean(left && right && left.symbol === right.symbol);

  return (
    <Box sx={{ bgcolor: D.bg, minHeight: "100vh" }}>
      <Box sx={{ bgcolor: D.surface, borderBottom: `1px solid ${D.border}` }}>
        <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
          <motion.div initial={reduceMotion ? undefined : { opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={2}>
              <Box>
                <Chip label="STOCK COMPARISON" size="small"
                  sx={{ bgcolor: D.brandBg, color: D.brandText, border: `1px solid ${D.brandBd}`, fontWeight: 900, fontSize: 10, fontFamily: MONO, letterSpacing: 1, mb: 1 }} />
                <Typography component="h1" sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 950, color: D.t1, letterSpacing: -1 }}>Compare Stocks</Typography>
                <Typography sx={{ fontSize: 13, color: D.t2, mt: 0.5 }}>Review price action, fundamentals, risk, and ownership without changing your portfolio.</Typography>
              </Box>
              <motion.div whileHover={reduceMotion ? undefined : { y: -2 }} whileTap={reduceMotion ? undefined : { scale: 0.96 }}>
                <Button component={RouterLink} to="/game" variant="contained"
                  sx={{ bgcolor: D.brand, fontWeight: 800, textTransform: "none", borderRadius: 1.5, boxShadow: "none", "&:hover": { bgcolor: D.brandMid, boxShadow: "none" } }}>
                  Back to Market
                </Button>
              </motion.div>
            </Stack>
          </motion.div>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box sx={{ ...CARD, p: 2.5, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={5}>
              <TextField select fullWidth size="small" label="First stock" value={leftSymbol} onChange={(event) => selectStock("left", event.target.value)}
                InputLabelProps={{ sx: { color: D.t3 } }}
                sx={{ "& .MuiOutlinedInput-root": { bgcolor: D.elevated, color: D.t1, borderRadius: 1.5, "& fieldset": { borderColor: D.border }, "&:hover fieldset": { borderColor: D.borderHi }, "&.Mui-focused fieldset": { borderColor: D.brand } } }}>
                {trading.stocks.map((stock) => (
                  <MenuItem key={stock.symbol} value={stock.symbol}>{stock.symbol} - {stock.name}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={2} sx={{ display: "grid", placeItems: "center" }}>
              <CompareArrowsIcon sx={{ color: D.brandText, fontSize: 26 }} />
            </Grid>
            <Grid item xs={12} md={5}>
              <TextField select fullWidth size="small" label="Second stock" value={rightSymbol} onChange={(event) => selectStock("right", event.target.value)}
                InputLabelProps={{ sx: { color: D.t3 } }}
                sx={{ "& .MuiOutlinedInput-root": { bgcolor: D.elevated, color: D.t1, borderRadius: 1.5, "& fieldset": { borderColor: D.border }, "&:hover fieldset": { borderColor: D.borderHi }, "&.Mui-focused fieldset": { borderColor: D.brand } } }}>
                {trading.stocks.map((stock) => (
                  <MenuItem key={stock.symbol} value={stock.symbol}>{stock.symbol} - {stock.name}</MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
          {sameStock && (
            <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: D.redBg, border: `1px solid ${D.redBd}` }}>
              <Typography sx={{ color: D.redText, fontSize: 13, fontWeight: 800 }}>Choose two different stocks to compare.</Typography>
            </Box>
          )}
        </Box>

        {left && right && (
          <>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <MotionPresence mode="popLayout" initial={false}>
              {[left, right].map((stock, i) => {
                const watched = trading.isWatchlisted(stock.symbol);
                const up = stock.dayChangePercent >= 0;
                return (
                  <Grid item xs={12} md={6} key={stock.symbol}>
                    <Box component={motion.div} layout={!reduceMotion}
                      initial={reduceMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.28, delay: Math.min(i * 0.06, 0.12), layout: { type: "spring", stiffness: 420, damping: 34 } }}
                      sx={{ ...CARD, p: 2.5, height: "100%" }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                        <Box>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                            <Typography sx={{ fontSize: 22, fontWeight: 950, color: D.t1, fontFamily: MONO }}>{stock.symbol}</Typography>
                            {watched && <StarIcon sx={{ color: D.amber, fontSize: 18 }} />}
                          </Stack>
                          <Typography sx={{ fontSize: 14, color: D.t2, fontWeight: 800 }}>{stock.name}</Typography>
                          <Typography sx={{ fontSize: 12.5, color: D.t3 }}>{stock.sector} / {stock.industry}</Typography>
                        </Box>
                        <Box sx={{ textAlign: "right" }}>
                          <Typography sx={{ fontSize: 22, fontWeight: 950, color: D.t1, fontFamily: MONO }}>{money(stock.currentPrice)}</Typography>
                          <Typography sx={{ fontSize: 13, fontWeight: 900, color: up ? D.greenText : D.redText }}>{pct(stock.dayChangePercent)}</Typography>
                        </Box>
                      </Stack>
                      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                        <Button size="small" onClick={() => trading.toggleWatchlist(stock)} startIcon={<StarIcon sx={{ fontSize: 14 }} />}
                          sx={{ color: watched ? D.amber : D.t2, border: `1px solid ${watched ? D.amber : D.border}`, bgcolor: watched ? D.amberBg : "transparent", fontWeight: 800, textTransform: "none", borderRadius: 1.5 }}>
                          {watched ? "Watching" : "Watch"}
                        </Button>
                        <Button size="small" component={RouterLink} to={`/stocks/${stock.symbol}`}
                          sx={{ color: D.brandText, fontWeight: 800, textTransform: "none", borderRadius: 1.5 }}>
                          Details
                        </Button>
                      </Stack>
                    </Box>
                  </Grid>
                );
              })}
              </MotionPresence>
            </Grid>

            <Box sx={{ ...CARD, p: 0, overflow: "hidden", mb: 3 }}>
              <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${D.border}` }}>
                <Typography sx={{ fontWeight: 900, fontSize: 16, color: D.t1 }}>Price Comparison</Typography>
                <Typography sx={{ fontSize: 12.5, color: D.t3 }}>Close price through Day {trading.gameDay}.</Typography>
              </Box>
              <Box sx={{ p: 2.5, height: 360 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={D.border} />
                    <XAxis dataKey="gameDay" tickFormatter={(value) => `D${value}`} tick={{ fill: D.t3, fontSize: 11 }} />
                    <YAxis tickFormatter={(value) => `$${Number(value).toFixed(0)}`} tick={{ fill: D.t3, fontSize: 11 }} />
                    <RTooltip contentStyle={{ backgroundColor: D.elevated, border: `1px solid ${D.border}`, borderRadius: 8, color: D.t1 }} formatter={(value: any) => money(Number(value))} labelFormatter={(label) => `Day ${label}`} />
                    <Legend wrapperStyle={{ color: D.t2, fontSize: 12 }} />
                    <Line type="monotone" dataKey="left" name={left.symbol} stroke={D.brand} strokeWidth={2.5} dot={chartData.length <= 35} connectNulls />
                    <Line type="monotone" dataKey="right" name={right.symbol} stroke={D.green} strokeWidth={2.5} dot={chartData.length <= 35} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Box>

            <Box sx={{ ...CARD, p: 0, overflow: "hidden" }}>
              <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${D.border}` }}>
                <Typography sx={{ fontWeight: 900, fontSize: 16, color: D.t1 }}>Attribute Matrix</Typography>
                <Typography sx={{ fontSize: 12.5, color: D.t3 }}>These are differences to investigate. No metric makes one stock automatically better; start with similar businesses and your own goal.</Typography>
              </Box>
              <Box sx={{ p: 2.5 }}>
                <Stack spacing={1}>
                  {metrics.map((metric, i) => (
                    <Box key={metric.label} component={motion.div}
                      initial={reduceMotion ? undefined : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, delay: Math.min(i * 0.025, 0.2) }}
                      sx={{ p: 1.8, borderRadius: 2, bgcolor: D.elevated, border: `1px solid ${D.border}` }}>
                      <Grid container spacing={1.5} alignItems="center">
                        <Grid item xs={12} md={4}>
                          <Typography sx={{ fontSize: 11, color: D.t3, fontWeight: 900, fontFamily: MONO }}>{metric.label.toUpperCase()}</Typography>
                          <Typography sx={{ fontSize: 12, color: D.t2, mt: .5 }}>{metric.note}</Typography>
                        </Grid>
                        <Grid item xs={6} md={4}>
                          <Typography sx={{ fontSize: 13, color: D.t3, mb: 0.2 }}>{left.symbol}</Typography>
                          <motion.div key={metric.left} initial={reduceMotion ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                            <Typography sx={{ fontSize: 15, color: D.t1, fontWeight: 900, fontFamily: MONO }}>{metric.left}</Typography>
                          </motion.div>
                        </Grid>
                        <Grid item xs={6} md={4}>
                          <Typography sx={{ fontSize: 13, color: D.t3, mb: 0.2 }}>{right.symbol}</Typography>
                          <motion.div key={metric.right} initial={reduceMotion ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                            <Typography sx={{ fontSize: 15, color: D.t1, fontWeight: 900, fontFamily: MONO }}>{metric.right}</Typography>
                          </motion.div>
                        </Grid>
                      </Grid>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Box>
            {!sameStock && <Box sx={{ ...CARD, p: 3, mt: 3 }}><DecisionNote key={`${left.symbol}:${right.symbol}`} kind="compare" symbol={`${left.symbol} / ${right.symbol}`} /></Box>}
          </>
        )}
      </Container>
    </Box>
  );
}
