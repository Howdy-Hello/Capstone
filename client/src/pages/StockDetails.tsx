import React, { useMemo, useState } from "react";
import {
  Box, Button, Chip, Container, Divider, Grid, LinearProgress, Stack, Typography,
} from "@mui/material";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from "recharts";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import QueryStatsIcon from "@mui/icons-material/QueryStats";
import AssessmentIcon from "@mui/icons-material/Assessment";
import NewspaperIcon from "@mui/icons-material/Newspaper";

import {
  getRelatedNewsBySymbol, getStockBySymbolForGameDay, getStockHistoryBySymbol, Stock, StockPriceHistory,
} from "../data/mockStocks";
import { getSharesOwned, useTradingAccount } from "../data/tradingState";
import { D, CARD, MONO, money, pct } from "../theme/design";

type LocationState = { gameDay?: number };

function getRiskScore(r: Stock["riskLevel"]) {
  if (r === "High") return 82;
  if (r === "Medium") return 58;
  return 34;
}

export default function StockDetails() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const trading = useTradingAccount();
  const [tradeMsg, setTradeMsg] = useState("");

  const state = location.state as LocationState | null;
  const gameDay = state?.gameDay ?? 1;

  const stock = useMemo(() => symbol ? getStockBySymbolForGameDay(symbol, gameDay) : undefined, [symbol, gameDay]);
  const history = useMemo(() => symbol ? getStockHistoryBySymbol(symbol, gameDay) : [], [symbol, gameDay]);
  const relatedNews = useMemo(() => symbol ? getRelatedNewsBySymbol(symbol, gameDay) : [], [symbol, gameDay]);

  if (!stock) {
    return (
      <Box sx={{ bgcolor: D.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Box sx={{ ...CARD, p: 4, maxWidth: 480, textAlign: "center" }}>
          <Typography sx={{ fontWeight: 900, fontSize: 22, color: D.t1, mb: 1 }}>Stock not found</Typography>
          <Typography sx={{ fontSize: 14, color: D.t3, mb: 3 }}>The symbol does not exist in the mock data.</Typography>
          <Button onClick={() => navigate("/game")} startIcon={<ArrowBackIcon />} variant="contained"
            sx={{ bgcolor: D.brand, fontWeight: 800, textTransform: "none", borderRadius: 1.5, boxShadow: "none", "&:hover": { bgcolor: D.brandMid, boxShadow: "none" } }}>
            Back to Market
          </Button>
        </Box>
      </Box>
    );
  }

  const isUp = stock.dayChangePercent >= 0;
  const riskScore = getRiskScore(stock.riskLevel);
  const latestHistory = history[history.length - 1];
  const sharesOwned = getSharesOwned(trading.account, stock.symbol);

  const handleBuy = () => {
    const ok = trading.buyStock(stock);
    setTradeMsg(ok ? `Bought 1 share of ${stock.symbol} for ${money(stock.currentPrice)}.` : `Not enough cash to buy ${stock.symbol}.`);
  };
  const handleSell = () => {
    const ok = trading.sellStock(stock);
    setTradeMsg(ok ? `Sold 1 share of ${stock.symbol} for ${money(stock.currentPrice)}.` : `You don't own any ${stock.symbol} shares.`);
  };

  return (
    <Box sx={{ bgcolor: D.bg, minHeight: "100vh" }}>
      {/* Hero */}
      <Box sx={{ bgcolor: D.surface, borderBottom: `1px solid ${D.border}` }}>
        <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
          <Button onClick={() => navigate("/game")} startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />}
            sx={{ color: D.t3, fontWeight: 700, textTransform: "none", borderRadius: 1.5, mb: 2, fontSize: 13, "&:hover": { color: D.t1, bgcolor: D.overlay } }}>
            Back to Market
          </Button>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={7}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                {[stock.symbol, `Day ${gameDay}`, `${stock.riskLevel} Risk`, stock.fundamentals.analystRating].map((label, i) => (
                  <Chip key={i} label={label} size="small"
                    sx={{ bgcolor: D.overlay, color: D.brandText, border: `1px solid ${D.border}`, fontWeight: 800, fontSize: 10.5, fontFamily: MONO }} />
                ))}
              </Stack>
              <Typography sx={{ fontSize: { xs: 26, md: 34 }, fontWeight: 950, color: D.t1, letterSpacing: -1, mb: 1 }}>{stock.name}</Typography>
              <Typography sx={{ fontSize: 14, color: D.t2, lineHeight: 1.7, maxWidth: 600 }}>{stock.description}</Typography>
            </Grid>
            <Grid item xs={12} md={5}>
              <Box sx={{ ...CARD, p: 3 }}>
                <Typography sx={{ fontSize: 10.5, fontWeight: 900, color: D.t3, fontFamily: MONO, mb: 0.8 }}>CURRENT PRICE</Typography>
                <Typography sx={{ fontSize: 36, fontWeight: 950, color: D.t1, fontFamily: MONO, lineHeight: 1, mb: 1 }}>{money(stock.currentPrice)}</Typography>
                <Chip size="small" icon={isUp ? <TrendingUpIcon sx={{ fontSize: 14 }} /> : <TrendingDownIcon sx={{ fontSize: 14 }} />}
                  label={`${pct(stock.dayChangePercent)} Today`}
                  sx={{ bgcolor: isUp ? D.greenBg : D.redBg, color: isUp ? D.greenText : D.redText, border: `1px solid ${isUp ? D.greenBd : D.redBd}`, fontWeight: 800, mb: 2 }} />
                <Typography sx={{ fontSize: 11.5, color: D.t3, mb: 0.8 }}>Risk Level: {stock.riskLevel}</Typography>
                <LinearProgress variant="determinate" value={riskScore}
                  sx={{ height: 5, borderRadius: 99, bgcolor: D.overlay, "& .MuiLinearProgress-bar": { bgcolor: stock.riskLevel === "High" ? D.red : D.green, borderRadius: 99 } }} />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Stat tiles */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: "Current Price",   val: money(stock.currentPrice),                             icon: <AccountBalanceWalletIcon sx={{ fontSize: 20 }} />, up: true },
            { label: "P/E Ratio",       val: stock.fundamentals.peRatio.toFixed(1),                 icon: <AssessmentIcon sx={{ fontSize: 20 }} />,           up: true },
            { label: "Revenue Growth",  val: `+${stock.fundamentals.revenueGrowth.toFixed(1)}%`,    icon: <TrendingUpIcon sx={{ fontSize: 20 }} />,            up: true },
            { label: "Volume",          val: latestHistory ? latestHistory.volume.toLocaleString() : "-", icon: <QueryStatsIcon sx={{ fontSize: 20 }} />,      up: undefined },
          ].map((s) => {
            const color = s.up === undefined ? D.brandText : D.greenText;
            const bg    = s.up === undefined ? D.brandBg   : D.greenBg;
            return (
              <Grid item xs={12} sm={6} md={3} key={s.label}>
                <Box sx={{ ...CARD, p: 2.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography sx={{ fontSize: 10.5, fontWeight: 900, color: D.t3, fontFamily: MONO, mb: 0.8 }}>{s.label.toUpperCase()}</Typography>
                      <Typography sx={{ fontSize: 20, fontWeight: 950, color: D.t1, fontFamily: MONO }}>{s.val}</Typography>
                    </Box>
                    <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: bg, color, display: "grid", placeItems: "center", flexShrink: 0 }}>{s.icon}</Box>
                  </Stack>
                </Box>
              </Grid>
            );
          })}
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            {/* Price chart */}
            <Box sx={{ ...CARD, p: 0, overflow: "hidden", mb: 3 }}>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1} sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${D.border}` }}>
                <Box>
                  <Typography sx={{ fontWeight: 900, fontSize: 16, color: D.t1 }}>Price History</Typography>
                  <Typography sx={{ fontSize: 12.5, color: D.t3 }}>Mock close prices up to Day {gameDay}.</Typography>
                </Box>
                <Chip label={`${history.length} data points`} size="small" sx={{ bgcolor: D.overlay, color: D.t3, fontSize: 11 }} />
              </Stack>
              <Box sx={{ p: 2.5, height: 360 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history}>
                    <defs>
                      <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={D.brand} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={D.brand} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={D.border} />
                    <XAxis dataKey="gameDay" tickFormatter={(v) => `D${v}`} minTickGap={18} tick={{ fill: D.t3, fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `$${Number(v).toFixed(0)}`} domain={["dataMin - 5", "dataMax + 5"]} tick={{ fill: D.t3, fontSize: 11 }} />
                    <RTooltip
                      contentStyle={{ bgcolor: D.elevated, border: `1px solid ${D.border}`, borderRadius: 8, color: D.t1 }}
                      formatter={(v: any) => [`$${Number(v).toFixed(2)}`, "Close"]}
                      labelFormatter={(l) => `Day ${l}`}
                    />
                    <Area type="monotone" dataKey="closePrice" stroke={D.brand} strokeWidth={2.5} fill="url(#priceFill)" dot={history.length <= 40} activeDot={{ r: 5, fill: D.brand }} />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </Box>

            {/* Fundamentals */}
            <Box sx={{ ...CARD, p: 0, overflow: "hidden", mb: 3 }}>
              <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${D.border}` }}>
                <Typography sx={{ fontWeight: 900, fontSize: 16, color: D.t1 }}>Mock Fundamentals</Typography>
                <Typography sx={{ fontSize: 12.5, color: D.t3 }}>Structured mock metrics to inform trading decisions.</Typography>
              </Box>
              <Box sx={{ p: 2.5 }}>
                <Grid container spacing={2}>
                  {[
                    { label: "P/E Ratio",        val: stock.fundamentals.peRatio.toFixed(1),            note: "Lower can mean cheaper valuation." },
                    { label: "EPS",              val: `$${stock.fundamentals.eps.toFixed(2)}`,           note: "Profit earned per share." },
                    { label: "Revenue Growth",   val: `+${stock.fundamentals.revenueGrowth.toFixed(1)}%`, note: "Higher means faster growth." },
                    { label: "Profit Margin",    val: `${stock.fundamentals.profitMargin.toFixed(1)}%`, note: "Higher means better efficiency." },
                    { label: "Debt/Equity",      val: stock.fundamentals.debtToEquity.toFixed(2),        note: "Higher means more balance-sheet risk." },
                    { label: "Dividend Yield",   val: `${stock.fundamentals.dividendYield.toFixed(1)}%`, note: "Cash return to shareholders." },
                  ].map((m) => (
                    <Grid item xs={12} sm={6} md={4} key={m.label}>
                      <Box sx={{ p: 2, borderRadius: 2, bgcolor: D.elevated, border: `1px solid ${D.border}`, height: "100%" }}>
                        <Typography sx={{ fontSize: 10.5, fontWeight: 900, color: D.t3, fontFamily: MONO, mb: 0.5 }}>{m.label.toUpperCase()}</Typography>
                        <Typography sx={{ fontSize: 20, fontWeight: 950, color: D.t1, fontFamily: MONO, mb: 0.3 }}>{m.val}</Typography>
                        <Typography sx={{ fontSize: 12, color: D.t3 }}>{m.note}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Box>

            {/* Recent prices */}
            <Box sx={{ ...CARD, p: 0, overflow: "hidden" }}>
              <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${D.border}` }}>
                <Typography sx={{ fontWeight: 900, fontSize: 16, color: D.t1 }}>Recent Prices</Typography>
                <Typography sx={{ fontSize: 12.5, color: D.t3 }}>Latest 10 generated price points.</Typography>
              </Box>
              <Box sx={{ p: 2.5 }}>
                <Stack spacing={1}>
                  {history.slice(-10).map((item: StockPriceHistory) => {
                    const up = item.changePercent >= 0;
                    return (
                      <Box key={item.priceId} sx={{ p: 1.8, borderRadius: 2, bgcolor: D.elevated, border: `1px solid ${D.border}` }}>
                        <Grid container spacing={1} alignItems="center">
                          <Grid item xs={6} sm={2}><Typography sx={{ fontSize: 13, fontWeight: 900, color: D.brandText, fontFamily: MONO }}>Day {item.gameDay}</Typography></Grid>
                          {[
                            { l: "Open",  v: money(item.openPrice) },
                            { l: "High",  v: money(item.highPrice) },
                            { l: "Low",   v: money(item.lowPrice) },
                            { l: "Close", v: money(item.closePrice) },
                          ].map((c) => (
                            <Grid item xs={6} sm={2} key={c.l}>
                              <Typography sx={{ fontSize: 10.5, color: D.t3 }}>{c.l}</Typography>
                              <Typography sx={{ fontSize: 13, fontWeight: 800, color: D.t1, fontFamily: MONO }}>{c.v}</Typography>
                            </Grid>
                          ))}
                          <Grid item xs={6} sm={2}>
                            <Typography sx={{ fontSize: 13, fontWeight: 900, color: up ? D.greenText : D.redText, textAlign: { xs: "left", sm: "right" }, fontFamily: MONO }}>
                              {pct(item.changePercent)}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            </Box>
          </Grid>

          {/* Sidebar */}
          <Grid item xs={12} lg={4}>
            <Stack spacing={2.5}>
              {/* Company profile */}
              <Box sx={{ bgcolor: D.elevated, border: `1px solid ${D.border}`, borderRadius: 2, p: 3 }}>
                <Typography sx={{ fontWeight: 900, fontSize: 15, color: D.t1, mb: 2 }}>Company Profile</Typography>
                <Stack spacing={0}>
                  {[
                    { l: "Symbol",        v: stock.symbol },
                    { l: "Sector",        v: stock.sector },
                    { l: "Industry",      v: stock.industry },
                    { l: "Starting Price", v: money(stock.startingPrice) },
                    { l: "Volatility",    v: `${(stock.volatility * 100).toFixed(1)}%` },
                    { l: "Risk Level",    v: stock.riskLevel },
                    { l: "Rating",        v: stock.fundamentals.analystRating },
                  ].map((r) => (
                    <Stack key={r.l} direction="row" justifyContent="space-between" gap={2} sx={{ py: 1.2, borderBottom: `1px solid ${D.border}`, "&:last-child": { border: "none" } }}>
                      <Typography sx={{ fontSize: 13, color: D.t3 }}>{r.l}</Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 800, color: D.t1, fontFamily: MONO, textAlign: "right" }}>{r.v}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>

              {/* Trading actions */}
              <Box sx={{ ...CARD, p: 3 }}>
                <Typography sx={{ fontWeight: 900, fontSize: 15, color: D.t1, mb: 0.5 }}>Trading Actions</Typography>
                <Typography sx={{ fontSize: 13, color: D.t3, mb: 2 }}>
                  Cash: {money(trading.account.cash)} · Owned: {sharesOwned} share{sharesOwned === 1 ? "" : "s"}
                </Typography>
                {tradeMsg && (
                  <Box sx={{ p: 1.8, borderRadius: 2, bgcolor: D.elevated, border: `1px solid ${D.border}`, mb: 1.5 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: D.t1 }}>{tradeMsg}</Typography>
                  </Box>
                )}
                <Stack spacing={1}>
                  <Button fullWidth variant="contained" onClick={handleBuy}
                    sx={{ bgcolor: D.green, color: "#fff", fontWeight: 800, textTransform: "none", borderRadius: 1.5, boxShadow: "none", "&:hover": { bgcolor: "#16A34A", boxShadow: "none" } }}>
                    Buy {stock.symbol}
                  </Button>
                  <Button fullWidth variant="contained" disabled={sharesOwned === 0} onClick={handleSell}
                    sx={{ bgcolor: D.red, color: "#fff", fontWeight: 800, textTransform: "none", borderRadius: 1.5, boxShadow: "none", "&:hover": { bgcolor: "#DC2626", boxShadow: "none" }, "&.Mui-disabled": { bgcolor: D.overlay, color: D.t3 } }}>
                    Sell {stock.symbol}
                  </Button>
                  <Button fullWidth onClick={() => navigate("/game")}
                    sx={{ color: D.t2, border: `1px solid ${D.border}`, fontWeight: 700, textTransform: "none", borderRadius: 1.5, "&:hover": { color: D.t1, borderColor: D.borderHi, bgcolor: D.overlay } }}>
                    Back to Market
                  </Button>
                </Stack>
              </Box>

              {/* Related news */}
              <Box sx={{ ...CARD, p: 3 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                  <NewspaperIcon sx={{ fontSize: 18, color: D.brandText }} />
                  <Typography sx={{ fontWeight: 900, fontSize: 15, color: D.t1 }}>Related News</Typography>
                </Stack>
                <Typography sx={{ fontSize: 12.5, color: D.t3, mb: 2 }}>News connected to {stock.symbol} up to Day {gameDay}.</Typography>
                <Divider sx={{ borderColor: D.border, mb: 2 }} />
                {relatedNews.length === 0 ? (
                  <Typography sx={{ fontSize: 13, color: D.t3 }}>No related news yet.</Typography>
                ) : (
                  <Stack spacing={1.2}>
                    {relatedNews.slice(-8).map((n) => {
                      const bull = n.marketTone === "Bullish";
                      return (
                        <Box key={n.newsId} sx={{ p: 1.8, borderRadius: 2, bgcolor: D.elevated, border: `1px solid ${D.border}` }}>
                          <Chip size="small" label={n.marketTone} sx={{ bgcolor: bull ? D.greenBg : D.redBg, color: bull ? D.greenText : D.redText, fontWeight: 800, fontSize: 10, mb: 0.8 }} />
                          <Typography sx={{ fontWeight: 800, fontSize: 13, color: D.t1, mb: 0.3 }}>Day {n.gameDay}: {n.headline}</Typography>
                          <Typography sx={{ fontSize: 12, color: D.t3, lineHeight: 1.6 }}>{n.body}</Typography>
                        </Box>
                      );
                    })}
                  </Stack>
                )}
              </Box>
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
