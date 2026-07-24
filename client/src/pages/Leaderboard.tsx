import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Avatar, Box, Button, Chip, CircularProgress, Container, Grid,
  IconButton, InputAdornment, LinearProgress, Stack,
  TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import MilitaryTechIcon from "@mui/icons-material/MilitaryTech";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import TimerIcon from "@mui/icons-material/Timer";
import AllInclusiveIcon from "@mui/icons-material/AllInclusive";
import { Link as RouterLink } from "react-router-dom";
import { fetchLeaderboard } from "../lib/api";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useGame } from "../context/GameContext";
import { D, CARD, MONO, money } from "../theme/design";

// Framer Motion 11 predates React 19's stricter JSX return type.
const MotionPresence = AnimatePresence as React.FC<React.PropsWithChildren<{
  initial?: boolean;
  mode?: "sync" | "popLayout" | "wait";
}>>;

type LeaderboardRow = {
  run_id?: string;
  user_id: string;
  best_net_worth: number;
  return_pct: number;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  completed_at?: string;
};

type RankedPlayer = LeaderboardRow & {
  rank: number;
  displayUsername: string;
  badge: string;
  tierColor: string;
};

const MEDAL_COLORS = ["#F59E0B", "#94A3B8", "#C98B5F"];

const TIER_TOOLTIPS: Record<string, string> = {
  Champion: "Rank #1 — all-time highest net worth",
  Expert:   "Rank #2–3 — top 3 performers",
  Elite:    "Rank #4–10 — top 10 performers",
  Rising:   "Rank #11–25 — top 25 performers",
  Player:   "Rank #26+ — keep trading to climb",
};

function tierFor(rank: number): { label: string; color: string } {
  if (rank === 1) return { label: "Champion", color: "#F59E0B" };
  if (rank <= 3) return { label: "Expert",   color: "#94A3B8" };
  if (rank <= 10) return { label: "Elite",   color: D.brandText };
  if (rank <= 25) return { label: "Rising",  color: D.greenText };
  return { label: "Player", color: D.t3 };
}

function buildRanked(rows: LeaderboardRow[]): RankedPlayer[] {
  return rows.map((row, i) => {
    const tier = tierFor(i + 1);
    return {
      ...row,
      best_net_worth: Number(row.best_net_worth),
      return_pct:     Number(row.return_pct),
      rank:           i + 1,
      displayUsername: row.username ?? row.display_name ?? "Anonymous",
      badge:           tier.label,
      tierColor:       tier.color,
    };
  });
}

