import React, { useMemo } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import AssessmentIcon from "@mui/icons-material/Assessment";
import PieChartIcon from "@mui/icons-material/PieChart";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { Link as RouterLink } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  getNewsForGameDay,
  getSeasonDay,
  getStocksForGameDay,
  normalizeGameDay,
  SEASON_LENGTH,
  Stock,
} from "../data/mockStocks";
import {
  getNetWorth,
  getPortfolioValue,
  useTradingAccount,
} from "../data/tradingState";

const BRAND = {
  navy: "#2C3947",
  red: "#FF3737",
  green: "#9AD872",
  background: "#F5F7F9",
};

const GAME_DAY_STORAGE_KEY = "stockpilot-current-game-day";
const CHART_COLORS = [BRAND.green, BRAND.red, "#78A9FF", "#F4C95D", "#35D0BA", "#A78BFA"];

function loadSavedGameDay() {
  const savedDay = Number(localStorage.getItem(GAME_DAY_STORAGE_KEY));
  return normalizeGameDay(savedDay || 1);
}

function formatMoney(value: number) {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function Dashboard() {
  const gameDay = loadSavedGameDay();
  const seasonDay = getSeasonDay(gameDay);
  const stocks = useMemo(() => getStocksForGameDay(gameDay), [gameDay]);
  const news = useMemo(() => getNewsForGameDay(gameDay), [gameDay]);
  const trading = useTradingAccount();

  const portfolioValue = useMemo(
    () => getPortfolioValue(trading.account, stocks),
    [trading.account, stocks]
  );
  const netWorth = useMemo(
    () => getNetWorth(trading.account, stocks),
    [trading.account, stocks]
  );

  const holdings = useMemo(() => {
    return trading.account.holdings.map((holding) => {
      const stock = stocks.find((item) => item.symbol === holding.symbol);
      const currentPrice = stock?.currentPrice ?? holding.averageCost;
      const marketValue = currentPrice * holding.shares;
      const costBasis = holding.averageCost * holding.shares;
      const profitLoss = marketValue - costBasis;
      const profitLossPercent = costBasis > 0 ? (profitLoss / costBasis) * 100 : 0;

      return {
        ...holding,
        stock,
        currentPrice,
        marketValue,
        costBasis,
        profitLoss,
        profitLossPercent,
      };
    });
  }, [trading.account.holdings, stocks]);

  const marketSummary = useMemo(() => {
    const gainers = stocks.filter((stock) => stock.dayChangePercent >= 0).length;
    const averageMove =
      stocks.reduce((sum, stock) => sum + stock.dayChangePercent, 0) / stocks.length;
    const strongest = [...stocks].sort(
      (a, b) => b.dayChangePercent - a.dayChangePercent
    )[0];
    const weakest = [...stocks].sort(
      (a, b) => a.dayChangePercent - b.dayChangePercent
    )[0];

    return {
      gainers,
      losers: stocks.length - gainers,
      averageMove,
      strongest,
      weakest,
    };
  }, [stocks]);

  const sectorExposure = useMemo(() => {
    const exposure = new Map<string, number>();

    holdings.forEach((holding) => {
      const sector = holding.stock?.sector ?? "Unknown";
      exposure.set(sector, (exposure.get(sector) ?? 0) + holding.marketValue);
    });

    if (trading.account.cash > 0) {
      exposure.set("Cash", trading.account.cash);
    }

    return Array.from(exposure, ([name, value]) => ({
      name,
      value: Number(value.toFixed(2)),
    }));
  }, [holdings, trading.account.cash]);

  const movers = useMemo(
    () =>
      [...stocks]
        .sort((a, b) => Math.abs(b.dayChangePercent) - Math.abs(a.dayChangePercent))
        .slice(0, 8),
    [stocks]
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: BRAND.background }}>
      <Box sx={{ bgcolor: BRAND.navy, color: "#fff" }}>
        <Container maxWidth="xl" sx={{ py: { xs: 4, md: 5 } }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={8}>
              <Chip
                icon={<AssessmentIcon />}
                label={`Game Day ${gameDay}`}
                sx={{
                  bgcolor: "rgba(154,216,114,0.18)",
                  color: BRAND.green,
                  fontWeight: 950,
                  mb: 2,
                }}
              />

              <Typography
                variant="h2"
                sx={{
                  fontWeight: 950,
                  letterSpacing: -1,
                  lineHeight: 1.05,
                  mb: 1.5,
                }}
              >
                Trading Dashboard
              </Typography>

              <Typography sx={{ color: "rgba(255,255,255,0.7)", maxWidth: 760 }}>
                Track your cash, holdings, market movement, and today&apos;s news
                from the same simulator state used by the trading screen.
              </Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card
                sx={{
                  bgcolor: "rgba(255,255,255,0.08)",
                  color: "#fff",
                  borderRadius: 4,
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Typography sx={{ opacity: 0.65, fontWeight: 800 }}>
                    SEASON PROGRESS
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 950, my: 1 }}>
                    Day {seasonDay}/{SEASON_LENGTH}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={(seasonDay / SEASON_LENGTH) * 100}
                    sx={{
                      height: 12,
                      borderRadius: 99,
                      bgcolor: "rgba(255,255,255,0.12)",
                      "& .MuiLinearProgress-bar": {
                        bgcolor: BRAND.green,
                        borderRadius: 99,
                      },
                    }}
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Cash"
              value={formatMoney(trading.account.cash)}
              icon={<AccountBalanceWalletIcon />}
              color={BRAND.green}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Portfolio"
              value={formatMoney(portfolioValue)}
              icon={<PieChartIcon />}
              color={BRAND.green}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Net Worth"
              value={formatMoney(netWorth)}
              icon={<AssessmentIcon />}
              color={BRAND.green}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Market Avg"
              value={`${marketSummary.averageMove >= 0 ? "+" : ""}${marketSummary.averageMove.toFixed(2)}%`}
              icon={
                marketSummary.averageMove >= 0 ? (
                  <TrendingUpIcon />
                ) : (
                  <TrendingDownIcon />
                )
              }
              color={marketSummary.averageMove >= 0 ? BRAND.green : BRAND.red}
            />
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <Card sx={panelStyle}>
              <CardContent sx={{ p: 3 }}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  spacing={2}
                  sx={{ mb: 2 }}
                >
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 950 }}>
                      Holdings
                    </Typography>
                    <Typography color="text.secondary">
                      Your owned shares marked to current game-day prices.
                    </Typography>
                  </Box>

                  <Button
                    variant="contained"
                    component={RouterLink}
                    to="/game"
                    sx={{
                      bgcolor: BRAND.red,
                      fontWeight: 950,
                      borderRadius: 2,
                      "&:hover": { bgcolor: "#E63131" },
                    }}
                  >
                    Trade
                  </Button>
                </Stack>

                <Divider sx={{ mb: 2 }} />

                {holdings.length === 0 ? (
                  <EmptyState
                    title="No positions yet"
                    text="Buy shares from the Game page and they will appear here."
                    actionLabel="Open Market"
                    actionTo="/game"
                  />
                ) : (
                  <Stack spacing={1.4}>
                    {holdings.map((holding) => (
                      <HoldingRow key={holding.symbol} holding={holding} netWorth={netWorth} />
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} lg={4}>
            <Card sx={{ ...panelStyle, height: "100%" }}>
              <CardContent sx={{ p: 3, height: "100%" }}>
                <Typography variant="h5" sx={{ fontWeight: 950 }}>
                  Allocation
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  Cash and sector exposure based on current holdings.
                </Typography>

                <Box sx={{ height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <RTooltip formatter={(value: any) => formatMoney(Number(value))} />
                      <Pie
                        data={sectorExposure}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="55%"
                        outerRadius="82%"
                        paddingAngle={2}
                      >
                        {sectorExposure.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </Box>

                <Stack spacing={1}>
                  {sectorExposure.map((entry, index) => (
                    <Stack
                      key={entry.name}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            bgcolor: CHART_COLORS[index % CHART_COLORS.length],
                          }}
                        />
                        <Typography sx={{ fontWeight: 900 }}>{entry.name}</Typography>
                      </Stack>
                      <Typography color="text.secondary">
                        {formatMoney(entry.value)}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} lg={7}>
            <Card sx={panelStyle}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 950 }}>
                  Market Movers
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  Largest absolute moves across the current stock universe.
                </Typography>

                <Box sx={{ height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={movers} layout="vertical" margin={{ left: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(44,57,71,0.12)" />
                      <XAxis
                        type="number"
                        tickFormatter={(value) => `${Number(value).toFixed(0)}%`}
                      />
                      <YAxis type="category" dataKey="symbol" width={48} />
                      <RTooltip
                        formatter={(value: any) => [
                          `${Number(value).toFixed(2)}%`,
                          "Day Move",
                        ]}
                      />
                      <Bar dataKey="dayChangePercent" radius={[0, 6, 6, 0]}>
                        {movers.map((stock) => (
                          <Cell
                            key={stock.symbol}
                            fill={stock.dayChangePercent >= 0 ? BRAND.green : BRAND.red}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} lg={5}>
            <Card sx={panelStyle}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 950 }}>
                  Today&apos;s News
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  Current events for Game Day {gameDay}.
                </Typography>

                <Divider sx={{ mb: 2 }} />

                {news.length === 0 ? (
                  <Typography color="text.secondary">
                    No major news today. Market movement is still affected by drift,
                    volatility, and trend bias.
                  </Typography>
                ) : (
                  <Stack spacing={1.2}>
                    {news.slice(0, 5).map((item) => (
                      <Box
                        key={item.newsId}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: "#F7F9FB",
                          border: "1px solid #E5E9EF",
                        }}
                      >
                        <Stack direction="row" spacing={1} sx={{ mb: 0.8 }}>
                          <Chip
                            size="small"
                            label={item.marketTone}
                            sx={{
                              bgcolor:
                                item.marketTone === "Bullish"
                                  ? "rgba(154,216,114,0.25)"
                                  : "rgba(255,55,55,0.12)",
                              color:
                                item.marketTone === "Bullish" ? BRAND.navy : BRAND.red,
                              fontWeight: 900,
                            }}
                          />
                          <Chip
                            size="small"
                            label={item.relatedTickers.join(", ")}
                            sx={{
                              bgcolor: BRAND.navy,
                              color: "#fff",
                              fontWeight: 900,
                            }}
                          />
                        </Stack>
                        <Typography sx={{ fontWeight: 950, color: BRAND.navy }}>
                          {item.headline}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>
                          {item.body}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                )}

                <Button
                  fullWidth
                  variant="outlined"
                  component={RouterLink}
                  to="/news"
                  sx={{
                    mt: 2,
                    borderColor: BRAND.navy,
                    color: BRAND.navy,
                    fontWeight: 950,
                    borderRadius: 2,
                  }}
                >
                  Open News
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card sx={{ ...panelStyle, bgcolor: BRAND.navy, color: "#fff" }}>
              <CardContent sx={{ p: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <MarketCallout
                      title="Strongest"
                      stock={marketSummary.strongest}
                      icon={<TrendingUpIcon />}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <MarketCallout
                      title="Weakest"
                      stock={marketSummary.weakest}
                      icon={<TrendingDownIcon />}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box>
                      <Typography sx={{ color: "rgba(255,255,255,0.62)", fontWeight: 800 }}>
                        MARKET BREADTH
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 950 }}>
                        {marketSummary.gainers} up / {marketSummary.losers} down
                      </Typography>
                      <Typography sx={{ color: "rgba(255,255,255,0.65)", mt: 0.5 }}>
                        Breadth helps show whether today&apos;s market is broad or
                        concentrated in a few stocks.
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card sx={panelStyle}>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography color="text.secondary" sx={{ fontWeight: 800 }}>
              {title}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 950, color: BRAND.navy }}>
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 46,
              height: 46,
              borderRadius: 2,
              bgcolor: `${color}33`,
              color,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function HoldingRow({
  holding,
  netWorth,
}: {
  holding: ReturnType<typeof useTradingAccount>["account"]["holdings"][number] & {
    stock?: Stock;
    currentPrice: number;
    marketValue: number;
    costBasis: number;
    profitLoss: number;
    profitLossPercent: number;
  };
  netWorth: number;
}) {
  const isUp = holding.profitLoss >= 0;
  const allocation = netWorth > 0 ? (holding.marketValue / netWorth) * 100 : 0;

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: "#F7F9FB",
        border: "1px solid #E5E9EF",
      }}
    >
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={4}>
          <Stack direction="row" spacing={1.2} alignItems="center">
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: 2,
                bgcolor: isUp ? "rgba(154,216,114,0.25)" : "rgba(255,55,55,0.12)",
                color: isUp ? BRAND.green : BRAND.red,
                display: "grid",
                placeItems: "center",
              }}
            >
              <ShowChartIcon />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 950, color: BRAND.navy }}>
                {holding.symbol}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {holding.name}
              </Typography>
            </Box>
          </Stack>
        </Grid>

        <Grid item xs={6} md={2}>
          <MetricLabel label="Shares" value={holding.shares.toString()} />
        </Grid>

        <Grid item xs={6} md={2}>
          <MetricLabel label="Price" value={formatMoney(holding.currentPrice)} />
        </Grid>

        <Grid item xs={6} md={2}>
          <MetricLabel label="Value" value={formatMoney(holding.marketValue)} />
        </Grid>

        <Grid item xs={6} md={2}>
          <Typography color="text.secondary" sx={{ fontWeight: 800 }}>
            P/L
          </Typography>
          <Typography sx={{ fontWeight: 950, color: isUp ? BRAND.green : BRAND.red }}>
            {holding.profitLoss >= 0 ? "+" : ""}
            {formatMoney(holding.profitLoss)} ({holding.profitLossPercent.toFixed(2)}%)
          </Typography>
        </Grid>
      </Grid>

      <Box sx={{ mt: 1.5 }}>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.6 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
            Allocation
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
            {allocation.toFixed(1)}%
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={Math.min(100, allocation)}
          sx={{
            height: 8,
            borderRadius: 99,
            bgcolor: "#E5E9EF",
            "& .MuiLinearProgress-bar": {
              bgcolor: isUp ? BRAND.green : BRAND.red,
              borderRadius: 99,
            },
          }}
        />
      </Box>
    </Box>
  );
}

function MetricLabel({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography color="text.secondary" sx={{ fontWeight: 800 }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 950, color: BRAND.navy }}>{value}</Typography>
    </Box>
  );
}

