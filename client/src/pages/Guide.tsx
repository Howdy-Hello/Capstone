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
  LinearProgress,
} from "@mui/material";
import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import NewspaperIcon from "@mui/icons-material/Newspaper";
import ShieldIcon from "@mui/icons-material/Shield";
import PieChartIcon from "@mui/icons-material/PieChart";
import PsychologyIcon from "@mui/icons-material/Psychology";
import { Link as RouterLink } from "react-router-dom";

const BRAND = {
  navy: "#2C3947",
  red: "#FF3737",
  green: "#9AD872",
  background: "#F5F7F9",
};

const fundamentals = [
  {
    title: "Stock Price",
    text: "A stock price shows how much one share of a company costs. In the game, prices rise or fall based on news, risk, and market movement.",
    icon: <TrendingUpIcon />,
  },
  {
    title: "Profit and Loss",
    text: "Profit happens when you sell a stock for more than you paid. Loss happens when you sell it for less than you paid.",
    icon: <TrendingDownIcon />,
  },
  {
    title: "News Events",
    text: "News can affect investor confidence. Positive news may raise prices, while negative news may lower prices.",
    icon: <NewspaperIcon />,
  },
  {
    title: "Risk Control",
    text: "Risk means the chance of losing money. A smart trader thinks about possible losses before chasing possible profits.",
    icon: <ShieldIcon />,
  },
];

const tradingRules = [
  "Do not buy only because a stock is rising quickly.",
  "Look for a reason behind the price movement.",
  "Keep some cash available instead of spending everything.",
  "Avoid putting your whole portfolio into one company.",
  "Sell when your reason for buying is no longer true.",
];

const sectors = [
  { name: "Technology", risk: 82, note: "Fast growth, but often more volatile." },
  { name: "Energy", risk: 68, note: "Affected by demand, prices, and climate policies." },
  { name: "Healthcare", risk: 52, note: "Often more stable, but news can still matter." },
  { name: "Finance", risk: 60, note: "Affected by interest rates and economic confidence." },
];

