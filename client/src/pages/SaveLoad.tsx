import React, { useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Chip, CircularProgress, Container, Dialog, DialogActions,
  DialogContent, DialogTitle, Grid, IconButton, Stack, Typography,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import CloudDoneIcon from "@mui/icons-material/CloudDone";
import RestoreIcon from "@mui/icons-material/Restore";
import DeleteIcon from "@mui/icons-material/Delete";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ShieldIcon from "@mui/icons-material/Shield";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CloseIcon from "@mui/icons-material/Close";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { GameMode, useGame } from "../context/GameContext";
import { getNetWorth } from "../data/tradingState";
import { D, CARD, MONO, money } from "../theme/design";

// Framer Motion 11 predates React 19's stricter JSX return type.
const MotionPresence = AnimatePresence as React.FC<React.PropsWithChildren<{
  initial?: boolean;
  mode?: "sync" | "popLayout" | "wait";
}>>;

const MAX_SLOTS = 4;

type HoldingSnapshot = {
  symbol: string;
  shares: number;
  averageCost: number;
};

type SaveSlot = {
  id: string;
  slot_name: string;
  game_day: number;
  game_mode: GameMode;
  game_seed?: string | null;
  cash_balance: number;
  net_worth: number;
  holdings_snapshot: HoldingSnapshot[];
  created_at: string;
};

function isMissingSeedColumn(error: { message?: string } | null | undefined) {
  return Boolean(error?.message?.toLowerCase().includes("game_seed"));
}

export default function SaveLoad() {
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const { user } = useAuth();
  const trading  = useGame();

  const [slots, setSlots]         = useState<SaveSlot[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [loadingSlot, setLoadingSlot] = useState<string | null>(null);
  const [message, setMessage]     = useState<{ text: string; severity: "success" | "error" } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<SaveSlot | null>(null);

  const netWorth = useMemo(() => getNetWorth(trading.account, trading.stocks), [trading.account, trading.stocks]);

  // Load slots from Supabase
  const fetchSlots = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("save_slots")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(MAX_SLOTS);

    if (error) {
      setMessage({ text: `Could not load saves: ${error.message}`, severity: "error" });
    } else {
      setSlots((data ?? []) as SaveSlot[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSlots();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveGame = async () => {
    if (!user) return;
    if (slots.length >= MAX_SLOTS) {
      setMessage({ text: `Maximum ${MAX_SLOTS} save slots reached. Delete one first.`, severity: "error" });
      return;
    }

    setSaving(true);
    const holdingsSnapshot: HoldingSnapshot[] = trading.account.holdings.map((h) => ({
      symbol:      h.symbol,
      shares:      h.shares,
      averageCost: h.averageCost,
    }));

    const savePayload = {
      user_id:           user.id,
      slot_name:         `Day ${trading.gameDay} Run`,
      game_day:          trading.gameDay,
      game_mode:         trading.gameMode,
      game_seed:         trading.marketSeed,
      cash_balance:      trading.account.cash,
      net_worth:         netWorth,
      holdings_snapshot: holdingsSnapshot,
    };

    let { error } = await supabase.from("save_slots").insert(savePayload);

    if (isMissingSeedColumn(error)) {
      const legacyPayload: Omit<typeof savePayload, "game_seed"> & { game_seed?: string } = {
        ...savePayload,
      };
      delete legacyPayload.game_seed;
      const retry = await supabase.from("save_slots").insert(legacyPayload);
      error = retry.error;
    }

    if (error) {
      setMessage({ text: `Save failed: ${error.message}`, severity: "error" });
    } else {
      setMessage({ text: "Game saved to cloud.", severity: "success" });
      await fetchSlots();
    }
    setSaving(false);
  };

  const loadSlot = async (slot: SaveSlot) => {
    if (!trading.sessionId) {
      setMessage({ text: "No active session to restore into.", severity: "error" });
      return;
    }
    setLoadingSlot(slot.id);

    const { error } = await supabase.rpc("restore_save_slot", { p_slot_id: slot.id });

    if (error) {
      setMessage({ text: `Load failed: ${error.message}`, severity: "error" });
      setLoadingSlot(null);
      return;
    }

    await trading.setGameDay(slot.game_day);
    await trading.reloadSession();
    setMessage({ text: `Loaded "${slot.slot_name}". Resuming from Day ${slot.game_day}.`, severity: "success" });
    setLoadingSlot(null);
    setTimeout(() => navigate("/game"), 800);
  };

  const deleteSlot = async (slot: SaveSlot) => {
    const { error } = await supabase.from("save_slots").delete().eq("id", slot.id);
    if (error) {
      setMessage({ text: `Delete failed: ${error.message}`, severity: "error" });
    } else {
      setMessage({ text: `"${slot.slot_name}" deleted.`, severity: "success" });
      setSlots((prev) => prev.filter((s) => s.id !== slot.id));
    }
    setDeleteConfirm(null);
  };

  const summary = useMemo(() => ({
    bestNetWorth: slots.length ? Math.max(...slots.map((s) => s.net_worth)) : 0,
    highestDay:   slots.length ? Math.max(...slots.map((s) => s.game_day)) : 0,
  }), [slots]);

  const latestSlot = slots[0];
  const currentModeLabel = trading.gameMode === "limited_30" ? "30-Day" : "Infinite";

  return (
    <Box sx={{ bgcolor: D.bg, minHeight: "100vh" }}>
      {/* Hero */}
      <Box sx={{ bgcolor: D.surface, borderBottom: `1px solid ${D.border}` }}>
        <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
          <motion.div initial={reduceMotion ? undefined : { opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={2}>
              <Box>
                <Chip label="SAVE SYSTEM" size="small"
                  sx={{ bgcolor: D.brandBg, color: D.brandText, border: `1px solid ${D.brandBd}`, fontWeight: 900, fontSize: 10, fontFamily: MONO, letterSpacing: 1, mb: 1 }} />
                <Typography sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 950, color: D.t1, letterSpacing: -1 }}>Save & Load</Typography>
                <Typography sx={{ fontSize: 13, color: D.t2, mt: 0.5 }}>
                  Cloud saves persist across devices. Up to {MAX_SLOTS} slots.
                </Typography>
              </Box>
              <Box sx={{ ...CARD, p: 2.5, minWidth: 300 }}>
                <Typography sx={{ fontSize: 10.5, fontWeight: 900, color: D.t3, fontFamily: MONO, mb: 0.5 }}>LATEST SAVE</Typography>
                <Typography sx={{ fontWeight: 800, fontSize: 15, color: D.t1, mb: 0.4 }}>
                  {latestSlot ? latestSlot.slot_name : "No cloud saves yet"}
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: D.t3, mb: 1.5 }}>
                  {latestSlot
                    ? `${new Date(latestSlot.created_at).toLocaleString()} · Day ${latestSlot.game_day}`
                    : "Save your current game to create a slot."}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <motion.div whileHover={reduceMotion || saving || !user ? undefined : { y: -2 }} whileTap={reduceMotion || saving || !user ? undefined : { scale: 0.96 }}>
                    <Button onClick={saveGame} variant="contained" size="small" disabled={saving || !user}
                      startIcon={saving ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : <SaveIcon sx={{ fontSize: 14 }} />}
                      sx={{ bgcolor: D.brand, fontWeight: 800, textTransform: "none", borderRadius: 1.5, boxShadow: "none", fontSize: 12, "&:hover": { bgcolor: D.brandMid, boxShadow: "none" } }}>
                      {saving ? "Saving…" : "Save Game"}
                    </Button>
                  </motion.div>
                  <Button component={RouterLink} to="/game" size="small"
                    sx={{ color: D.t2, border: `1px solid ${D.border}`, fontWeight: 700, textTransform: "none", borderRadius: 1.5, fontSize: 12, "&:hover": { color: D.t1, borderColor: D.borderHi } }}>
                    Back to Game
                  </Button>
                </Stack>
              </Box>
            </Stack>
          </motion.div>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
        <MotionPresence initial={false}>
          {message && (
            <motion.div initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={{ type: "spring", stiffness: 420, damping: 30 }}>
              <Alert severity={message.severity} onClose={() => setMessage(null)}
                sx={{ mb: 2.5, bgcolor: message.severity === "success" ? D.greenBg : D.redBg, color: message.severity === "success" ? D.greenText : D.redText, border: `1px solid ${message.severity === "success" ? D.greenBd : D.redBd}`, "& .MuiAlert-icon": { color: message.severity === "success" ? D.greenText : D.redText }, fontWeight: 700, borderRadius: 2 }}>
                {message.text}
              </Alert>
            </motion.div>
          )}
        </MotionPresence>

        {/* Stats */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: "Save Slots",     val: `${slots.length} / ${MAX_SLOTS}`, icon: <FolderOpenIcon sx={{ fontSize: 20 }} />,           up: true      },
            { label: "Current Day",    val: `Day ${trading.gameDay}`,          icon: <CalendarTodayIcon sx={{ fontSize: 20 }} />,        up: undefined },
            { label: "Mode",           val: currentModeLabel,                  icon: <ShieldIcon sx={{ fontSize: 20 }} />,               up: undefined },
            { label: "Best Net Worth", val: money(summary.bestNetWorth),       icon: <AccountBalanceWalletIcon sx={{ fontSize: 20 }} />, up: true      },
          ].map((s, i) => {
            const color = s.up === undefined ? D.brandText : D.greenText;
            const bg    = s.up === undefined ? D.brandBg   : D.greenBg;
            return (
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
                    <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: bg, color, display: "grid", placeItems: "center", flexShrink: 0 }}>{s.icon}</Box>
                  </Stack>
                </Box>
              </Grid>
            );
          })}
        </Grid>

        <Grid container spacing={3}>
          {/* Save slots list */}
          <Grid item xs={12} md={8}>
            <Box sx={{ ...CARD, p: 0, overflow: "hidden" }}>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1} sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${D.border}` }}>
                <Box>
                  <Typography sx={{ fontWeight: 900, fontSize: 16, color: D.t1 }}>Cloud Saves</Typography>
                  <Typography sx={{ fontSize: 12.5, color: D.t3 }}>Snapshots of your game state stored in the cloud.</Typography>
                </Box>
                <Button onClick={saveGame} variant="contained" size="small" disabled={saving || slots.length >= MAX_SLOTS || !user}
                  startIcon={<SaveIcon sx={{ fontSize: 14 }} />}
                  sx={{ bgcolor: D.brand, fontWeight: 800, textTransform: "none", borderRadius: 1.5, boxShadow: "none", fontSize: 12, "&:hover": { bgcolor: D.brandMid, boxShadow: "none" } }}>
                  New Save
                </Button>
              </Stack>

              <Box sx={{ p: 2.5 }}>
                {loading ? (
                  <Box sx={{ display: "grid", placeItems: "center", py: 4 }}>
                    <CircularProgress sx={{ color: D.brandText }} />
                  </Box>
                ) : slots.length === 0 ? (
                  <Box sx={{ p: 4, borderRadius: 2, bgcolor: D.elevated, border: `1px dashed ${D.borderHi}`, textAlign: "center" }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 16, color: D.t1, mb: 0.5 }}>No cloud saves yet.</Typography>
                    <Typography sx={{ fontSize: 13, color: D.t3, mb: 2 }}>Save your current game to create your first cloud slot.</Typography>
                    <Button onClick={saveGame} variant="contained" disabled={saving}
                      sx={{ bgcolor: D.brand, fontWeight: 800, textTransform: "none", borderRadius: 1.5, boxShadow: "none", "&:hover": { bgcolor: D.brandMid, boxShadow: "none" } }}>
                      Save Game
                    </Button>
                  </Box>
                ) : (
                  <Stack spacing={1.2}>
                    <MotionPresence mode="popLayout" initial={false}>
                    {slots.map((slot, index) => {
                      const returnPct = ((slot.net_worth - 2000) / 2000) * 100;
                      const isLoading = loadingSlot === slot.id;
                      return (
                        <Box key={slot.id} component={motion.div} layout={!reduceMotion}
                          initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -16 }}
                          transition={{ duration: 0.22, delay: Math.min(index * 0.03, 0.18), layout: { type: "spring", stiffness: 420, damping: 34 } }}
                          sx={{ p: 2, borderRadius: 2, bgcolor: D.elevated, border: `1px solid ${D.border}` }}>
                          <Grid container spacing={1.5} alignItems="center">
                            <Grid item xs={12} sm={3.5}>
                              <Typography sx={{ fontWeight: 900, fontSize: 14, color: D.t1 }}>{slot.slot_name}</Typography>
                              <Typography sx={{ fontSize: 12, color: D.t3 }}>{new Date(slot.created_at).toLocaleString()}</Typography>
                            </Grid>
                            {[
                              { label: "Day",      val: `${slot.game_day}`,            color: undefined },
                              { label: "Mode",     val: slot.game_mode === "limited_30" ? "30D" : "Inf", color: undefined },
                              { label: "Net Worth", val: money(slot.net_worth),         color: undefined },
                              { label: "Return",   val: `${returnPct >= 0 ? "+" : ""}${returnPct.toFixed(1)}%`, color: returnPct >= 0 ? D.greenText : D.redText },
                            ].map((m) => (
                              <Grid item xs={6} sm={1.5} key={m.label}>
                                <Typography sx={{ fontSize: 10.5, color: D.t3 }}>{m.label}</Typography>
                                <Typography sx={{ fontSize: 13, fontWeight: 800, color: m.color ?? D.t1, fontFamily: MONO }}>{m.val}</Typography>
                              </Grid>
                            ))}
                            <Grid item xs={12} sm={2}>
                              <Stack direction="row" spacing={0.8}>
                                <motion.div style={{ flex: 1 }} whileHover={reduceMotion || isLoading ? undefined : { scale: 1.02 }} whileTap={reduceMotion || isLoading ? undefined : { scale: 0.96 }}>
                                  <Button fullWidth size="small" variant="contained"
                                    disabled={isLoading}
                                    startIcon={isLoading ? <CircularProgress size={12} sx={{ color: "#fff" }} /> : <RestoreIcon sx={{ fontSize: 14 }} />}
                                    onClick={() => loadSlot(slot)}
                                    sx={{ bgcolor: D.green, color: "#fff", fontWeight: 800, textTransform: "none", borderRadius: 1.5, boxShadow: "none", fontSize: 12, "&:hover": { bgcolor: "#16A34A", boxShadow: "none" } }}>
                                    Load
                                  </Button>
                                </motion.div>
                                <IconButton size="small" onClick={() => setDeleteConfirm(slot)}
                                  sx={{ color: D.t3, border: `1px solid ${D.border}`, borderRadius: 1.5, "&:hover": { color: D.redText, borderColor: D.redBd, bgcolor: D.redBg } }}>
                                  <DeleteIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Stack>
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

          {/* Sidebar */}
          <Grid item xs={12} md={4}>
            <Stack spacing={2.5}>
              <Box sx={{ bgcolor: D.elevated, border: `1px solid ${D.border}`, borderRadius: 2, p: 3 }}>
                <Typography sx={{ fontWeight: 900, fontSize: 15, color: D.t1, mb: 0.5 }}>Save Strategy</Typography>
                <Typography sx={{ fontSize: 13, color: D.t3, mb: 2 }}>Use saves before risky trades or after strong growth days.</Typography>
                <Stack spacing={1}>
                  {[
                    "Save before spending most of your cash.",
                    "Save after reaching a new net worth high.",
                    "Load an earlier run to compare strategies.",
                    "Up to 4 cloud saves per account.",
                  ].map((tip) => (
                    <Stack key={tip} direction="row" spacing={1} alignItems="flex-start">
                      <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: D.brandText, mt: 0.8, flexShrink: 0 }} />
                      <Typography sx={{ fontSize: 13, color: D.t2, lineHeight: 1.6 }}>{tip}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>

              <Box sx={{ ...CARD, p: 3 }}>
                <Typography sx={{ fontWeight: 900, fontSize: 15, color: D.t1, mb: 0.5 }}>Storage Status</Typography>
                <Typography sx={{ fontSize: 13, color: D.t3, mb: 2 }}>Saves are stored in Supabase and sync across devices.</Typography>
                <Stack direction="row" spacing={1.5} alignItems="center"
                  sx={{ p: 2, borderRadius: 2, bgcolor: D.elevated, border: `1px solid ${D.border}`, mb: 2 }}>
                  <CloudDoneIcon sx={{ color: D.greenText, fontSize: 20 }} />
                  <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: 13.5, color: D.t1 }}>Cloud Save Active</Typography>
                    <Typography sx={{ fontSize: 12, color: D.t3 }}>{user ? `Signed in as ${user.email}` : "Sign in to use cloud saves."}</Typography>
                  </Box>
                </Stack>
              </Box>
            </Stack>
          </Grid>
        </Grid>
      </Container>

      {/* Delete confirmation dialog */}
      <Dialog open={Boolean(deleteConfirm)} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { bgcolor: D.surface, border: `1px solid ${D.border}`, borderRadius: 3 } }}>
        <DialogTitle sx={{ bgcolor: D.elevated, borderBottom: `1px solid ${D.border}`, p: 2.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography sx={{ fontWeight: 900, fontSize: 16, color: D.t1 }}>Delete Save?</Typography>
            <IconButton size="small" onClick={() => setDeleteConfirm(null)} sx={{ color: D.t3 }}>
              <CloseIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ bgcolor: D.bg, p: 2.5 }}>
          <Typography sx={{ fontSize: 14, color: D.t2 }}>
            This will permanently delete <strong style={{ color: D.t1 }}>{deleteConfirm?.slot_name}</strong>. This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ bgcolor: D.elevated, borderTop: `1px solid ${D.border}`, p: 2 }}>
          <Button onClick={() => setDeleteConfirm(null)}
            sx={{ color: D.t3, fontWeight: 700, textTransform: "none", borderRadius: 1.5, "&:hover": { color: D.t1, bgcolor: D.overlay } }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={() => deleteConfirm && deleteSlot(deleteConfirm)}
            sx={{ bgcolor: D.red, color: "#fff", fontWeight: 800, textTransform: "none", borderRadius: 1.5, boxShadow: "none", "&:hover": { bgcolor: "#DC2626", boxShadow: "none" } }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
