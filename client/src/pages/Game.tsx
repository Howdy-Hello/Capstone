import React, { useMemo, useState } from "react";
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
  Stack,
} from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ShieldIcon from "@mui/icons-material/Shield";
import NewspaperIcon from "@mui/icons-material/Newspaper";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import StorefrontIcon from "@mui/icons-material/Storefront";
import { Link as RouterLink, useNavigate } from "react-router-dom";

import {
  getNewsForGameDay,
  getSeasonDay,
  getStocksForGameDay,
  SEASON_LENGTH,
  Stock,
} from "../data/mockStocks";

const BRAND = {
  navy: "#2C3947",
  red: "#FF3737",
  green: "#9AD872",
  background: "#F5F7F9",
};

export default function Game() {
  const navigate = useNavigate();
  const [gameDay, setGameDay] = useState(1);

  const stocks = useMemo(() => getStocksForGameDay(gameDay), [gameDay]);
  const todayNews = useMemo(() => getNewsForGameDay(gameDay), [gameDay]);
  const seasonDay = getSeasonDay(gameDay);

  const marketSummary = useMemo(() => {
    const gainers = stocks.filter((stock) => stock.dayChangePercent >= 0).length;
    const losers = stocks.length - gainers;

    const averageMove =
      stocks.reduce((sum, stock) => sum + stock.dayChangePercent, 0) /
      stocks.length;

    return {
      gainers,
      losers,
      averageMove,
    };
  }, [stocks]);

  function handleNextDay() {
    setGameDay((currentDay) => currentDay + 1);
  }

  function handleResetDay() {
    setGameDay(1);
  }

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
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={7}>
            <Chip
              label={`Game Day ${gameDay}`}
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
              Infinite Stock Market Simulator
            </Typography>

            <Typography
              sx={{
                color: "rgba(255,255,255,0.72)",
                maxWidth: 720,
                fontSize: 18,
              }}
            >
              Trade from 15 mock companies. Prices are generated forever using
              volatility, trend bias, sector movement, and generated news events.
            </Typography>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              sx={{ mt: 3 }}
            >
              <Button
                variant="contained"
                onClick={handleNextDay}
                sx={{
                  bgcolor: BRAND.red,
                  fontWeight: 950,
                  borderRadius: 2.2,
                  px: 3,
                  "&:hover": { bgcolor: "#E63131" },
                }}
              >
                Next Day
              </Button>

              <Button
                variant="outlined"
                startIcon={<RestartAltIcon />}
                onClick={handleResetDay}
                sx={{
                  color: "#fff",
                  borderColor: "rgba(255,255,255,0.35)",
                  fontWeight: 950,
                  borderRadius: 2.2,
                  px: 3,
                  "&:hover": {
                    borderColor: "#fff",
                    bgcolor: "rgba(255,255,255,0.08)",
                  },
                }}
              >
                Reset
              </Button>
            </Stack>
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
                  MARKET STATUS
                </Typography>

                <Typography variant="h3" sx={{ fontWeight: 950, my: 1 }}>
                  {marketSummary.averageMove >= 0 ? "+" : ""}
                  {marketSummary.averageMove.toFixed(2)}%
                </Typography>

                <Chip
                  icon={
                    marketSummary.averageMove >= 0 ? (
                      <TrendingUpIcon />
                    ) : (
                      <TrendingDownIcon />
                    )
                  }
                  label={
                    marketSummary.averageMove >= 0
                      ? "Positive Market Day"
                      : "Negative Market Day"
                  }
                  sx={{
                    bgcolor:
                      marketSummary.averageMove >= 0 ? BRAND.green : BRAND.red,
                    color:
                      marketSummary.averageMove >= 0 ? BRAND.navy : "#fff",
                    fontWeight: 950,
                  }}
                />

                <Box sx={{ mt: 4 }}>
                  <Typography
                    variant="body2"
                    sx={{ color: "rgba(255,255,255,0.7)", mb: 1 }}
                  >
                    Season Progress: Day {seasonDay}/{SEASON_LENGTH}
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
              title="Cash Balance"
              value="$10,000"
              icon={<AccountBalanceWalletIcon />}
              color={BRAND.green}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Companies"
              value={stocks.length.toString()}
              icon={<StorefrontIcon />}
              color={BRAND.green}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Market Gainers"
              value={`${marketSummary.gainers}/${stocks.length}`}
              icon={<TrendingUpIcon />}
              color={BRAND.green}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="News Events"
              value={todayNews.length.toString()}
              icon={<NewspaperIcon />}
              color={todayNews.length > 0 ? BRAND.red : BRAND.green}
            />
          </Grid>
        </Grid>

        {todayNews.length > 0 && (
          <Card sx={{ ...panelStyle, mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <ReportProblemIcon sx={{ color: BRAND.red }} />

                <Typography variant="h5" sx={{ fontWeight: 950 }}>
                  Today&apos;s Market News
                </Typography>
              </Box>

              <Typography color="text.secondary" sx={{ mb: 2 }}>
                These generated events are connected to today&apos;s mock price movement.
              </Typography>

              <Divider sx={{ mb: 2 }} />

              <Grid container spacing={2}>
                {todayNews.map((news) => (
                  <Grid item xs={12} md={6} key={news.newsId}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 3,
                        bgcolor: "#F7F9FB",
                        border: "1px solid #E5E9EF",
                      }}
                    >
                      <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                        <Chip
                          size="small"
                          label={news.importance}
                          sx={{
                            bgcolor:
                              news.importance === "High"
                                ? "rgba(255,55,55,0.12)"
                                : "rgba(154,216,114,0.2)",
                            color:
                              news.importance === "High"
                                ? BRAND.red
                                : BRAND.navy,
                            fontWeight: 900,
                          }}
                        />

                        <Chip
                          size="small"
                          label={news.marketTone}
                          sx={{
                            bgcolor:
                              news.marketTone === "Bullish"
                                ? "rgba(154,216,114,0.25)"
                                : "rgba(255,55,55,0.12)",
                            color:
                              news.marketTone === "Bullish"
                                ? BRAND.navy
                                : BRAND.red,
                            fontWeight: 900,
                          }}
                        />
                      </Stack>

                      <Typography sx={{ fontWeight: 950, color: BRAND.navy }}>
                        {news.headline}
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.7 }}
                      >
                        {news.body}
                      </Typography>

                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", mt: 1 }}
                      >
                        Related: {news.relatedTickers.join(", ")}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
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
                      Market
                    </Typography>

                    <Typography color="text.secondary">
                      Click any stock to view details, chart, mock fundamentals,
                      and related news.
                    </Typography>
                  </Box>

                  <Button
                    variant="contained"
                    onClick={handleNextDay}
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
                  <StockRow
                    key={stock.stockId}
                    stock={stock}
                    gameDay={gameDay}
                    onOpen={() =>
                      navigate(`/stocks/${stock.symbol}`, {
                        state: { gameDay },
                      })
                    }
                  />
                ))}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
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
                  Game Loop
                </Typography>

                <Typography sx={{ color: "rgba(255,255,255,0.65)", mb: 2 }}>
                  The market uses seeded randomness, sector drift, volatility,
                  fundamentals, and generated news events.
                </Typography>

                <TradingTip text="Read the news for the current game day." />
                <TradingTip text="Open stock details before buying." />
                <TradingTip text="Compare valuation, growth, debt, and margin." />
                <TradingTip text="Press Next Day to generate the next market day." />

                <Button
                  fullWidth
                  variant="contained"
                  component={RouterLink}
                  to="/news"
                  startIcon={<NewspaperIcon />}
                  sx={{
                    mt: 2,
                    bgcolor: BRAND.red,
                    fontWeight: 950,
                    borderRadius: 2.2,
                    "&:hover": { bgcolor: "#E63131" },
                  }}
                >
                  Open News Page
                </Button>
              </CardContent>
            </Card>

            <Card sx={panelStyle}>
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mb: 1,
                  }}
                >
                  <ShieldIcon sx={{ color: BRAND.red }} />

                  <Typography variant="h5" sx={{ fontWeight: 950 }}>
                    Risk Guide
                  </Typography>
                </Box>

                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  Higher-risk stocks move more aggressively across game days.
                </Typography>

                <RiskItem
                  level="Low"
                  text="Stable movement, smaller upside and downside."
                />
                <RiskItem
                  level="Medium"
                  text="Balanced movement with moderate volatility."
                />
                <RiskItem
                  level="High"
                  text="Bigger moves, higher profit and loss potential."
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}

