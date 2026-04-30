import React, { useMemo } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import BusinessIcon from "@mui/icons-material/Business";
import ShieldIcon from "@mui/icons-material/Shield";
import QueryStatsIcon from "@mui/icons-material/QueryStats";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";

import {
  getStockBySymbolForGameDay,
  getStockHistoryBySymbol,
  MAX_GAME_DAY,
  Stock,
  StockPriceHistory,
} from "../data/mockStocks";

const BRAND = {
  navy: "#2C3947",
  red: "#FF3737",
  green: "#9AD872",
  background: "#F5F7F9",
};

type LocationState = {
  gameDay?: number;
};

export default function StockDetails() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as LocationState | null;
  const gameDay = state?.gameDay ?? MAX_GAME_DAY;

  const stock = useMemo(() => {
    if (!symbol) return undefined;
    return getStockBySymbolForGameDay(symbol, gameDay);
  }, [symbol, gameDay]);

  const history = useMemo(() => {
    if (!symbol) return [];
    return getStockHistoryBySymbol(symbol);
  }, [symbol]);

  const visibleHistory = useMemo(() => {
    return history.filter((item) => item.gameDay <= gameDay);
  }, [history, gameDay]);

  if (!stock) {
    return (
      <Box
        sx={{
          bgcolor: BRAND.background,
          minHeight: "100vh",
          px: { xs: 2, md: 8 },
          py: 5,
        }}
      >
        <Card sx={panelStyle}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h4" sx={{ fontWeight: 950, color: BRAND.navy }}>
              Stock not found
            </Typography>

            <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
              The selected stock symbol does not exist in your mock data.
            </Typography>

            <Button
              variant="contained"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate("/game")}
              sx={{
                bgcolor: BRAND.red,
                fontWeight: 950,
                borderRadius: 2,
                "&:hover": { bgcolor: "#E63131" },
              }}
            >
              Back to Game
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  const isUp = stock.dayChangePercent >= 0;
  const riskScore = getRiskScore(stock.riskLevel);
  const latestHistory = visibleHistory[visibleHistory.length - 1];

  return (
    <Box sx={{ bgcolor: BRAND.background, minHeight: "100vh" }}>
      <Box
        sx={{
          bgcolor: BRAND.navy,
          color: "#fff",
          px: { xs: 3, md: 8 },
          py: { xs: 5, md: 7 },
        }}
      >
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/game")}
          sx={{
            color: "#fff",
            fontWeight: 900,
            mb: 3,
            px: 0,
            "&:hover": {
              bgcolor: "transparent",
              color: BRAND.green,
            },
          }}
        >
          Back to Market
        </Button>

        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={7}>
            <Stack direction="row" spacing={1.2} flexWrap="wrap" sx={{ mb: 2 }}>
              <Chip
                label={stock.symbol}
                sx={{
                  bgcolor: "rgba(154,216,114,0.18)",
                  color: BRAND.green,
                  fontWeight: 950,
                }}
              />

              <Chip
                label={`Game Day ${gameDay}`}
                sx={{
                  bgcolor: "rgba(255,255,255,0.1)",
                  color: "#fff",
                  fontWeight: 900,
                }}
              />

              <Chip
                label={`${stock.riskLevel} Risk`}
                sx={{
                  bgcolor:
                    stock.riskLevel === "High"
                      ? "rgba(255,55,55,0.2)"
                      : "rgba(154,216,114,0.18)",
                  color: stock.riskLevel === "High" ? "#FFB3B3" : BRAND.green,
                  fontWeight: 900,
                }}
              />
            </Stack>

            <Typography
              variant="h2"
              sx={{
                fontWeight: 950,
                letterSpacing: -1.5,
                lineHeight: 1.05,
                mb: 2,
              }}
            >
              {stock.name}
            </Typography>

            <Typography
              sx={{
                color: "rgba(255,255,255,0.72)",
                maxWidth: 720,
                fontSize: 18,
              }}
            >
              {stock.description}
            </Typography>
          </Grid>

          <Grid item xs={12} md={5}>
            <Card
              sx={{
                bgcolor: "rgba(255,255,255,0.08)",
                color: "#fff",
                borderRadius: 4,
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Typography sx={{ opacity: 0.65, fontWeight: 800 }}>
                  CURRENT PRICE
                </Typography>

                <Typography variant="h3" sx={{ fontWeight: 950, my: 1 }}>
                  ${stock.currentPrice.toFixed(2)}
                </Typography>

                <Chip
                  icon={isUp ? <TrendingUpIcon /> : <TrendingDownIcon />}
                  label={`${isUp ? "+" : ""}${stock.dayChangePercent.toFixed(2)}% Today`}
                  sx={{
                    bgcolor: isUp ? BRAND.green : BRAND.red,
                    color: isUp ? BRAND.navy : "#fff",
                    fontWeight: 950,
                  }}
                />

                <Box sx={{ mt: 3 }}>
                  <Typography
                    variant="body2"
                    sx={{ color: "rgba(255,255,255,0.7)", mb: 1 }}
                  >
                    Risk Level
                  </Typography>

                  <LinearProgress
                    variant="determinate"
                    value={riskScore}
                    sx={{
                      height: 12,
                      borderRadius: 99,
                      bgcolor: "rgba(255,255,255,0.12)",
                      "& .MuiLinearProgress-bar": {
                        bgcolor: stock.riskLevel === "High" ? BRAND.red : BRAND.green,
                        borderRadius: 99,
                      },
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ px: { xs: 2, md: 8 }, py: 4 }}>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Current Price"
              value={`$${stock.currentPrice.toFixed(2)}`}
              icon={<AccountBalanceWalletIcon />}
              color={BRAND.green}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Previous Price"
              value={`$${stock.previousPrice.toFixed(2)}`}
              icon={<ShowChartIcon />}
              color={BRAND.green}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Day Change"
              value={`${stock.dayChange >= 0 ? "+" : ""}$${stock.dayChange.toFixed(2)}`}
              icon={isUp ? <TrendingUpIcon /> : <TrendingDownIcon />}
              color={isUp ? BRAND.green : BRAND.red}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Volume"
              value={latestHistory ? latestHistory.volume.toLocaleString() : "-"}
              icon={<QueryStatsIcon />}
              color={BRAND.red}
            />
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <Card sx={panelStyle}>
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: { xs: "flex-start", sm: "center" },
                    flexDirection: { xs: "column", sm: "row" },
                    gap: 2,
                    mb: 2,
                  }}
                >
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 950 }}>
                      Price History
                    </Typography>
                    <Typography color="text.secondary">
                      Mock close price movement up to Game Day {gameDay}.
                    </Typography>
                  </Box>

                  <Chip
                    label={`${visibleHistory.length} data points`}
                    sx={{
                      bgcolor: "rgba(154,216,114,0.25)",
                      color: BRAND.navy,
                      fontWeight: 900,
                    }}
                  />
                </Box>

                <Divider sx={{ mb: 2 }} />

                <Box sx={{ width: "100%", height: 360 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={visibleHistory}>
                      <defs>
                        <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={BRAND.green} stopOpacity={0.45} />
                          <stop offset="95%" stopColor={BRAND.green} stopOpacity={0.03} />
                        </linearGradient>
                      </defs>

                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(44,57,71,0.12)" />

                      <XAxis
                        dataKey="gameDay"
                        tickFormatter={(value) => `Day ${value}`}
                      />

                      <YAxis
                        tickFormatter={(value) => `$${Number(value).toFixed(0)}`}
                        domain={["dataMin - 5", "dataMax + 5"]}
                      />

                      <RTooltip
                        formatter={(value: number) => [`$${value.toFixed(2)}`, "Close Price"]}
                        labelFormatter={(label) => `Game Day ${label}`}
                      />

                      <Area
                        type="monotone"
                        dataKey="closePrice"
                        stroke={BRAND.green}
                        strokeWidth={3}
                        fill="url(#priceFill)"
                        dot={{
                          r: 4,
                          strokeWidth: 2,
                        }}
                        activeDot={{
                          r: 6,
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>

            <Card sx={{ ...panelStyle, mt: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 950 }}>
                  Historical Prices
                </Typography>

                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  Open, high, low, close, and volume for each mock game day.
                </Typography>

                <Divider sx={{ mb: 2 }} />

                <Stack spacing={1.3}>
                  {visibleHistory.map((item) => (
                    <HistoryRow key={item.priceId} item={item} />
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} lg={4}>
            <Card
              sx={{
                bgcolor: BRAND.navy,
                color: "#fff",
                borderRadius: 4,
                boxShadow: "0 18px 45px rgba(44,57,71,0.22)",
                mb: 3,
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 950 }}>
                  Company Profile
                </Typography>

                <Typography sx={{ color: "rgba(255,255,255,0.65)", mb: 3 }}>
                  Basic company information from your mock stock constant.
                </Typography>

                <InfoRow label="Symbol" value={stock.symbol} />
                <InfoRow label="Sector" value={stock.sector} />
                <InfoRow label="Industry" value={stock.industry} />
                <InfoRow label="Starting Price" value={`$${stock.startingPrice.toFixed(2)}`} />
                <InfoRow label="Volatility" value={`${(stock.volatility * 100).toFixed(1)}%`} />
                <InfoRow label="Risk Level" value={stock.riskLevel} />
              </CardContent>
            </Card>

            <Card sx={panelStyle}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <BusinessIcon sx={{ color: BRAND.green }} />
                  <Typography variant="h5" sx={{ fontWeight: 950 }}>
                    Trading Actions
                  </Typography>
                </Box>

                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  These buttons are UI-ready. Connect them to your portfolio logic later.
                </Typography>

                <Stack spacing={1.2}>
                  <Button
                    fullWidth
                    variant="contained"
                    sx={{
                      bgcolor: BRAND.green,
                      color: BRAND.navy,
                      fontWeight: 950,
                      borderRadius: 2,
                      "&:hover": { bgcolor: "#85C85F" },
                    }}
                  >
                    Buy {stock.symbol}
                  </Button>

                  <Button
                    fullWidth
                    variant="contained"
                    sx={{
                      bgcolor: BRAND.red,
                      fontWeight: 950,
                      borderRadius: 2,
                      "&:hover": { bgcolor: "#E63131" },
                    }}
                  >
                    Sell {stock.symbol}
                  </Button>

                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => navigate("/game")}
                    sx={{
                      borderColor: BRAND.navy,
                      color: BRAND.navy,
                      fontWeight: 950,
                      borderRadius: 2,
                      "&:hover": {
                        borderColor: BRAND.navy,
                        bgcolor: "rgba(44,57,71,0.06)",
                      },
                    }}
                  >
                    Back to Market
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
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
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
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
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

function HistoryRow({ item }: { item: StockPriceHistory }) {
  const isUp = item.changePercent >= 0;

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 3,
        bgcolor: "#F7F9FB",
        border: "1px solid #E5E9EF",
      }}
    >
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={2}>
          <Typography sx={{ fontWeight: 950, color: BRAND.navy }}>
            Day {item.gameDay}
          </Typography>
        </Grid>

        <Grid item xs={6} sm={2}>
          <Typography variant="body2" color="text.secondary">
            Open
          </Typography>
          <Typography sx={{ fontWeight: 900 }}>${item.openPrice.toFixed(2)}</Typography>
        </Grid>

        <Grid item xs={6} sm={2}>
          <Typography variant="body2" color="text.secondary">
            High
          </Typography>
          <Typography sx={{ fontWeight: 900 }}>${item.highPrice.toFixed(2)}</Typography>
        </Grid>

        <Grid item xs={6} sm={2}>
          <Typography variant="body2" color="text.secondary">
            Low
          </Typography>
          <Typography sx={{ fontWeight: 900 }}>${item.lowPrice.toFixed(2)}</Typography>
        </Grid>

        <Grid item xs={6} sm={2}>
          <Typography variant="body2" color="text.secondary">
            Close
          </Typography>
          <Typography sx={{ fontWeight: 900 }}>${item.closePrice.toFixed(2)}</Typography>
        </Grid>

        <Grid item xs={12} sm={2}>
          <Typography
            sx={{
              fontWeight: 950,
              color: isUp ? BRAND.green : BRAND.red,
              textAlign: { xs: "left", sm: "right" },
            }}
          >
            {isUp ? "+" : ""}
            {item.changePercent.toFixed(2)}%
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        gap: 2,
        py: 1.4,
        borderBottom: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <Typography sx={{ color: "rgba(255,255,255,0.62)", fontWeight: 800 }}>
        {label}
      </Typography>

      <Typography sx={{ fontWeight: 950, textAlign: "right" }}>{value}</Typography>
    </Box>
  );
}

function getRiskScore(riskLevel: Stock["riskLevel"]) {
  if (riskLevel === "High") return 82;
  if (riskLevel === "Medium") return 58;
  return 34;
}

const panelStyle = {
  borderRadius: 4,
  boxShadow: "0 18px 45px rgba(44,57,71,0.08)",
  border: "1px solid rgba(44,57,71,0.08)",
};