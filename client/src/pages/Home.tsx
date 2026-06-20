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
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TimelineIcon from "@mui/icons-material/Timeline";
import InsightsIcon from "@mui/icons-material/Insights";
import CandlestickChartIcon from "@mui/icons-material/CandlestickChart";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import CircleIcon from "@mui/icons-material/Circle";

const BRAND = { navy: "#0F1923", navyMid: "#1A2A3A", red: "#E84040", green: "#5CC87A", muted: "#7A8FA6", paper: "#F4F6F9", border: "#DDE3EB" };

const MotionBox = motion(Box);
const MotionCard = motion(Card);

const tickers = [
  { symbol: "AAPL", price: "$196.42", change: "+1.84%", up: true },
  { symbol: "NVDA", price: "$873.11", change: "+3.21%", up: true },
  { symbol: "TSLA", price: "$171.05", change: "-2.08%", up: false },
  { symbol: "MSFT", price: "$421.76", change: "+0.64%", up: true },
  { symbol: "AMZN", price: "$188.30", change: "+1.12%", up: true },
  { symbol: "GOOGL", price: "$163.90", change: "-0.44%", up: false },
];

const features = [
  { icon: <CandlestickChartIcon />, title: "Market cockpit", desc: "Portfolio value, sector heat, simulated orders, and P&L from a single control room." },
  { icon: <TimelineIcon />, title: "Scenario engine", desc: "Stress-test buy, sell, hold, and allocation decisions before committing virtual capital." },
  { icon: <ShieldOutlinedIcon />, title: "Risk-first UX", desc: "Drawdown, exposure, stop-loss discipline, and downside scenarios surfaced clearly." },
  { icon: <InsightsIcon />, title: "Decision analytics", desc: "Win rate, return attribution, conviction scores, and performance drift in one view." },
];

const howItWorks = [
  { icon: <SportsEsportsIcon />, step: "01", title: "Start the simulator", desc: "Launch with $2,000 of virtual capital. No real money, no real risk." },
  { icon: <ShowChartIcon />, step: "02", title: "Trade the market", desc: "Buy and sell virtual stocks across sectors. Each day new events shift prices." },
  { icon: <AutoStoriesIcon />, step: "03", title: "Learn as you play", desc: "Read the built-in guide to understand valuation, news analysis, and risk." },
  { icon: <EmojiEventsIcon />, step: "04", title: "Track your edge", desc: "Leaderboard, achievements, and save-points measure your strategy over time." },
];

const portfolioRows = [
  { symbol: "AAPL", name: "Apple Inc.", price: "$196.42", change: "+1.84%", up: true },
  { symbol: "NVDA", name: "NVIDIA Corp.", price: "$873.11", change: "+3.21%", up: true },
  { symbol: "TSLA", name: "Tesla Inc.", price: "$171.05", change: "-2.08%", up: false },
  { symbol: "MSFT", name: "Microsoft", price: "$421.76", change: "+0.64%", up: true },
];

const stats = [
  { label: "Simulated AUM", value: "$2.48M", progress: 78, color: BRAND.green },
  { label: "Risk score", value: "64/100", progress: 64, color: BRAND.red },
  { label: "Open positions", value: "18", progress: 52, color: BRAND.green },
];

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

