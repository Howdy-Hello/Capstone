import React from "react";
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
import { Link as RouterLink } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import QueryStatsIcon from "@mui/icons-material/QueryStats";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import BoltIcon from "@mui/icons-material/Bolt";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TimelineIcon from "@mui/icons-material/Timeline";
import InsightsIcon from "@mui/icons-material/Insights";
import CandlestickChartIcon from "@mui/icons-material/CandlestickChart";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

const BRAND = {
  navy: "#2C3947",
  red: "#FF3737",
  green: "#9AD872",
  ink: "#111827",
  paper: "#F6F8FA",
};

const MotionBox = motion(Box);
const MotionCard = motion(Card);

const marketRows = [
  { symbol: "AAPL", price: "$196.42", change: "+1.84%", up: true },
  { symbol: "NVDA", price: "$873.11", change: "+3.21%", up: true },
  { symbol: "TSLA", price: "$171.05", change: "-2.08%", up: false },
  { symbol: "MSFT", price: "$421.76", change: "+0.64%", up: true },
];

const features = [
  {
    icon: <CandlestickChartIcon />,
    title: "Live-style market cockpit",
    desc: "Track portfolio value, watchlists, sector heat, simulated orders, and risk movement from one control room.",
  },
  {
    icon: <TimelineIcon />,
    title: "Scenario simulation",
    desc: "Stress-test buy, sell, hold, leverage, and allocation decisions before committing capital in-game.",
  },
  {
    icon: <ShieldOutlinedIcon />,
    title: "Risk-first UX",
    desc: "Surface drawdown, exposure, stop-loss discipline, volatility pressure, and downside scenarios clearly.",
  },
  {
    icon: <InsightsIcon />,
    title: "Decision intelligence",
    desc: "Convert trading activity into clean signals: win rate, return attribution, conviction, and performance drift.",
  },
];

const stats = [
  { label: "Simulated AUM", value: "$2.48M", progress: 78 },
  { label: "Risk score", value: "64/100", progress: 64 },
  { label: "Open positions", value: "18", progress: 52 },
];

