import React, { useEffect, useMemo, useState } from "react";
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

import { Stock } from "../data/mockStocks";
import { getSharesOwned } from "../data/tradingState";
import { useGame } from "../context/GameContext";
import { CARD, D, MONO, money, pct } from "../theme/design";

type Metric = {
  label: string;
  left: string;
  right: string;
  leftRaw?: number;
  rightRaw?: number;
  preference?: "higher" | "lower";
};

function firstDifferent(stocks: Stock[], symbol?: string) {
  return stocks.find((stock) => stock.symbol !== symbol)?.symbol ?? stocks[0]?.symbol ?? "";
}

function metricTone(metric: Metric, side: "left" | "right") {
  if (!metric.preference || metric.leftRaw === undefined || metric.rightRaw === undefined) return D.t1;
  if (metric.leftRaw === metric.rightRaw) return D.t1;
  const leftWins = metric.preference === "higher"
    ? metric.leftRaw > metric.rightRaw
    : metric.leftRaw < metric.rightRaw;
  return (side === "left" ? leftWins : !leftWins) ? D.greenText : D.t2;
}

export default function CompareStocks() {
  const trading = useGame();
  const { getHistory } = trading;
  const [params, setParams] = useSearchParams();
  const [leftSymbol, setLeftSymbol] = useState(params.get("left") ?? "");
  const [rightSymbol, setRightSymbol] = useState(params.get("right") ?? "");

  useEffect(() => {
    if (trading.loading || trading.stocks.length === 0) return;

    setLeftSymbol((current) => current || trading.watchlistStocks[0]?.symbol || trading.stocks[0]?.symbol || "");
    setRightSymbol((current) => current || trading.watchlistStocks.find((stock) => stock.symbol !== leftSymbol)?.symbol || firstDifferent(trading.stocks, leftSymbol));
  }, [leftSymbol, trading.loading, trading.stocks, trading.watchlistStocks]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (leftSymbol) next.set("left", leftSymbol);
    if (rightSymbol) next.set("right", rightSymbol);
    setParams(next, { replace: true });
  }, [leftSymbol, rightSymbol, setParams]);

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
      { label: "Current Price", left: money(left.currentPrice), right: money(right.currentPrice), leftRaw: left.currentPrice, rightRaw: right.currentPrice },
      { label: "Day Move", left: pct(left.dayChangePercent), right: pct(right.dayChangePercent), leftRaw: left.dayChangePercent, rightRaw: right.dayChangePercent, preference: "higher" },
      { label: "P/E Ratio", left: left.fundamentals.peRatio.toFixed(1), right: right.fundamentals.peRatio.toFixed(1), leftRaw: left.fundamentals.peRatio, rightRaw: right.fundamentals.peRatio, preference: "lower" },
      { label: "EPS", left: money(left.fundamentals.eps), right: money(right.fundamentals.eps), leftRaw: left.fundamentals.eps, rightRaw: right.fundamentals.eps, preference: "higher" },
      { label: "Revenue Growth", left: pct(left.fundamentals.revenueGrowth), right: pct(right.fundamentals.revenueGrowth), leftRaw: left.fundamentals.revenueGrowth, rightRaw: right.fundamentals.revenueGrowth, preference: "higher" },
      { label: "Profit Margin", left: pct(left.fundamentals.profitMargin), right: pct(right.fundamentals.profitMargin), leftRaw: left.fundamentals.profitMargin, rightRaw: right.fundamentals.profitMargin, preference: "higher" },
      { label: "Debt / Equity", left: left.fundamentals.debtToEquity.toFixed(2), right: right.fundamentals.debtToEquity.toFixed(2), leftRaw: left.fundamentals.debtToEquity, rightRaw: right.fundamentals.debtToEquity, preference: "lower" },
      { label: "Dividend Yield", left: pct(left.fundamentals.dividendYield), right: pct(right.fundamentals.dividendYield), leftRaw: left.fundamentals.dividendYield, rightRaw: right.fundamentals.dividendYield, preference: "higher" },
      { label: "Volatility", left: pct(left.volatility * 100), right: pct(right.volatility * 100), leftRaw: left.volatility, rightRaw: right.volatility, preference: "lower" },
      { label: "Volume", left: left.volume.toLocaleString(), right: right.volume.toLocaleString(), leftRaw: left.volume, rightRaw: right.volume, preference: "higher" },
      { label: "Risk Level", left: left.riskLevel, right: right.riskLevel },
      { label: "Sector", left: left.sector, right: right.sector },
      { label: "Analyst Rating", left: left.fundamentals.analystRating, right: right.fundamentals.analystRating },
      { label: "Shares Owned", left: getSharesOwned(trading.account, left.symbol).toString(), right: getSharesOwned(trading.account, right.symbol).toString() },
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
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={2}>
            <Box>
              <Chip label="STOCK COMPARISON" size="small"
                sx={{ bgcolor: D.brandBg, color: D.brandText, border: `1px solid ${D.brandBd}`, fontWeight: 900, fontSize: 10, fontFamily: MONO, letterSpacing: 1, mb: 1 }} />
              <Typography sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 950, color: D.t1, letterSpacing: -1 }}>Compare Stocks</Typography>
              <Typography sx={{ fontSize: 13, color: D.t2, mt: 0.5 }}>Review price action, fundamentals, risk, and ownership without changing your portfolio.</Typography>
            </Box>
            <Button component={RouterLink} to="/game" variant="contained"
              sx={{ bgcolor: D.brand, fontWeight: 800, textTransform: "none", borderRadius: 1.5, boxShadow: "none", "&:hover": { bgcolor: D.brandMid, boxShadow: "none" } }}>
              Back to Market
            </Button>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box sx={{ ...CARD, p: 2.5, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={5}>
              <TextField select fullWidth size="small" label="First stock" value={leftSymbol} onChange={(event) => setLeftSymbol(event.target.value)}
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
              <TextField select fullWidth size="small" label="Second stock" value={rightSymbol} onChange={(event) => setRightSymbol(event.target.value)}
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
              {[left, right].map((stock) => {
                const watched = trading.isWatchlisted(stock.symbol);
                const up = stock.dayChangePercent >= 0;
                return (
                  <Grid item xs={12} md={6} key={stock.symbol}>
                    <Box sx={{ ...CARD, p: 2.5, height: "100%" }}>
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
                <Typography sx={{ fontSize: 12.5, color: D.t3 }}>Green marks the stronger side when a metric has a clear direction.</Typography>
              </Box>
              <Box sx={{ p: 2.5 }}>
                <Stack spacing={1}>
                  {metrics.map((metric) => (
                    <Box key={metric.label} sx={{ p: 1.8, borderRadius: 2, bgcolor: D.elevated, border: `1px solid ${D.border}` }}>
                      <Grid container spacing={1.5} alignItems="center">
                        <Grid item xs={12} md={4}>
                          <Typography sx={{ fontSize: 11, color: D.t3, fontWeight: 900, fontFamily: MONO }}>{metric.label.toUpperCase()}</Typography>
                        </Grid>
                        <Grid item xs={6} md={4}>
                          <Typography sx={{ fontSize: 13, color: D.t3, mb: 0.2 }}>{left.symbol}</Typography>
                          <Typography sx={{ fontSize: 15, color: metricTone(metric, "left"), fontWeight: 900, fontFamily: MONO }}>{metric.left}</Typography>
                        </Grid>
                        <Grid item xs={6} md={4}>
                          <Typography sx={{ fontSize: 13, color: D.t3, mb: 0.2 }}>{right.symbol}</Typography>
                          <Typography sx={{ fontSize: 15, color: metricTone(metric, "right"), fontWeight: 900, fontFamily: MONO }}>{metric.right}</Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Box>
          </>
        )}
      </Container>
    </Box>
  );
}
