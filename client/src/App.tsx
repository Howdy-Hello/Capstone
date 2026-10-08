import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link as RouterLink, useLocation } from "react-router-dom";
import { Box, Button, CssBaseline, Typography } from "@mui/material";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { GameProvider } from "./context/GameContext";
import { ThemeProvider, useThemeSettings } from "./context/ThemeContext";
import { setInboxUser } from "./lib/inbox";
import { setNotificationUser } from "./lib/notifications";
import { setAnalyticsUser } from "./lib/analytics";
import { D } from "./theme/design";

import Header from "./components/Header";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import NotificationHost from "./components/NotificationHost";
import AdvisorEffects from "./components/AdvisorEffects";
import GuidedTutorial from "./components/GuidedTutorial";

import Home from "./pages/Home";
import Practice from "./pages/Practice";
import AuthPage from "./pages/AuthPage";
import AuthCallback from "./pages/AuthCallback";
import UpdatePassword from "./pages/UpdatePassword";
import Dashboard from "./pages/Dashboard";
import Game from "./pages/Game";
import Learn from "./pages/Learn";
import Leaderboard from "./pages/Leaderboard";
import Rival from "./pages/Rival";
import Achievements from "./pages/Achievements";
import SaveLoad from "./pages/SaveLoad";
import StockDetails from "./pages/StockDetails";
import CompareStocks from "./pages/CompareStocks";
import Profile from "./pages/Profile";
import Inbox from "./pages/Inbox";
import Notifications from "./pages/Notifications";
import News from "./pages/News";
import { trackEvent } from "./lib/analytics";
import Level from "./pages/Level";
import Watchlist from "./pages/Watchlist";
import GoalsMissions from "./pages/GoalsMissions";
import LivingCosts from "./pages/LivingCosts";
import Advisor from "./pages/Advisor";
import Tutorial from "./pages/Tutorial";
import { useTradeDebriefs } from "./hooks/useTradeDebriefs";

const NotFound: React.FC = () => (
  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 2, px: 2, textAlign: "center" }}>
    <Typography sx={{ fontSize: 72, fontWeight: 950, color: D.brandBd, lineHeight: 1 }}>404</Typography>
    <Typography sx={{ fontSize: 22, fontWeight: 900, color: D.t1 }}>Page not found</Typography>
    <Typography sx={{ fontSize: 14, color: D.t3, maxWidth: 320 }}>This route doesn't exist. Head back to the market.</Typography>
    <Button component={RouterLink} to="/" variant="contained"
      sx={{ bgcolor: D.brand, fontWeight: 800, textTransform: "none", borderRadius: 1.5, boxShadow: "none", mt: 1, "&:hover": { bgcolor: D.brandMid, boxShadow: "none" } }}>
      Back to Home
    </Button>
  </Box>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth?mode=login" replace />;
  return <>{children}</>;
};

function InboxSync() {
  const { user } = useAuth();
  useEffect(() => {
    const userId = user?.id ?? null;
    setInboxUser(userId);
    setNotificationUser(userId);
    setAnalyticsUser(userId);
  }, [user]);
  return null;
}

function AppLayout() {
  useThemeSettings();
  useTradeDebriefs();
  const location = useLocation();

  useEffect(() => {
    trackEvent("page_view", { path: location.pathname });
  }, [location.pathname]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh", width: "100%", m: 0, p: 0, bgcolor: D.bg }}>
      <Box component="header" sx={{ width: "100%", flexShrink: 0 }}>
        <Header />
      </Box>

      <Box component="main" sx={{ flex: 1, width: "100%", overflowX: "hidden" }}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/update-password" element={<UpdatePassword />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/practice" element={<Practice />} />

          {/* Legacy redirects */}
          <Route path="/guide" element={<Navigate to="/learn?tab=guide" replace />} />

          {/* Protected */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/game" element={<ProtectedRoute><Game /></ProtectedRoute>} />
          <Route path="/game/watchlist" element={<ProtectedRoute><Watchlist /></ProtectedRoute>} />
          <Route path="/game/goals" element={<ProtectedRoute><GoalsMissions /></ProtectedRoute>} />
          <Route path="/game/living-costs" element={<ProtectedRoute><LivingCosts /></ProtectedRoute>} />
          <Route path="/game/advisor" element={<ProtectedRoute><Advisor /></ProtectedRoute>} />
          <Route path="/tutorial" element={<ProtectedRoute><Tutorial /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
          <Route path="/rival" element={<ProtectedRoute><Rival /></ProtectedRoute>} />
          <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
          <Route path="/save-load" element={<ProtectedRoute><SaveLoad /></ProtectedRoute>} />
          <Route path="/compare" element={<ProtectedRoute><CompareStocks /></ProtectedRoute>} />
          <Route path="/stocks/:symbol" element={<ProtectedRoute><StockDetails /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/level" element={<ProtectedRoute><Level /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/inbox" element={<ProtectedRoute><Inbox /></ProtectedRoute>} />
          <Route path="/news" element={<ProtectedRoute><News /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Box>

      <Box component="footer" sx={{ width: "100%", flexShrink: 0 }}>
        <Footer />
      </Box>

      <NotificationHost />
      <AdvisorEffects />
      <GuidedTutorial />
    </Box>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <CssBaseline />
      <ScrollToTop />
      <ThemeProvider>
        <AuthProvider>
          <InboxSync />
          <GameProvider>
            <AppLayout />
          </GameProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