export default function Leaderboard() {
  const reduceMotion = useReducedMotion();
  const { user } = useAuth();
  const { syncSessionValue } = useGame();
  const [players, setPlayers]   = useState<RankedPlayer[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sortBy, setSortBy]     = useState<"net_worth" | "return_pct">("net_worth");
  const [category, setCategory] = useState<"infinite" | "thirty_day">("infinite");
  const [search, setSearch]     = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPlayers([]);

    (async () => {
      await syncSessionValue();
      if (cancelled) return;
      try {
        const rows = category === "thirty_day"
          ? await (async () => {
              const { data, error: rpcError } = await supabase.rpc(
                "get_30_day_leaderboard",
                { p_limit: 50 }
              );
              if (rpcError) throw rpcError;
              return data ?? [];
            })()
          : await fetchLeaderboard(50);
        if (cancelled) return;
        if (rpcError) { setError(rpcError.message); setLoading(false); return; }
        setPlayers(buildRanked((data ?? []) as LeaderboardRow[]));
      } catch (leaderboardError: any) {
        if (!cancelled) setError(leaderboardError?.message ?? "Could not load leaderboard.");
      }
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [category, refreshKey, syncSessionValue]);

  const sorted = useMemo(() => {
    const base = sortBy === "return_pct"
      ? [...players].sort((a, b) => b.return_pct - a.return_pct)
      : [...players].sort((a, b) => b.best_net_worth - a.best_net_worth);
    return base.map((p, i) => {
      const tier = tierFor(i + 1);
      return { ...p, rank: i + 1, badge: tier.label, tierColor: tier.color };
    });
  }, [players, sortBy]);

  const filtered = useMemo(() => {
    if (!search.trim()) return sorted;
    const q = search.toLowerCase();
    return sorted.filter((p) => p.displayUsername.toLowerCase().includes(q));
  }, [sorted, search]);

  const myRowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!loading && myRowRef.current) {
      setTimeout(() => myRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
    }
  }, [loading]);

  const topThree     = sorted.slice(0, 3);
  const currentEntry = user ? sorted.find((p) => p.user_id === user.id) : undefined;
  // "Top Net Worth" is the maximum net worth regardless of the active sort.
  const topNetWorth  = players.length
    ? players.reduce((max, p) => Math.max(max, p.best_net_worth), -Infinity)
    : null;
  // Progress bars are normalized across the currently-sorted metric's range, so
  // they stay meaningful even when every value is negative (e.g. Return %).
  const metricValues = sorted.map((p) => (sortBy === "net_worth" ? p.best_net_worth : p.return_pct));
  const metricMax    = metricValues.length ? Math.max(...metricValues) : 0;
  const metricMin    = metricValues.length ? Math.min(...metricValues) : 0;
  const metricRange  = metricMax - metricMin;
  const isThirtyDay = category === "thirty_day";
  const entryKey = (entry: RankedPlayer) => entry.run_id ?? entry.user_id;

  return (
    <Box sx={{ bgcolor: D.bg, minHeight: "100vh" }}>
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: D.surface, borderBottom: `1px solid ${D.border}` }}>
        <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={2}>
            <Box>
              <Chip label="GLOBAL RANKINGS" size="small"
                sx={{ bgcolor: D.brandBg, color: D.brandText, border: `1px solid ${D.brandBd}`, fontWeight: 900, fontSize: 10, fontFamily: MONO, letterSpacing: 1, mb: 1 }} />
              <Typography sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 950, color: D.t1, letterSpacing: -1 }}>Leaderboard</Typography>
              <Typography sx={{ fontSize: 13, color: D.t2, mt: 0.5 }}>
                {isThirtyDay ? "Completed 30-day challenges ranked by final net worth." : "Infinite runs ranked by each player's current net worth."}
              </Typography>
            </Box>
            <Box sx={{ ...CARD, p: 2.5, minWidth: 240 }}>
              <Typography sx={{ fontSize: 10.5, fontWeight: 900, color: D.t3, fontFamily: MONO, mb: 0.5 }}>YOUR RANK</Typography>
              <Typography sx={{ fontSize: 36, fontWeight: 950, color: D.brandText, fontFamily: MONO, lineHeight: 1 }}>
                {loading ? "—" : currentEntry ? `#${currentEntry.rank}` : "—"}
              </Typography>
              {currentEntry && (
                <>
                  <Typography sx={{ fontSize: 12, color: D.t3, mt: 0.5 }}>
                    {money(currentEntry.best_net_worth)} {isThirtyDay ? "best 30-day finish" : "current infinite net worth"}
                  </Typography>
                  <Tooltip title={TIER_TOOLTIPS[currentEntry.badge] ?? ""} placement="bottom" arrow>
                    <Chip label={currentEntry.badge} size="small"
                      sx={{ mt: 0.8, bgcolor: D.brandBg, color: currentEntry.tierColor, fontWeight: 800, fontSize: 10, cursor: "help" }} />
                  </Tooltip>
                </>
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
        <ToggleButtonGroup
          value={category}
          exclusive
          onChange={(_, value) => {
            if (!value) return;
            setCategory(value);
            setSearch("");
          }}
          sx={{
            mb: 3,
            "& .MuiToggleButton-root": {
              color: D.t2,
              borderColor: D.border,
              px: 2.2,
              py: 1,
              gap: 0.8,
              fontWeight: 800,
              fontSize: 12.5,
              textTransform: "none",
              "&.Mui-selected": {
                color: D.brandText,
                bgcolor: D.brandBg,
                borderColor: D.brandBd,
              },
            },
          }}
        >
          <ToggleButton value="infinite"><AllInclusiveIcon sx={{ fontSize: 17 }} />Infinite</ToggleButton>
          <ToggleButton value="thirty_day"><TimerIcon sx={{ fontSize: 17 }} />30-Day Runs</ToggleButton>
        </ToggleButtonGroup>

        {/* ── Stat tiles ───────────────────────────────────────────────────── */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: isThirtyDay ? "Top 30-Day Finish" : "Net Worth", val: isThirtyDay ? (topNetWorth !== null ? money(topNetWorth) : "—") : (currentEntry ? money(currentEntry.best_net_worth) : "—"), icon: <AccountBalanceWalletIcon sx={{ fontSize: 20 }} />, color: D.greenText, bg: D.greenBg },
            { label: isThirtyDay ? "Your Best 30-Day" : "Rank", val: isThirtyDay ? (currentEntry ? money(currentEntry.best_net_worth) : "—") : (currentEntry ? `#${currentEntry.rank}` : "—"), icon: <EmojiEventsIcon sx={{ fontSize: 20 }} />, color: "#F59E0B", bg: "rgba(245,158,11,0.1)" },
            { label: "Your Return",    val: currentEntry ? `${currentEntry.return_pct >= 0 ? "+" : ""}${currentEntry.return_pct.toFixed(1)}%` : "—", icon: <TrendingUpIcon sx={{ fontSize: 20 }} />, color: D.greenText, bg: D.greenBg },
            { label: isThirtyDay ? "Completed Runs" : "Players Ranked", val: loading ? "—" : players.length.toString(), icon: <WorkspacePremiumIcon sx={{ fontSize: 20 }} />, color: D.brandText, bg: D.brandBg },
          ].map((s, i) => (
            <Grid item xs={12} sm={6} md={3} key={s.label}>
              <Box component={motion.div} initial={reduceMotion ? undefined : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, delay: Math.min(i * 0.06, 0.24) }}
                sx={{ ...CARD, p: 2.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography sx={{ fontSize: 10.5, fontWeight: 900, color: D.t3, fontFamily: MONO, mb: 0.8 }}>{s.label.toUpperCase()}</Typography>
                    <motion.div key={s.val} initial={reduceMotion ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }}>
                      <Typography sx={{ fontSize: 20, fontWeight: 950, color: D.t1, fontFamily: MONO }}>{s.val}</Typography>
                    </motion.div>
                  </Box>
                  <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: s.bg, color: s.color, display: "grid", placeItems: "center", flexShrink: 0 }}>{s.icon}</Box>
                </Stack>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* ── Error ────────────────────────────────────────────────────────── */}
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
            {/* ── Podium + top 3 ─────────────────────────────────────────── */}
            <Grid item xs={12} md={4}>
              <Box sx={{ bgcolor: D.elevated, border: `1px solid ${D.border}`, borderRadius: 2, p: 3, height: "100%" }}>
                <Typography sx={{ fontWeight: 900, fontSize: 16, color: D.t1, mb: 0.5 }}>
                  {isThirtyDay ? "Best 30-Day Runs" : "Top Traders"}
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: D.t3, mb: 2.5 }}>
                  {isThirtyDay ? "The highest finishing values after Day 30." : "The strongest current infinite portfolios."}
                </Typography>

                {topThree.length === 0 ? (
                  <Typography sx={{ fontSize: 13, color: D.t3 }}>No ranked runs yet. Be the first!</Typography>
                ) : (
                  <>
                    {/* Visual podium: 2nd | 1st | 3rd */}
                    <Stack direction="row" alignItems="flex-end" justifyContent="center" spacing={1} sx={{ mb: 3 }}>
                      {([1, 0, 2] as const).map((idx) => {
                        const p = topThree[idx];
                        if (!p) return <Box key={idx} sx={{ flex: 1 }} />;
                        const podiumHeights = [130, 90, 70];
                        const isYou = p.user_id === user?.id;
                        return (
                          <Box key={entryKey(p)} sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                            <Avatar src={p.avatar_url ?? undefined}
                              sx={{
                                width: idx === 0 ? 52 : 40,
                                height: idx === 0 ? 52 : 40,
                                bgcolor: MEDAL_COLORS[idx],
                                color: "#09090F",
                                fontWeight: 900,
                                fontSize: idx === 0 ? 20 : 16,
                                mb: 0.8,
                                border: isYou ? `2px solid ${D.brand}` : "none",
                              }}>
                              {p.displayUsername[0]?.toUpperCase()}
                            </Avatar>
                            <Typography sx={{ fontSize: 11, fontWeight: 900, color: isYou ? D.brandText : D.t1, textAlign: "center", mb: 0.3, maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {p.displayUsername}
                            </Typography>
                            <Typography sx={{ fontSize: 10, color: D.t3, fontFamily: MONO, textAlign: "center", mb: 0.8 }}>
                              {sortBy === "net_worth" ? money(p.best_net_worth) : `${p.return_pct >= 0 ? "+" : ""}${p.return_pct.toFixed(1)}%`}
                            </Typography>
                            <Box sx={{
                              width: "100%",
                              height: podiumHeights[idx],
                              borderRadius: "4px 4px 0 0",
                              bgcolor: `${MEDAL_COLORS[idx]}18`,
                              border: `1px solid ${MEDAL_COLORS[idx]}33`,
                              borderBottom: "none",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}>
                              <Typography sx={{ fontSize: idx === 0 ? 22 : 18, fontWeight: 950, color: MEDAL_COLORS[idx], fontFamily: MONO }}>
                                #{p.rank}
                              </Typography>
                            </Box>
                          </Box>
                        );
                      })}
                    </Stack>

                    {/* Top-3 detail cards */}
                    <Stack spacing={1.5}>
                      <MotionPresence mode="popLayout" initial={false}>
                      {topThree.map((p) => (
                        <Box key={entryKey(p)} component={motion.div} layout={!reduceMotion}
                          initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -16 }}
                          transition={{ duration: 0.24, layout: { type: "spring", stiffness: 420, damping: 34 } }}
                          sx={{ p: 2, borderRadius: 2, bgcolor: D.surface, border: `1px solid ${p.user_id === user?.id ? D.brandBd : D.border}` }}>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar src={p.avatar_url ?? undefined}
                              sx={{ bgcolor: MEDAL_COLORS[p.rank - 1] ?? D.brand, color: "#09090F", fontWeight: 900, width: 36, height: 36, fontSize: 15 }}>
                              {p.displayUsername[0]?.toUpperCase()}
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography sx={{ fontWeight: 900, fontSize: 14, color: p.user_id === user?.id ? D.brandText : D.t1 }} noWrap>
                                {p.displayUsername}{p.user_id === user?.id ? " (You)" : ""}
                              </Typography>
                              <Typography sx={{ fontSize: 12, color: D.t3, fontFamily: MONO }}>
                                {sortBy === "net_worth" ? money(p.best_net_worth) : `${p.return_pct >= 0 ? "+" : ""}${p.return_pct.toFixed(1)}%`}
                              </Typography>
                            </Box>
                            <MilitaryTechIcon sx={{ color: MEDAL_COLORS[p.rank - 1] ?? D.t3, fontSize: 20 }} />
                          </Stack>
                        </Box>
                      ))}
                      </MotionPresence>
                    </Stack>
                  </>
                )}
              </Box>
            </Grid>

            {/* ── Full table ───────────────────────────────────────────────── */}
            <Grid item xs={12} md={8}>
              <Box sx={{ ...CARD, p: 0, overflow: "hidden" }}>
                {/* Header + controls */}
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1.5} sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${D.border}` }}>
                  <Box>
                    <Typography sx={{ fontWeight: 900, fontSize: 16, color: D.t1 }}>
                      {isThirtyDay ? "30-Day Run Rankings" : "Full Leaderboard"}
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, color: D.t3 }}>
                      {isThirtyDay ? "Every completed challenge is ranked by its Day-30 finish." : "Each player's latest infinite run ranked by current net worth."}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <ToggleButtonGroup
                      value={sortBy} exclusive size="small"
                      onChange={(_, v) => { if (v) setSortBy(v); }}
                      sx={{
                        "& .MuiToggleButton-root": {
                          color: D.t3, borderColor: D.border, fontSize: 11, fontWeight: 700,
                          textTransform: "none", px: 1.5, py: 0.6,
                          "&.Mui-selected": { color: D.brandText, bgcolor: D.brandBg, borderColor: D.brandBd },
                        },
                      }}>
                      <ToggleButton value="net_worth">Net Worth</ToggleButton>
                      <ToggleButton value="return_pct">Return %</ToggleButton>
                    </ToggleButtonGroup>
                    <motion.div whileHover={reduceMotion ? undefined : { rotate: 90 }} whileTap={reduceMotion ? undefined : { scale: 0.9 }} transition={{ duration: 0.2 }}>
                      <IconButton size="small" title="Refresh leaderboard" aria-label="Refresh leaderboard" onClick={() => setRefreshKey((k) => k + 1)}
                        sx={{ color: D.t2, border: `1px solid ${D.border}`, borderRadius: 1.5, p: 0.8, "&:hover": { color: D.t1, borderColor: D.borderHi } }}>
                        <RefreshIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </motion.div>
                  </Stack>
                </Stack>

                {/* Search */}
                <Box sx={{ px: 2.5, pt: 2, pb: 0.5 }}>
                  <TextField
                    fullWidth size="small" placeholder="Search players…"
                    value={search} onChange={(e) => setSearch(e.target.value)}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: D.t3 }} /></InputAdornment>,
                      endAdornment: search ? (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setSearch("")} sx={{ color: D.t3 }}>
                            <ClearIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </InputAdornment>
                      ) : null,
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        bgcolor: D.elevated, color: D.t1, borderRadius: 1.5,
                        "& fieldset": { borderColor: D.border },
                        "&:hover fieldset": { borderColor: D.borderHi },
                        "&.Mui-focused fieldset": { borderColor: D.brand },
                        "& input": { fontSize: 13, py: 0.9 },
                      },
                    }}
                  />
                </Box>

                {/* Rows */}
                <Box sx={{ p: 2.5 }}>
                  {filtered.length === 0 ? (
                    <Box sx={{ p: 4, borderRadius: 2, bgcolor: D.elevated, border: `1px dashed ${D.borderHi}`, textAlign: "center" }}>
                      <Typography sx={{ fontWeight: 800, fontSize: 16, color: D.t1, mb: 0.5 }}>
                        {players.length === 0 ? "No players yet." : "No results found."}
                      </Typography>
                      <Typography sx={{ fontSize: 13, color: D.t3 }}>
                        {players.length === 0 ? "Start a run to appear on the leaderboard." : "Try a different search term."}
                      </Typography>
                    </Box>
                  ) : (
                    <Stack spacing={1.2}>
                      <MotionPresence mode="popLayout" initial={false}>
                      {filtered.map((p, index) => {
                        const isYou    = p.user_id === user?.id;
                        const val      = sortBy === "net_worth" ? p.best_net_worth : p.return_pct;
                        const progress = Math.max(0, Math.min(100, metricRange > 0 ? ((val - metricMin) / metricRange) * 100 : 100));
                        const rankBg   = p.rank === 1 ? "rgba(245,158,11,0.12)" : p.rank === 2 ? "rgba(148,163,184,0.12)" : p.rank === 3 ? "rgba(201,139,95,0.12)" : D.overlay;
                        return (
                          <Box key={entryKey(p)} ref={isYou ? myRowRef : undefined} component={motion.div} layout={!reduceMotion}
                            initial={reduceMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -16 }}
                            transition={{ duration: 0.24, delay: Math.min(index * 0.02, 0.16), layout: { type: "spring", stiffness: 420, damping: 34 } }}
                            sx={{ p: 2, borderRadius: 2, bgcolor: isYou ? D.brandBg : D.elevated, border: `1px solid ${isYou ? D.brandBd : D.border}` }}>
                            <Grid container spacing={1.5} alignItems="center">
                              {/* Rank */}
                              <Grid item xs="auto">
                                <Chip label={`#${p.rank}`} size="small"
                                  sx={{ bgcolor: rankBg, color: p.rank <= 3 ? MEDAL_COLORS[p.rank - 1] : D.t3, fontWeight: 900, fontSize: 10, fontFamily: MONO, minWidth: 38 }} />
                              </Grid>

                              {/* Player */}
                              <Grid item xs>
                                <Stack direction="row" spacing={1.2} alignItems="center">
                                  <Avatar src={p.avatar_url ?? undefined}
                                    sx={{ width: 30, height: 30, bgcolor: D.brand, fontSize: 12, fontWeight: 900, flexShrink: 0 }}>
                                    {p.displayUsername[0]?.toUpperCase()}
                                  </Avatar>
                                  <Box sx={{ minWidth: 0 }}>
                                    <Typography sx={{ fontWeight: 900, fontSize: 13.5, color: isYou ? D.brandText : D.t1, lineHeight: 1.2 }} noWrap>
                                      {p.displayUsername}{isYou ? " (You)" : ""}
                                    </Typography>
                                    <Tooltip title={TIER_TOOLTIPS[p.badge] ?? ""} placement="top" arrow>
                                      <Chip label={p.badge} size="small"
                                        sx={{ height: 16, bgcolor: "transparent", color: p.tierColor, fontWeight: 800, fontSize: 9.5, cursor: "help", "& .MuiChip-label": { px: 0.8 } }} />
                                    </Tooltip>
                                    {isThirtyDay && p.completed_at && (
                                      <Typography sx={{ fontSize: 10, color: D.t3 }}>
                                        Finished {new Date(p.completed_at).toLocaleDateString()}
                                      </Typography>
                                    )}
                                  </Box>
                                </Stack>
                              </Grid>

                              {/* Net worth */}
                              <Grid item xs={12} sm={3}>
                                <Typography sx={{ fontSize: 10.5, color: D.t3 }}>Net Worth</Typography>
                                <Typography sx={{ fontSize: 13, fontWeight: 800, color: D.t1, fontFamily: MONO }}>{money(p.best_net_worth)}</Typography>
                              </Grid>

                              {/* Return */}
                              <Grid item xs={6} sm={2}>
                                <Typography sx={{ fontSize: 10.5, color: D.t3 }}>Return</Typography>
                                <Typography sx={{ fontSize: 13, fontWeight: 800, color: p.return_pct >= 0 ? D.greenText : D.redText, fontFamily: MONO }}>
                                  {p.return_pct >= 0 ? "+" : ""}{p.return_pct.toFixed(1)}%
                                </Typography>
                              </Grid>

                              {/* Progress bar */}
                              <Grid item xs={12} sm={3}>
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
                      </MotionPresence>
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
