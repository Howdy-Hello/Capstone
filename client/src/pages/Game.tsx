import React from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  LinearProgress,
  Divider,
} from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ShieldIcon from "@mui/icons-material/Shield";
import NewspaperIcon from "@mui/icons-material/Newspaper";
import { Link as RouterLink } from "react-router-dom";

const BRAND = {
  navy: "#2C3947",
  red: "#FF3737",
  green: "#9AD872",
  background: "#F5F7F9",
};

type Stock = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  sector: string;
};

const stocks: Stock[] = [
  {
    symbol: "NVT",
    name: "NovaTech",
    price: 124.82,
    change: 3.21,
    sector: "Technology",
  },
  {
    symbol: "GVE",
    name: "GreenVolt Energy",
    price: 78.45,
    change: 1.84,
    sector: "Energy",
  },
  {
    symbol: "MCH",
    name: "MediCore Health",
    price: 91.2,
    change: -2.08,
    sector: "Healthcare",
  },
  {
    symbol: "URB",
    name: "UrbanBank",
    price: 56.91,
    change: 0.64,
    sector: "Finance",
  },
  {
    symbol: "PAP",
    name: "PineApple Inc.",
    price: 210.34,
    change: -4.12,
    sector: "Technology",
  },
];

export default function Game() {
  return (
    <Box sx={{ bgcolor: BRAND.background, minHeight: "100vh" }}>
      {/* Hero Section */}
      <Box
        sx={{
          bgcolor: BRAND.navy,
          color: "#fff",
          px: { xs: 3, md: 8 },
          py: { xs: 5, md: 7 },
        }}
      >
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={7}>
            <Chip
              label="Live Simulation Mode"
              sx={{
                bgcolor: "rgba(154,216,114,0.18)",
                color: BRAND.green,
                fontWeight: 900,
                mb: 2,
              }}
            />

            <Typography
              variant="h2"
              sx={{
                fontWeight: 950,
                letterSpacing: -1.5,
                lineHeight: 1.05,
                mb: 2,
              }}
            >
              Stock Market Simulator
            </Typography>

            <Typography
              sx={{
                color: "rgba(255,255,255,0.72)",
                maxWidth: 680,
                fontSize: 18,
              }}
            >
              Buy, sell, react to news events, and build your virtual portfolio
              before the market turns against you.
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
                  PORTFOLIO VALUE
                </Typography>

                <Typography variant="h3" sx={{ fontWeight: 950, my: 1 }}>
                  $10,000.00
                </Typography>

                <Chip
                  icon={<TrendingUpIcon />}
                  label="+2.8% Today"
                  sx={{
                    bgcolor: BRAND.green,
                    color: BRAND.navy,
                    fontWeight: 950,
                  }}
                />

                <Box sx={{ mt: 4 }}>
                  <LinearProgress
                    variant="determinate"
                    value={68}
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
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Main Content */}
      <Box sx={{ px: { xs: 2, md: 8 }, py: 4 }}>
        {/* Stats */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Cash Balance"
              value="$10,000"
              icon={<AccountBalanceWalletIcon />}
              color={BRAND.green}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total P/L"
              value="+$0"
              icon={<TrendingUpIcon />}
              color={BRAND.green}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Risk Score"
              value="42/100"
              icon={<ShieldIcon />}
              color={BRAND.red}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="News Events"
              value="3 Active"
              icon={<NewspaperIcon />}
              color={BRAND.green}
            />
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          {/* Market List */}
          <Grid item xs={12} md={8}>
            <Card sx={panelStyle}>
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                  }}
                >
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 950 }}>
                      Market
                    </Typography>
                    <Typography color="text.secondary">
                      Watch prices and make trading decisions.
                    </Typography>
                  </Box>

                  <Button
                    variant="contained"
                    sx={{
                      bgcolor: BRAND.red,
                      fontWeight: 950,
                      borderRadius: 2,
                      "&:hover": { bgcolor: "#E63131" },
                    }}
                  >
                    Next Day
                  </Button>
                </Box>

                <Divider sx={{ mb: 2 }} />

                {stocks.map((stock) => (
                  <Box
                    key={stock.symbol}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      p: 2,
                      mb: 1.5,
                      borderRadius: 3,
                      bgcolor: "#F7F9FB",
                      border: "1px solid #E5E9EF",
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontWeight: 950 }}>
                        {stock.symbol}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {stock.name} • {stock.sector}
                      </Typography>
                    </Box>

                    <Box sx={{ textAlign: "right" }}>
                      <Typography sx={{ fontWeight: 950 }}>
                        ${stock.price.toFixed(2)}
                      </Typography>

                      <Typography
                        variant="body2"
                        sx={{
                          color: stock.change >= 0 ? BRAND.green : BRAND.red,
                          fontWeight: 900,
                        }}
                      >
                        {stock.change >= 0 ? "+" : ""}
                        {stock.change}%
                      </Typography>
                    </Box>

                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button
                        size="small"
                        variant="contained"
                        sx={{
                          bgcolor: BRAND.green,
                          color: BRAND.navy,
                          fontWeight: 950,
                          "&:hover": { bgcolor: "#85C85F" },
                        }}
                      >
                        Buy
                      </Button>

                      <Button
                        size="small"
                        variant="contained"
                        sx={{
                          bgcolor: BRAND.red,
                          fontWeight: 950,
                          "&:hover": { bgcolor: "#E63131" },
                        }}
                      >
                        Sell
                      </Button>
                    </Box>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>

          {/* Side Panel */}
          <Grid item xs={12} md={4}>
            <Card
              sx={{
                bgcolor: BRAND.navy,
                color: "#fff",
                borderRadius: 4,
                boxShadow: "0 18px 45px rgba(44,57,71,0.22)",
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 950 }}>
                  Game Tools
                </Typography>

                <Typography sx={{ color: "rgba(255,255,255,0.65)", mb: 3 }}>
                  Use these tools to improve your trading strategy.
                </Typography>

                <SideButton to="/leaderboard" label="View Leaderboard" />
                <SideButton to="/achievements" label="View Achievements" />
                <SideButton to="/save-load" label="Save / Load Game" />
                <SideButton to="/guide" label="Trading Guide" />
              </CardContent>
            </Card>

            <Card sx={{ ...panelStyle, mt: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 950 }}>
                  Breaking News
                </Typography>

                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  News events may change stock prices.
                </Typography>

                <Box
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    bgcolor: "#FFF2F2",
                    border: `1px solid ${BRAND.red}`,
                  }}
                >
                  <Typography sx={{ fontWeight: 950 }}>
                    Energy Prices Fall
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    GreenVolt Energy may become more volatile today.
                  </Typography>
                </Box>
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
      <CardContent
        sx={{
          p: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 950,
              color: "text.secondary",
              letterSpacing: 1,
            }}
          >
            {title.toUpperCase()}
          </Typography>

          <Typography variant="h5" sx={{ fontWeight: 950, mt: 1 }}>
            {value}
          </Typography>
        </Box>

        <Box
          sx={{
            width: 42,
            height: 42,
            borderRadius: 2,
            bgcolor: `${color}33`,
            color,
            display: "grid",
            placeItems: "center",
          }}
        >
          {icon}
        </Box>
      </CardContent>
    </Card>
  );
}

function SideButton({ to, label }: { to: string; label: string }) {
  return (
    <Button
      fullWidth
      component={RouterLink}
      to={to}
      sx={{
        justifyContent: "space-between",
        color: "#fff",
        bgcolor: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 3,
        py: 1.4,
        px: 2,
        mb: 1.3,
        fontWeight: 900,
        "&:hover": {
          bgcolor: "rgba(255,255,255,0.14)",
        },
      }}
    >
      {label}
    </Button>
  );
}

const panelStyle = {
  borderRadius: 4,
  boxShadow: "0 14px 35px rgba(44,57,71,0.08)",
  border: "1px solid #E5E9EF",
};