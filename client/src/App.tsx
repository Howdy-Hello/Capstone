import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Box, CssBaseline } from "@mui/material";

import Header from "./components/Header";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";

import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Game from "./pages/Game";
import Tutorial from "./pages/Tutorial";
import Guide from "./pages/Guide";
import News from "./pages/News";
import Leaderboard from "./pages/Leaderboard";
import Achievements from "./pages/Achievements";
import SaveLoad from "./pages/SaveLoad";
import StockDetails from "./pages/StockDetails";

export default function App() {
  return (
    <BrowserRouter>
      <CssBaseline />
      <ScrollToTop />

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          width: "100%",
          m: 0,
          p: 0,
          bgcolor: "#F5F7F9",
        }}
      >
        <Box
          component="header"
          sx={{
            width: "100%",
            m: 0,
            p: 0,
            flexShrink: 0,
          }}
        >
          <Header />
        </Box>

        <Box
          component="main"
          sx={{
            flex: 1,
            width: "100%",
            m: 0,
            p: 0,
            overflowX: "hidden",
          }}
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/game" element={<Game />} />
            <Route path="/tutorial" element={<Tutorial />} />
            <Route path="/guide" element={<Guide />} />
            <Route path="/news" element={<News />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/achievements" element={<Achievements />} />
            <Route path="/save-load" element={<SaveLoad />} />
            <Route path="/stocks/:symbol" element={<StockDetails />} />
          </Routes>
        </Box>

        <Box
          component="footer"
          sx={{
            width: "100%",
            m: 0,
            p: 0,
            flexShrink: 0,
          }}
        >
          <Footer />
        </Box>
      </Box>
    </BrowserRouter>
  );
}