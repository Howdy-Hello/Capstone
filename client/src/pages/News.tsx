import React from "react";
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
import { Link as RouterLink } from "react-router-dom";

const BRAND = {
  navy: "#2C3947",
  red: "#FF3737",
  green: "#9AD872",
  background: "#F5F7F9",
};

type MarketNews = {
  id: string;
  source: string;
  time: string;
  headline: string;
  body: string;
  importance: "Low" | "Medium" | "High";
  marketTone: "Bullish" | "Bearish" | "Unclear";
  relatedTickers: string[];
  expectedImpact: number;
  isAccurate: boolean;
};

const marketNews: MarketNews[] = [
  {
    id: "1",
    source: "MarketWatch Daily",
    time: "8:45 AM",
    headline: "NovaTech reports stronger-than-expected quarterly earnings",
    body:
      "NovaTech beat analyst expectations after reporting higher software revenue and stronger demand for its AI products. Investors are now watching whether the company can keep growing next quarter.",
    importance: "High",
    marketTone: "Bullish",
    relatedTickers: ["NVT"],
    expectedImpact: 0.12,
    isAccurate: true,
  },
  {
    id: "2",
    source: "Global Energy Brief",
    time: "9:10 AM",
    headline: "GreenVolt faces pressure after energy demand forecast is lowered",
    body:
      "Analysts lowered their short-term energy demand outlook after weaker industrial activity. Renewable energy stocks may face selling pressure if investors expect slower revenue growth.",
    importance: "Medium",
    marketTone: "Bearish",
    relatedTickers: ["GVE"],
    expectedImpact: -0.08,
    isAccurate: true,
  },
  {
    id: "3",
    source: "Health Finance Wire",
    time: "10:20 AM",
    headline: "MediCore product approval could increase future revenue",
    body:
      "MediCore received approval for a new medical product. Some investors believe this may improve long-term sales, though production costs may reduce early profits.",
    importance: "High",
    marketTone: "Bullish",
    relatedTickers: ["MCH"],
    expectedImpact: 0.1,
    isAccurate: true,
  },
  {
    id: "4",
    source: "Street Rumors",
    time: "11:05 AM",
    headline: "NovaTech may lose its biggest government contract",
    body:
      "A market report claims NovaTech could lose a major contract, but the company has not released an official statement. Traders are reacting quickly as uncertainty spreads.",
    importance: "High",
    marketTone: "Bearish",
    relatedTickers: ["NVT"],
    expectedImpact: -0.09,
    isAccurate: false,
  },
  {
    id: "5",
    source: "Banking Outlook",
    time: "12:30 PM",
    headline: "UrbanBank shares slip as interest rate concerns continue",
    body:
      "Finance stocks are under pressure as investors worry that higher borrowing costs could reduce loan demand. UrbanBank may remain volatile until the next economic report.",
    importance: "Medium",
    marketTone: "Bearish",
    relatedTickers: ["URB"],
    expectedImpact: -0.06,
    isAccurate: true,
  },
  {
    id: "6",
    source: "Investor Pulse",
    time: "1:15 PM",
    headline: "GreenVolt reportedly close to major battery partnership",
    body:
      "Sources claim GreenVolt may announce a major partnership connected to battery storage technology. Traders are watching for confirmation before the market closes.",
    importance: "Medium",
    marketTone: "Bullish",
    relatedTickers: ["GVE"],
    expectedImpact: 0.07,
    isAccurate: false,
  },
  {
    id: "7",
    source: "Tech Insider",
    time: "2:40 PM",
    headline: "MediCore faces lawsuit over product safety concerns",
    body:
      "MediCore is being sued by a group of patients claiming that a medical product caused adverse effects. The case is in early stages, but it may create volatility for the stock.",
    importance: "High",
    marketTone: "Bearish",
    relatedTickers: ["MCH"],
    expectedImpact: -0.11,
    isAccurate: true,
  },
  {
    id: "8",
    source: "+1(206) 342-8631",
    time: "1:32 AM",
    headline: "Yo,",
    body: "I have some news from the inside on NovaTech. They just got massive orders from a buyer, and I think it's going to increase their revenue a lot.",
    importance: "Low",
    marketTone: "Unclear",
    relatedTickers: ["NVT"],
    expectedImpact: 0.00,
    isAccurate: false,
  },
  {
    id: "9",
    source: "Phone Viewer",
    time: "3:50 PM",
    headline: "PineApple Inc. reports strong quarterly earnings",
    body: "PineApple Inc. announced better-than-expected quarterly earnings, driving investor confidence and increasing the stock price.",
    importance: "High",
    marketTone: "Bullish",
    relatedTickers: ["PAP"],
    expectedImpact: 0.18,
    isAccurate: true,
  },
];

export default function News() {
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
              label="Market News Terminal"
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
              Read the news. Predict the move.
            </Typography>

            <Typography
              sx={{
                color: "rgba(255,255,255,0.72)",
                maxWidth: 720,
                fontSize: 18,
              }}
            >
              News do not directly tell you what to buy. You need to judge whether
              each headline is important, reliable, and likely to move prices.
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
                  TRADER OBJECTIVE
                </Typography>

                <Typography variant="h4" sx={{ fontWeight: 950, my: 1 }}>
                  Separate signal from noise.
                </Typography>

                <Typography sx={{ color: "rgba(255,255,255,0.7)", mb: 3 }}>
                  Some news may be useful, some may be exaggerated, and some may
                  mislead traders. Your job is to decide what the market will believe.
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
              title="News Items"
              value={marketNews.length.toString()}
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
                  Latest Market Headlines
                </Typography>

                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  Use the headline, source, tone, and details to predict whether
                  stocks may rise or fall.
                </Typography>

                <Divider sx={{ mb: 2 }} />

                {marketNews.map((news) => (
                  <NewsCard key={news.id} news={news} />
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
            {news.source} • {news.time}
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