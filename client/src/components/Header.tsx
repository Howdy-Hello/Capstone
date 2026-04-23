import React from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  Chip,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import CandlestickChartIcon from "@mui/icons-material/CandlestickChart";
import { Link as RouterLink, useLocation } from "react-router-dom";

const BRAND = {
  navy: "#2C3947",
  red: "#FF3737",
  green: "#9AD872",
};

const NavButton = ({ to, label, active }: { to: string; label: string; active?: boolean }) => (
  <Button
    component={RouterLink}
    to={to}
    sx={{
      color: "#fff",
      opacity: active ? 1 : 0.72,
      fontWeight: active ? 950 : 800,
      borderRadius: 2,
      "&:hover": { opacity: 1, bgcolor: "rgba(255,255,255,0.08)" },
    }}
  >
    {label}
  </Button>
);

const Header: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const { pathname, hash } = useLocation();
  const isActive = (target: string) => pathname + hash === target || pathname === target;

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: "rgba(44,57,71,0.94)",
          backdropFilter: "blur(14px)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <Toolbar sx={{ display: "flex", justifyContent: "space-between", gap: 2, minHeight: 72 }}>
          <Box component={RouterLink} to="/" sx={{ display: "flex", alignItems: "center", gap: 1.25, textDecoration: "none", color: "#fff" }}>
            <Box sx={{ width: 38, height: 38, borderRadius: 2.4, bgcolor: BRAND.red, display: "grid", placeItems: "center", boxShadow: "0 10px 26px rgba(255,55,55,0.32)" }}>
              <CandlestickChartIcon />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 950, letterSpacing: -0.2, lineHeight: 1 }}>
                StockPilot
              </Typography>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.55)", fontWeight: 700 }}>
                Simulation Desk
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 0.5 }}>
            <NavButton to="/" label="Home" active={isActive("/")} />
            <NavButton to="/dashboard" label="Simulator" active={isActive("/dashboard")} />
            <NavButton to="/auth?mode=login" label="Login" active={pathname === "/auth"} />
            <Divider orientation="vertical" flexItem sx={{ mx: 1.5, borderColor: "rgba(255,255,255,0.14)" }} />
            <Chip label="Market Mode" sx={{ bgcolor: BRAND.green, color: BRAND.navy, fontWeight: 950, mr: 0.5 }} />
            <Button
              variant="contained"
              component={RouterLink}
              to="/auth?mode=signup"
              sx={{ bgcolor: BRAND.red, fontWeight: 950, borderRadius: 2.2, "&:hover": { bgcolor: "#E63131" } }}
            >
              Get Started
            </Button>
          </Box>

          <IconButton onClick={() => setOpen(true)} color="inherit" sx={{ display: { xs: "inline-flex", md: "none" } }} aria-label="Open menu">
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: 300, p: 2.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 1.5 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: 2.2, bgcolor: BRAND.red, color: "#fff", display: "grid", placeItems: "center" }}>
              <CandlestickChartIcon />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 950, color: BRAND.navy }}>StockPilot</Typography>
              <Typography variant="caption" color="text.secondary">Simulation Desk</Typography>
            </Box>
          </Box>
          <Divider sx={{ mb: 1 }} />
          <List>
            <ListItemButton component={RouterLink} to="/" onClick={() => setOpen(false)}><ListItemText primary="Home" /></ListItemButton>
            <ListItemButton component={RouterLink} to="/dashboard" onClick={() => setOpen(false)}><ListItemText primary="Simulator" /></ListItemButton>
            <ListItemButton component={RouterLink} to="/auth?mode=login" onClick={() => setOpen(false)}><ListItemText primary="Login" /></ListItemButton>
          </List>
          <Divider sx={{ my: 1 }} />
          <Button fullWidth variant="contained" component={RouterLink} to="/auth?mode=signup" onClick={() => setOpen(false)} sx={{ bgcolor: BRAND.red, fontWeight: 950, "&:hover": { bgcolor: "#E63131" } }}>
            Get Started
          </Button>
        </Box>
      </Drawer>
    </>
  );
};

export default Header;