export default function Guide() {
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
              icon={<AutoStoriesIcon />}
              label="In-Depth Trading Guide"
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
              Understand the market before you trade.
            </Typography>

            <Typography
              sx={{
                color: "rgba(255,255,255,0.72)",
                maxWidth: 720,
                fontSize: 18,
              }}
            >
              This guide explains the main ideas behind trading, including
              price movement, profit, loss, risk, diversification, and decision-making.
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
                  MAIN LESSON
                </Typography>

                <Typography variant="h4" sx={{ fontWeight: 950, my: 1 }}>
                  Good trading is not guessing.
                </Typography>

                <Typography sx={{ color: "rgba(255,255,255,0.7)", mb: 3 }}>
                  A good trader watches trends, understands risk, reads news,
                  and makes decisions based on evidence instead of emotion.
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
                  Practice in Game
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ px: { xs: 2, md: 8 }, py: 4 }}>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {fundamentals.map((item) => (
            <Grid item xs={12} sm={6} md={3} key={item.title}>
              <Card sx={panelStyle}>
                <CardContent sx={{ p: 3 }}>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 2,
                      bgcolor: "rgba(154,216,114,0.25)",
                      color: BRAND.green,
                      display: "grid",
                      placeItems: "center",
                      mb: 2,
                    }}
                  >
                    {item.icon}
                  </Box>

                  <Typography variant="h6" sx={{ fontWeight: 950, mb: 1 }}>
                    {item.title}
                  </Typography>

                  <Typography color="text.secondary">{item.text}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card sx={panelStyle}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 950 }}>
                  Core Trading Concepts
                </Typography>

                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  These ideas help you understand why stocks move and how to make better decisions.
                </Typography>

                <Divider sx={{ mb: 2 }} />

                <ConceptBlock
                  title="1. Buy Low, Sell High"
                  text="The basic goal is to buy a stock at a lower price and sell it at a higher price. However, this is harder than it sounds because prices can change quickly and unpredictably."
                />

                <ConceptBlock
                  title="2. Trend"
                  text="A trend is the general direction a stock is moving. If it keeps rising, it is in an upward trend. If it keeps falling, it is in a downward trend."
                />

                <ConceptBlock
                  title="3. Volatility"
                  text="Volatility means how much a stock price moves. A highly volatile stock may bring bigger profits, but it can also cause bigger losses."
                />

                <ConceptBlock
                  title="4. Diversification"
                  text="Diversification means spreading your money across different companies or sectors. This helps reduce risk because one bad stock will not destroy your whole portfolio."
                />

                <ConceptBlock
                  title="5. Risk vs. Reward"
                  text="Risk and reward are connected. A stock with a chance for large profit often also has a larger chance of loss. A smart trader compares both before buying."
                />
              </CardContent>
            </Card>

            <Card sx={{ ...panelStyle, mt: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 950 }}>
                  How to Think Before Buying
                </Typography>

                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  Ask yourself these questions before making a trade.
                </Typography>

                <Divider sx={{ mb: 2 }} />

                <DecisionQuestion question="Why do I think this stock will rise?" />
                <DecisionQuestion question="Is the company affected by recent good or bad news?" />
                <DecisionQuestion question="Am I risking too much money on one stock?" />
                <DecisionQuestion question="What will I do if the stock falls instead?" />
                <DecisionQuestion question="When should I sell and take profit?" />
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
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <PsychologyIcon sx={{ color: BRAND.green }} />
                  <Typography variant="h5" sx={{ fontWeight: 950 }}>
                    Trader Mindset
                  </Typography>
                </Box>

                <Typography sx={{ color: "rgba(255,255,255,0.65)", mb: 2 }}>
                  Many traders lose because they panic, get greedy, or follow the crowd.
                </Typography>

                {tradingRules.map((rule, index) => (
                  <Box
                    key={rule}
                    sx={{
                      p: 1.6,
                      mb: 1.2,
                      borderRadius: 3,
                      bgcolor: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.12)",
                    }}
                  >
                    <Typography sx={{ fontWeight: 800 }}>
                      {index + 1}. {rule}
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>

            <Card sx={{ ...panelStyle, mt: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <PieChartIcon sx={{ color: BRAND.green }} />
                  <Typography variant="h5" sx={{ fontWeight: 950 }}>
                    Sector Risk
                  </Typography>
                </Box>

                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  Different industries react to different events.
                </Typography>

                {sectors.map((sector) => (
                  <Box key={sector.name} sx={{ mb: 2 }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 0.5,
                      }}
                    >
                      <Typography sx={{ fontWeight: 950 }}>
                        {sector.name}
                      </Typography>
                      <Typography sx={{ fontWeight: 900 }}>
                        {sector.risk}/100
                      </Typography>
                    </Box>

                    <LinearProgress
                      variant="determinate"
                      value={sector.risk}
                      sx={{
                        height: 10,
                        borderRadius: 99,
                        bgcolor: "#E5E9EF",
                        "& .MuiLinearProgress-bar": {
                          bgcolor: sector.risk > 70 ? BRAND.red : BRAND.green,
                          borderRadius: 99,
                        },
                      }}
                    />

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {sector.note}
                    </Typography>
                  </Box>
                ))}
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
                Ready to apply these fundamentals?
              </Typography>

              <Typography color="text.secondary">
                Use this guide as your strategy base, then test your decisions in the simulator.
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

function ConceptBlock({ title, text }: { title: string; text: string }) {
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
      <Typography sx={{ fontWeight: 950, mb: 0.5 }}>{title}</Typography>
      <Typography color="text.secondary">{text}</Typography>
    </Box>
  );
}

function DecisionQuestion({ question }: { question: string }) {
  return (
    <Box
      sx={{
        p: 2,
        mb: 1.3,
        borderRadius: 3,
        bgcolor: "#FFF2F2",
        border: `1px solid rgba(255,55,55,0.25)`,
      }}
    >
      <Typography sx={{ fontWeight: 900 }}>{question}</Typography>
    </Box>
  );
}

const panelStyle = {
  borderRadius: 4,
  boxShadow: "0 14px 35px rgba(44,57,71,0.08)",
  border: "1px solid #E5E9EF",
};