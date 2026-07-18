import React from "react";
import {
  Box, Button, Chip, CircularProgress, Container, Grid, LinearProgress, Stack, Typography,
} from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import LockIcon from "@mui/icons-material/Lock";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import PieChartIcon from "@mui/icons-material/PieChart";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ShieldIcon from "@mui/icons-material/Shield";
import { Link as RouterLink } from "react-router-dom";
import { D, CARD, MONO } from "../theme/design";
import { useAchievements } from "../hooks/useAchievements";

const ICONS: Record<string, React.ReactNode> = {
  first_trade:     <TrendingUpIcon />,
  smart_investor:  <AccountBalanceWalletIcon />,
  risk_taker:      <PieChartIcon />,
  cash_discipline: <ShieldIcon />,
  market_master:   <EmojiEventsIcon />,
  hot_streak:      <LocalFireDepartmentIcon />,
};

export default function Achievements() {
  const { achievements, totalXP, loading } = useAchievements();

  const unlockedCount  = achievements.filter((a) => a.unlocked).length;
  const totalCount     = achievements.length;
  const completionPct  = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;
  const nextGoal       = [...achievements]
    .filter((a) => !a.unlocked)
    .sort((a, b) => b.progress - a.progress)[0];

  if (loading) {
    return (
      <Box sx={{ bgcolor: D.bg, minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <CircularProgress sx={{ color: D.brandText }} />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: D.bg, minHeight: "100vh" }}>
      {/* Hero */}
      <Box sx={{ bgcolor: D.surface, borderBottom: `1px solid ${D.border}` }}>
        <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={2}>
            <Box>
              <Chip label="ACHIEVEMENT SYSTEM" size="small"
                sx={{ bgcolor: D.brandBg, color: D.brandText, border: `1px solid ${D.brandBd}`, fontWeight: 900, fontSize: 10, fontFamily: MONO, letterSpacing: 1, mb: 1 }} />
              <Typography sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 950, color: D.t1, letterSpacing: -1 }}>Milestones</Typography>
              <Typography sx={{ fontSize: 13, color: D.t2, mt: 0.5 }}>
                Achievements reward strong trading habits and portfolio growth.
              </Typography>
            </Box>
            <Box sx={{ ...CARD, p: 2.5, minWidth: 280 }}>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography sx={{ fontSize: 10.5, fontWeight: 900, color: D.t3, fontFamily: MONO }}>COMPLETION</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 900, color: D.brandText, fontFamily: MONO }}>{completionPct}%</Typography>
              </Stack>
              <LinearProgress variant="determinate" value={completionPct}
                sx={{ height: 6, borderRadius: 99, bgcolor: D.overlay, "& .MuiLinearProgress-bar": { bgcolor: D.brand, borderRadius: 99 } }} />
              <Typography sx={{ fontSize: 11.5, color: D.t3, mt: 1 }}>{unlockedCount} of {totalCount} unlocked · {totalXP} XP earned</Typography>
            </Box>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
        {/* Stats */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: "Unlocked",  val: unlockedCount.toString(),            icon: <CheckCircleIcon sx={{ fontSize: 20 }} />,         up: true       },
            { label: "Locked",    val: (totalCount - unlockedCount).toString(), icon: <LockIcon sx={{ fontSize: 20 }} />,            up: false      },
            { label: "Total XP",  val: totalXP.toString(),                  icon: <LocalFireDepartmentIcon sx={{ fontSize: 20 }} />, up: true       },
            { label: "Next Goal", val: nextGoal?.title ?? "All done!",      icon: <PieChartIcon sx={{ fontSize: 20 }} />,            up: undefined  },
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
          {/* Achievement cards */}
          <Grid item xs={12} md={8}>
            <Box sx={{ ...CARD, p: 0, overflow: "hidden" }}>
              <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${D.border}` }}>
                <Typography sx={{ fontWeight: 900, fontSize: 16, color: D.t1 }}>Achievement Progress</Typography>
                <Typography sx={{ fontSize: 12.5, color: D.t3 }}>Progress updates live as you trade.</Typography>
              </Box>
              <Box sx={{ p: 2.5 }}>
                <Grid container spacing={2}>
                  {achievements.map((a) => (
                    <Grid item xs={12} sm={6} key={a.id}>
                      <Box sx={{
                        p: 2.5, borderRadius: 2, height: "100%",
                        bgcolor: a.unlocked ? D.greenBg : D.elevated,
                        border: `1px solid ${a.unlocked ? D.greenBd : D.border}`,
                      }}>
                        <Stack direction="row" spacing={1.5} alignItems="flex-start">
                          <Box sx={{ position: "relative", width: 44, height: 44, flexShrink: 0 }}>
                            <Box sx={{
                              width: 44, height: 44, borderRadius: 2, display: "grid", placeItems: "center",
                              bgcolor: a.unlocked ? D.greenBg : D.overlay,
                              color:   a.unlocked ? D.greenText : D.t3,
                            }}>
                              {ICONS[a.id] ?? <EmojiEventsIcon />}
                            </Box>
                            {a.unlocked && (
                              <CheckCircleIcon sx={{
                                position: "absolute", bottom: -4, right: -4,
                                fontSize: 16, color: D.green,
                                bgcolor: D.bg, borderRadius: "50%",
                              }} />
                            )}
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Stack direction="row" justifyContent="space-between" gap={1}>
                              <Typography sx={{ fontWeight: 900, fontSize: 14, color: D.t1 }}>{a.title}</Typography>
                              <Chip size="small" label={a.unlocked ? "Unlocked" : "Locked"}
                                sx={{
                                  bgcolor: a.unlocked ? D.greenBg : D.overlay,
                                  color:   a.unlocked ? D.greenText : D.t3,
                                  border: `1px solid ${a.unlocked ? D.greenBd : D.border}`,
                                  fontWeight: 800, fontSize: 10,
                                }} />
                            </Stack>
                            <Typography sx={{ fontSize: 12.5, color: D.t2, mt: 0.5, mb: 1.5, lineHeight: 1.6 }}>{a.description}</Typography>
                            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.6 }}>
                              <Typography sx={{ fontSize: 11, color: D.t3 }}>{a.category}</Typography>
                              <Typography sx={{ fontSize: 11, fontWeight: 800, color: D.t2 }}>{a.progress}%</Typography>
                            </Stack>
                            <LinearProgress variant="determinate" value={a.progress}
                              sx={{ height: 4, borderRadius: 99, bgcolor: D.border, "& .MuiLinearProgress-bar": { bgcolor: a.unlocked ? D.green : D.brand, borderRadius: 99 } }} />
                            <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: a.unlocked ? D.greenText : D.brandText, mt: 1 }}>
                              {a.reward}
                              {a.unlockedAt && (
                                <Typography component="span" sx={{ fontSize: 10.5, fontWeight: 600, color: D.t3, ml: 1 }}>
                                  · {new Date(a.unlockedAt).toLocaleDateString()}
                                </Typography>
                              )}
                            </Typography>
                          </Box>
                        </Stack>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Box>
          </Grid>

          {/* Sidebar */}
          <Grid item xs={12} md={4}>
            <Stack spacing={2.5}>
              {/* Next unlock */}
              {nextGoal && (
                <Box sx={{ bgcolor: D.elevated, border: `1px solid ${D.border}`, borderRadius: 2, p: 3 }}>
                  <Typography sx={{ fontWeight: 900, fontSize: 15, color: D.t1, mb: 0.5 }}>Next Unlock</Typography>
                  <Typography sx={{ fontSize: 13, color: D.t3, mb: 2 }}>You are closest to unlocking {nextGoal.title}.</Typography>
                  <Box sx={{ p: 2, borderRadius: 2, bgcolor: D.surface, border: `1px solid ${D.border}`, mb: 2 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: D.brandBg, color: D.brandText, display: "grid", placeItems: "center", flexShrink: 0 }}>
                        {ICONS[nextGoal.id]}
                      </Box>
                      <Box>
                        <Typography sx={{ fontWeight: 900, fontSize: 14, color: D.t1 }}>{nextGoal.title}</Typography>
                        <Typography sx={{ fontSize: 12.5, color: D.t3 }}>{nextGoal.description}</Typography>
                      </Box>
                    </Stack>
                    <Box sx={{ mt: 2 }}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.6 }}>
                        <Typography sx={{ fontSize: 11.5, color: D.t3 }}>Progress</Typography>
                        <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: D.brandText }}>{nextGoal.progress}%</Typography>
                      </Stack>
                      <LinearProgress variant="determinate" value={nextGoal.progress}
                        sx={{ height: 5, borderRadius: 99, bgcolor: D.border, "& .MuiLinearProgress-bar": { bgcolor: D.brand, borderRadius: 99 } }} />
                    </Box>
                  </Box>
                  <Button fullWidth component={RouterLink} to="/game" variant="contained"
                    sx={{ bgcolor: D.brand, fontWeight: 800, textTransform: "none", borderRadius: 1.5, boxShadow: "none", "&:hover": { bgcolor: D.brandMid, boxShadow: "none" } }}>
                    Continue Trading →
                  </Button>
                </Box>
              )}

              <Box sx={{ ...CARD, p: 3 }}>
                <Typography sx={{ fontWeight: 900, fontSize: 15, color: D.t1, mb: 0.5 }}>How to Unlock More</Typography>
                <Typography sx={{ fontSize: 13, color: D.t3, mb: 2 }}>Focus on these habits while playing.</Typography>
                <Stack spacing={1}>
                  {[
                    "Buy your first stock to start progress.",
                    "Diversify across 3+ companies.",
                    "Grow net worth above $15,000 then $50,000.",
                    "Keep enough cash to survive market drops.",
                    "Advance game days to build streak records.",
                  ].map((tip) => (
                    <Stack key={tip} direction="row" spacing={1} alignItems="flex-start">
                      <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: D.brandText, mt: 0.8, flexShrink: 0 }} />
                      <Typography sx={{ fontSize: 13, color: D.t2, lineHeight: 1.6 }}>{tip}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
