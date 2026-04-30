import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Box } from "@mui/material";

import Header from "./components/Header";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Game from "./pages/Game";
import Tutorial from "./pages/Tutorial";
import Guide from "./pages/Guide";
import News from "./pages/News";
import Leaderboard from "./pages/Leaderboard";
import Achievements from "./pages/Achievements";
import SaveLoad from "./pages/SaveLoad";

export default function App() {
  return (
    <BrowserRouter>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
        }}
      >
        {/* Header */}
        <Header />

        {/* Page Content */}
        <Box sx={{ flex: 1, px: 2, py: 2 }}>
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
          </Routes>
        </Box>

        {/* Footer */}
        <Footer />
      </Box>
    </BrowserRouter>
  );
}