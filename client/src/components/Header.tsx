import React from "react";
import {
  Alert, AppBar, Avatar, Badge, Box, Button, Divider, Drawer,
  IconButton, List, ListItemButton, ListItemIcon,
  ListItemText, LinearProgress, Menu, MenuItem, Snackbar, Stack, Toolbar, Tooltip, Typography,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import CloseIcon from "@mui/icons-material/Close";
import CandlestickChartIcon from "@mui/icons-material/CandlestickChart";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import SportsEsportsOutlinedIcon from "@mui/icons-material/SportsEsportsOutlined";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import WorkspacePremiumOutlinedIcon from "@mui/icons-material/WorkspacePremiumOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import SportsMmaOutlinedIcon from "@mui/icons-material/SportsMmaOutlined";
import StarBorderOutlinedIcon from "@mui/icons-material/StarBorderOutlined";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUnreadInboxCount } from "../lib/inbox";
import { useUnseenNotificationCount } from "../lib/notifications";
import { D } from "../theme/design";
import { useAchievements } from "../hooks/useAchievements";
import { getPlayerLevel } from "../data/levelSystem";
import { useGame } from "../context/GameContext";
import { supabase } from "../lib/supabase";

const nav = [
  { to: "/dashboard",   label: "Dashboard",   icon: <DashboardOutlinedIcon sx={{ fontSize: 17 }} /> },
  { to: "/leaderboard", label: "Leaderboard",  icon: <EmojiEventsOutlinedIcon sx={{ fontSize: 17 }} /> },
  { to: "/achievements", label: "Achievements", icon: <WorkspacePremiumOutlinedIcon sx={{ fontSize: 17 }} /> },
  { to: "/learn",       label: "Learn",        icon: <AutoStoriesOutlinedIcon sx={{ fontSize: 17 }} /> },
  { to: "/news",        label: "News",         icon: <AutoStoriesOutlinedIcon sx={{ fontSize: 17 }} /> },
  { to: "/inbox",       label: "Inbox",        icon: <MailOutlineIcon sx={{ fontSize: 17 }} /> },
];

const gameMenu = [
  { to: "/game", label: "Market", icon: <SportsEsportsOutlinedIcon sx={{ fontSize: 17 }} /> },
  { to: "/game/watchlist", label: "Watchlist", icon: <StarBorderOutlinedIcon sx={{ fontSize: 17 }} /> },
  { to: "/level", label: "Player Level", icon: <WorkspacePremiumOutlinedIcon sx={{ fontSize: 17 }} /> },
  { to: "/game/goals", label: "Goals & Missions", icon: <FlagOutlinedIcon sx={{ fontSize: 17 }} /> },
  { to: "/game/living-costs", label: "Living Costs", icon: <ReceiptLongOutlinedIcon sx={{ fontSize: 17 }} /> },
  { to: "/game/advisor", label: "Advisors", icon: <SmartToyOutlinedIcon sx={{ fontSize: 17 }} /> },
  { to: "/practice", label: "Guest Practice", icon: <SportsEsportsOutlinedIcon sx={{ fontSize: 17 }} /> },
];

const accountMenu = [
  { label: "Settings",      to: "/settings",     icon: <SettingsOutlinedIcon sx={{ fontSize: 16 }} /> },
  { label: "My Profile",    to: "/profile",      icon: <AccountCircleOutlinedIcon sx={{ fontSize: 16 }} /> },
  { label: "My Level",      to: "/level",        icon: <WorkspacePremiumOutlinedIcon sx={{ fontSize: 16 }} /> },
  { label: "Rival Trader",  to: "/rival",        icon: <SportsMmaOutlinedIcon sx={{ fontSize: 16 }} /> },
  { label: "Dashboard",     to: "/dashboard",    icon: <DashboardOutlinedIcon sx={{ fontSize: 16 }} /> },
  { label: "Achievements",  to: "/achievements", icon: <WorkspacePremiumOutlinedIcon sx={{ fontSize: 16 }} /> },
  { label: "Save & Load",   to: "/save-load",    icon: <SaveOutlinedIcon sx={{ fontSize: 16 }} /> },
];

