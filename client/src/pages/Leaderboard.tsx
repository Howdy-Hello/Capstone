import React from "react";
import {
  Avatar, Box, Button, Chip, Container, Grid, LinearProgress, Stack, Typography,
} from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import MilitaryTechIcon from "@mui/icons-material/MilitaryTech";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import { Link as RouterLink } from "react-router-dom";
import { D, CARD, MONO, money } from "../theme/design";

type LeaderboardPlayer = {
  id: string; username: string; netWorth: number; cash: number;
  portfolioValue: number; returnPct: number; rank: number;
  badge: "Champion" | "Expert" | "Rising" | "Player";
};

const mockPlayers: LeaderboardPlayer[] = [
  { id: "1", username: "MarketKing",  netWorth: 52000, cash: 12000, portfolioValue: 40000, returnPct: 420, rank: 1, badge: "Champion" },
  { id: "2", username: "StockWizard", netWorth: 43000, cash: 8500,  portfolioValue: 34500, returnPct: 330, rank: 2, badge: "Expert"   },
  { id: "3", username: "BullTrader",  netWorth: 39000, cash: 10000, portfolioValue: 29000, returnPct: 290, rank: 3, badge: "Rising"   },
  { id: "4", username: "You",         netWorth: 18500, cash: 7200,  portfolioValue: 11300, returnPct: 85,  rank: 8, badge: "Player"   },
];

const topThree = mockPlayers.slice(0, 3);
const currentPlayer = mockPlayers.find((p) => p.username === "You");
const medalColors = ["#F59E0B", "#94A3B8", "#C98B5F"];

