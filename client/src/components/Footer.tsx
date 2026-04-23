import React from "react";
import { Box, Container, Grid, Link, Stack, Typography } from "@mui/material";
import CandlestickChartIcon from "@mui/icons-material/CandlestickChart";

const BRAND = {
  navy: "#2C3947",
  red: "#FF3737",
  green: "#9AD872",
};

const Footer: React.FC = () => {
  return (
    <Box component="footer" sx={{ bgcolor: BRAND.navy, color: "#fff", mt: "auto", borderTop: `4px solid ${BRAND.red}` }}>
      <Container sx={{ py: { xs: 4, md: 5 } }}>
        <Grid container spacing={3} alignItems="flex-start">
          <Grid item xs={12} md={6}>
            <Stack direction="row" spacing={1.2} alignItems="center">
              <Box sx={{ width: 38, height: 38, borderRadius: 2.3, bgcolor: BRAND.red, display: "grid", placeItems: "center" }}>
                <CandlestickChartIcon />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={950}>StockPilot</Typography>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.56)" }}>Enterprise Stock Simulator</Typography>
              </Box>
            </Stack>
            <Typography variant="body2" sx={{ opacity: 0.78, mt: 2, maxWidth: 520, lineHeight: 1.7 }}>
              Portfolio simulation, strategy testing, risk visibility, and trading-performance analytics for better decision discipline.
            </Typography>
          </Grid>

          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2" sx={{ color: BRAND.green, mb: 1, fontWeight: 950 }}>Platform</Typography>
            <Link href="/" color="inherit" underline="hover" display="block" sx={{ opacity: 0.78 }}>Home</Link>
            <Link href="/dashboard" color="inherit" underline="hover" display="block" sx={{ opacity: 0.78 }}>Simulator</Link>
            <Link href="/auth?mode=signup" color="inherit" underline="hover" display="block" sx={{ opacity: 0.78 }}>Create Account</Link>
          </Grid>

          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2" sx={{ color: BRAND.green, mb: 1, fontWeight: 950 }}>Account</Typography>
            <Link href="/auth?mode=login" color="inherit" underline="hover" display="block" sx={{ opacity: 0.78 }}>Log in</Link>
            <Link href="/auth?mode=signup" color="inherit" underline="hover" display="block" sx={{ opacity: 0.78 }}>Sign up</Link>
          </Grid>
        </Grid>

        <Typography variant="body2" sx={{ mt: 4, opacity: 0.58 }}>
          © {new Date().getFullYear()} StockPilot. Simulation only. Not financial advice.
        </Typography>
      </Container>
    </Box>
  );
};

export default Footer;