const Header: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);
  const [gameAnchor, setGameAnchor] = React.useState<null | HTMLElement>(null);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const trading = useGame();
  const unreadCount = useUnreadInboxCount(trading.newsHistory, trading.sessionId);
  const unseenNotifications = useUnseenNotificationCount();
  const { totalXP, confirmedXP } = useAchievements();
  const { gameMode, sessionId, reloadSession } = trading;
  const playerLevel = React.useMemo(() => getPlayerLevel(totalXP), [totalXP]);
  const [levelReward, setLevelReward] = React.useState<{ level: number; amount: number } | null>(null);
  const processedXpRef = React.useRef<number | null>(null);

  // Keyed on confirmedXP, not totalXP: the reward RPC recomputes the level from
  // user_achievement_unlocks, so firing it on optimistic XP raced the upsert
  // that writes the row it reads.
  React.useEffect(() => {
    if (!user || !sessionId || processedXpRef.current === confirmedXP) return;
    processedXpRef.current = confirmedXP;

    void (async () => {
      const { data, error } = await supabase.rpc("process_level_cash_rewards", {
        target_session_id: sessionId,
      });
      if (error) {
        processedXpRef.current = null;
        return;
      }

      const result = data as { level: number; cash_reward: number | string; game_mode: string };
      const amount = Number(result.cash_reward);
      if (result.game_mode === "infinite" && amount > 0) {
        await reloadSession();
        setLevelReward({ level: Number(result.level), amount });
      }
    })();
  }, [gameMode, reloadSession, sessionId, confirmedXP, user]);

  const isActive = (to: string) => pathname === to || (to !== "/" && pathname.startsWith(to));

  const handleSignOut = async () => {
    setMenuAnchor(null);
    setGameAnchor(null);
    setDrawerOpen(false);
    await signOut();
    navigate("/", { replace: true });
  };

  const profileName =
    profile?.display_name
    || profile?.username
    || user?.email?.split("@")[0]
    || "Player";
  const menuHandle = profile?.username ? `@${profile.username}` : user?.email;
  const avatarUrl = profile?.avatar_url ?? null;
  const initials = profileName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <Snackbar open={Boolean(levelReward)} autoHideDuration={6000} onClose={() => setLevelReward(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}>
        <Alert severity="success" variant="filled" onClose={() => setLevelReward(null)} sx={{ fontWeight: 800 }}>
          Level up! You reached LV {levelReward?.level} and earned ${levelReward?.amount.toLocaleString("en-US")} for your Endless run.
        </Alert>
      </Snackbar>
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: D.surface, borderBottom: `1px solid ${D.border}`, zIndex: 1200 }}>
        <Toolbar sx={{ minHeight: 58, px: { xs: 2, md: 3 }, gap: 2 }}>

          {/* Logo */}
          <Box component={RouterLink} to="/" aria-label="StockPilot home" sx={{ display: "flex", alignItems: "center", gap: 1, textDecoration: "none", flexShrink: 0 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: D.brand, display: "grid", placeItems: "center" }}>
              <CandlestickChartIcon sx={{ fontSize: 18, color: "#fff" }} />
            </Box>
            <Typography sx={{ fontWeight: 900, fontSize: 15, color: D.t1, letterSpacing: -0.3, display: { xs: "none", sm: "block" } }}>
              StockPilot
            </Typography>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ borderColor: D.border, display: { xs: "none", md: "block" } }} />

          {/* Desktop nav */}
          <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 0.5, flex: 1 }}>
            <Box data-tour="game-menu" sx={{ order: 1, display: "flex", alignItems: "center", borderRadius: 1.5, bgcolor: pathname === "/level" || pathname.startsWith("/game") ? D.overlay : "transparent", "&:hover": { bgcolor: D.overlay } }}>
              <Button component={RouterLink} to="/game" size="small"
                sx={{ minWidth: 0, color: pathname === "/level" || pathname.startsWith("/game") ? D.t1 : D.t2, fontWeight: pathname === "/level" || pathname.startsWith("/game") ? 800 : 600, fontSize: 13.5, textTransform: "none", pl: 1.5, pr: 0.6, py: 0.7, borderRadius: "6px 0 0 6px", "&:hover": { color: D.t1, bgcolor: "transparent" } }}>
                Game
              </Button>
              <IconButton data-tour="game-menu-arrow" size="small" onClick={(event) => setGameAnchor(event.currentTarget)} aria-label="Open Game menu" aria-haspopup="menu" aria-expanded={Boolean(gameAnchor)}
                sx={{ color: pathname === "/level" || pathname.startsWith("/game") ? D.t1 : D.t2, p: 0.55, borderRadius: "0 6px 6px 0", "&:hover": { color: D.t1, bgcolor: "transparent" } }}>
                <KeyboardArrowDownIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
            <Menu anchorEl={gameAnchor} open={Boolean(gameAnchor)} onClose={() => setGameAnchor(null)}
              PaperProps={{ sx: { bgcolor: D.elevated, border: `1px solid ${D.border}`, borderRadius: 2, minWidth: 210, mt: 0.5 } }}>
              {gameMenu.map((item) => (
                <MenuItem key={item.to} selected={pathname === item.to} onClick={() => { setGameAnchor(null); navigate(item.to); }}
                  sx={{ gap: 1.2, fontSize: 13, fontWeight: 700, color: D.t2, py: 1, "&:hover": { color: D.t1, bgcolor: D.overlay } }}>
                  {item.icon}{item.label}
                </MenuItem>
              ))}
            </Menu>
            {nav.map(({ to, label }) => {
              const active = isActive(to);
              return (
                <Button key={to} component={RouterLink} to={to} size="small"
                  sx={{
                    order: to === "/dashboard" ? 0 : 2,
                    color: active ? D.t1 : D.t2,
                    fontWeight: active ? 800 : 600,
                    fontSize: 13.5,
                    textTransform: "none",
                    px: 1.5,
                    py: 0.7,
                    borderRadius: 1.5,
                    bgcolor: active ? D.overlay : "transparent",
                    "&:hover": { color: D.t1, bgcolor: D.overlay },
                    transition: "all 140ms",
                  }}
                >
                  {to === "/inbox" && unreadCount > 0 ? (
                    <Badge badgeContent={unreadCount} color="error" sx={{ "& .MuiBadge-badge": { fontSize: 9, height: 15, minWidth: 15 } }}>
                      {label}
                    </Badge>
                  ) : label}
                </Button>
              );
            })}
          </Box>

          <Box sx={{ flex: { xs: 1, md: 0 } }} />

          {/* Right side */}
          <Stack direction="row" spacing={1} alignItems="center" sx={{ display: { xs: "none", md: "flex" } }}>
            {user ? (
              <>
                <Tooltip title={unseenNotifications > 0 ? `${unseenNotifications} new notification${unseenNotifications === 1 ? "" : "s"}` : "Notifications"}>
                  <IconButton
                    component={RouterLink}
                    to="/notifications"
                    aria-label={unseenNotifications > 0 ? `Notifications, ${unseenNotifications} new` : "Notifications"}
                    sx={{
                      color: isActive("/notifications") ? D.brandText : D.t2,
                      bgcolor: isActive("/notifications") ? D.brandBg : "transparent",
                      borderRadius: 1.5,
                      "&:hover": { color: D.t1, bgcolor: D.overlay },
                    }}
                  >
                    <Badge
                      badgeContent={unseenNotifications}
                      color="error"
                      max={99}
                      sx={{ "& .MuiBadge-badge": { fontSize: 9, height: 15, minWidth: 15 } }}
                    >
                      <NotificationsNoneOutlinedIcon sx={{ fontSize: 20 }} />
                    </Badge>
                  </IconButton>
                </Tooltip>

                <Button
                  onClick={(e) => setMenuAnchor(e.currentTarget)}
                  endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 16 }} />}
                  sx={{ color: D.t2, fontWeight: 600, fontSize: 13, textTransform: "none", borderRadius: 1.5, px: 1.2, py: 0.6, gap: 0.8, "&:hover": { color: D.t1, bgcolor: D.overlay } }}
                >
                  <Avatar src={avatarUrl ?? undefined} sx={{ width: 26, height: 26, bgcolor: D.brandBg, border: `1px solid ${D.brandBd}`, fontSize: 11, fontWeight: 900, color: D.brandText }}>
                    {!avatarUrl && initials}
                  </Avatar>
                  <Box sx={{ minWidth: 76, textAlign: "left" }}>
                    <Stack direction="row" spacing={0.7} alignItems="center">
                      <Typography sx={{ color: "inherit", fontWeight: 700, fontSize: 13 }} noWrap>{profileName}</Typography>
                      <Typography sx={{ color: D.brandText, fontWeight: 900, fontSize: 9.5, whiteSpace: "nowrap" }}>LV {playerLevel.level}</Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={playerLevel.progress}
                      sx={{ mt: 0.35, width: "100%", height: 3, borderRadius: 99, bgcolor: D.border, "& .MuiLinearProgress-bar": { bgcolor: D.brand, borderRadius: 99 } }} />
                  </Box>
                </Button>

                <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}
                  PaperProps={{ sx: { bgcolor: D.elevated, border: `1px solid ${D.border}`, borderRadius: 2, boxShadow: "0 16px 40px rgba(0,0,0,0.5)", minWidth: 200, mt: 0.5 } }}
                  transformOrigin={{ horizontal: "right", vertical: "top" }}
                  anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                >
                  <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${D.border}` }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography sx={{ fontWeight: 800, fontSize: 13, color: D.t1 }}>{profileName}</Typography>
                      <Typography sx={{ fontWeight: 900, fontSize: 10, color: D.brandText }}>LV {playerLevel.level}</Typography>
                    </Stack>
                    <Typography sx={{ fontSize: 11, color: D.t3 }}>{menuHandle}</Typography>
                    <Stack direction="row" justifyContent="space-between" sx={{ mt: 1, mb: 0.45 }}>
                      <Typography sx={{ fontSize: 9.5, color: D.t3 }}>{playerLevel.xpIntoLevel}/{playerLevel.xpForNextLevel} XP</Typography>
                      <Typography sx={{ fontSize: 9.5, color: D.t3 }}>Next: LV {playerLevel.level + 1}</Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={playerLevel.progress}
                      sx={{ height: 4, borderRadius: 99, bgcolor: D.border, "& .MuiLinearProgress-bar": { bgcolor: D.brand, borderRadius: 99 } }} />
                  </Box>
                  {accountMenu.map((item) => (
                    <MenuItem key={item.to} onClick={() => { setMenuAnchor(null); navigate(item.to); }}
                      sx={{ gap: 1.2, fontSize: 13, fontWeight: 700, color: D.t2, py: 1, "&:hover": { color: D.t1, bgcolor: D.overlay } }}>
                      {item.icon}{item.label}
                    </MenuItem>
                  ))}
                  <Divider sx={{ borderColor: D.border }} />
                  <MenuItem onClick={handleSignOut} sx={{ gap: 1.2, fontSize: 13, fontWeight: 700, color: D.redText, py: 1, "&:hover": { bgcolor: D.redBg } }}>
                    <LogoutOutlinedIcon sx={{ fontSize: 16 }} /> Log out
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <>
                <Button component={RouterLink} to="/auth?mode=login" size="small"
                  sx={{ color: D.t2, fontWeight: 700, fontSize: 13, textTransform: "none", borderRadius: 1.5, px: 1.5, "&:hover": { color: D.t1, bgcolor: D.overlay } }}>
                  Log in
                </Button>
                <Button component={RouterLink} to="/auth?mode=signup" size="small" variant="contained"
                  sx={{ bgcolor: D.brand, fontWeight: 800, fontSize: 13, textTransform: "none", borderRadius: 1.5, px: 2, boxShadow: "none", "&:hover": { bgcolor: D.brandMid, boxShadow: "none" } }}>
                  Sign up
                </Button>
              </>
            )}
          </Stack>

          {/* Mobile hamburger */}
          <IconButton data-tour="game-menu" onClick={() => setDrawerOpen(true)} aria-label="Open navigation menu" title="Open menu" sx={{ color: D.t2, display: { xs: "flex", md: "none" }, p: 0.8 }}>
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: 280, maxWidth: "100vw", bgcolor: D.surface, borderLeft: `1px solid ${D.border}` } }}>
        <Box sx={{ p: 2.5 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: D.brand, display: "grid", placeItems: "center" }}>
                <CandlestickChartIcon sx={{ fontSize: 16, color: "#fff" }} />
              </Box>
              <Typography sx={{ fontWeight: 900, fontSize: 14, color: D.t1 }}>StockPilot</Typography>
            </Stack>
            <IconButton onClick={() => setDrawerOpen(false)} aria-label="Close navigation menu" title="Close menu" sx={{ color: D.t3, p: 0.5 }}>
              <CloseIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Stack>

          <List disablePadding sx={{ "& .MuiListItemButton-root": { borderRadius: 1.5, mb: 0.3, px: 1.5, py: 0.9 } }}>
            <Typography sx={{ px: 1.5, pt: 0.5, pb: 0.7, color: D.t3, fontSize: 10, fontWeight: 900, letterSpacing: 1 }}>GAME</Typography>
            {gameMenu.map(({ to, label, icon }) => (
              <ListItemButton key={to} component={RouterLink} to={to} onClick={() => setDrawerOpen(false)} selected={pathname === to}
                sx={{ color: pathname === to ? D.t1 : D.t2, bgcolor: pathname === to ? D.overlay : "transparent", "&:hover": { color: D.t1, bgcolor: D.overlay } }}>
                <ListItemIcon sx={{ minWidth: 30, color: "inherit" }}>{icon}</ListItemIcon>
                <ListItemText primary={label} primaryTypographyProps={{ fontWeight: 700, fontSize: 13.5 }} />
              </ListItemButton>
            ))}
            <Divider sx={{ borderColor: D.border, my: 1 }} />
            {nav.map(({ to, label, icon }) => (
              <ListItemButton key={to} component={RouterLink} to={to} onClick={() => setDrawerOpen(false)} selected={isActive(to)}
                sx={{ color: isActive(to) ? D.t1 : D.t2, bgcolor: isActive(to) ? D.overlay : "transparent", "&:hover": { color: D.t1, bgcolor: D.overlay }, "& .Mui-selected": {} }}>
                <ListItemIcon sx={{ minWidth: 30, color: "inherit" }}>{icon}</ListItemIcon>
                <ListItemText primary={label} primaryTypographyProps={{ fontWeight: 700, fontSize: 13.5 }} />
              </ListItemButton>
            ))}
          </List>

          <Divider sx={{ borderColor: D.border, my: 2 }} />

          {user ? (
            <Stack spacing={1}>
              <Box sx={{ px: 1.5, py: 1, borderRadius: 1.5, bgcolor: D.elevated, border: `1px solid ${D.border}` }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Avatar src={avatarUrl ?? undefined} sx={{ width: 28, height: 28, bgcolor: D.brandBg, fontSize: 11, fontWeight: 900, color: D.brandText }}>
                    {!avatarUrl && initials}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography sx={{ fontSize: 13, fontWeight: 800, color: D.t1 }} noWrap>{profileName}</Typography>
                      <Typography sx={{ fontSize: 9.5, fontWeight: 900, color: D.brandText }}>LV {playerLevel.level}</Typography>
                    </Stack>
                    <Typography sx={{ fontSize: 10, color: D.t3 }}>{menuHandle}</Typography>
                    <LinearProgress variant="determinate" value={playerLevel.progress}
                      sx={{ mt: 0.7, height: 3, borderRadius: 99, bgcolor: D.border, "& .MuiLinearProgress-bar": { bgcolor: D.brand, borderRadius: 99 } }} />
                    <Typography sx={{ mt: 0.35, fontSize: 9, color: D.t3 }}>
                      {playerLevel.xpIntoLevel}/{playerLevel.xpForNextLevel} XP to LV {playerLevel.level + 1}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
              <Button
                component={RouterLink}
                to="/notifications"
                onClick={() => setDrawerOpen(false)}
                startIcon={<NotificationsNoneOutlinedIcon sx={{ fontSize: 16 }} />}
                fullWidth
                sx={{ color: D.t2, fontWeight: 700, fontSize: 13, textTransform: "none", justifyContent: "flex-start", px: 1.5, borderRadius: 1.5, "&:hover": { color: D.t1, bgcolor: D.overlay } }}
              >
                <Box component="span" sx={{ flex: 1, textAlign: "left" }}>Notifications</Box>
                {unseenNotifications > 0 && (
                  <Badge badgeContent={unseenNotifications} color="error" max={99}
                    sx={{ mr: 1.5, "& .MuiBadge-badge": { position: "static", transform: "none", fontSize: 9, height: 15, minWidth: 15 } }} />
                )}
              </Button>
              {accountMenu.map((item) => (
                <Button key={item.to} component={RouterLink} to={item.to} onClick={() => setDrawerOpen(false)}
                  startIcon={item.icon} fullWidth
                  sx={{ color: D.t2, fontWeight: 700, fontSize: 13, textTransform: "none", justifyContent: "flex-start", px: 1.5, borderRadius: 1.5, "&:hover": { color: D.t1, bgcolor: D.overlay } }}>
                  {item.label}
                </Button>
              ))}
              <Button onClick={handleSignOut} startIcon={<LogoutOutlinedIcon />} fullWidth
                sx={{ color: D.redText, fontWeight: 700, fontSize: 13, textTransform: "none", justifyContent: "flex-start", px: 1.5, borderRadius: 1.5, "&:hover": { bgcolor: D.redBg } }}>
                Log out
              </Button>
            </Stack>
          ) : (
            <Stack spacing={1}>
              <Button component={RouterLink} to="/auth?mode=login" onClick={() => setDrawerOpen(false)} fullWidth
                sx={{ color: D.t2, fontWeight: 700, fontSize: 13, textTransform: "none", borderRadius: 1.5, border: `1px solid ${D.border}`, "&:hover": { color: D.t1, borderColor: D.borderHi } }}>
                Log in
              </Button>
              <Button component={RouterLink} to="/auth?mode=signup" onClick={() => setDrawerOpen(false)} variant="contained" fullWidth
                sx={{ bgcolor: D.brand, fontWeight: 800, fontSize: 13, textTransform: "none", borderRadius: 1.5, boxShadow: "none", "&:hover": { bgcolor: D.brandMid, boxShadow: "none" } }}>
                Sign up free
              </Button>
            </Stack>
          )}
        </Box>
      </Drawer>
    </>
  );
};

export default Header;