function StockRow({
  stock,
  gameDay,
  onOpen,
}: {
  stock: Stock;
  gameDay: number;
  onOpen: () => void;
}) {
  const isUp = stock.dayChangePercent >= 0;

  return (
    <Box
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          sm: "1fr auto",
          md: "1.4fr 0.9fr auto",
        },
        gap: 2,
        alignItems: "center",
        p: 2,
        mb: 1.5,
        borderRadius: 3,
        bgcolor: "#F7F9FB",
        border: "1px solid #E5E9EF",
        cursor: "pointer",
        outline: "none",
        transition:
          "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease, background-color 160ms ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: "0 14px 34px rgba(44,57,71,0.12)",
          borderColor: "rgba(44,57,71,0.22)",
          bgcolor: "#fff",
        },
        "&:focus-visible": {
          boxShadow: "0 0 0 3px rgba(154,216,114,0.45)",
          borderColor: BRAND.green,
        },
      }}
    >
      <Box>
        <Stack direction="row" spacing={1.2} alignItems="center">
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 2,
              bgcolor: isUp
                ? "rgba(154,216,114,0.25)"
                : "rgba(255,55,55,0.12)",
              color: isUp ? BRAND.green : BRAND.red,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <ShowChartIcon />
          </Box>

          <Box>
            <Typography sx={{ fontWeight: 950, color: BRAND.navy }}>
              {stock.symbol}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              {stock.name} • {stock.sector} • {stock.riskLevel} Risk
            </Typography>

            <Typography variant="caption" color="text.secondary">
              P/E {stock.fundamentals.peRatio} • Growth{" "}
              {stock.fundamentals.revenueGrowth}% • Day {gameDay}
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
        <Typography sx={{ fontWeight: 950, color: BRAND.navy }}>
          ${stock.currentPrice.toFixed(2)}
        </Typography>

        <Typography
          variant="body2"
          sx={{
            color: isUp ? BRAND.green : BRAND.red,
            fontWeight: 900,
          }}
        >
          {isUp ? "+" : ""}
          {stock.dayChangePercent.toFixed(2)}%
        </Typography>

        <Typography variant="caption" color="text.secondary">
          {stock.dayChange >= 0 ? "+" : ""}
          ${stock.dayChange.toFixed(2)} today
        </Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          gap: 1,
          justifyContent: { xs: "flex-start", md: "flex-end" },
        }}
      >
        <Button
          size="small"
          variant="contained"
          onClick={(event) => {
            event.stopPropagation();
            alert(`Buy ${stock.symbol}`);
          }}
          sx={{
            bgcolor: BRAND.green,
            color: BRAND.navy,
            fontWeight: 950,
            borderRadius: 2,
            "&:hover": { bgcolor: "#85C85F" },
          }}
        >
          Buy
        </Button>

        <Button
          size="small"
          variant="contained"
          onClick={(event) => {
            event.stopPropagation();
            alert(`Sell ${stock.symbol}`);
          }}
          sx={{
            bgcolor: BRAND.red,
            fontWeight: 950,
            borderRadius: 2,
            "&:hover": { bgcolor: "#E63131" },
          }}
        >
          Sell
        </Button>
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

function TradingTip({ text }: { text: string }) {
  return (
    <Box
      sx={{
        p: 1.6,
        mb: 1.2,
        borderRadius: 3,
        bgcolor: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.12)",
      }}
    >
      <Typography sx={{ fontWeight: 800 }}>{text}</Typography>
    </Box>
  );
}

function RiskItem({ level, text }: { level: string; text: string }) {
  return (
    <Box
      sx={{
        p: 1.5,
        mb: 1.2,
        borderRadius: 3,
        bgcolor: "#F7F9FB",
        border: "1px solid #E5E9EF",
      }}
    >
      <Typography sx={{ fontWeight: 950, color: BRAND.navy }}>
        {level} Risk
      </Typography>

      <Typography variant="body2" color="text.secondary">
        {text}
      </Typography>
    </Box>
  );
}

const panelStyle = {
  borderRadius: 4,
  boxShadow: "0 18px 45px rgba(44,57,71,0.08)",
  border: "1px solid rgba(44,57,71,0.08)",
};