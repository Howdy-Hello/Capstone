import React from "react";
import { Box, Button, Chip, Container, Grid, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { motion } from "framer-motion";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import BarChartIcon from "@mui/icons-material/BarChart";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import { D, CARD, MONO, money, pct } from "../theme/design";

const STOCKS = [
  { sym: "NVDA", name: "Nvidia",    price: 892.14, change: 3.21 },
  { sym: "AAPL", name: "Apple",     price: 189.30, change: -0.84 },
  { sym: "MSFT", name: "Microsoft", price: 415.56, change: 1.07 },
  { sym: "TSLA", name: "Tesla",     price: 246.80, change: -2.45 },
];

const FEATURES = [
  { icon: <BarChartIcon sx={{ fontSize: 22 }} />,           title: "Portfolio Simulation",   desc: "Trade 21 stocks across 30 simulated days with a $2,000 starting stake." },
  { icon: <AutoStoriesOutlinedIcon sx={{ fontSize: 22 }} />, title: "Learn the Concepts",    desc: "Built-in guide covers volatility, diversification, and risk management." },
  { icon: <EmojiEventsOutlinedIcon sx={{ fontSize: 22 }} />, title: "Compete on Leaderboard", desc: "Compare final portfolio value with other traders and climb the ranks." },
  { icon: <ShieldOutlinedIcon sx={{ fontSize: 22 }} />,      title: "Risk-Free Practice",    desc: "No real money, no real risk — pure market mechanics in a safe sandbox." },
];

const STEPS = [
  { n: "01", title: "Create an account",      desc: "Sign up free and your trading desk is ready instantly." },
  { n: "02", title: "Get your $2,000 stake",  desc: "Every new game resets to $2,000 in simulated cash." },
  { n: "03", title: "Trade stocks each day",  desc: "Buy and sell in a turn-based market across 30 days." },
  { n: "04", title: "See how you rank",       desc: "Submit your score to the live leaderboard at game end." },
];

const MotionBox = motion(Box);

export default function Home() {
  return (
    <Box sx={{ bgcolor: D.bg, color: D.t1 }}>
      {/* HERO */}
      <Box sx={{ position: "relative", overflow: "hidden", minHeight: { xs: 520, md: 680 }, display: "flex", alignItems: "center" }}>
        <Box sx={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${D.border} 1px, transparent 1px), linear-gradient(90deg, ${D.border} 1px, transparent 1px)`, backgroundSize: "48px 48px", opacity: 0.5 }} />
        <Box sx={{ position: "absolute", top: -100, left: -100, width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)", pointerEvents: "none" }} />
        <Box sx={{ position: "absolute", bottom: -120, right: -80, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(34,197,94,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />

        <Container maxWidth="xl" sx={{ position: "relative", zIndex: 1, py: { xs: 6, md: 8 } }}>
          <Grid container spacing={5} alignItems="center">
            <Grid item xs={12} lg={6}>
              <MotionBox initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <Chip label="SIMULATION PLATFORM" size="small" sx={{ bgcolor: D.brandBg, color: D.brandText, border: `1px solid ${D.brandBd}`, fontWeight: 800, fontSize: 10, letterSpacing: 1, mb: 2.5, fontFamily: MONO }} />
                <Typography variant="h1" sx={{ fontSize: { xs: 36, md: 52, lg: 60 }, fontWeight: 950, lineHeight: 1.08, letterSpacing: -2, color: D.t1, mb: 2 }}>
                  Trade the market.<br />
                  <Box component="span" sx={{ color: D.brandText }}>Risk nothing.</Box>
                </Typography>
                <Typography sx={{ fontSize: { xs: 15, md: 17 }, color: D.t2, lineHeight: 1.8, mb: 3.5, maxWidth: 480 }}>
                  StockPilot puts $2,000 of simulated capital in your hands. Navigate 30 days of market events, build your portfolio, and learn what separates disciplined traders from the rest.
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <Button component={RouterLink} to="/auth?mode=signup" variant="contained"
                    sx={{ bgcolor: D.brand, fontWeight: 800, fontSize: 14, textTransform: "none", borderRadius: 2, px: 3.5, py: 1.4, boxShadow: "none", "&:hover": { bgcolor: D.brandMid, boxShadow: "none" } }}>
                    Start trading free
                  </Button>
                  <Button component={RouterLink} to="/learn" variant="outlined"
                    sx={{ color: D.t2, borderColor: D.border, fontWeight: 700, fontSize: 14, textTransform: "none", borderRadius: 2, px: 3, py: 1.4, "&:hover": { color: D.t1, borderColor: D.borderHi, bgcolor: D.overlay } }}>
                    See how it works
                  </Button>
                </Stack>
              </MotionBox>
            </Grid>

            {/* Terminal card */}
            <Grid item xs={12} lg={6}>
              <MotionBox initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.15 }}>
                <Box sx={{ ...CARD, borderRadius: 3, overflow: "hidden", maxWidth: 520, ml: { lg: "auto" } }}>
                  <Box sx={{ px: 2, py: 1.2, borderBottom: `1px solid ${D.border}`, display: "flex", alignItems: "center", gap: 1 }}>
                    {["#EF4444", "#F59E0B", "#22C55E"].map((c) => (
                      <Box key={c} sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: c }} />
                    ))}
                    <Typography sx={{ fontSize: 11, color: D.t3, ml: 1, fontFamily: MONO }}>portfolio_terminal.exe</Typography>
                  </Box>
                  <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5, borderBottom: `1px solid ${D.border}` }}>
                    <Typography sx={{ fontSize: 11, color: D.t3, fontFamily: MONO, mb: 0.5 }}>PORTFOLIO VALUE</Typography>
                    <Stack direction="row" alignItems="flex-end" gap={1}>
                      <Typography sx={{ fontSize: 32, fontWeight: 950, color: D.t1, fontFamily: MONO, lineHeight: 1 }}>{money(2418.72)}</Typography>
                      <Chip label="+20.9%" size="small" icon={<TrendingUpIcon sx={{ fontSize: 12 }} />}
                        sx={{ bgcolor: D.greenBg, color: D.greenText, border: `1px solid ${D.greenBd}`, fontWeight: 800, fontSize: 11, mb: 0.3 }} />
                    </Stack>
                    <Typography sx={{ fontSize: 11, color: D.t3, mt: 0.5 }}>Day 18 of 30 · 4 positions</Typography>
                  </Box>
                  <Box sx={{ px: 2.5, py: 1.5 }}>
                    {STOCKS.map((s) => {
                      const up = s.change >= 0;
                      return (
                        <Stack key={s.sym} direction="row" alignItems="center" justifyContent="space-between"
                          sx={{ py: 1, borderBottom: `1px solid ${D.border}`, "&:last-child": { border: "none" } }}>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: D.overlay, border: `1px solid ${D.border}`, display: "grid", placeItems: "center" }}>
                              <Typography sx={{ fontSize: 9, fontWeight: 900, color: D.brandText, fontFamily: MONO }}>{s.sym.slice(0, 2)}</Typography>
                            </Box>
                            <Box>
                              <Typography sx={{ fontSize: 13, fontWeight: 800, color: D.t1, fontFamily: MONO }}>{s.sym}</Typography>
                              <Typography sx={{ fontSize: 11, color: D.t3 }}>{s.name}</Typography>
                            </Box>
                          </Stack>
                          <Stack alignItems="flex-end">
                            <Typography sx={{ fontSize: 13, fontWeight: 800, color: D.t1, fontFamily: MONO }}>{money(s.price)}</Typography>
                            <Stack direction="row" spacing={0.4} alignItems="center">
                              {up ? <TrendingUpIcon sx={{ fontSize: 12, color: D.greenText }} /> : <TrendingDownIcon sx={{ fontSize: 12, color: D.redText }} />}
                              <Typography sx={{ fontSize: 11, color: up ? D.greenText : D.redText, fontWeight: 700 }}>{pct(s.change)}</Typography>
                            </Stack>
                          </Stack>
                        </Stack>
                      );
                    })}
                  </Box>
                </Box>
              </MotionBox>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* FEATURES */}
      <Box sx={{ bgcolor: D.surface, borderTop: `1px solid ${D.border}`, borderBottom: `1px solid ${D.border}` }}>
        <Container maxWidth="xl" sx={{ py: { xs: 5, md: 7 } }}>
          <Typography sx={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.5, color: D.t3, mb: 4, textAlign: "center", fontFamily: MONO }}>
            PLATFORM FEATURES
          </Typography>
          <Grid container spacing={2.5}>
            {FEATURES.map((f, i) => (
              <Grid item xs={12} sm={6} lg={3} key={i}>
                <MotionBox initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.4 }}>
                  <Box sx={{ ...CARD, p: 3, height: "100%", borderRadius: 2.5, "&:hover": { borderColor: D.borderHi }, transition: "border-color 200ms" }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: D.brandBg, border: `1px solid ${D.brandBd}`, display: "grid", placeItems: "center", mb: 2, color: D.brandText }}>
                      {f.icon}
                    </Box>
                    <Typography sx={{ fontWeight: 800, fontSize: 14.5, color: D.t1, mb: 1 }}>{f.title}</Typography>
                    <Typography sx={{ fontSize: 13, color: D.t2, lineHeight: 1.7 }}>{f.desc}</Typography>
                  </Box>
                </MotionBox>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* HOW IT WORKS */}
      <Box sx={{ bgcolor: D.bg }}>
        <Container maxWidth="xl" sx={{ py: { xs: 6, md: 8 } }}>
          <Box sx={{ textAlign: "center", mb: 5 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.5, color: D.t3, mb: 1.5, fontFamily: MONO }}>HOW IT WORKS</Typography>
            <Typography sx={{ fontSize: { xs: 26, md: 34 }, fontWeight: 950, color: D.t1, letterSpacing: -1 }}>Up and running in 60 seconds</Typography>
          </Box>
          <Grid container spacing={2} sx={{ maxWidth: 900, mx: "auto" }}>
            {STEPS.map((s, i) => (
              <Grid item xs={12} sm={6} key={i}>
                <MotionBox initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.4 }}>
                  <Stack direction="row" spacing={2} sx={{ p: 2.5, borderRadius: 2.5, bgcolor: D.surface, border: `1px solid ${D.border}` }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 900, color: D.t4, fontFamily: MONO, pt: 0.1, flexShrink: 0 }}>{s.n}</Typography>
                    <Box>
                      <Typography sx={{ fontWeight: 800, fontSize: 14, color: D.t1, mb: 0.5 }}>{s.title}</Typography>
                      <Typography sx={{ fontSize: 13, color: D.t3, lineHeight: 1.7 }}>{s.desc}</Typography>
                    </Box>
                  </Stack>
                </MotionBox>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* CTA */}
      <Box sx={{ bgcolor: D.surface, borderTop: `1px solid ${D.border}` }}>
        <Container maxWidth="md" sx={{ py: { xs: 6, md: 8 }, textAlign: "center" }}>
          <Typography sx={{ fontSize: { xs: 26, md: 38 }, fontWeight: 950, color: D.t1, letterSpacing: -1.5, mb: 1.5 }}>
            Ready to start trading?
          </Typography>
          <Typography sx={{ fontSize: 15, color: D.t2, mb: 3.5 }}>
            Free forever. No credit card. Just better trading habits.
          </Typography>
          <Button component={RouterLink} to="/auth?mode=signup" variant="contained"
            sx={{ bgcolor: D.brand, fontWeight: 800, fontSize: 15, textTransform: "none", borderRadius: 2, px: 4, py: 1.6, boxShadow: "none", "&:hover": { bgcolor: D.brandMid, boxShadow: "none" } }}>
            Create free account
          </Button>
        </Container>
      </Box>
    </Box>
  );
}
