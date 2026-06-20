import React, { useMemo, useState } from "react";
import {
  Alert, Box, Button, Chip, Container, Grid, Stack, Typography,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import CloudDoneIcon from "@mui/icons-material/CloudDone";
import RestoreIcon from "@mui/icons-material/Restore";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ShieldIcon from "@mui/icons-material/Shield";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import { Link as RouterLink } from "react-router-dom";
import { D, CARD, MONO, money } from "../theme/design";

type SaveSlot = {
  id: string; name: string; savedAt: string; gameDay: number;
  cash: number; netWorth: number; riskScore: number; portfolioGrowth: number;
};

const initialSlots: SaveSlot[] = [
  { id: "slot-1", name: "Main Trading Run",       savedAt: "Today, 3:42 PM",      gameDay: 12, cash: 7200,  netWorth: 18500, riskScore: 48, portfolioGrowth: 85 },
  { id: "slot-2", name: "Diversified Strategy",   savedAt: "Yesterday, 8:10 PM",  gameDay: 7,  cash: 9400,  netWorth: 14200, riskScore: 32, portfolioGrowth: 42 },
];

export default function SaveLoad() {
  const [saveSlots, setSaveSlots] = useState<SaveSlot[]>(() => {
    const saved = localStorage.getItem("stockpilot-save-slots");
    if (!saved) return initialSlots;
    try { return JSON.parse(saved) as SaveSlot[]; } catch { return initialSlots; }
  });
  const [message, setMessage] = useState<string | null>(null);
  const latestSlot = saveSlots[0];

  const summary = useMemo(() => ({
    bestNetWorth: Math.max(...saveSlots.map((s) => s.netWorth), 0),
    highestDay:   Math.max(...saveSlots.map((s) => s.gameDay), 0),
    avgRisk:      saveSlots.length ? Math.round(saveSlots.reduce((sum, s) => sum + s.riskScore, 0) / saveSlots.length) : 0,
  }), [saveSlots]);

  function saveGame() {
    const newSave: SaveSlot = {
      id: `slot-${Date.now()}`,
      name: `Auto Save ${saveSlots.length + 1}`,
      savedAt: "Just now",
      gameDay: latestSlot ? latestSlot.gameDay + 1 : 1,
      cash: latestSlot ? latestSlot.cash + 300 : 10000,
      netWorth: latestSlot ? latestSlot.netWorth + 750 : 10000,
      riskScore: latestSlot ? Math.max(10, latestSlot.riskScore - 2) : 40,
      portfolioGrowth: latestSlot ? latestSlot.portfolioGrowth + 8 : 0,
    };
    const updated = [newSave, ...saveSlots].slice(0, 4);
    setSaveSlots(updated);
    localStorage.setItem("stockpilot-save-slots", JSON.stringify(updated));
    setMessage("Game saved locally.");
  }

  function loadGame(slot: SaveSlot) {
    localStorage.setItem("stockpilot-current-save", JSON.stringify(slot));
    setMessage(`Loaded "${slot.name}". Continue from Day ${slot.gameDay}.`);
  }

  function clearSaves() {
    setSaveSlots([]);
    localStorage.removeItem("stockpilot-save-slots");
    localStorage.removeItem("stockpilot-current-save");
    setMessage("All local save slots cleared.");
  }

  return (
    <Box sx={{ bgcolor: D.bg, minHeight: "100vh" }}>
      {/* Hero */}
      <Box sx={{ bgcolor: D.surface, borderBottom: `1px solid ${D.border}` }}>
        <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={2}>
            <Box>
              <Chip label="SAVE SYSTEM" size="small" sx={{ bgcolor: D.brandBg, color: D.brandText, border: `1px solid ${D.brandBd}`, fontWeight: 900, fontSize: 10, fontFamily: MONO, letterSpacing: 1, mb: 1 }} />
              <Typography sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 950, color: D.t1, letterSpacing: -1 }}>Save & Load</Typography>
              <Typography sx={{ fontSize: 13, color: D.t2, mt: 0.5 }}>Store progress, reload strategies, and continue without restarting.</Typography>
            </Box>
            <Box sx={{ ...CARD, p: 2.5, minWidth: 300 }}>
              <Typography sx={{ fontSize: 10.5, fontWeight: 900, color: D.t3, fontFamily: MONO, mb: 0.5 }}>LATEST SAVE</Typography>
              <Typography sx={{ fontWeight: 800, fontSize: 15, color: D.t1, mb: 0.4 }}>{latestSlot ? latestSlot.name : "No save found"}</Typography>
              <Typography sx={{ fontSize: 12.5, color: D.t3, mb: 1.5 }}>
                {latestSlot ? `${latestSlot.savedAt} · Day ${latestSlot.gameDay}` : "Create a save slot to store progress."}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button onClick={saveGame} variant="contained" size="small" startIcon={<SaveIcon sx={{ fontSize: 14 }} />}
                  sx={{ bgcolor: D.brand, fontWeight: 800, textTransform: "none", borderRadius: 1.5, boxShadow: "none", fontSize: 12, "&:hover": { bgcolor: D.brandMid, boxShadow: "none" } }}>
                  Save Game
                </Button>
                <Button component={RouterLink} to="/game" size="small"
                  sx={{ color: D.t2, border: `1px solid ${D.border}`, fontWeight: 700, textTransform: "none", borderRadius: 1.5, fontSize: 12, "&:hover": { color: D.t1, borderColor: D.borderHi } }}>
                  Back to Game
                </Button>
              </Stack>
            </Box>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
        {message && (
          <Alert severity="success" onClose={() => setMessage(null)}
            sx={{ mb: 2.5, bgcolor: D.greenBg, color: D.greenText, border: `1px solid ${D.greenBd}`, "& .MuiAlert-icon": { color: D.greenText }, fontWeight: 700, borderRadius: 2 }}>
            {message}
          </Alert>
        )}

        {/* Stats */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: "Save Slots",       val: saveSlots.length.toString(),  icon: <FolderOpenIcon sx={{ fontSize: 20 }} />,        up: true },
            { label: "Best Net Worth",   val: money(summary.bestNetWorth),  icon: <AccountBalanceWalletIcon sx={{ fontSize: 20 }} />, up: true },
            { label: "Highest Day",      val: `Day ${summary.highestDay}`,  icon: <CalendarTodayIcon sx={{ fontSize: 20 }} />,     up: undefined },
            { label: "Avg Risk Score",   val: `${summary.avgRisk}/100`,     icon: <ShieldIcon sx={{ fontSize: 20 }} />,            up: false },
          ].map((s) => {
            const color = s.up === undefined ? D.brandText : s.up ? D.greenText : D.redText;
            const bg    = s.up === undefined ? D.brandBg   : s.up ? D.greenBg   : D.redBg;
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
          {/* Save slots */}
          <Grid item xs={12} md={8}>
            <Box sx={{ ...CARD, p: 0, overflow: "hidden" }}>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1} sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${D.border}` }}>
                <Box>
                  <Typography sx={{ fontWeight: 900, fontSize: 16, color: D.t1 }}>Saved Games</Typography>
                  <Typography sx={{ fontSize: 12.5, color: D.t3 }}>Load a previous run or create a new save.</Typography>
                </Box>
                <Button onClick={saveGame} variant="contained" size="small" startIcon={<SaveIcon sx={{ fontSize: 14 }} />}
                  sx={{ bgcolor: D.brand, fontWeight: 800, textTransform: "none", borderRadius: 1.5, boxShadow: "none", fontSize: 12, "&:hover": { bgcolor: D.brandMid, boxShadow: "none" } }}>
                  New Save
                </Button>
              </Stack>
              <Box sx={{ p: 2.5 }}>
                {saveSlots.length === 0 ? (
                  <Box sx={{ p: 4, borderRadius: 2, bgcolor: D.elevated, border: `1px dashed ${D.borderHi}`, textAlign: "center" }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 16, color: D.t1, mb: 0.5 }}>No saved games yet.</Typography>
                    <Typography sx={{ fontSize: 13, color: D.t3, mb: 2 }}>Save your current game to create your first slot.</Typography>
                    <Button onClick={saveGame} variant="contained"
                      sx={{ bgcolor: D.brand, fontWeight: 800, textTransform: "none", borderRadius: 1.5, boxShadow: "none", "&:hover": { bgcolor: D.brandMid, boxShadow: "none" } }}>
                      Save Game
                    </Button>
                  </Box>
                ) : (
                  <Stack spacing={1.2}>
                    {saveSlots.map((slot) => (
                      <Box key={slot.id} sx={{ p: 2, borderRadius: 2, bgcolor: D.elevated, border: `1px solid ${D.border}` }}>
                        <Grid container spacing={1.5} alignItems="center">
                          <Grid item xs={12} sm={3.5}>
                            <Typography sx={{ fontWeight: 900, fontSize: 14, color: D.t1 }}>{slot.name}</Typography>
                            <Typography sx={{ fontSize: 12, color: D.t3 }}>{slot.savedAt}</Typography>
                          </Grid>
                          {[
                            { label: "Day",      val: slot.gameDay.toString() },
                            { label: "Net Worth", val: money(slot.netWorth) },
                            { label: "Growth",   val: `+${slot.portfolioGrowth}%`, color: D.greenText },
                            { label: "Risk",     val: `${slot.riskScore}/100`,    color: D.redText },
                          ].map((m) => (
                            <Grid item xs={6} sm={1.5} key={m.label}>
                              <Typography sx={{ fontSize: 10.5, color: D.t3 }}>{m.label}</Typography>
                              <Typography sx={{ fontSize: 13, fontWeight: 800, color: (m as any).color ?? D.t1, fontFamily: MONO }}>{m.val}</Typography>
                            </Grid>
                          ))}
                          <Grid item xs={12} sm={1}>
                            <Button fullWidth size="small" variant="contained" startIcon={<RestoreIcon sx={{ fontSize: 14 }} />} onClick={() => loadGame(slot)}
                              sx={{ bgcolor: D.green, color: "#fff", fontWeight: 800, textTransform: "none", borderRadius: 1.5, boxShadow: "none", fontSize: 12, "&:hover": { bgcolor: "#16A34A", boxShadow: "none" } }}>
                              Load
                            </Button>
                          </Grid>
                        </Grid>
                      </Box>
                    ))}
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
                <Typography sx={{ fontSize: 13, color: D.t3, mb: 2 }}>Use saves before major trades, risky decisions, or after strong growth.</Typography>
                <Stack spacing={1}>
                  {[
                    "Save before using most of your cash.",
                    "Save after reaching a new net worth high.",
                    "Load an old run to compare strategies.",
                    "MongoDB cloud saves coming in a future update.",
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
                <Typography sx={{ fontSize: 13, color: D.t3, mb: 2 }}>Using browser localStorage for now.</Typography>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: 2, borderRadius: 2, bgcolor: D.elevated, border: `1px solid ${D.border}`, mb: 2 }}>
                  <CloudDoneIcon sx={{ color: D.greenText, fontSize: 20 }} />
                  <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: 13.5, color: D.t1 }}>Local Save Active</Typography>
                    <Typography sx={{ fontSize: 12, color: D.t3 }}>Ready to connect to backend later.</Typography>
                  </Box>
                </Stack>
                <Button fullWidth onClick={clearSaves}
                  sx={{ color: D.redText, border: `1px solid ${D.redBd}`, fontWeight: 800, textTransform: "none", borderRadius: 1.5, fontSize: 13, "&:hover": { bgcolor: D.redBg } }}>
                  Clear Local Saves
                </Button>
              </Box>
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
