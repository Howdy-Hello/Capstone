import React, { useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Chip, CircularProgress, Container, Dialog, DialogActions,
  DialogContent, DialogTitle, Grid, IconButton, Stack, Typography,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import RestoreIcon from "@mui/icons-material/Restore";
import DeleteIcon from "@mui/icons-material/Delete";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ShieldIcon from "@mui/icons-material/Shield";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CloseIcon from "@mui/icons-material/Close";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { isMissingDbObject, supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { GameMode, useGame } from "../context/GameContext";
import { D, CARD, MONO, money } from "../theme/design";
import { usePageTitle } from "../lib/usePageTitle";

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
  ranked?: boolean;
};

const UNRANKED_NOTE =
  "This run is now unranked: the save is from before the furthest day you've already played on this market, or from an unranked run. You can keep playing; it just won't appear on the leaderboards.";

export default function SaveLoad() {
  usePageTitle("Save & load");
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


  // Load slots from Supabase
  const fetchSlots = async () => {
    if (!user) {
      setSlots([]);
      setLoading(false);
      return;
    }
    setLoading(true);
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
    if (!user || trading.actionPending || saving || loadingSlot) return;
    if (slots.length >= MAX_SLOTS) {
      setMessage({ text: `Maximum ${MAX_SLOTS} save slots reached. Delete one first.`, severity: "error" });
      return;
    }

    setSaving(true);
    setMessage(null);
    // Snapshotted server-side from the session itself: a slot is restored into
    // cash and holdings, so the client can't be the one to write it.
    try {
      let { error } = await supabase.rpc("create_save_slot", {
        target_session_id: trading.sessionId,
        slot_name: `Day ${trading.gameDay} Run`,
      });
      if (isMissingDbObject(error)) {
        ({ error } = await supabase.rpc("create_save_slot", { slot_name: `Day ${trading.gameDay} Run` }));
      }
      if (error) {
        setMessage({ text: `Save failed: ${error.message}`, severity: "error" });
      } else {
        setMessage({ text: "Game saved to cloud.", severity: "success" });
        await fetchSlots();
      }
    } catch {
      setMessage({ text: "Save could not be confirmed. Refresh your saves before trying again.", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const loadSlot = async (slot: SaveSlot) => {
    if (!trading.sessionId) {
      setMessage({ text: "No active session to restore into.", severity: "error" });
      return;
    }
    setLoadingSlot(slot.id);

    try {
      const { data: restored, error } = await supabase.rpc("restore_save_slot", { p_slot_id: slot.id });

      if (error) {
        setMessage({ text: `Load failed: ${error.message}`, severity: "error" });
        return;
      }

      // Deliberately no setGameDay() here. restore_save_slot has already
      // written current_day, game_mode, game_seed, cash and holdings
      // authoritatively, and reloadSession() pulls all of it back into React.
      // Calling setGameDay would undo the restore: it clamps against the
      // PRE-restore gameMode still in React state (a day-90 infinite save
      // loaded while in limited_30 collapses to day 30) and forwards that
      // stale mode to advance_game_day, which overwrites the mode the RPC just
      // set and bills every weekly cycle between bills_paid_through_day and
      // the restored day in one lump against the restored cash.
      await trading.reloadSession();
      const loaded = `Loaded "${slot.slot_name}". Resuming from Day ${slot.game_day}.`;
      if ((restored as { ranked?: boolean } | null)?.ranked === false) {
        // Stay on the page so the player reads why the run left the leaderboards.
        setMessage({ text: `${loaded} ${UNRANKED_NOTE}`, severity: "success" });
        return;
      }
      setMessage({ text: loaded, severity: "success" });
      setTimeout(() => navigate("/game"), 800);
    } catch {
      setMessage({ text: "The saved run could not be loaded. Retry loading the game from Market.", severity: "error" });
    } finally {
      setLoadingSlot(null);
    }
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

                <Typography component="h1" sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 950, color: D.t1, letterSpacing: -1 }}>Save & Load</Typography>
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
                    <Button onClick={saveGame} variant="contained" size="small" disabled={trading.actionPending || loadingSlot !== null || saving || !user}
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
          <Grid item xs={12}>
            <Box sx={{ ...CARD, p: 0, overflow: "hidden" }}>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1} sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${D.border}` }}>
                <Box>
                  <Typography sx={{ fontWeight: 900, fontSize: 16, color: D.t1 }}>Cloud Saves</Typography>

                </Box>
                <Button onClick={saveGame} variant="contained" size="small" disabled={trading.actionPending || loadingSlot !== null || saving || slots.length >= MAX_SLOTS || !user}
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
                    <Button onClick={saveGame} variant="contained" disabled={trading.actionPending || loadingSlot !== null || saving}
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
                              {slot.ranked === false && (
                                <Chip label="Unranked" size="small"
                                  sx={{ mt: 0.5, height: 20, fontSize: 11, fontWeight: 800, color: D.t2, bgcolor: D.overlay, border: `1px solid ${D.border}` }} />
                              )}
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
                                    disabled={trading.actionPending || saving || loadingSlot !== null}
                                    startIcon={isLoading ? <CircularProgress size={12} sx={{ color: "#fff" }} /> : <RestoreIcon sx={{ fontSize: 14 }} />}
                                    onClick={() => loadSlot(slot)}
                                    sx={{ bgcolor: D.green, color: "#fff", fontWeight: 800, textTransform: "none", borderRadius: 1.5, boxShadow: "none", fontSize: 12, "&:hover": { bgcolor: "#16A34A", boxShadow: "none" } }}>
                                    Load
                                  </Button>
                                </motion.div>
                                <IconButton size="small" aria-label={`Delete ${slot.slot_name}`} onClick={() => setDeleteConfirm(slot)}
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


        </Grid>
      </Container>

      {/* Delete confirmation dialog */}
      <Dialog open={Boolean(deleteConfirm)} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { bgcolor: D.surface, border: `1px solid ${D.border}`, borderRadius: 3 } }}>
        <DialogTitle sx={{ bgcolor: D.elevated, borderBottom: `1px solid ${D.border}`, p: 2.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography sx={{ fontWeight: 900, fontSize: 16, color: D.t1 }}>Delete Save?</Typography>
            <IconButton size="small" aria-label="Close delete confirmation" onClick={() => setDeleteConfirm(null)} sx={{ color: D.t3 }}>
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
