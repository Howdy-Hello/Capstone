import React from "react";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { Link as RouterLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { D, CARD, MONO, money, pct } from "../theme/design";
import { usePageTitle } from "../lib/usePageTitle";

const STOCKS = [
  { sym: "CAI", name: "Closed Ai", price: 112.14, change: 3.21 },
  { sym: "GVE", name: "GreenVolt Energy", price: 79.30, change: -0.84 },
];

// The same sequence taught in Learn.
const TURN = [
  { title: "Review your position", text: "Check cash balance and current holdings before making any new order." },
  { title: "Read the market news", text: "Ask whether a headline is credible, unexpected, and relevant to the business." },
  { title: "Place orders", text: "Choose whether to buy, sell, or wait based on evidence, cash needs, and your plan." },
  { title: "Advance the day", text: "The market updates, prices shift, and fresh events appear." },
];

export default function Home() {
  usePageTitle();
  const { user } = useAuth();

  return (
    <Box sx={{ bgcolor: D.bg, color: D.t1 }}>
      <Container maxWidth="lg" sx={{
        display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "1fr 1fr" },
        alignItems: "center", gap: { xs: 4, md: 6, lg: 9 }, py: { xs: 5, md: 9 },
      }}>
        <Box>
          <Typography variant="h1" sx={{ fontSize: { xs: 38, sm: 48, lg: 60 }, fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.03em", mb: 2 }}>
            Practice investing with <Box component="span" sx={{ color: D.brandText }}>virtual money</Box>
          </Typography>
          <Typography sx={{ fontSize: { xs: 16, md: 18 }, color: D.t2, lineHeight: 1.6, mb: 3, maxWidth: "43ch" }}>
            Start with $2,000 in virtual cash and a market of 21 fictional stocks. Read the news, then decide whether to buy, sell, or wait.
          </Typography>
          <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1.25}>
            <Button component={RouterLink} to={user ? "/game" : "/auth?mode=signup"} variant="contained" endIcon={<ArrowForwardIcon />}
              sx={{ minHeight: 44, px: 2, borderRadius: 1.5, fontWeight: 800, textTransform: "none", boxShadow: "none", "&:hover": { boxShadow: "none" } }}>
              {user ? "Continue trading" : "Create free account"}
            </Button>
            <Button component={RouterLink} to="/practice" variant="outlined"
              sx={{ minHeight: 44, px: 2, borderRadius: 1.5, borderColor: D.borderHi, color: D.t1, fontWeight: 700, textTransform: "none", "&:hover": { bgcolor: D.elevated, borderColor: D.t3 } }}>
              Try guest practice
            </Button>
          </Stack>
        </Box>

        <Box sx={{ border: `1px solid ${D.border}`, borderRadius: 3, p: { xs: 1.25, sm: 2.5 }, bgcolor: D.elevated, backgroundImage: `linear-gradient(145deg, ${D.brandBg}, transparent 70%)` }}>
          <Box component="figure" sx={{ ...CARD, m: 0, overflow: "hidden" }}>
            <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 2 }}>
              <Stack direction="row" justifyContent="space-between" flexWrap="wrap" gap={0.5} sx={{ mb: 1.75 }}>
                <Typography component="figcaption" sx={{ fontSize: 14, fontWeight: 700 }}>Example portfolio</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: D.brandText }}>Day 4 · Market open</Typography>
              </Stack>
              <Typography sx={{ fontSize: 12, color: D.t3, fontWeight: 700 }}>Net worth</Typography>
              <Stack direction="row" alignItems="baseline" flexWrap="wrap" columnGap={1.5}>
                <Typography sx={{ fontSize: { xs: 28, sm: 36 }, fontWeight: 700, fontFamily: MONO, letterSpacing: "-0.03em" }}>{money(2418.72)}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: D.greenText }}>{pct(20.9)} since Day 1</Typography>
              </Stack>
            </Box>
            <Box sx={{ px: { xs: 2, sm: 2.5 }, borderTop: `1px solid ${D.border}` }}>
              {STOCKS.map((stock) => (
                <Stack key={stock.sym} direction="row" alignItems="center" justifyContent="space-between" gap={1.5} sx={{ py: 1.25, borderBottom: `1px solid ${D.border}`, "&:last-child": { borderBottom: 0 } }}>
                  <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 800, fontFamily: MONO }}>{stock.sym}</Typography>
                    <Typography sx={{ fontSize: 12, color: D.t3 }}>{stock.name}</Typography>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 800, fontFamily: MONO }}>{money(stock.price)}</Typography>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: stock.change >= 0 ? D.greenText : D.redText }}>{pct(stock.change)}</Typography>
                  </Box>
                </Stack>
              ))}
            </Box>
            <Box sx={{ bgcolor: D.elevated, borderTop: `1px solid ${D.border}`, px: { xs: 2, sm: 2.5 }, py: 1.5 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: D.t3, mb: 0.5 }}>Day 3 after-hours news · Reliable source · CAI</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Independent review finds no major Closed Ai data-control failures</Typography>
            </Box>
          </Box>
        </Box>
      </Container>

      <Box component="section" aria-labelledby="home-turn" sx={{ bgcolor: D.surface, borderTop: `1px solid ${D.border}` }}>
        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 5 } }}>
          <Stack direction="row" flexWrap="wrap" alignItems="center" justifyContent="space-between" gap={1} sx={{ mb: 2 }}>
            <Typography id="home-turn" component="h2" sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 800, letterSpacing: "-0.02em" }}>How a trading day works</Typography>
            <Button component={RouterLink} to="/learn" endIcon={<ArrowForwardIcon />} sx={{ color: D.brandText, minHeight: 44, fontWeight: 700, textTransform: "none", px: 0 }}>
              Investing guide
            </Button>
          </Stack>
          <Box component="ol" sx={{ m: 0, pl: 2.5, display: "grid", gap: { xs: 2, md: 4 }, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" } }}>
            {TURN.map((step) => (
              <Box component="li" key={step.title} sx={{ pl: 0.5, "&::marker": { color: D.brandText, fontFamily: MONO, fontSize: 14, fontWeight: 700 } }}>
                <Typography component="h3" sx={{ fontWeight: 800, fontSize: 16, mb: 0.5 }}>{step.title}</Typography>
                <Typography sx={{ fontSize: 14, color: D.t2, lineHeight: 1.6 }}>{step.text}</Typography>
              </Box>
            ))}
          </Box>
          <Typography sx={{ mt: 3, pt: 2, borderTop: `1px solid ${D.border}`, fontSize: 14, color: D.t2 }}>
            Trade at your own pace in Infinite mode or compete on the leaderboard in the 30-Day Challenge.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
