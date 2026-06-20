import React from "react";
import {
  AppBar,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import CandlestickChartIcon from "@mui/icons-material/CandlestickChart";
import DashboardIcon from "@mui/icons-material/Dashboard";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import NewspaperIcon from "@mui/icons-material/Newspaper";
import CircleIcon from "@mui/icons-material/Circle";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const BRAND = { navy: "#0F1923", navyMid: "#1A2A3A", red: "#E84040", green: "#5CC87A", muted: "rgba(255,255,255,0.52)" };

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: <DashboardIcon sx={{ fontSize: 16 }} /> },
  { to: "/game", label: "Game", icon: <SportsEsportsIcon sx={{ fontSize: 16 }} /> },
  { to: "/learn", label: "Learn", icon: <AutoStoriesIcon sx={{ fontSize: 16 }} /> },
  { to: "/news", label: "News", icon: <NewspaperIcon sx={{ fontSize: 16 }} /> },
];

const Header: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const isActive = (to: string) => pathname === to || (to !== "/" && pathname.startsWith(to));

  const handleAuthAction = async () => {
    if (user) {
      await signOut();
      navigate("/", { replace: true });
    } else {
      navigate("/auth?mode=login");
    }
  };

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: BRAND.navy,
          borderBottom: `1px solid rgba(255,255,255,0.07)`,
        }}
      >
        {/* Market ticker strip */}
        <Box
          sx={{
            bgcolor: BRAND.navyMid,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            px: { xs: 2, md: 4 },
            py: 0.55,
            display: { xs: "none", md: "flex" },
            alignItems: "center",
            gap: 3,
            overflow: "hidden",
          }}
        >
          {[
            { sym: "AAPL", val: "$196.42", up: true },
            { sym: "NVDA", val: "$873.11", up: true },
            { sym: "TSLA", val: "$171.05", up: false },
            { sym: "MSFT", val: "$421.76", up: true },
            { sym: "AMZN", val: "$188.30", up: true },
            { sym: "GOOGL", val: "$163.90", up: false },
          ].map((t) => (
            <Stack key={t.sym} direction="row" spacing={0.8} alignItems="center">
              <Typography sx={{ fontWeight: 900, fontSize: 11, color: "rgba(255,255,255,0.75)", fontFamily: "monospace" }}>{t.sym}</Typography>
              <Typography sx={{ fontWeight: 700, fontSize: 11, color: t.up ? BRAND.green : BRAND.red, fontFamily: "monospace" }}>{t.val}</Typography>
              <CircleIcon sx={{ fontSize: 5, color: t.up ? BRAND.green : BRAND.red }} />
            </Stack>
          ))}
          <Box sx={{ flex: 1 }} />
          <Typography sx={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>SIMULATION · NOT REAL PRICES</Typography>
        </Box>

        {/* Main nav */}
        <Toolbar sx={{ minHeight: { xs: 60, md: 66 }, px: { xs: 2, md: 4 }, gap: 1 }}>
          {/* Logo */}
          <Box component={RouterLink} to="/" sx={{ display: "flex", alignItems: "center", gap: 1.2, textDecoration: "none", mr: { md: 3 } }}>
            <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: BRAND.red, display: "grid", placeItems: "center", boxShadow: "0 8px 20px rgba(232,64,64,0.35)" }}>
              <CandlestickChartIcon sx={{ fontSize: 20, color: "#fff" }} />
            </Box>
            <Box sx={{ display: { xs: "none", sm: "block" } }}>
              <Typography sx={{ fontWeight: 950, fontSize: 16, color: "#fff", lineHeight: 1, letterSpacing: -0.3 }}>StockPilot</Typography>
              <Typography sx={{ fontSize: 10, color: "rgba(255,255,255,0.42)", fontWeight: 700, letterSpacing: 0.8, fontFamily: "monospace" }}>SIMULATION DESK</Typography>
            </Box>
          </Box>

          {/* Separator */}
          <Divider orientation="vertical" flexItem sx={{ borderColor: "rgba(255,255,255,0.1)", mx: 1, display: { xs: "none", lg: "block" } }} />

          {/* Desktop nav links */}
          <Box sx={{ display: { xs: "none", lg: "flex" }, alignItems: "center", gap: 0.5, flex: 1 }}>
            {navItems.map((item) => {
              const active = isActive(item.to);
              return (
                <Button
                  key={item.to}
                  component={RouterLink}
                  to={item.to}
                  startIcon={item.icon}
                  sx={{
                    color: active ? "#fff" : BRAND.muted,
                    fontWeight: active ? 900 : 700,
                    fontSize: 13.5,
                    px: 1.6,
                    py: 0.9,
                    textTransform: "none",
                    bgcolor: active ? "rgba(255,255,255,0.09)" : "transparent",
                    borderBottom: active ? `2px solid ${BRAND.green}` : "2px solid transparent",
                    borderRadius: 2,
                    transition: "all 180ms ease",
                    "&:hover": { color: "#fff", bgcolor: "rgba(255,255,255,0.06)" },
                    "& .MuiButton-startIcon": { mr: 0.6 },
                  }}
                >
                  {item.label}
                </Button>
              );
            })}
          </Box>

          <Box sx={{ flex: { xs: 1, lg: 0 } }} />

          {/* Right side */}
          <Stack direction="row" spacing={1} alignItems="center" sx={{ display: { xs: "none", lg: "flex" } }}>
            <Chip
              label="● MARKET OPEN"
              size="small"
              sx={{ bgcolor: "rgba(92,200,122,0.12)", color: BRAND.green, fontWeight: 900, fontSize: 10.5, fontFamily: "monospace", border: "1px solid rgba(92,200,122,0.25)", letterSpacing: 0.4 }}
            />

            {user ? (
              <>
                <Button
                  component={RouterLink}
                  to="/dashboard"
                  size="small"
                  sx={{ color: "rgba(255,255,255,0.75)", fontWeight: 800, fontSize: 13, textTransform: "none", borderRadius: 2, px: 1.5, "&:hover": { color: "#fff", bgcolor: "rgba(255,255,255,0.06)" } }}
                >
                  {user.email?.split("@")[0]}
                </Button>
                <Button
                  onClick={handleAuthAction}
                  size="small"
                  variant="outlined"
                  sx={{ color: "rgba(255,255,255,0.7)", borderColor: "rgba(255,255,255,0.22)", fontWeight: 800, fontSize: 12, textTransform: "none", borderRadius: 2, px: 2, "&:hover": { borderColor: "rgba(255,255,255,0.5)", bgcolor: "rgba(255,255,255,0.06)" } }}
                >
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Button
                  component={RouterLink}
                  to="/auth?mode=login"
                  size="small"
                  sx={{ color: "rgba(255,255,255,0.72)", fontWeight: 800, fontSize: 13, textTransform: "none", borderRadius: 2, px: 1.5, "&:hover": { color: "#fff", bgcolor: "rgba(255,255,255,0.06)" } }}
                >
                  Log in
                </Button>
                <Button
                  component={RouterLink}
                  to="/auth?mode=signup"
                  size="small"
                  variant="contained"
                  sx={{ bgcolor: BRAND.red, fontWeight: 900, fontSize: 13, textTransform: "none", borderRadius: 2, px: 2, boxShadow: "0 6px 16px rgba(232,64,64,0.32)", "&:hover": { bgcolor: "#C93232", boxShadow: "0 8px 20px rgba(232,64,64,0.38)" } }}
                >
                  Get Started
                </Button>
              </>
            )}
          </Stack>

          {/* Mobile hamburger */}
          <IconButton onClick={() => setOpen(true)} sx={{ color: "#fff", display: { xs: "inline-flex", lg: "none" } }}>
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* ── Mobile Drawer ── */}
      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{ sx: { width: 300, bgcolor: BRAND.navy, color: "#fff" } }}
      >
        <Box sx={{ p: 2.5 }}>
          {/* Header */}
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1.2} alignItems="center">
              <Box sx={{ width: 34, height: 34, borderRadius: 2, bgcolor: BRAND.red, display: "grid", placeItems: "center" }}>
                <CandlestickChartIcon sx={{ fontSize: 18, color: "#fff" }} />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 950, fontSize: 15, color: "#fff" }}>StockPilot</Typography>
                <Typography sx={{ fontSize: 10, color: "rgba(255,255,255,0.42)", fontFamily: "monospace" }}>SIMULATION DESK</Typography>
              </Box>
            </Stack>
            <IconButton onClick={() => setOpen(false)} sx={{ color: "rgba(255,255,255,0.6)" }}>
              <CloseIcon />
            </IconButton>
          </Stack>

          <Divider sx={{ borderColor: "rgba(255,255,255,0.1)", mb: 1.5 }} />

          {/* Nav links */}
          <List disablePadding>
            <ListItemButton component={RouterLink} to="/" onClick={() => setOpen(false)} selected={pathname === "/"} sx={drawerItemStyle}>
              <ListItemIcon sx={{ minWidth: 32, color: "inherit" }}><CandlestickChartIcon sx={{ fontSize: 18 }} /></ListItemIcon>
              <ListItemText primary="Home" primaryTypographyProps={{ fontWeight: 800, fontSize: 14 }} />
            </ListItemButton>

            {navItems.map((item) => (
              <ListItemButton key={item.to} component={RouterLink} to={item.to} onClick={() => setOpen(false)} selected={isActive(item.to)} sx={drawerItemStyle}>
                <ListItemIcon sx={{ minWidth: 32, color: "inherit" }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 800, fontSize: 14 }} />
              </ListItemButton>
            ))}
          </List>

          <Divider sx={{ borderColor: "rgba(255,255,255,0.1)", my: 2 }} />

          {/* Auth */}
          <Stack spacing={1.2}>
            {user ? (
              <>
                <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.45)", px: 1 }}>Signed in as {user.email}</Typography>
                <Button fullWidth variant="outlined" onClick={() => { setOpen(false); handleAuthAction(); }} sx={{ color: "rgba(255,255,255,0.75)", borderColor: "rgba(255,255,255,0.22)", fontWeight: 800, textTransform: "none", borderRadius: 2 }}>
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Button fullWidth component={RouterLink} to="/auth?mode=login" onClick={() => setOpen(false)} sx={{ color: "rgba(255,255,255,0.75)", fontWeight: 800, textTransform: "none", borderRadius: 2, border: "1px solid rgba(255,255,255,0.15)" }}>
                  Log in
                </Button>
                <Button fullWidth variant="contained" component={RouterLink} to="/auth?mode=signup" onClick={() => setOpen(false)} sx={{ bgcolor: BRAND.red, fontWeight: 900, textTransform: "none", borderRadius: 2, "&:hover": { bgcolor: "#C93232" } }}>
                  Get Started
                </Button>
              </>
            )}
          </Stack>
        </Box>
      </Drawer>
    </>
  );
};

const drawerItemStyle = {
  borderRadius: 2,
  mb: 0.5,
  color: "rgba(255,255,255,0.7)",
  "& .Mui-selected": { bgcolor: "rgba(255,255,255,0.08)", color: "#fff" },
  "&:hover": { bgcolor: "rgba(255,255,255,0.06)", color: "#fff" },
};

export default Header;
