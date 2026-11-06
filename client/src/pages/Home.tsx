import React from "react";
import { Box, Button, Chip, Container, Grid, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { D, CARD, MONO, money, pct } from "../theme/design";
import { usePageTitle } from "../lib/usePageTitle";

const STOCKS = [
  { sym: "CAI", name: "Closed Ai",        price: 112.14, change: 3.21 },
  { sym: "GVE", name: "GreenVolt Energy", price: 79.30,  change: -0.84 },
  { sym: "MCH", name: "MediCore Health",  price: 101.56, change: 1.07 },
  { sym: "URB", name: "UrbanBank",        price: 52.80,  change: -2.45 },
];

const FEATURES = [
  { title: "Portfolio Simulation",   desc: "Trade 21 stocks for as many simulated days as you want with a $2,000 starting stake." },
  { title: "Learn the Concepts",    desc: "Explore company research, long-term investing, diversification, order types, and fees." },
  { title: "Compete on Leaderboard", desc: "Try a 30-day challenge if you enjoy competition. Your rank is separate from learning progress." },
  { title: "Risk-Free Practice",    desc: "Experiment with virtual money, fictional companies, and synthetic prices. Your real savings stay untouched." },
];

// The same steps Learn teaches, in the same words.
const TURN = [
  { title: "Review your position", text: "Check cash balance and current holdings before making any new order." },
  { title: "Read the market news", text: "Ask whether a headline is credible, unexpected, and relevant to the business." },
  { title: "Place orders", text: "Choose whether to buy, sell, or wait based on evidence, cash needs, and your plan." },
  { title: "Advance the day", text: "The market updates, prices shift, and fresh events appear." },
];


// The huge top margin counts anything above the viewport as "in view", so a
// visitor who jumps past a section (End key, fast fling) still gets it revealed
// instead of a blank gap; sections below the fold still animate on arrival.

export default function Home() {
  usePageTitle();
  const { user } = useAuth();
  return (
    <Box sx={{ bgcolor: D.bg, color: D.t1 }}>
      {/* HERO */}
      <Box sx={{ position: "relative", overflow: "hidden", minHeight: { md: 600 }, display: "flex", alignItems: "center" }}>

        <Container maxWidth="xl" sx={{ position: "relative", zIndex: 1, py: { xs: 6, md: 8 } }}>
          <Grid container spacing={5} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box>
                <Typography variant="h1" sx={{ fontSize: { xs: 40, md: 52, lg: 60 }, fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.02em", color: D.t1, mb: 2 }}>
                  Trade the market.<br />
                  <Box component="span" sx={{ color: D.brandText }}>Risk nothing.</Box>
                </Typography>
                <Typography sx={{ fontSize: { xs: 16, md: 18 }, color: D.t2, lineHeight: 1.6, mb: 3.5, maxWidth: 480 }}>
                  StockPilot puts $2,000 of simulated capital in your hands. Keep advancing the market, build your portfolio, and learn what separates disciplined traders from the rest.
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <Button component={RouterLink} to={user ? "/game" : "/auth?mode=signup"} variant="contained"
                    sx={{ bgcolor: D.brand, fontWeight: 800, fontSize: 14, textTransform: "none", borderRadius: 2, px: 3.5, py: 1.4, boxShadow: "none", "&:hover": { bgcolor: D.brandMid, boxShadow: "none" } }}>
                    {user ? "Continue trading" : "Start trading free"}
                  </Button>
                  <Button component={RouterLink} to="/learn" variant="outlined"
                    sx={{ color: D.t2, borderColor: D.border, fontWeight: 700, fontSize: 14, textTransform: "none", borderRadius: 2, px: 3, py: 1.4, "&:hover": { color: D.t1, borderColor: D.borderHi, bgcolor: D.overlay } }}>
                    See how it works
                  </Button>
                </Stack>
                <Button component={RouterLink} to="/practice" size="small" sx={{ color: D.brandText, textTransform: "none", mt: 1.5, px: 0 }}>Try guest practice without an account →</Button>
              </Box>
            </Grid>

            {/* Illustrative account */}
            <Grid item xs={12} md={6}>
              <Box>
                <Box sx={{ ...CARD, borderRadius: 3, overflow: "hidden", maxWidth: { md: 520 }, ml: { md: "auto" } }}>
                  <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${D.border}` }}>
                    <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                      {["DAY 4", "MARKET OPEN"].map((label) => (
                        <Chip key={label} label={label} size="small" sx={{ bgcolor: D.elevated, color: D.t2, border: `1px solid ${D.border}`, fontWeight: 800, fontSize: 12 }} />
                      ))}
                    </Stack>
                    <Typography sx={{ fontSize: 12, fontWeight: 800, color: D.t3 }}>NET WORTH</Typography>
                    <Typography sx={{ fontSize: { xs: 36, md: 44 }, fontWeight: 700, color: D.t1, fontFamily: MONO, lineHeight: 1.1, letterSpacing: "-0.02em" }}>{money(2418.72)}</Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 800, color: D.greenText }}>{pct(20.9)} since Day 1</Typography>
                    <Typography sx={{ fontSize: 12, color: D.t3, mt: 0.5 }}>Illustrative account · not a forecast</Typography>
                  </Box>
                  <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${D.border}` }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 800, color: D.t3, mb: 0.75 }}>DAY 3 AFTER-HOURS NEWS · RELIABLE SOURCE</Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 800, color: D.t1 }}>Independent review finds no major Closed Ai data-control failures</Typography>
                    <Typography sx={{ fontSize: 12, color: D.t3, fontFamily: MONO, mt: 0.5 }}>Affects: CAI</Typography>
                  </Box>
                  <Box sx={{ px: 2.5 }}>
                    {STOCKS.slice(0, 2).map((s) => (
                      <Stack key={s.sym} direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 1.25, borderBottom: `1px solid ${D.border}`, "&:last-child": { borderBottom: "none" } }}>
                        <Box>
                          <Typography sx={{ fontSize: 14, fontWeight: 800, color: D.t1, fontFamily: MONO }}>{s.sym}</Typography>
                          <Typography sx={{ fontSize: 12, color: D.t3 }}>{s.name}</Typography>
                        </Box>
                        <Box sx={{ textAlign: "right" }}>
                          <Typography sx={{ fontSize: 14, fontWeight: 800, color: D.t1, fontFamily: MONO }}>{money(s.price)}</Typography>
                          <Typography sx={{ fontSize: 12, fontWeight: 700, color: s.change >= 0 ? D.greenText : D.redText }}>{pct(s.change)}</Typography>
                        </Box>
                      </Stack>
                    ))}
                  </Box>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* A TURN */}
      <Box sx={{ bgcolor: D.surface, borderTop: `1px solid ${D.border}` }}>
        <Container maxWidth="xl" sx={{ py: { xs: 6, md: 8 } }}>
          <Typography component="h2" sx={{ fontSize: { xs: 26, md: 32 }, fontWeight: 900, color: D.t1, letterSpacing: "-0.02em", mb: 1 }}>How a Turn Works</Typography>
          <Typography sx={{ fontSize: 16, color: D.t2, mb: 4 }}>Each turn is one game day. Follow this order every time.</Typography>
          <Grid container spacing={3}>
            {TURN.map((step, i) => (
              <Grid item xs={12} sm={6} md={3} key={step.title}>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: D.t3, fontFamily: MONO, mb: 1 }}>{i + 1}</Typography>
                <Typography component="h3" sx={{ fontWeight: 800, fontSize: 16, color: D.t1, mb: 0.5 }}>{step.title}</Typography>
                <Typography sx={{ fontSize: 14, color: D.t2, lineHeight: 1.6 }}>{step.text}</Typography>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* FEATURES */}
      <Box sx={{ bgcolor: D.bg, borderTop: `1px solid ${D.border}` }}>
        <Container maxWidth="xl" sx={{ py: { xs: 6, md: 8 } }}>
          <Typography component="h2" sx={{ fontSize: { xs: 26, md: 32 }, fontWeight: 900, color: D.t1, letterSpacing: "-0.02em", mb: 4 }}>Platform features</Typography>
          <Grid container spacing={3}>
            {FEATURES.map((f) => (
              <Grid item xs={12} sm={6} md={3} key={f.title}>
                <Typography component="h3" sx={{ fontWeight: 800, fontSize: 16, color: D.t1, mb: 0.5 }}>{f.title}</Typography>
                <Typography sx={{ fontSize: 14, color: D.t2, lineHeight: 1.6 }}>{f.desc}</Typography>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* CTA */}
      <Box sx={{ bgcolor: D.surface, borderTop: `1px solid ${D.border}` }}>
        <Container maxWidth="md" sx={{ py: { xs: 6, md: 8 }, textAlign: "center" }}>
          <Typography component="h2" sx={{ fontSize: { xs: 26, md: 38 }, fontWeight: 900, color: D.t1, letterSpacing: "-0.02em", mb: 1.5 }}>
            {user ? "Ready for your next move?" : "Ready to start trading?"}
          </Typography>
          <Typography sx={{ fontSize: 16, color: D.t2, mb: 3.5 }}>
            Free practice with virtual money. Build your understanding one decision at a time.
          </Typography>
          <Button component={RouterLink} to={user ? "/game" : "/auth?mode=signup"} variant="contained"
            sx={{ bgcolor: D.brand, fontWeight: 800, fontSize: 16, textTransform: "none", borderRadius: 2, px: 4, py: 1.6, boxShadow: "none", "&:hover": { bgcolor: D.brandMid, boxShadow: "none" } }}>
            {user ? "Continue trading" : "Create free account"}
          </Button>
        </Container>
      </Box>
    </Box>
  );
}
