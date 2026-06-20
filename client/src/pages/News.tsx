import React, { useMemo } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Divider,
} from "@mui/material";
import NewspaperIcon from "@mui/icons-material/Newspaper";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import QueryStatsIcon from "@mui/icons-material/QueryStats";
import { Link as RouterLink, useLocation } from "react-router-dom";

import {
  getNewsForGameDay,
  getSeasonDay,
  MarketNews,
  normalizeGameDay,
  SEASON_LENGTH,
} from "../data/mockStocks";

const BRAND = {
  navy: "#2C3947",
  red: "#FF3737",
  green: "#9AD872",
  background: "#F5F7F9",
};

const GAME_DAY_STORAGE_KEY = "stockpilot-current-game-day";

type LocationState = {
  gameDay?: number;
};

function loadSavedGameDay() {
  const savedDay = Number(localStorage.getItem(GAME_DAY_STORAGE_KEY));
  return Number.isFinite(savedDay) && savedDay > 0 ? Math.floor(savedDay) : 1;
}

export default function News() {
  const location = useLocation();
  const state = location.state as LocationState | null;
  const gameDay = normalizeGameDay(state?.gameDay ?? loadSavedGameDay());
  const seasonDay = getSeasonDay(gameDay);
  const marketNews = useMemo(() => getNewsForGameDay(gameDay), [gameDay]);
  const bullishNews = marketNews.filter((news) => news.marketTone === "Bullish");
  const bearishNews = marketNews.filter((news) => news.marketTone === "Bearish");
  const highImportance = marketNews.filter((news) => news.importance === "High");

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
              icon={<NewspaperIcon />}
              label={`Game Day ${gameDay} News`}
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
              Today&apos;s market headlines.
            </Typography>

            <Typography
              sx={{
                color: "rgba(255,255,255,0.72)",
                maxWidth: 720,
                fontSize: 18,
              }}
            >
              These are the same events driving the simulator for the current
              game day. Judge the source, tone, affected tickers, and story
              strength before trading.
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
                  MARKET CLOCK
                </Typography>

                <Typography variant="h4" sx={{ fontWeight: 950, my: 1 }}>
                  Day {seasonDay}/{SEASON_LENGTH}
                </Typography>

                <Typography sx={{ color: "rgba(255,255,255,0.7)", mb: 3 }}>
                  The News page now follows the active simulator day instead of
                  showing a dated static list.
                </Typography>

                <Button
                  variant="contained"
                  component={RouterLink}
                  to="/game"
                  sx={{
                    bgcolor: BRAND.red,
                    fontWeight: 950,
                    borderRadius: 2.2,
                    "&:hover": { bgcolor: "#E63131" },
                  }}
                >
                  Trade the Market
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ px: { xs: 2, md: 8 }, py: 4 }}>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <SummaryCard
              title="Game Day"
              value={gameDay.toString()}
              icon={<NewspaperIcon />}
              color={BRAND.green}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <SummaryCard
              title="Bullish Tone"
              value={bullishNews.length.toString()}
              icon={<TrendingUpIcon />}
              color={BRAND.green}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <SummaryCard
              title="Bearish Tone"
              value={bearishNews.length.toString()}
              icon={<TrendingDownIcon />}
              color={BRAND.red}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <SummaryCard
              title="High Importance"
              value={highImportance.length.toString()}
              icon={<ReportProblemIcon />}
              color={BRAND.red}
            />
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card sx={panelStyle}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 950 }}>
                  Game Day {gameDay} Headlines
                </Typography>

                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  Showing news generated by the same mock market engine used on
                  the trading screen.
                </Typography>

                <Divider sx={{ mb: 2 }} />

                {marketNews.length === 0 ? (
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      bgcolor: "#F7F9FB",
                      border: "1px solid #E5E9EF",
                    }}
                  >
                    <Typography sx={{ fontWeight: 950, color: BRAND.navy }}>
                      No major news today.
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                      Prices can still move because of market drift, sector drift,
                      trend bias, and normal volatility.
                    </Typography>
                  </Box>
                ) : (
                  marketNews.map((news) => (
                    <NewsCard key={news.newsId} news={news} />
                  ))
                )}
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
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 950 }}>
                  How to Predict Movement
                </Typography>

                <Typography sx={{ color: "rgba(255,255,255,0.65)", mb: 2 }}>
                  Real traders do not just read headlines. They think about how
                  other investors might react.
                </Typography>

                <Tip number="1" text="Check if the news affects future profits." />
                <Tip number="2" text="Notice whether the headline is confirmed or uncertain." />
                <Tip number="3" text="Compare the news to the company’s current trend." />
                <Tip number="4" text="Think about whether traders may overreact." />
                <Tip number="5" text="Watch for rumors that may move prices quickly." />
              </CardContent>
            </Card>

            <Card sx={{ ...panelStyle, mt: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <QueryStatsIcon sx={{ color: BRAND.green }} />
                  <Typography variant="h5" sx={{ fontWeight: 950 }}>
                    News Reading Rules
                  </Typography>
                </Box>

                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  These rules help players decide whether news is strong or weak.
                </Typography>

                <RuleBox
                  title="Strong news"
                  text="Earnings, product approvals, contracts, lawsuits, and major economic reports often move prices."
                />

                <RuleBox
                  title="Weak news"
                  text="Opinions, vague rumors, and repeated information may create short-term movement but can fade quickly."
                />

                <RuleBox
                  title="Mixed news"
                  text="Some news has both good and bad parts. These events may create volatility instead of a clear direction."
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Card sx={{ ...panelStyle, mt: 3 }}>
          <CardContent
            sx={{
              p: 3,
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              alignItems: { xs: "flex-start", md: "center" },
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 950 }}>
                Think before you trade.
              </Typography>

              <Typography color="text.secondary">
                Headlines can create opportunity, but they can also trick careless traders.
              </Typography>
            </Box>

            <Button
              variant="contained"
              component={RouterLink}
              to="/game"
              sx={{
                bgcolor: BRAND.red,
                fontWeight: 950,
                borderRadius: 2.2,
                px: 3,
                "&:hover": { bgcolor: "#E63131" },
              }}
            >
              Open Simulator
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

function SummaryCard({
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

function NewsCard({ news }: { news: MarketNews }) {
  const isBullish = news.marketTone === "Bullish";
  const isBearish = news.marketTone === "Bearish";

  const toneColor = isBullish ? BRAND.green : isBearish ? BRAND.red : BRAND.navy;

  return (
    <Box
      sx={{
        p: 2,
        mb: 2,
        borderRadius: 3,
        bgcolor: "#F7F9FB",
        border: "1px solid #E5E9EF",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
          mb: 1,
        }}
      >
        <Box>
          <Typography
            variant="caption"
            sx={{ color: "text.secondary", fontWeight: 900 }}
          >
            {news.source} • Game Day {news.gameDay} • {news.category}
          </Typography>

          <Typography sx={{ fontWeight: 950, fontSize: 18 }}>
            {news.headline}
          </Typography>
        </Box>

        <Chip
          size="small"
          label={news.importance}
          sx={{
            bgcolor:
              news.importance === "High"
                ? BRAND.red
                : news.importance === "Medium"
                ? BRAND.green
                : "#DCE3EA",
            color: news.importance === "Low" ? BRAND.navy : "#fff",
            fontWeight: 950,
          }}
        />
      </Box>

      <Typography color="text.secondary" sx={{ mb: 1.5 }}>
        {news.body}
      </Typography>

      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        <Chip
          size="small"
          label={news.marketTone}
          sx={{
            bgcolor: toneColor,
            color: isBullish ? BRAND.navy : "#fff",
            fontWeight: 950,
          }}
        />

        {news.isRumor && (
          <Chip
            size="small"
            label={news.isAccurate ? "Rumor" : "Unconfirmed"}
            sx={{
              bgcolor: "#DCE3EA",
              color: BRAND.navy,
              fontWeight: 900,
            }}
          />
        )}

        {news.relatedTickers.map((ticker) => (
          <Chip
            key={ticker}
            size="small"
            label={ticker}
            sx={{
              bgcolor: BRAND.navy,
              color: "#fff",
              fontWeight: 800,
            }}
          />
        ))}
      </Box>
    </Box>
  );
}

function Tip({ number, text }: { number: string; text: string }) {
  return (
    <Box
      sx={{
        p: 1.6,
        mb: 1.2,
        borderRadius: 3,
        bgcolor: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.12)",
        display: "flex",
        gap: 1.2,
      }}
    >
      <Box
        sx={{
          width: 26,
          height: 26,
          borderRadius: 1.5,
          bgcolor: BRAND.green,
          color: BRAND.navy,
          display: "grid",
          placeItems: "center",
          fontWeight: 950,
          flexShrink: 0,
        }}
      >
        {number}
      </Box>

      <Typography sx={{ fontWeight: 800 }}>{text}</Typography>
    </Box>
  );
}

function RuleBox({ title, text }: { title: string; text: string }) {
  return (
    <Box
      sx={{
        p: 2,
        mb: 1.4,
        borderRadius: 3,
        bgcolor: "#F7F9FB",
        border: "1px solid #E5E9EF",
      }}
    >
      <Typography sx={{ fontWeight: 950 }}>{title}</Typography>
      <Typography color="text.secondary">{text}</Typography>
    </Box>
  );
}

const panelStyle = {
  borderRadius: 4,
  boxShadow: "0 14px 35px rgba(44,57,71,0.08)",
  border: "1px solid #E5E9EF",
};