const Home: React.FC = () => {
  const reducedMotion = useReducedMotion();

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        background: `linear-gradient(135deg, ${BRAND.paper} 0%, #FFFFFF 45%, rgba(154,216,114,0.18) 100%)`,
        color: BRAND.ink,
      }}
    >
      <Container sx={{ py: { xs: 5, md: 9 } }}>
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={6}>
            <MotionBox
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
            >
              <Chip
                icon={<BoltIcon />}
                label="Enterprise Stock Simulation Platform"
                sx={{
                  mb: 2,
                  bgcolor: "rgba(154,216,114,0.22)",
                  color: BRAND.navy,
                  border: `1px solid rgba(44,57,71,0.12)`,
                  fontWeight: 800,
                }}
              />

              <Typography
                variant="h1"
                fontWeight={950}
                sx={{
                  fontSize: { xs: "2.7rem", md: "4.9rem" },
                  lineHeight: 0.94,
                  letterSpacing: -2.4,
                  color: BRAND.navy,
                }}
              >
                Trade the market before the market trades you.
              </Typography>

              <Typography
                variant="h6"
                sx={{ mt: 2.5, maxWidth: 660, color: "rgba(44,57,71,0.74)", lineHeight: 1.65 }}
              >
                A premium stock simulator dashboard for portfolio decisions, market scenarios,
                risk control, and performance analytics.
              </Typography>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 4 }}>
                <Button
                  component={RouterLink}
                  to="/dashboard"
                  size="large"
                  variant="contained"
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    bgcolor: BRAND.red,
                    color: "#fff",
                    px: 3,
                    py: 1.35,
                    borderRadius: 2.5,
                    fontWeight: 900,
                    boxShadow: "0 18px 40px rgba(255,55,55,0.28)",
                    "&:hover": { bgcolor: "#E63131" },
                  }}
                >
                  Launch simulator
                </Button>
                <Button
                  component={RouterLink}
                  to="/auth?mode=signup"
                  size="large"
                  variant="outlined"
                  sx={{
                    borderColor: BRAND.navy,
                    color: BRAND.navy,
                    px: 3,
                    py: 1.35,
                    borderRadius: 2.5,
                    fontWeight: 900,
                    "&:hover": { borderColor: BRAND.navy, bgcolor: "rgba(44,57,71,0.06)" },
                  }}
                >
                  Create account
                </Button>
              </Stack>
            </MotionBox>
          </Grid>

          <Grid item xs={12} md={6}>
            <MotionCard
              initial={{ opacity: 0, y: 20, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.08 }}
              sx={{
                borderRadius: 5,
                overflow: "hidden",
                bgcolor: BRAND.navy,
                color: "#fff",
                boxShadow: "0 30px 80px rgba(44,57,71,0.35)",
                border: "1px solid rgba(255,255,255,0.14)",
              }}
            >
              <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                  <Box>
                    <Typography variant="overline" sx={{ color: "rgba(255,255,255,0.62)", fontWeight: 900 }}>
                      Portfolio terminal
                    </Typography>
                    <Typography variant="h4" fontWeight={950}>$248,920.44</Typography>
                  </Box>
                  <Chip
                    icon={<TrendingUpIcon />}
                    label="+12.8%"
                    sx={{ bgcolor: BRAND.green, color: BRAND.navy, fontWeight: 950 }}
                  />
                </Stack>

                <Box
                  sx={{
                    height: 190,
                    borderRadius: 4,
                    p: 2,
                    background:
                      "linear-gradient(180deg, rgba(154,216,114,0.24), rgba(154,216,114,0.03)), repeating-linear-gradient(90deg, rgba(255,255,255,0.07) 0 1px, transparent 1px 58px)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <MotionBox
                    animate={reducedMotion ? undefined : { x: [0, 16, 0], y: [0, -8, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    sx={{
                      position: "absolute",
                      inset: 18,
                      borderRadius: 3,
                      borderBottom: `4px solid ${BRAND.green}`,
                      clipPath:
                        "polygon(0 72%, 10% 64%, 20% 70%, 31% 48%, 42% 58%, 54% 34%, 66% 42%, 79% 19%, 91% 28%, 100% 12%, 100% 100%, 0 100%)",
                      bgcolor: "rgba(154,216,114,0.18)",
                    }}
                  />
                  <Box sx={{ position: "absolute", right: 18, top: 16, textAlign: "right" }}>
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.65)" }}>Today P/L</Typography>
                    <Typography variant="h5" fontWeight={950} color={BRAND.green}>+$8,420</Typography>
                  </Box>
                </Box>

                <Stack spacing={1.35} sx={{ mt: 3 }}>
                  {marketRows.map((row) => (
                    <Stack
                      key={row.symbol}
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{
                        p: 1.35,
                        borderRadius: 2.5,
                        bgcolor: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <Box sx={{ width: 34, height: 34, borderRadius: 2, bgcolor: "rgba(255,255,255,0.1)", display: "grid", placeItems: "center" }}>
                          <ShowChartIcon fontSize="small" />
                        </Box>
                        <Box>
                          <Typography fontWeight={900}>{row.symbol}</Typography>
                          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.58)" }}>Equity</Typography>
                        </Box>
                      </Stack>
                      <Box sx={{ textAlign: "right" }}>
                        <Typography fontWeight={900}>{row.price}</Typography>
                        <Typography variant="caption" sx={{ color: row.up ? BRAND.green : BRAND.red, fontWeight: 900 }}>{row.change}</Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </MotionCard>
          </Grid>
        </Grid>

        <Grid container spacing={2.5} sx={{ mt: { xs: 4, md: 7 } }}>
          {features.map((item, index) => (
            <Grid item xs={12} sm={6} md={3} key={item.title}>
              <MotionCard
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.04 }}
                sx={{
                  height: "100%",
                  borderRadius: 4,
                  border: "1px solid rgba(44,57,71,0.1)",
                  boxShadow: "0 18px 40px rgba(44,57,71,0.08)",
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ color: BRAND.red, mb: 1.5, "& svg": { fontSize: 34 } }}>{item.icon}</Box>
                  <Typography variant="h6" fontWeight={950} color={BRAND.navy}>{item.title}</Typography>
                  <Typography variant="body2" sx={{ mt: 1, color: "rgba(44,57,71,0.68)", lineHeight: 1.6 }}>{item.desc}</Typography>
                </CardContent>
              </MotionCard>
            </Grid>
          ))}
        </Grid>

        <Card sx={{ mt: 3, borderRadius: 4, border: "1px solid rgba(44,57,71,0.1)", boxShadow: "0 18px 40px rgba(44,57,71,0.08)" }}>
          <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={3} divider={<Divider orientation="vertical" flexItem />}>
              {stats.map((stat) => (
                <Box key={stat.label} sx={{ flex: 1 }}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="overline" fontWeight={900} color="rgba(44,57,71,0.62)">{stat.label}</Typography>
                    <Typography fontWeight={950} color={BRAND.navy}>{stat.value}</Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={stat.progress}
                    sx={{
                      height: 10,
                      borderRadius: 99,
                      bgcolor: "rgba(44,57,71,0.08)",
                      "& .MuiLinearProgress-bar": { bgcolor: stat.label === "Risk score" ? BRAND.red : BRAND.green, borderRadius: 99 },
                    }}
                  />
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default Home;