export default function Leaderboard() {
  return (
    <Box sx={{ bgcolor: D.bg, minHeight: "100vh" }}>
      {/* Hero */}
      <Box sx={{ bgcolor: D.surface, borderBottom: `1px solid ${D.border}` }}>
        <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={2}>
            <Box>
              <Chip label="GLOBAL RANKINGS" size="small" sx={{ bgcolor: D.brandBg, color: D.brandText, border: `1px solid ${D.brandBd}`, fontWeight: 900, fontSize: 10, fontFamily: MONO, letterSpacing: 1, mb: 1 }} />
              <Typography sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 950, color: D.t1, letterSpacing: -1 }}>Leaderboard</Typography>
              <Typography sx={{ fontSize: 13, color: D.t2, mt: 0.5 }}>Rankings based on net worth, portfolio growth, and cash discipline.</Typography>
            </Box>
            <Box sx={{ ...CARD, p: 2.5, minWidth: 240 }}>
              <Typography sx={{ fontSize: 10.5, fontWeight: 900, color: D.t3, fontFamily: MONO, mb: 0.5 }}>YOUR RANK</Typography>
              <Typography sx={{ fontSize: 36, fontWeight: 950, color: D.brandText, fontFamily: MONO, lineHeight: 1 }}>#{currentPlayer?.rank ?? "--"}</Typography>
              <Button component={RouterLink} to="/game" size="small"
                sx={{ mt: 1.2, color: D.brandText, border: `1px solid ${D.brandBd}`, fontWeight: 700, fontSize: 12, textTransform: "none", borderRadius: 1.5, bgcolor: D.brandBg, "&:hover": { bgcolor: "rgba(124,58,237,0.15)" } }}>
                Improve Rank →
              </Button>
            </Box>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
        {/* Stats */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: "Top Net Worth",  val: money(mockPlayers[0].netWorth), icon: <EmojiEventsIcon sx={{ fontSize: 20 }} />,          up: true },
            { label: "Your Net Worth", val: money(currentPlayer?.netWorth ?? 0), icon: <AccountBalanceWalletIcon sx={{ fontSize: 20 }} />, up: true },
            { label: "Your Return",    val: `+${currentPlayer?.returnPct ?? 0}%`,  icon: <TrendingUpIcon sx={{ fontSize: 20 }} />,          up: true },
            { label: "Players",        val: mockPlayers.length.toString(),          icon: <WorkspacePremiumIcon sx={{ fontSize: 20 }} />,    up: undefined },
          ].map((s) => {
            const color = s.up === undefined ? D.brandText : D.greenText;
            const bg    = s.up === undefined ? D.brandBg   : D.greenBg;
            return (
              <Grid item xs={12} sm={6} md={3} key={s.label}>
                <Box sx={{ ...CARD, p: 2.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography sx={{ fontSize: 10.5, fontWeight: 900, color: D.t3, fontFamily: MONO, mb: 0.8 }}>{s.label.toUpperCase()}</Typography>
                      <Typography sx={{ fontSize: 20, fontWeight: 950, color: D.t1, fontFamily: MONO }}>{s.val}</Typography>
                    </Box>
                    <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: bg, color, display: "grid", placeItems: "center", flexShrink: 0 }}>{s.icon}</Box>
                  </Stack>
                </Box>
              </Grid>
            );
          })}
        </Grid>

        <Grid container spacing={3}>
          {/* Top 3 */}
          <Grid item xs={12} md={4}>
            <Box sx={{ bgcolor: D.elevated, border: `1px solid ${D.border}`, borderRadius: 2, p: 3, height: "100%" }}>
              <Typography sx={{ fontWeight: 900, fontSize: 16, color: D.t1, mb: 0.5 }}>Top Traders</Typography>
              <Typography sx={{ fontSize: 12.5, color: D.t3, mb: 2.5 }}>The strongest players balance profit with cash discipline.</Typography>
              <Stack spacing={1.5}>
                {topThree.map((p) => (
                  <Box key={p.id} sx={{ p: 2, borderRadius: 2, bgcolor: D.surface, border: `1px solid ${D.border}` }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar sx={{ bgcolor: medalColors[p.rank - 1], color: D.bg, fontWeight: 900, width: 36, height: 36, fontSize: 15 }}>
                        {p.rank}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 900, fontSize: 14, color: D.t1 }}>{p.username}</Typography>
                        <Typography sx={{ fontSize: 12, color: D.t3, fontFamily: MONO }}>{money(p.netWorth)}</Typography>
                      </Box>
                      <MilitaryTechIcon sx={{ color: medalColors[p.rank - 1], fontSize: 20 }} />
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Grid>

          {/* Full table */}
          <Grid item xs={12} md={8}>
            <Box sx={{ ...CARD, p: 0, overflow: "hidden" }}>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1} sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${D.border}` }}>
                <Box>
                  <Typography sx={{ fontWeight: 900, fontSize: 16, color: D.t1 }}>Full Leaderboard</Typography>
                  <Typography sx={{ fontSize: 12.5, color: D.t3 }}>Ranked by total net worth.</Typography>
                </Box>
                <Chip size="small" label="Updated after each game day" sx={{ bgcolor: D.overlay, color: D.t3, fontSize: 11 }} />
              </Stack>
              <Box sx={{ p: 2.5 }}>
                <Stack spacing={1.2}>
                  {mockPlayers.map((p) => {
                    const isYou = p.username === "You";
                    const progress = Math.min(100, (p.netWorth / mockPlayers[0].netWorth) * 100);
                    return (
                      <Box key={p.id} sx={{ p: 2, borderRadius: 2, bgcolor: isYou ? D.brandBg : D.elevated, border: `1px solid ${isYou ? D.brandBd : D.border}` }}>
                        <Grid container spacing={1.5} alignItems="center">
                          <Grid item xs={12} sm={1}>
                            <Chip label={`#${p.rank}`} size="small" sx={{ bgcolor: p.rank <= 3 ? D.brand : D.overlay, color: p.rank <= 3 ? "#fff" : D.t3, fontWeight: 900, fontSize: 10, fontFamily: MONO }} />
                          </Grid>
                          <Grid item xs={12} sm={3}>
                            <Typography sx={{ fontWeight: 900, fontSize: 13.5, color: D.t1 }}>{p.username}</Typography>
                            <Typography sx={{ fontSize: 11.5, color: D.t3 }}>{p.badge}</Typography>
                          </Grid>
                          <Grid item xs={6} sm={2}>
                            <Typography sx={{ fontSize: 10.5, color: D.t3 }}>Net Worth</Typography>
                            <Typography sx={{ fontSize: 13, fontWeight: 800, color: D.t1, fontFamily: MONO }}>{money(p.netWorth)}</Typography>
                          </Grid>
                          <Grid item xs={6} sm={2}>
                            <Typography sx={{ fontSize: 10.5, color: D.t3 }}>Cash</Typography>
                            <Typography sx={{ fontSize: 13, fontWeight: 800, color: D.t1, fontFamily: MONO }}>{money(p.cash)}</Typography>
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                              <Typography sx={{ fontSize: 11, color: D.t3 }}>Progress</Typography>
                              <Typography sx={{ fontSize: 11, fontWeight: 800, color: isYou ? D.brandText : D.t2 }}>+{p.returnPct}%</Typography>
                            </Stack>
                            <LinearProgress variant="determinate" value={progress}
                              sx={{ height: 5, borderRadius: 99, bgcolor: D.border, "& .MuiLinearProgress-bar": { bgcolor: isYou ? D.brand : D.green, borderRadius: 99 } }} />
                          </Grid>
                        </Grid>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