function EmptyState({
  title,
  text,
  actionLabel,
  actionTo,
}: {
  title: string;
  text: string;
  actionLabel: string;
  actionTo: string;
}) {
  return (
    <Box
      sx={{
        p: 3,
        borderRadius: 2,
        bgcolor: "#F7F9FB",
        border: "1px solid #E5E9EF",
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 950, color: BRAND.navy }}>
        {title}
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
        {text}
      </Typography>
      <Button
        variant="contained"
        component={RouterLink}
        to={actionTo}
        sx={{
          bgcolor: BRAND.red,
          fontWeight: 950,
          borderRadius: 2,
          "&:hover": { bgcolor: "#E63131" },
        }}
      >
        {actionLabel}
      </Button>
    </Box>
  );
}

function MarketCallout({
  title,
  stock,
  icon,
}: {
  title: string;
  stock?: Stock;
  icon: React.ReactNode;
}) {
  if (!stock) return null;

  const isUp = stock.dayChangePercent >= 0;

  return (
    <Stack direction="row" spacing={1.4} alignItems="center">
      <Box
        sx={{
          width: 46,
          height: 46,
          borderRadius: 2,
          bgcolor: isUp ? "rgba(154,216,114,0.2)" : "rgba(255,55,55,0.18)",
          color: isUp ? BRAND.green : BRAND.red,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography sx={{ color: "rgba(255,255,255,0.62)", fontWeight: 800 }}>
          {title.toUpperCase()}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 950 }}>
          {stock.symbol} {isUp ? "+" : ""}
          {stock.dayChangePercent.toFixed(2)}%
        </Typography>
        <Typography sx={{ color: "rgba(255,255,255,0.65)" }}>
          {stock.name}
        </Typography>
      </Box>
    </Stack>
  );
}

const panelStyle = {
  borderRadius: 4,
  boxShadow: "0 18px 45px rgba(44,57,71,0.08)",
  border: "1px solid rgba(44,57,71,0.08)",
};
