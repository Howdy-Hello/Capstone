import React from "react";
import { Box, Container, Divider, Grid, Link, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import CandlestickChartIcon from "@mui/icons-material/CandlestickChart";
import { D } from "../theme/design";

const cols = {
  Product:  [{ l: "Dashboard",   h: "/dashboard"   }, { l: "Game",         h: "/game"        }, { l: "Inbox",     h: "/inbox"       }],
  Play:     [{ l: "Leaderboard", h: "/leaderboard" }, { l: "Achievements", h: "/achievements"}, { l: "Save & Load", h: "/save-load" }],
  Learn:    [{ l: "Tutorial",    h: "/learn"        }, { l: "Guide",       h: "/learn?tab=guide" }],
  Account:  [{ l: "Log in",     h: "/auth?mode=login" }, { l: "Sign up",  h: "/auth?mode=signup" }, { l: "Settings", h: "/settings" }, { l: "Profile", h: "/profile" }],
};

const Footer: React.FC = () => (
  <Box sx={{ bgcolor: D.surface, borderTop: `1px solid ${D.border}` }}>
    <Container maxWidth="xl" sx={{ py: { xs: 5, md: 6 } }}>
      <Grid container spacing={4}>
        <Grid item xs={12} md={5}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <Box sx={{ width: 30, height: 30, borderRadius: 1.5, bgcolor: D.brand, display: "grid", placeItems: "center" }}>
              <CandlestickChartIcon sx={{ fontSize: 17, color: "#fff" }} />
            </Box>
            <Typography sx={{ fontWeight: 900, fontSize: 15, color: D.t1 }}>StockPilot</Typography>
          </Stack>
          <Typography sx={{ color: D.t3, fontSize: 13, lineHeight: 1.8, maxWidth: 360 }}>
            A stock market simulator for learning portfolio decisions, scenario analysis, and risk management — without real capital at stake.
          </Typography>
          <Typography sx={{ color: D.t4, fontSize: 11.5, mt: 2, fontFamily: "'Courier New', monospace", letterSpacing: 0.3 }}>
            SIMULATION ONLY · NOT FINANCIAL ADVICE
          </Typography>
        </Grid>

        {Object.entries(cols).map(([section, items]) => (
          <Grid item xs={4} md key={section}>
            <Typography sx={{ fontSize: 10.5, fontWeight: 900, letterSpacing: 1, color: D.t3, mb: 1.8, fontFamily: "'Courier New', monospace" }}>
              {section.toUpperCase()}
            </Typography>
            <Stack spacing={0.9}>
              {items.map((item) => (
                <Link key={item.l} component={RouterLink} to={item.h} underline="none"
                  sx={{ color: D.t3, fontSize: 13, fontWeight: 600, transition: "color 120ms", "&:hover": { color: D.t1 } }}>
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
        <Typography sx={{ fontSize: 11, color: D.t4, fontFamily: "'Courier New', monospace" }}>
          v1.0.0
        </Typography>
      </Stack>
    </Container>
  </Box>
);

export default Footer;