const Home: React.FC = () => {
  const rm = useReducedMotion();
  const t = rm ? { duration: 0 } : { duration: 0.6, ease: [0.22, 1, 0.36, 1] };

  return (
    <Box sx={{ bgcolor: BRAND.paper, overflow: "hidden" }}>
      {/* ── Hero ─────────────────────────────────────────── */}
      <Box sx={{ bgcolor: BRAND.navy, color: "#fff", position: "relative", overflow: "hidden" }}>
        {/* Subtle grid overlay */}
        <Box sx={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "56px 56px", pointerEvents: "none" }} />

        {/* Glow orbs */}
        <MotionBox aria-hidden animate={rm ? undefined : { x: [0, 20, 0], y: [0, -14, 0] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          sx={{ position: "absolute", top: -140, right: -100, width: 420, height: 420, borderRadius: "50%", bgcolor: "rgba(92,200,122,0.14)", filter: "blur(60px)", pointerEvents: "none" }} />
        <MotionBox aria-hidden animate={rm ? undefined : { x: [0, -14, 0], y: [0, 18, 0] }} transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
          sx={{ position: "absolute", bottom: 60, left: -160, width: 360, height: 360, borderRadius: "50%", bgcolor: "rgba(232,64,64,0.1)", filter: "blur(60px)", pointerEvents: "none" }} />

        <Container sx={{ py: { xs: 6, md: 10 }, position: "relative", zIndex: 1 }}>
          <Grid container spacing={{ xs: 4, md: 6 }} alignItems="center">
            {/* Left copy */}
            <Grid item xs={12} md={6}>
              <MotionBox initial={rm ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={t}>
                <Chip
                  label="Enterprise Stock Simulation"
                  sx={{ mb: 3, bgcolor: "rgba(92,200,122,0.12)", color: BRAND.green, fontWeight: 900, fontSize: 12, border: "1px solid rgba(92,200,122,0.22)", letterSpacing: 0.4, fontFamily: "monospace" }}
                />

                <Typography variant="h1" fontWeight={950} sx={{ fontSize: { xs: "2.4rem", sm: "3.2rem", md: "4.2rem" }, lineHeight: 1, letterSpacing: -2, color: "#fff", mb: 2.5 }}>
                  Trade the market before the{" "}
                  <Box component="span" sx={{ color: BRAND.green }}>market trades you.</Box>
                </Typography>

                <Typography sx={{ color: "rgba(255,255,255,0.62)", fontSize: { xs: 15, md: 17 }, lineHeight: 1.75, maxWidth: 560, mb: 4 }}>
                  A premium stock simulator for portfolio decisions, scenario analysis, risk control, and performance analytics — all without real capital at risk.
                </Typography>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <Button component={RouterLink} to="/game" size="large" variant="contained" endIcon={<ArrowForwardIcon />}
                    sx={{ bgcolor: BRAND.red, px: 3.5, py: 1.4, borderRadius: 2.5, fontWeight: 900, fontSize: 15, textTransform: "none", boxShadow: "0 16px 36px rgba(232,64,64,0.3)", "&:hover": { bgcolor: "#C93232" } }}>
                    Launch simulator
                  </Button>
                  <Button component={RouterLink} to="/auth?mode=signup" size="large" variant="outlined"
                    sx={{ borderColor: "rgba(255,255,255,0.22)", color: "rgba(255,255,255,0.82)", px: 3.5, py: 1.4, borderRadius: 2.5, fontWeight: 900, fontSize: 15, textTransform: "none", "&:hover": { borderColor: "rgba(255,255,255,0.5)", bgcolor: "rgba(255,255,255,0.06)" } }}>
                    Create free account
                  </Button>
                </Stack>

                {/* Trust line */}
                <Stack direction="row" spacing={2.5} sx={{ mt: 4 }} alignItems="center">
                  {["No real money", "No signup required to try", "Free forever"].map((tag) => (
                    <Stack key={tag} direction="row" spacing={0.7} alignItems="center">
                      <CircleIcon sx={{ fontSize: 6, color: BRAND.green }} />
                      <Typography sx={{ fontSize: 12.5, color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>{tag}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </MotionBox>
            </Grid>

            {/* Right — terminal card */}
            <Grid item xs={12} md={6}>
              <MotionCard
                initial={rm ? false : { opacity: 0, y: 32, scale: 0.97 }}
                animate={rm ? undefined : { opacity: 1, y: [0, -6, 0], scale: 1 }}
                transition={rm ? { duration: 0 } : { opacity: { duration: 0.7, delay: 0.15 }, scale: { duration: 0.7, delay: 0.15 }, y: { duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.9 } }}
                sx={{ borderRadius: 4, bgcolor: BRAND.navyMid, border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 32px 80px rgba(0,0,0,0.5)" }}
              >
                <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                  {/* Terminal header bar */}
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#FF5F57" }} />
                      <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#FFBD2E" }} />
                      <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#28C840" }} />
                      <Typography sx={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "monospace", ml: 1 }}>PORTFOLIO TERMINAL</Typography>
                    </Stack>
                    <Chip label="+12.8%" icon={<TrendingUpIcon sx={{ fontSize: 14 }} />} size="small" sx={{ bgcolor: "rgba(92,200,122,0.15)", color: BRAND.green, fontWeight: 950, fontSize: 12, border: "1px solid rgba(92,200,122,0.25)" }} />
                  </Stack>

                  {/* Value */}
                  <Box sx={{ mb: 2.5 }}>
                    <Typography sx={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "monospace", letterSpacing: 1 }}>NET PORTFOLIO VALUE</Typography>
                    <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 950, color: "#fff", lineHeight: 1.1, fontFamily: "monospace" }}>$248,920.44</Typography>
                    <Typography sx={{ fontSize: 13, color: BRAND.green, fontWeight: 800, mt: 0.4 }}>▲ +$28,920 total return</Typography>
                  </Box>

                  {/* Sparkline */}
                  <Box sx={{ height: 80, borderRadius: 2, bgcolor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", position: "relative", overflow: "hidden", mb: 2.5 }}>
                    <MotionBox animate={rm ? undefined : { x: [0, 10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                      sx={{ position: "absolute", inset: 12, borderBottom: `2px solid ${BRAND.green}`, clipPath: "polygon(0 82%, 8% 70%, 18% 75%, 30% 52%, 42% 62%, 55% 36%, 68% 46%, 80% 22%, 92% 30%, 100% 14%, 100% 100%, 0 100%)", bgcolor: "rgba(92,200,122,0.12)" }} />
                    <Box sx={{ position: "absolute", right: 12, top: 10, textAlign: "right" }}>
                      <Typography sx={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>TODAY P/L</Typography>
                      <Typography sx={{ fontSize: 16, fontWeight: 950, color: BRAND.green, fontFamily: "monospace" }}>+$8,420</Typography>
                    </Box>
                  </Box>

                  {/* Stock rows */}
                  <Stack spacing={0.9}>
                    {portfolioRows.map((row) => (
                      <Stack key={row.symbol} direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 1.3, borderRadius: 2, bgcolor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", "&:hover": { bgcolor: "rgba(255,255,255,0.07)" }, transition: "background 150ms" }}>
                        <Stack direction="row" spacing={1.2} alignItems="center">
                          <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: "rgba(255,255,255,0.08)", display: "grid", placeItems: "center" }}>
                            <ShowChartIcon sx={{ fontSize: 16, color: "rgba(255,255,255,0.6)" }} />
                          </Box>
                          <Box>
                            <Typography sx={{ fontWeight: 900, fontSize: 13, color: "#fff", fontFamily: "monospace" }}>{row.symbol}</Typography>
                            <Typography sx={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{row.name}</Typography>
                          </Box>
                        </Stack>
                        <Box sx={{ textAlign: "right" }}>
                          <Typography sx={{ fontWeight: 900, fontSize: 13, color: "#fff", fontFamily: "monospace" }}>{row.price}</Typography>
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                            {row.up ? <TrendingUpIcon sx={{ fontSize: 12, color: BRAND.green }} /> : <TrendingDownIcon sx={{ fontSize: 12, color: BRAND.red }} />}
                            <Typography sx={{ fontSize: 11, color: row.up ? BRAND.green : BRAND.red, fontWeight: 900, fontFamily: "monospace" }}>{row.change}</Typography>
                          </Stack>
                        </Box>
                      </Stack>
                    ))}
                  </Stack>
                </CardContent>
              </MotionCard>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ── Stats bar ──────────────────────────────────── */}
      <Box sx={{ bgcolor: "#fff", borderBottom: `1px solid ${BRAND.border}` }}>
        <Container sx={{ py: 0 }}>
          <Stack direction={{ xs: "column", sm: "row" }} divider={<Divider orientation="vertical" flexItem />}>
            {stats.map((stat) => (
              <Box key={stat.label} sx={{ flex: 1, py: 3, px: { xs: 0, sm: 3 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 900, letterSpacing: 1, color: BRAND.muted, fontFamily: "monospace" }}>{stat.label.toUpperCase()}</Typography>
                  <Typography sx={{ fontWeight: 950, color: BRAND.navy, fontFamily: "monospace" }}>{stat.value}</Typography>
                </Stack>
                <LinearProgress variant="determinate" value={stat.progress} sx={{ height: 6, borderRadius: 99, bgcolor: BRAND.border, "& .MuiLinearProgress-bar": { bgcolor: stat.color, borderRadius: 99 } }} />
              </Box>
            ))}
          </Stack>
        </Container>
      </Box>

      {/* ── Features ──────────────────────────────────── */}
      <Container sx={{ py: { xs: 6, md: 9 } }}>
        <Box sx={{ textAlign: "center", mb: { xs: 4, md: 6 } }}>
          <Typography sx={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.5, color: BRAND.muted, fontFamily: "monospace", mb: 1 }}>PLATFORM CAPABILITIES</Typography>
          <Typography variant="h3" sx={{ fontWeight: 950, color: BRAND.navy, letterSpacing: -1, fontSize: { xs: "1.9rem", md: "2.6rem" } }}>
            Everything a serious simulator needs.
          </Typography>
        </Box>

        <MotionBox variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
          <Grid container spacing={2.5}>
            {features.map((item, i) => (
              <Grid item xs={12} sm={6} md={3} key={item.title}>
                <MotionCard variants={fadeUp} transition={{ duration: 0.5, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                  sx={{ height: "100%", borderRadius: 3.5, border: `1px solid ${BRAND.border}`, boxShadow: "0 4px 20px rgba(15,25,35,0.06)", "&:hover": { boxShadow: "0 12px 40px rgba(15,25,35,0.1)", borderColor: "#C6CDD8", transform: "translateY(-4px)" }, transition: "all 200ms ease" }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ width: 44, height: 44, borderRadius: 2.5, bgcolor: "rgba(232,64,64,0.1)", color: BRAND.red, display: "grid", placeItems: "center", mb: 2, "& svg": { fontSize: 24 } }}>
                      {item.icon}
                    </Box>
                    <Typography variant="h6" fontWeight={950} sx={{ color: BRAND.navy, mb: 0.8, fontSize: 15 }}>{item.title}</Typography>
                    <Typography variant="body2" sx={{ color: BRAND.muted, lineHeight: 1.7 }}>{item.desc}</Typography>
                  </CardContent>
                </MotionCard>
              </Grid>
            ))}
          </Grid>
        </MotionBox>
      </Container>

      {/* ── How it works ───────────────────────────────── */}
      <Box sx={{ bgcolor: BRAND.navy, color: "#fff", py: { xs: 6, md: 9 } }}>
        <Container>
          <Box sx={{ textAlign: "center", mb: { xs: 4, md: 6 } }}>
            <Typography sx={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.5, color: BRAND.green, fontFamily: "monospace", mb: 1 }}>HOW IT WORKS</Typography>
            <Typography variant="h3" sx={{ fontWeight: 950, letterSpacing: -1, fontSize: { xs: "1.9rem", md: "2.6rem" } }}>
              From zero to portfolio in four steps.
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {howItWorks.map((item, i) => (
              <Grid item xs={12} sm={6} md={3} key={item.step}>
                <Box sx={{ position: "relative" }}>
                  {i < howItWorks.length - 1 && (
                    <Box sx={{ display: { xs: "none", md: "block" }, position: "absolute", top: 28, left: "calc(100% - 8px)", width: "calc(100% - 16px)", height: 1, bgcolor: "rgba(255,255,255,0.1)", zIndex: 0 }} />
                  )}
                  <Box sx={{ position: "relative", zIndex: 1 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                      <Box sx={{ width: 48, height: 48, borderRadius: 2.5, bgcolor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", display: "grid", placeItems: "center", color: BRAND.green, "& svg": { fontSize: 22 } }}>
                        {item.icon}
                      </Box>
                      <Typography sx={{ fontFamily: "monospace", fontWeight: 900, fontSize: 28, color: "rgba(255,255,255,0.12)", lineHeight: 1 }}>{item.step}</Typography>
                    </Stack>
                    <Typography sx={{ fontWeight: 950, fontSize: 15, mb: 0.8 }}>{item.title}</Typography>
                    <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.55)", lineHeight: 1.7 }}>{item.desc}</Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ textAlign: "center", mt: { xs: 4, md: 6 } }}>
            <Button component={RouterLink} to="/game" size="large" variant="contained" endIcon={<ArrowForwardIcon />}
              sx={{ bgcolor: BRAND.red, px: 4, py: 1.5, borderRadius: 2.5, fontWeight: 900, fontSize: 15, textTransform: "none", boxShadow: "0 16px 36px rgba(232,64,64,0.3)", "&:hover": { bgcolor: "#C93232" } }}>
              Start trading now
            </Button>
          </Box>
        </Container>
      </Box>

      {/* ── CTA strip ──────────────────────────────────── */}
      <Box sx={{ bgcolor: "#fff", borderTop: `1px solid ${BRAND.border}` }}>
        <Container sx={{ py: { xs: 5, md: 7 } }}>
          <Stack direction={{ xs: "column", md: "row" }} alignItems={{ md: "center" }} justifyContent="space-between" spacing={3}>
            <Box sx={{ maxWidth: 560 }}>
              <Typography variant="h4" sx={{ fontWeight: 950, color: BRAND.navy, letterSpacing: -0.8, mb: 1, fontSize: { xs: "1.5rem", md: "2rem" } }}>
                Build better trading habits — risk-free.
              </Typography>
              <Typography sx={{ color: BRAND.muted, lineHeight: 1.75 }}>
                Create a free account to save progress, unlock leaderboard rankings, and track your performance across sessions.
              </Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ flexShrink: 0 }}>
              <Button component={RouterLink} to="/auth?mode=signup" size="large" variant="contained" sx={{ bgcolor: BRAND.red, px: 3.5, py: 1.4, borderRadius: 2.5, fontWeight: 900, fontSize: 15, textTransform: "none", "&:hover": { bgcolor: "#C93232" } }}>
                Create free account
              </Button>
              <Button component={RouterLink} to="/learn" size="large" variant="outlined" sx={{ borderColor: BRAND.border, color: BRAND.navy, px: 3.5, py: 1.4, borderRadius: 2.5, fontWeight: 900, fontSize: 15, textTransform: "none", "&:hover": { borderColor: BRAND.navy, bgcolor: BRAND.paper } }}>
                Read the guide
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
};

export default Home;
