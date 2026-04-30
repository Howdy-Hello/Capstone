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
import SchoolIcon from "@mui/icons-material/School";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import NewspaperIcon from "@mui/icons-material/Newspaper";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { Link as RouterLink } from "react-router-dom";

const BRAND = {
  navy: "#2C3947",
  red: "#FF3737",
  green: "#9AD872",
  background: "#F5F7F9",
};

const tutorialSteps = [
  {
    title: "Start with Cash",
    description:
      "You begin with virtual money. Use it wisely to buy stocks and build your portfolio.",
    icon: <AccountBalanceWalletIcon />,
  },
  {
    title: "Buy Stocks",
    description:
      "Choose companies you believe will increase in value. Buying low and selling high is the main goal.",
    icon: <TrendingUpIcon />,
  },
  {
    title: "Read the News",
    description:
      "News events can cause stock prices to rise or fall. Good traders pay attention before making decisions.",
    icon: <NewspaperIcon />,
  },
  {
    title: "Manage Risk",
    description:
      "Do not put all your money into one stock. Spread your investments to reduce risk.",
    icon: <WarningAmberIcon />,
  },
];

const strategyTips = [
  "Buy when a strong company drops from temporary bad news.",
  "Sell when a stock has made a strong profit and may fall soon.",
  "Avoid spending all your cash at once.",
  "Watch which sectors are affected by each news event.",
  "Diversify by owning stocks from different industries.",
];

export default function Tutorial() {
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
              icon={<SchoolIcon />}
              label="Beginner Trading Tutorial"
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
              Learn how to play before you trade.
            </Typography>

            <Typography
              sx={{
                color: "rgba(255,255,255,0.72)",
                maxWidth: 700,
                fontSize: 18,
              }}
            >
              This tutorial teaches you how to buy, sell, read market news, and
              make better decisions in the StockPilot simulator.
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
                  QUICK OBJECTIVE
                </Typography>

                <Typography variant="h4" sx={{ fontWeight: 950, my: 1 }}>
                  Grow your net worth.
                </Typography>

                <Typography sx={{ color: "rgba(255,255,255,0.7)", mb: 3 }}>
                  Your net worth is your cash plus the value of all stocks you
                  own. The higher it gets, the better your score.
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
                  Start Trading
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ px: { xs: 2, md: 8 }, py: 4 }}>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {tutorialSteps.map((step) => (
            <Grid item xs={12} sm={6} md={3} key={step.title}>
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
                    {step.icon}
                  </Box>

                  <Typography variant="h6" sx={{ fontWeight: 950, mb: 1 }}>
                    {step.title}
                  </Typography>

                  <Typography color="text.secondary">
                    {step.description}
                  </Typography>
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
                  How a Turn Works
                </Typography>

                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  Each turn represents the next day in the virtual market.
                </Typography>

                <Divider sx={{ mb: 2 }} />

                <StepNumber
                  number="1"
                  title="Check your cash and portfolio"
                  text="Before buying anything, look at how much money you have and which stocks you already own."
                />

                <StepNumber
                  number="2"
                  title="Read the market news"
                  text="News events give clues about which companies may rise or fall."
                />

                <StepNumber
                  number="3"
                  title="Buy or sell stocks"
                  text="Buy stocks you think will rise. Sell stocks if you want to lock in profit or avoid losses."
                />

                <StepNumber
                  number="4"
                  title="Press Next Day"
                  text="The market updates, stock prices change, and new events may appear."
                />
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
                  Trading Tips
                </Typography>

                <Typography sx={{ color: "rgba(255,255,255,0.65)", mb: 2 }}>
                  Use these rules to make smarter decisions.
                </Typography>

                {strategyTips.map((tip, index) => (
                  <Box
                    key={tip}
                    sx={{
                      p: 1.6,
                      mb: 1.2,
                      borderRadius: 3,
                      bgcolor: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.12)",
                    }}
                  >
                    <Typography sx={{ fontWeight: 800 }}>
                      {index + 1}. {tip}
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
                Ready to test your strategy?
              </Typography>

              <Typography color="text.secondary">
                Start the simulator and try to grow your portfolio without
                taking too much risk.
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
              Go to Game
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

function StepNumber({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        gap: 2,
        mb: 2,
        p: 2,
        borderRadius: 3,
        bgcolor: "#F7F9FB",
        border: "1px solid #E5E9EF",
      }}
    >
      <Box
        sx={{
          minWidth: 38,
          height: 38,
          borderRadius: 2,
          bgcolor: BRAND.green,
          color: BRAND.navy,
          display: "grid",
          placeItems: "center",
          fontWeight: 950,
        }}
      >
        {number}
      </Box>

      <Box>
        <Typography sx={{ fontWeight: 950 }}>{title}</Typography>
        <Typography color="text.secondary">{text}</Typography>
      </Box>
    </Box>
  );
}

const panelStyle = {
  borderRadius: 4,
  boxShadow: "0 14px 35px rgba(44,57,71,0.08)",
  border: "1px solid #E5E9EF",
};