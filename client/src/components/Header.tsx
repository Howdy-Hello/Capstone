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

/* ✅ ONLY MAIN NAV PAGES */
const navItems = [
  { to: "/", label: "Home" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/game", label: "Game" },
  { to: "/tutorial", label: "Tutorial" },
  { to: "/guide", label: "Guide" },
  { to: "/news", label: "News" },
];

const NavButton = ({
  to,
  label,
  active,
}: {
  to: string;
  label: string;
  active?: boolean;
}) => (
  <Button
    component={RouterLink}
    to={to}
    sx={{
      color: "#fff",
      opacity: active ? 1 : 0.72,
      fontWeight: active ? 950 : 800,
      borderRadius: 2,
      whiteSpace: "nowrap",
      "&:hover": {
        opacity: 1,
        bgcolor: "rgba(255,255,255,0.08)",
      },
    }}
  >
    {label}
  </Button>
);

const Header: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const { pathname } = useLocation();

  const isActive = (target: string) => pathname === target;

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
        <Toolbar
          sx={{
            display: "flex",
            justifyContent: "space-between",
            gap: 2,
            minHeight: 72,
          }}
        >
          {/* LOGO */}
          <Box
            component={RouterLink}
            to="/"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.25,
              textDecoration: "none",
              color: "#fff",
            }}
          >
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2.4,
                bgcolor: BRAND.red,
                display: "grid",
                placeItems: "center",
                boxShadow: "0 10px 26px rgba(255,55,55,0.32)",
              }}
            >
              <CandlestickChartIcon />
            </Box>

            <Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 950, letterSpacing: -0.2, lineHeight: 1 }}
              >
                StockPilot
              </Typography>

              <Typography
                variant="caption"
                sx={{
                  color: "rgba(255,255,255,0.55)",
                  fontWeight: 700,
                }}
              >
                Simulation Desk
              </Typography>
            </Box>
          </Box>

          {/* DESKTOP NAV */}
          <Box
            sx={{
              display: { xs: "none", lg: "flex" },
              alignItems: "center",
              gap: 0.5,
            }}
          >
            {navItems.map((item) => (
              <NavButton
                key={item.to}
                to={item.to}
                label={item.label}
                active={isActive(item.to)}
              />
            ))}

            <Divider
              orientation="vertical"
              flexItem
              sx={{
                mx: 1.5,
                borderColor: "rgba(255,255,255,0.14)",
              }}
            />

            <Chip
              label="Market Mode"
              sx={{
                bgcolor: BRAND.green,
                color: BRAND.navy,
                fontWeight: 950,
                mr: 0.5,
              }}
            />

            <Button
              variant="contained"
              component={RouterLink}
              to="/auth?mode=signup"
              sx={{
                bgcolor: BRAND.red,
                fontWeight: 950,
                borderRadius: 2.2,
                "&:hover": { bgcolor: "#E63131" },
              }}
            >
              Get Started
            </Button>
          </Box>

          {/* MOBILE MENU BUTTON */}
          <IconButton
            onClick={() => setOpen(true)}
            color="inherit"
            sx={{ display: { xs: "inline-flex", lg: "none" } }}
          >
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* MOBILE DRAWER */}
      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: 310, p: 2.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2.2,
                bgcolor: BRAND.red,
                color: "#fff",
                display: "grid",
                placeItems: "center",
              }}
            >
              <CandlestickChartIcon />
            </Box>

            <Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 950, color: BRAND.navy }}
              >
                StockPilot
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Simulation Desk
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ mb: 1 }} />

          {/* ONLY MAIN NAV IN DRAWER */}
          <List>
            {navItems.map((item) => (
              <ListItemButton
                key={item.to}
                component={RouterLink}
                to={item.to}
                selected={isActive(item.to)}
                onClick={() => setOpen(false)}
              >
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}

            <ListItemButton
              component={RouterLink}
              to="/auth?mode=login"
              onClick={() => setOpen(false)}
            >
              <ListItemText primary="Login" />
            </ListItemButton>
          </List>

          <Divider sx={{ my: 1 }} />

          <Button
            fullWidth
            variant="contained"
            component={RouterLink}
            to="/auth?mode=signup"
            onClick={() => setOpen(false)}
            sx={{
              bgcolor: BRAND.red,
              fontWeight: 950,
              "&:hover": { bgcolor: "#E63131" },
            }}
          >
            Get Started
          </Button>
        </Box>
      </Drawer>
    </>
  );
};

export default Header;