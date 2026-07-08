import React, { useEffect, useState } from "react";
import {
  Box, Button, Chip, CircularProgress, Container, Divider, Grid, IconButton,
  LinearProgress, Stack, TextField, Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { Link as RouterLink, useLocation, useNavigate, useParams } from "react-router-dom";
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
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";

import { Stock, StockPriceHistory } from "../data/mockStocks";
import { getSharesOwned } from "../data/tradingState";
import { useGame } from "../context/GameContext";
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
  const trading = useGame();
  const [tradeMsg, setTradeMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [quantity, setQuantity] = useState(1);

  const state = location.state as LocationState | null;
  const gameDay = state?.gameDay ?? trading.gameDay;

  const stock = symbol ? trading.getStock(symbol) : undefined;
  const history = symbol ? trading.getHistory(symbol) : [];
  const relatedNews = symbol ? trading.getRelatedNews(symbol) : [];

  // Auto-dismiss trade message
  useEffect(() => {
    if (!tradeMsg) return;
    const t = setTimeout(() => setTradeMsg(null), 3500);
    return () => clearTimeout(t);
  }, [tradeMsg]);

  if (trading.loading) {
    return (
      <Box sx={{ bgcolor: D.bg, minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <CircularProgress sx={{ color: D.brandText }} />
      </Box>
    );
  }

  if (!stock) {
    return (
      <Box sx={{ bgcolor: D.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Box sx={{ ...CARD, p: 4, maxWidth: 480, textAlign: "center" }}>
          <Typography sx={{ fontWeight: 900, fontSize: 22, color: D.t1, mb: 1 }}>Stock not found</Typography>
          <Typography sx={{ fontSize: 14, color: D.t3, mb: 3 }}>The symbol does not exist in the market data.</Typography>
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
  const watchlisted = trading.isWatchlisted(stock.symbol);
  const compareSymbol =
    trading.watchlistStocks.find((item) => item.symbol !== stock.symbol)?.symbol
    ?? trading.stocks.find((item) => item.symbol !== stock.symbol)?.symbol
    ?? stock.symbol;

  const handleBuy = async () => {
    const ok = await trading.buyStock(stock, quantity);
    const shares = `${quantity} share${quantity === 1 ? "" : "s"}`;
    setTradeMsg({ ok, text: ok ? `Bought ${shares} of ${stock.symbol} for ${money(stock.currentPrice * quantity)}.` : `Not enough cash to buy ${shares} of ${stock.symbol}.` });
  };
  const handleSell = async () => {
    const ok = await trading.sellStock(stock, quantity);
    const shares = `${quantity} share${quantity === 1 ? "" : "s"}`;
    setTradeMsg({ ok, text: ok ? `Sold ${shares} of ${stock.symbol} for ${money(stock.currentPrice * quantity)}.` : `Not enough shares to sell.` });
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
              <Button onClick={() => trading.toggleWatchlist(stock)} startIcon={watchlisted ? <StarIcon /> : <StarBorderIcon />}
                sx={{ mt: 2, color: watchlisted ? D.amber : D.t2, border: `1px solid ${watchlisted ? D.amber : D.border}`, bgcolor: watchlisted ? D.amberBg : "transparent", fontWeight: 800, textTransform: "none", borderRadius: 1.5, "&:hover": { color: D.amber, borderColor: D.amber, bgcolor: D.amberBg } }}>
                {watchlisted ? "Watching" : "Add to Watchlist"}
              </Button>
              <Button component={RouterLink} to={`/compare?left=${stock.symbol}&right=${compareSymbol}`}
                sx={{ mt: 2, ml: 1, color: D.brandText, border: `1px solid ${D.brandBd}`, bgcolor: D.brandBg, fontWeight: 800, textTransform: "none", borderRadius: 1.5, "&:hover": { bgcolor: "rgba(124,58,237,0.15)" } }}>
                Compare
              </Button>
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
                  <Typography sx={{ fontSize: 12.5, color: D.t3 }}>Close prices up to Day {gameDay}.</Typography>
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
                      contentStyle={{ backgroundColor: D.elevated, border: `1px solid ${D.border}`, borderRadius: 8, color: D.t1 }}
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
                <Typography sx={{ fontWeight: 900, fontSize: 16, color: D.t1 }}>Company Fundamentals</Typography>
                <Typography sx={{ fontSize: 12.5, color: D.t3 }}>Stored company metrics to inform trading decisions.</Typography>
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
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                  <Typography sx={{ fontWeight: 900, fontSize: 15, color: D.t1 }}>Trading Actions</Typography>
                  <Chip label={watchlisted ? "WATCHING" : "WATCHLIST"} size="small"
                    sx={{ bgcolor: watchlisted ? D.amberBg : D.overlay, color: watchlisted ? D.amber : D.t3, fontWeight: 900, fontSize: 10, fontFamily: MONO }} />
                </Stack>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Typography sx={{ fontSize: 13, color: D.t3 }}>Cash: {money(trading.account.cash)}</Typography>
                  <Typography sx={{ fontSize: 13, color: D.t3 }}>Owned: {sharesOwned}</Typography>
                </Stack>

                {/* Quantity stepper */}
                <Box sx={{ mb: 2 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 900, color: D.t3, fontFamily: MONO, mb: 1 }}>QUANTITY</Typography>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <IconButton size="small" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1}
                      sx={{ bgcolor: D.elevated, border: `1px solid ${D.border}`, color: D.t2, borderRadius: 1.5,
                        "&:hover": { bgcolor: D.overlay, color: D.t1 }, "&.Mui-disabled": { color: D.t3 } }}>
                      <RemoveIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <TextField
                      size="small"
                      value={quantity}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        if (!Number.isNaN(v) && v >= 1) setQuantity(v);
                      }}
                      inputProps={{ min: 1, sx: { textAlign: "center", fontFamily: MONO, fontWeight: 900, fontSize: 17, py: 0.8 } }}
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
                    <IconButton size="small" onClick={() => setQuantity((q) => q + 1)}
                      sx={{ bgcolor: D.elevated, border: `1px solid ${D.border}`, color: D.t2, borderRadius: 1.5,
                        "&:hover": { bgcolor: D.overlay, color: D.t1 } }}>
                      <AddIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <Button size="small"
                      onClick={() => setQuantity(Math.max(1, Math.floor(trading.account.cash / stock.currentPrice)))}
                      sx={{ color: D.brandText, fontSize: 11, fontWeight: 800, textTransform: "none", px: 1, minWidth: "auto" }}>
                      Max
                    </Button>
                    <Typography sx={{ fontSize: 13, color: D.t3, fontFamily: MONO }}>
                      = {money(stock.currentPrice * quantity)}
                    </Typography>
                  </Stack>
                  <Typography sx={{ fontSize: 11, color: D.t3, mt: 0.5, fontFamily: MONO }}>
                    Cash after: <Box component="span" sx={{ color: trading.account.cash - stock.currentPrice * quantity >= 0 ? D.greenText : D.redText, fontWeight: 700 }}>
                      {money(Math.max(0, trading.account.cash - stock.currentPrice * quantity))}
                    </Box>
                  </Typography>
                </Box>

                {tradeMsg && (
                  <Box sx={{ p: 1.8, borderRadius: 2, bgcolor: tradeMsg.ok ? D.greenBg : D.redBg, border: `1px solid ${tradeMsg.ok ? D.greenBd : D.redBd}`, mb: 1.5 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: tradeMsg.ok ? D.greenText : D.redText }}>{tradeMsg.text}</Typography>
                  </Box>
                )}
                <Stack spacing={1}>
                  <Button fullWidth variant="contained" onClick={handleBuy}
                    disabled={trading.account.cash < stock.currentPrice * quantity}
                    sx={{ bgcolor: D.green, color: "#fff", fontWeight: 800, textTransform: "none", borderRadius: 1.5, boxShadow: "none", "&:hover": { bgcolor: "#16A34A", boxShadow: "none" }, "&.Mui-disabled": { bgcolor: D.overlay, color: D.t3 } }}>
                    Buy {quantity} {quantity === 1 ? "share" : "shares"}
                  </Button>
                  <Button fullWidth variant="contained" disabled={sharesOwned < quantity} onClick={handleSell}
                    sx={{ bgcolor: D.red, color: "#fff", fontWeight: 800, textTransform: "none", borderRadius: 1.5, boxShadow: "none", "&:hover": { bgcolor: "#DC2626", boxShadow: "none" }, "&.Mui-disabled": { bgcolor: D.overlay, color: D.t3 } }}>
                    Sell {quantity} {quantity === 1 ? "share" : "shares"}
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
                    {relatedNews.slice(-8).map((n) => (
                        <Box key={n.newsId} sx={{ p: 1.8, borderRadius: 2, bgcolor: D.elevated, border: `1px solid ${D.border}` }}>
                          <Chip size="small" label={n.importance} sx={{ bgcolor: n.importance === "High" ? D.redBg : D.amberBg, color: n.importance === "High" ? D.redText : D.amber, fontWeight: 800, fontSize: 10, mb: 0.8 }} />
                          <Typography sx={{ fontWeight: 800, fontSize: 13, color: D.t1, mb: 0.3 }}>Day {n.gameDay}: {n.headline}</Typography>
                          <Typography sx={{ fontSize: 12, color: D.t3, lineHeight: 1.6 }}>{n.body}</Typography>
                        </Box>
                    ))}
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
