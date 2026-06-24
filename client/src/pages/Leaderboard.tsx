import React, { useEffect, useState } from "react";
import {
  Avatar, Box, Button, Chip, CircularProgress, Container, Grid,
  LinearProgress, Stack, Typography,
} from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import MilitaryTechIcon from "@mui/icons-material/MilitaryTech";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import RefreshIcon from "@mui/icons-material/Refresh";
import { Link as RouterLink } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { D, CARD, MONO, money } from "../theme/design";

type LeaderboardRow = {
  user_id: string;
  best_net_worth: number;
  return_pct: number;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type RankedPlayer = LeaderboardRow & {
  rank: number;
  displayUsername: string;
  badge: string;
};

const MEDAL_COLORS = ["#F59E0B", "#94A3B8", "#C98B5F"];

function badgeFor(rank: number): string {
  if (rank === 1) return "Champion";
  if (rank <= 3) return "Expert";
  if (rank <= 10) return "Rising";
  return "Player";
}

function avatarLetter(player: RankedPlayer): string {
  return (player.displayUsername[0] ?? "?").toUpperCase();
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [players, setPlayers]   = useState<RankedPlayer[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      const { data, error: rpcError } = await supabase.rpc("get_leaderboard", { p_limit: 50 });

      if (cancelled) return;

      if (rpcError) {
        setError(rpcError.message);
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as LeaderboardRow[];
      const ranked: RankedPlayer[] = rows.map((row, i) => ({
        ...row,
        best_net_worth: Number(row.best_net_worth),
        return_pct:     Number(row.return_pct),
        rank: i + 1,
        displayUsername: row.username ?? row.display_name ?? "Anonymous",
        badge: badgeFor(i + 1),
      }));

      setPlayers(ranked);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [refreshKey]);

  const topThree     = players.slice(0, 3);
  const currentEntry = user ? players.find((p) => p.user_id === user.id) : undefined;
  const topNetWorth  = players[0]?.best_net_worth ?? 1;

  return (
    <Box sx={{ bgcolor: D.bg, minHeight: "100vh" }}>
      {/* Hero */}
      <Box sx={{ bgcolor: D.surface, borderBottom: `1px solid ${D.border}` }}>
        <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={2}>
            <Box>
              <Chip label="GLOBAL RANKINGS" size="small"
                sx={{ bgcolor: D.brandBg, color: D.brandText, border: `1px solid ${D.brandBd}`, fontWeight: 900, fontSize: 10, fontFamily: MONO, letterSpacing: 1, mb: 1 }} />
              <Typography sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 950, color: D.t1, letterSpacing: -1 }}>Leaderboard</Typography>
              <Typography sx={{ fontSize: 13, color: D.t2, mt: 0.5 }}>Rankings based on best net worth across all completed runs.</Typography>
            </Box>
            <Box sx={{ ...CARD, p: 2.5, minWidth: 240 }}>
              <Typography sx={{ fontSize: 10.5, fontWeight: 900, color: D.t3, fontFamily: MONO, mb: 0.5 }}>YOUR RANK</Typography>
              <Typography sx={{ fontSize: 36, fontWeight: 950, color: D.brandText, fontFamily: MONO, lineHeight: 1 }}>
                {loading ? "—" : currentEntry ? `#${currentEntry.rank}` : "—"}
              </Typography>
              {currentEntry && (
                <Typography sx={{ fontSize: 12, color: D.t3, mt: 0.5 }}>{money(currentEntry.best_net_worth)} best run</Typography>
              )}
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
            { label: "Top Net Worth",   val: players[0] ? money(players[0].best_net_worth) : "—", icon: <EmojiEventsIcon sx={{ fontSize: 20 }} />,           up: true      },
            { label: "Your Best Run",   val: currentEntry ? money(currentEntry.best_net_worth) : "—", icon: <AccountBalanceWalletIcon sx={{ fontSize: 20 }} />, up: true      },
            { label: "Your Return",     val: currentEntry ? `+${currentEntry.return_pct.toFixed(1)}%` : "—", icon: <TrendingUpIcon sx={{ fontSize: 20 }} />,   up: true      },
            { label: "Players Ranked",  val: loading ? "—" : players.length.toString(),            icon: <WorkspacePremiumIcon sx={{ fontSize: 20 }} />,       up: undefined },
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

        {/* Error */}
        {error && (
          <Box sx={{ p: 2, mb: 2.5, borderRadius: 2, bgcolor: D.redBg, border: `1px solid ${D.redBd}` }}>
            <Typography sx={{ color: D.redText, fontSize: 13, fontWeight: 800 }}>Could not load leaderboard: {error}</Typography>
          </Box>
        )}

        {loading ? (
          <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
            <CircularProgress sx={{ color: D.brandText }} />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {/* Top 3 podium */}
            <Grid item xs={12} md={4}>
              <Box sx={{ bgcolor: D.elevated, border: `1px solid ${D.border}`, borderRadius: 2, p: 3, height: "100%" }}>
                <Typography sx={{ fontWeight: 900, fontSize: 16, color: D.t1, mb: 0.5 }}>Top Traders</Typography>
                <Typography sx={{ fontSize: 12.5, color: D.t3, mb: 2.5 }}>The strongest players by best net worth.</Typography>
                <Stack spacing={1.5}>
                  {topThree.length === 0 ? (
                    <Typography sx={{ fontSize: 13, color: D.t3 }}>No runs completed yet. Be the first!</Typography>
                  ) : (
                    topThree.map((p) => (
                      <Box key={p.user_id} sx={{ p: 2, borderRadius: 2, bgcolor: D.surface, border: `1px solid ${p.user_id === user?.id ? D.brandBd : D.border}` }}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar sx={{ bgcolor: MEDAL_COLORS[p.rank - 1] ?? D.brand, color: D.bg, fontWeight: 900, width: 36, height: 36, fontSize: 15 }}>
                            {avatarLetter(p)}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 900, fontSize: 14, color: p.user_id === user?.id ? D.brandText : D.t1 }}>
                              {p.displayUsername}{p.user_id === user?.id ? " (You)" : ""}
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: D.t3, fontFamily: MONO }}>{money(p.best_net_worth)}</Typography>
                          </Box>
                          <MilitaryTechIcon sx={{ color: MEDAL_COLORS[p.rank - 1] ?? D.t3, fontSize: 20 }} />
                        </Stack>
                      </Box>
                    ))
                  )}
                </Stack>
              </Box>
            </Grid>

            {/* Full table */}
            <Grid item xs={12} md={8}>
              <Box sx={{ ...CARD, p: 0, overflow: "hidden" }}>
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1} sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${D.border}` }}>
                  <Box>
                    <Typography sx={{ fontWeight: 900, fontSize: 16, color: D.t1 }}>Full Leaderboard</Typography>
                    <Typography sx={{ fontSize: 12.5, color: D.t3 }}>Best net worth per player across all game runs.</Typography>
                  </Box>
                  <Button size="small" startIcon={<RefreshIcon sx={{ fontSize: 14 }} />} onClick={() => setRefreshKey((k) => k + 1)}
                    sx={{ color: D.t2, border: `1px solid ${D.border}`, fontWeight: 700, textTransform: "none", borderRadius: 1.5, fontSize: 12, "&:hover": { color: D.t1, borderColor: D.borderHi } }}>
                    Refresh
                  </Button>
                </Stack>
                <Box sx={{ p: 2.5 }}>
                  {players.length === 0 ? (
                    <Box sx={{ p: 4, borderRadius: 2, bgcolor: D.elevated, border: `1px dashed ${D.borderHi}`, textAlign: "center" }}>
                      <Typography sx={{ fontWeight: 800, fontSize: 16, color: D.t1, mb: 0.5 }}>No players yet.</Typography>
                      <Typography sx={{ fontSize: 13, color: D.t3 }}>Complete a game run to appear on the leaderboard.</Typography>
                    </Box>
                  ) : (
                    <Stack spacing={1.2}>
                      {players.map((p) => {
                        const isYou    = p.user_id === user?.id;
                        const progress = Math.min(100, (p.best_net_worth / topNetWorth) * 100);
                        return (
                          <Box key={p.user_id} sx={{ p: 2, borderRadius: 2, bgcolor: isYou ? D.brandBg : D.elevated, border: `1px solid ${isYou ? D.brandBd : D.border}` }}>
                            <Grid container spacing={1.5} alignItems="center">
                              <Grid item xs={12} sm={1}>
                                <Chip label={`#${p.rank}`} size="small"
                                  sx={{ bgcolor: p.rank <= 3 ? D.brand : D.overlay, color: p.rank <= 3 ? "#fff" : D.t3, fontWeight: 900, fontSize: 10, fontFamily: MONO }} />
                              </Grid>
                              <Grid item xs={12} sm={3}>
                                <Typography sx={{ fontWeight: 900, fontSize: 13.5, color: isYou ? D.brandText : D.t1 }}>
                                  {p.displayUsername}{isYou ? " (You)" : ""}
                                </Typography>
                                <Typography sx={{ fontSize: 11.5, color: D.t3 }}>{p.badge}</Typography>
                              </Grid>
                              <Grid item xs={6} sm={2}>
                                <Typography sx={{ fontSize: 10.5, color: D.t3 }}>Net Worth</Typography>
                                <Typography sx={{ fontSize: 13, fontWeight: 800, color: D.t1, fontFamily: MONO }}>{money(p.best_net_worth)}</Typography>
                              </Grid>
                              <Grid item xs={6} sm={2}>
                                <Typography sx={{ fontSize: 10.5, color: D.t3 }}>Return</Typography>
                                <Typography sx={{ fontSize: 13, fontWeight: 800, color: p.return_pct >= 0 ? D.greenText : D.redText, fontFamily: MONO }}>
                                  {p.return_pct >= 0 ? "+" : ""}{p.return_pct.toFixed(1)}%
                                </Typography>
                              </Grid>
                              <Grid item xs={12} sm={4}>
                                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                                  <Typography sx={{ fontSize: 11, color: D.t3 }}>vs #1</Typography>
                                  <Typography sx={{ fontSize: 11, fontWeight: 800, color: isYou ? D.brandText : D.t2 }}>{Math.round(progress)}%</Typography>
                                </Stack>
                                <LinearProgress variant="determinate" value={progress}
                                  sx={{ height: 5, borderRadius: 99, bgcolor: D.border, "& .MuiLinearProgress-bar": { bgcolor: isYou ? D.brand : D.green, borderRadius: 99 } }} />
                              </Grid>
                            </Grid>
                          </Box>
                        );
                      })}
                    </Stack>
                  )}
                </Box>
              </Box>
            </Grid>
          </Grid>
        )}
      </Container>
    </Box>
  );
}
