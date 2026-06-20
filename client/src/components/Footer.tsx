import React from "react";
import { Box, Container, Divider, Grid, Link, Stack, Typography } from "@mui/material";
import CandlestickChartIcon from "@mui/icons-material/CandlestickChart";

const BRAND = { navy: "#0F1923", navyMid: "#1A2A3A", red: "#E84040", green: "#5CC87A" };

const links = {
  Platform: [
    { label: "Home", href: "/" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Game", href: "/game" },
    { label: "News", href: "/news" },
  ],
  Learn: [
    { label: "Tutorial", href: "/learn" },
    { label: "Market Guide", href: "/learn" },
    { label: "Leaderboard", href: "/leaderboard" },
    { label: "Achievements", href: "/achievements" },
  ],
  Account: [
    { label: "Log in", href: "/auth?mode=login" },
    { label: "Create account", href: "/auth?mode=signup" },
    { label: "Save / Load", href: "/save-load" },
  ],
};

const Footer: React.FC = () => (
  <Box sx={{ bgcolor: BRAND.navy, color: "#fff", borderTop: `1px solid rgba(255,255,255,0.07)` }}>
    {/* Top bar */}
    <Box sx={{ bgcolor: BRAND.navyMid, borderBottom: "1px solid rgba(255,255,255,0.06)", py: 1, px: { xs: 3, md: 5 } }}>
      <Stack direction="row" alignItems="center" spacing={2}>
        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: BRAND.green, boxShadow: `0 0 6px ${BRAND.green}` }} />
        <Typography sx={{ fontSize: 11, fontFamily: "monospace", color: "rgba(255,255,255,0.4)", letterSpacing: 1 }}>
          SIMULATION ENVIRONMENT · NOT REAL FINANCIAL ADVICE · VIRTUAL CAPITAL ONLY
        </Typography>
      </Stack>
    </Box>

    <Container sx={{ py: { xs: 5, md: 6 } }}>
      <Grid container spacing={4}>
        {/* Brand */}
        <Grid item xs={12} md={4}>
          <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 2 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: BRAND.red, display: "grid", placeItems: "center", boxShadow: "0 8px 20px rgba(232,64,64,0.3)" }}>
              <CandlestickChartIcon sx={{ fontSize: 20, color: "#fff" }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 950, fontSize: 16, lineHeight: 1 }}>StockPilot</Typography>
              <Typography sx={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "monospace", letterSpacing: 0.8 }}>SIMULATION DESK</Typography>
            </Box>
          </Stack>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.55)", lineHeight: 1.75, maxWidth: 380 }}>
            Portfolio simulation, scenario testing, risk visibility, and performance analytics — built to develop better trading decision discipline.
          </Typography>
        </Grid>

        {/* Links */}
        {Object.entries(links).map(([section, items]) => (
          <Grid item xs={6} sm={4} md={8 / 3} key={section}>
            <Typography sx={{ fontSize: 10, fontWeight: 900, letterSpacing: 1.2, color: BRAND.green, mb: 1.8, fontFamily: "monospace" }}>
              {section.toUpperCase()}
            </Typography>
            <Stack spacing={1}>
              {items.map((item) => (
                <Link key={item.label} href={item.href} underline="none" sx={{ color: "rgba(255,255,255,0.55)", fontSize: 13.5, fontWeight: 700, transition: "color 150ms", "&:hover": { color: "#fff" } }}>
                  {item.label}
                </Link>
              ))}
            </Stack>
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ my: 4, borderColor: "rgba(255,255,255,0.08)" }} />

      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1}>
        <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
          © {new Date().getFullYear()} StockPilot. Simulation only — not financial advice.
        </Typography>
        <Typography sx={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>
          v1.0.0 · VIRTUAL CAPITAL
        </Typography>
      </Stack>
    </Container>
  </Box>
);

export default Footer;
