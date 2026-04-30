import React, { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import CloudDoneIcon from "@mui/icons-material/CloudDone";
import RestoreIcon from "@mui/icons-material/Restore";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import ShieldIcon from "@mui/icons-material/Shield";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import { Link as RouterLink } from "react-router-dom";

const BRAND = {
  navy: "#2C3947",
  red: "#FF3737",
  green: "#9AD872",
  background: "#F5F7F9",
};

type SaveSlot = {
  id: string;
  name: string;
  savedAt: string;
  gameDay: number;
  cash: number;
  netWorth: number;
  riskScore: number;
  portfolioGrowth: number;
};

const initialSlots: SaveSlot[] = [
  {
    id: "slot-1",
    name: "Main Trading Run",
    savedAt: "Today, 3:42 PM",
    gameDay: 12,
    cash: 7200,
    netWorth: 18500,
    riskScore: 48,
    portfolioGrowth: 85,
  },
  {
    id: "slot-2",
    name: "Diversified Strategy",
    savedAt: "Yesterday, 8:10 PM",
    gameDay: 7,
    cash: 9400,
    netWorth: 14200,
    riskScore: 32,
    portfolioGrowth: 42,
  },
];

export default function SaveLoad() {
  const [saveSlots, setSaveSlots] = useState<SaveSlot[]>(() => {
    const saved = localStorage.getItem("stockpilot-save-slots");

    if (!saved) return initialSlots;

    try {
      return JSON.parse(saved) as SaveSlot[];
    } catch {
      return initialSlots;
    }
  });

  const [message, setMessage] = useState<string | null>(null);

  const latestSlot = saveSlots[0];

  const summary = useMemo(() => {
    const bestNetWorth = Math.max(...saveSlots.map((slot) => slot.netWorth));
    const highestDay = Math.max(...saveSlots.map((slot) => slot.gameDay));
    const avgRisk =
      saveSlots.reduce((sum, slot) => sum + slot.riskScore, 0) / saveSlots.length;

    return {
      bestNetWorth,
      highestDay,
      avgRisk: Math.round(avgRisk),
    };
  }, [saveSlots]);

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

    const updatedSlots = [newSave, ...saveSlots].slice(0, 4);
    setSaveSlots(updatedSlots);
    localStorage.setItem("stockpilot-save-slots", JSON.stringify(updatedSlots));
    setMessage("Game saved locally. Later, this can be replaced with MongoDB.");
  }

  function loadGame(slot: SaveSlot) {
    localStorage.setItem("stockpilot-current-save", JSON.stringify(slot));
    setMessage(`Loaded "${slot.name}". You can now continue from game day ${slot.gameDay}.`);
  }

  function clearSaves() {
    setSaveSlots([]);
    localStorage.removeItem("stockpilot-save-slots");
    localStorage.removeItem("stockpilot-current-save");
    setMessage("All local save slots cleared.");
  }

  return (
    <Box sx={{ bgcolor: BRAND.background, minHeight: "100vh" }}>
      <Box
        sx={{
          bgcolor: BRAND.navy,
          color: "#fff",
          px: { xs: 3, md: 8 },
          py: { xs: 5, md: 7 },
        }}
      >
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={7}>
            <Chip
              icon={<CloudDoneIcon />}
              label="Save System"
              sx={{
                bgcolor: "rgba(154,216,114,0.18)",
                color: BRAND.green,
                fontWeight: 900,
                mb: 2,
              }}
            />

            <Typography
              variant="h2"
              sx={{
                fontWeight: 950,
                letterSpacing: -1.5,
                lineHeight: 1.05,
                mb: 2,
              }}
            >
              Save your run. Continue later.
            </Typography>

            <Typography
              sx={{
                color: "rgba(255,255,255,0.72)",
                maxWidth: 720,
                fontSize: 18,
              }}
            >
              Store your game progress, reload previous strategies, and continue
              your trading simulation without restarting from zero.
            </Typography>
          </Grid>

          <Grid item xs={12} md={5}>
            <Card
              sx={{
                bgcolor: "rgba(255,255,255,0.08)",
                color: "#fff",
                borderRadius: 4,
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Typography sx={{ opacity: 0.65, fontWeight: 800 }}>
                  LATEST SAVE
                </Typography>

                <Typography variant="h4" sx={{ fontWeight: 950, my: 1 }}>
                  {latestSlot ? latestSlot.name : "No Save Found"}
                </Typography>

                <Typography sx={{ color: "rgba(255,255,255,0.7)", mb: 3 }}>
                  {latestSlot
                    ? `Saved ${latestSlot.savedAt} • Game Day ${latestSlot.gameDay}`
                    : "Create a save slot to store your current progress locally."}
                </Typography>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={saveGame}
                    sx={{
                      bgcolor: BRAND.red,
                      fontWeight: 950,
                      borderRadius: 2.2,
                      "&:hover": { bgcolor: "#E63131" },
                    }}
                  >
                    Save Game
                  </Button>

                  <Button
                    variant="outlined"
                    component={RouterLink}
                    to="/game"
                    sx={{
                      borderColor: "rgba(255,255,255,0.35)",
                      color: "#fff",
                      fontWeight: 950,
                      borderRadius: 2.2,
                      "&:hover": {
                        borderColor: "#fff",
                        bgcolor: "rgba(255,255,255,0.08)",
                      },
                    }}
                  >
                    Back to Game
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ px: { xs: 2, md: 8 }, py: 4 }}>
        {message && (
          <Alert
            severity="success"
            onClose={() => setMessage(null)}
            sx={{
              mb: 3,
              borderRadius: 3,
              fontWeight: 700,
            }}
          >
            {message}
          </Alert>
        )}

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <SummaryCard
              title="Save Slots"
              value={saveSlots.length.toString()}
              icon={<FolderOpenIcon />}
              color={BRAND.green}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <SummaryCard
              title="Best Net Worth"
              value={`$${summary.bestNetWorth.toLocaleString()}`}
              icon={<AccountBalanceWalletIcon />}
              color={BRAND.green}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <SummaryCard
              title="Highest Day"
              value={`Day ${summary.highestDay}`}
              icon={<CalendarTodayIcon />}
              color={BRAND.red}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <SummaryCard
              title="Avg Risk"
              value={`${summary.avgRisk}/100`}
              icon={<ShieldIcon />}
              color={BRAND.red}
            />
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card sx={panelStyle}>
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: { xs: "flex-start", sm: "center" },
                    gap: 2,
                    flexDirection: { xs: "column", sm: "row" },
                    mb: 2,
                  }}
                >
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 950 }}>
                      Saved Games
                    </Typography>
                    <Typography color="text.secondary">
                      Load a previous run or create a new local save.
                    </Typography>
                  </Box>

                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={saveGame}
                    sx={{
                      bgcolor: BRAND.red,
                      fontWeight: 950,
                      borderRadius: 2,
                      "&:hover": { bgcolor: "#E63131" },
                    }}
                  >
                    New Save
                  </Button>
                </Box>

                <Divider sx={{ mb: 2 }} />

                {saveSlots.length === 0 ? (
                  <Box
                    sx={{
                      p: 4,
                      borderRadius: 3,
                      bgcolor: "#F7F9FB",
                      border: "1px dashed #C8D1DC",
                      textAlign: "center",
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 950, color: BRAND.navy }}>
                      No saved games yet.
                    </Typography>

                    <Typography color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                      Save your current game to create your first slot.
                    </Typography>

                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={saveGame}
                      sx={{
                        bgcolor: BRAND.red,
                        fontWeight: 950,
                        borderRadius: 2,
                        "&:hover": { bgcolor: "#E63131" },
                      }}
                    >
                      Save Game
                    </Button>
                  </Box>
                ) : (
                  <Stack spacing={1.5}>
                    {saveSlots.map((slot) => (
                      <SaveSlotCard key={slot.id} slot={slot} onLoad={loadGame} />
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card
              sx={{
                bgcolor: BRAND.navy,
                color: "#fff",
                borderRadius: 4,
                boxShadow: "0 18px 45px rgba(44,57,71,0.22)",
                mb: 3,
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 950 }}>
                  Save Strategy
                </Typography>

                <Typography sx={{ color: "rgba(255,255,255,0.65)", mb: 3 }}>
                  Use saves before major trades, risky decisions, or after strong portfolio growth.
                </Typography>

                <SaveRule text="Save before using most of your cash." />
                <SaveRule text="Save after reaching a new net worth high." />
                <SaveRule text="Load an old run to compare strategies." />
                <SaveRule text="Use MongoDB later for account-based cloud saves." />
              </CardContent>
            </Card>

            <Card sx={panelStyle}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 950 }}>
                  Storage Status
                </Typography>

                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  Current version uses browser localStorage.
                </Typography>

                <Box
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    bgcolor: "#F7F9FB",
                    border: "1px solid #E5E9EF",
                    mb: 2,
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <CloudDoneIcon sx={{ color: BRAND.green }} />
                    <Box>
                      <Typography sx={{ fontWeight: 950, color: BRAND.navy }}>
                        Local Save Active
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Ready to connect to backend later.
                      </Typography>
                    </Box>
                  </Stack>
                </Box>

                <Button
                  fullWidth
                  variant="outlined"
                  onClick={clearSaves}
                  sx={{
                    borderColor: BRAND.red,
                    color: BRAND.red,
                    fontWeight: 950,
                    borderRadius: 2,
                    "&:hover": {
                      borderColor: BRAND.red,
                      bgcolor: "rgba(255,55,55,0.08)",
                    },
                  }}
                >
                  Clear Local Saves
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}

function SaveSlotCard({
  slot,
  onLoad,
}: {
  slot: SaveSlot;
  onLoad: (slot: SaveSlot) => void;
}) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 3,
        bgcolor: "#F7F9FB",
        border: "1px solid #E5E9EF",
      }}
    >
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={3.5}>
          <Typography sx={{ fontWeight: 950, color: BRAND.navy }}>
            {slot.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {slot.savedAt}
          </Typography>
        </Grid>

        <Grid item xs={6} sm={1.6}>
          <Typography variant="body2" color="text.secondary">
            Day
          </Typography>
          <Typography sx={{ fontWeight: 950 }}>{slot.gameDay}</Typography>
        </Grid>

        <Grid item xs={6} sm={2}>
          <Typography variant="body2" color="text.secondary">
            Net Worth
          </Typography>
          <Typography sx={{ fontWeight: 950 }}>
            ${slot.netWorth.toLocaleString()}
          </Typography>
        </Grid>

        <Grid item xs={6} sm={2}>
          <Typography variant="body2" color="text.secondary">
            Growth
          </Typography>
          <Typography sx={{ fontWeight: 950, color: BRAND.green }}>
            +{slot.portfolioGrowth}%
          </Typography>
        </Grid>

        <Grid item xs={6} sm={1.6}>
          <Typography variant="body2" color="text.secondary">
            Risk
          </Typography>
          <Typography sx={{ fontWeight: 950, color: BRAND.red }}>
            {slot.riskScore}/100
          </Typography>
        </Grid>

        <Grid item xs={12} sm={1.3}>
          <Button
            fullWidth
            size="small"
            variant="contained"
            startIcon={<RestoreIcon />}
            onClick={() => onLoad(slot)}
            sx={{
              bgcolor: BRAND.green,
              color: BRAND.navy,
              fontWeight: 950,
              borderRadius: 2,
              "&:hover": { bgcolor: "#85C85F" },
            }}
          >
            Load
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card sx={panelStyle}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
          <Box>
            <Typography color="text.secondary" sx={{ fontWeight: 800 }}>
              {title}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 950, color: BRAND.navy }}>
              {value}
            </Typography>
          </Box>

          <Box
            sx={{
              width: 46,
              height: 46,
              borderRadius: 2,
              bgcolor: `${color}33`,
              color,
              display: "grid",
              placeItems: "center",
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

function SaveRule({ text }: { text: string }) {
  return (
    <Box
      sx={{
        p: 1.6,
        mb: 1.2,
        borderRadius: 3,
        bgcolor: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.12)",
      }}
    >
      <Typography sx={{ fontWeight: 800 }}>{text}</Typography>
    </Box>
  );
}

const panelStyle = {
  borderRadius: 4,
  boxShadow: "0 18px 45px rgba(44,57,71,0.08)",
  border: "1px solid rgba(44,57,71,0.08)",
};