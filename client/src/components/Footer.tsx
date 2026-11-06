import React from "react";
import { useAuth } from "../context/AuthContext";
import { Box, Container, Divider, Grid, Link, Stack, Typography } from "@mui/material";
import { Link as RouterLink, useLocation } from "react-router-dom";
import CandlestickChartIcon from "@mui/icons-material/CandlestickChart";
import { D, MONO } from "../theme/design";

// `guest` links only make sense signed out: testers found Guest Practice
// confusing next to their real run.
// `member` links only work signed in, so visitors don't see them.
const cols: Record<string, Array<{ l: string; h: string; guest?: boolean; member?: boolean }>> = {
  Product:  [{ l: "Dashboard",   h: "/dashboard", member: true }, { l: "Game",         h: "/game", member: true }, { l: "News",      h: "/news", member: true }, { l: "Inbox",     h: "/inbox", member: true }],
  Play:     [{ l: "Leaderboard", h: "/leaderboard", member: true }, { l: "Achievements", h: "/achievements", member: true }, { l: "Save & Load", h: "/save-load", member: true }],
  Learn:    [{ l: "Tutorial", h: "/learn" }, { l: "Guide", h: "/learn?tab=guide" }, { l: "Guest Practice", h: "/practice", guest: true }, { l: "Investing Path", h: "/learn?tab=investing" }],
  Account:  [{ l: "Log in", h: "/auth?mode=login", guest: true }, { l: "Sign up", h: "/auth?mode=signup", guest: true }, { l: "Settings", h: "/settings", member: true }, { l: "Profile", h: "/profile", member: true }, { l: "Privacy", h: "/privacy" }],
};

// WCAG 2.5.8: every link gets a target at least 24px tall.
const TARGET = { display: "inline-flex", alignItems: "center", minHeight: 24 } as const;

const Footer: React.FC = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  if (!user && pathname !== "/") return <Box component="footer" sx={{ p: 2, textAlign: "center", color: D.t3, borderTop: `1px solid ${D.border}` }}><Typography variant="caption">StockPilot · Simulation only · <Link component={RouterLink} to="/learn" sx={TARGET}>Help</Link> · <Link component={RouterLink} to="/privacy" sx={TARGET}>Privacy</Link></Typography></Box>;
  return (
  <Box sx={{ bgcolor: D.surface, borderTop: `1px solid ${D.border}` }}>
    <Container maxWidth="xl" sx={{ py: { xs: 5, md: 6 } }}>
      <Grid container spacing={4}>
        <Grid item xs={12} md={5}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <Box sx={{ width: 30, height: 30, borderRadius: 1.5, bgcolor: D.brand, display: "grid", placeItems: "center" }}>
              <CandlestickChartIcon sx={{ fontSize: 18, color: "#fff" }} />
            </Box>
            <Typography sx={{ fontWeight: 900, fontSize: 16, color: D.t1 }}>StockPilot</Typography>
          </Stack>
          <Typography sx={{ color: D.t3, fontSize: 14, lineHeight: 1.8, maxWidth: 360 }}>
            A stock market simulator for learning portfolio decisions, scenario analysis, and risk management — without real capital at stake.
          </Typography>
          <Typography sx={{ color: D.t4, fontSize: 12, mt: 2, fontFamily: MONO, letterSpacing: 0.3 }}>
            SIMULATION ONLY · NOT FINANCIAL ADVICE
          </Typography>
        </Grid>

        {Object.entries(cols).filter(([, items]) => user || items.some((item) => !item.member)).map(([section, items]) => (
          <Grid item xs={4} md key={section}>
            <Typography sx={{ fontSize: 12, fontWeight: 900, letterSpacing: 1, color: D.t3, mb: 1.8, fontFamily: MONO }}>
              {section.toUpperCase()}
            </Typography>
            <Stack spacing={0.4}>
              {items.filter((item) => (user ? !item.guest : !item.member)).map((item) => (
                <Link key={item.l} component={RouterLink} to={item.h} underline="none"
                  sx={{ ...TARGET, color: D.t3, fontSize: 14, fontWeight: 600, transition: "color 120ms", "&:hover": { color: D.t1 } }}>
                  {item.l}
                </Link>
              ))}
            </Stack>
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ borderColor: D.border, my: 4 }} />

      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
        <Typography sx={{ fontSize: 12, color: D.t4 }}>
          © {new Date().getFullYear()} StockPilot. Simulation only.
        </Typography>

      </Stack>
    </Container>
  </Box>
);
};

export default Footer;
