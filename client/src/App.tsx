import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Box, CssBaseline } from "@mui/material";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { GameProvider } from "./context/GameContext";
import { ThemeProvider, useThemeSettings } from "./context/ThemeContext";
import { D } from "./theme/design";

import Header from "./components/Header";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";

import Home from "./pages/Home";
import AuthPage from "./pages/AuthPage";
import UpdatePassword from "./pages/UpdatePassword";
import Dashboard from "./pages/Dashboard";
import Game from "./pages/Game";
import Learn from "./pages/Learn";
import News from "./pages/News";
import Leaderboard from "./pages/Leaderboard";
import Achievements from "./pages/Achievements";
import SaveLoad from "./pages/SaveLoad";
import StockDetails from "./pages/StockDetails";
import CompareStocks from "./pages/CompareStocks";
import Profile from "./pages/Profile";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth?mode=login" replace />;
  return <>{children}</>;
};

function AppLayout() {
  useThemeSettings();

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
          <Route path="/update-password" element={<UpdatePassword />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/news" element={<News />} />

          {/* Legacy redirects */}
          <Route path="/tutorial" element={<Navigate to="/learn" replace />} />
          <Route path="/guide" element={<Navigate to="/learn?tab=guide" replace />} />

          {/* Protected */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/game" element={<ProtectedRoute><Game /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
          <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
          <Route path="/save-load" element={<ProtectedRoute><SaveLoad /></ProtectedRoute>} />
          <Route path="/compare" element={<ProtectedRoute><CompareStocks /></ProtectedRoute>} />
          <Route path="/stocks/:symbol" element={<ProtectedRoute><StockDetails /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        </Routes>
      </Box>

      <Box component="footer" sx={{ width: "100%", flexShrink: 0 }}>
        <Footer />
      </Box>
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
          <GameProvider>
            <AppLayout />
          </GameProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
