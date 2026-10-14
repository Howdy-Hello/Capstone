import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link as RouterLink, useLocation } from "react-router-dom";
import { Box, Button, CircularProgress, Typography } from "@mui/material";

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
import { trackEvent } from "./lib/analytics";
import { useTradeDebriefs } from "./hooks/useTradeDebriefs";
import { useNoIndex, usePageTitle } from "./lib/usePageTitle";

// Every other page loads on first visit. One bundle held every page, including
// recharts, which only five of them use, and the browser parsed all of it before
// the first screen appeared.
const loadGame = () => import("./pages/Game");
const loadDashboard = () => import("./pages/Dashboard");
const loadStockDetails = () => import("./pages/StockDetails");
const loadNews = () => import("./pages/News");
const loadInbox = () => import("./pages/Inbox");
const Practice = lazy(() => import("./pages/Practice"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const UpdatePassword = lazy(() => import("./pages/UpdatePassword"));
const Dashboard = lazy(loadDashboard);
const Game = lazy(loadGame);
const Learn = lazy(() => import("./pages/Learn"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Rival = lazy(() => import("./pages/Rival"));
const Achievements = lazy(() => import("./pages/Achievements"));
const SaveLoad = lazy(() => import("./pages/SaveLoad"));
const StockDetails = lazy(loadStockDetails);
const CompareStocks = lazy(() => import("./pages/CompareStocks"));
const Profile = lazy(() => import("./pages/Profile"));
const Inbox = lazy(loadInbox);
const Notifications = lazy(() => import("./pages/Notifications"));
const News = lazy(loadNews);
const Level = lazy(() => import("./pages/Level"));
const Watchlist = lazy(() => import("./pages/Watchlist"));
const GoalsMissions = lazy(() => import("./pages/GoalsMissions"));
const LivingCosts = lazy(() => import("./pages/LivingCosts"));
const Advisor = lazy(() => import("./pages/Advisor"));
const Tutorial = lazy(() => import("./pages/Tutorial"));
const Privacy = lazy(() => import("./pages/Privacy"));

// BUG-031: a missing page says so to search engines too (noindex), since a
// single-page app answers every path with HTTP 200.
const NotFound: React.FC = () => {
  usePageTitle("Page not found");
  useNoIndex();
  return (
  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 2, px: 2, textAlign: "center" }}>
    <Typography sx={{ fontSize: 72, fontWeight: 950, color: D.brandBd, lineHeight: 1 }}>404</Typography>
    <Typography component="h1" sx={{ fontSize: 22, fontWeight: 900, color: D.t1 }}>Page not found</Typography>
    <Typography sx={{ fontSize: 14, color: D.t3, maxWidth: 320 }}>This route doesn't exist. Head back to the market.</Typography>
    <Button component={RouterLink} to="/" variant="contained"
      sx={{ bgcolor: D.brand, fontWeight: 800, textTransform: "none", borderRadius: 1.5, boxShadow: "none", mt: 1, "&:hover": { bgcolor: D.brandMid, boxShadow: "none" } }}>
      Back to Home
    </Button>
  </Box>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth?mode=login" replace />;
  return <>{children}</>;
};

const PageFallback: React.FC = () => (
  <Box sx={{ minHeight: "60vh", display: "grid", placeItems: "center" }}>
    <CircularProgress aria-label="Loading page" sx={{ color: D.brandText }} />
  </Box>
);

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
  const { user } = useAuth();

  useEffect(() => {
    trackEvent("page_view", { path: location.pathname });
  }, [location.pathname]);

  // Once a player is signed in, fetch the pages they move between most in the
  // background, so switching to them doesn't wait on the network.
  useEffect(() => {
    if (!user) return;
    const timer = window.setTimeout(() => {
      for (const load of [loadGame, loadDashboard, loadStockDetails, loadNews, loadInbox]) void load().catch(() => {});
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [user]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh", width: "100%", m: 0, p: 0, bgcolor: D.bg }}>
      <Box component="header" sx={{ width: "100%", flexShrink: 0 }}>
        <Header />
      </Box>

      <Box component="main" sx={{ flex: 1, width: "100%", overflowX: "hidden" }}>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/update-password" element={<UpdatePassword />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/practice" element={<Practice />} />
            <Route path="/privacy" element={<Privacy />} />

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
        </Suspense>
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
