import React from "react";
import {
  Alert, Box, Button, Chip, CircularProgress, Container, Grid, LinearProgress, Stack, Typography,
} from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import PieChartIcon from "@mui/icons-material/PieChart";
import { Link as RouterLink } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { D, CARD, MONO } from "../theme/design";
import { useAchievements } from "../hooks/useAchievements";
import { ACHIEVEMENT_ICONS } from "../components/AchievementIcons";
import { getPlayerLevel } from "../data/levelSystem";
import { usePageTitle } from "../lib/usePageTitle";

// Framer Motion 11 predates React 19's stricter JSX return type.
const MotionPresence = AnimatePresence as React.FC<React.PropsWithChildren<{
  initial?: boolean;
  mode?: "sync" | "popLayout" | "wait";
}>>;

// Custom set drawn for StockPilot (Codex); every achievement has its own motif.
function AchievementIcon({ id, size = 24 }: { id: string; size?: number }) {
  const Icon = ACHIEVEMENT_ICONS[id];
  return Icon ? <Icon size={size} /> : <EmojiEventsIcon />;
}

export default function Achievements() {
  usePageTitle("Achievements");
  const reduceMotion = useReducedMotion();
  const {
    achievements, totalXP, loading, persistenceError, retryPersistence,
  } = useAchievements();

  const unlockedCount  = achievements.filter((a) => a.unlocked).length;
  const totalCount     = achievements.length;
  const completionPct  = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;
  const playerLevel    = getPlayerLevel(totalXP);
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
          <motion.div>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={2}>
              <Box>
                <Typography component="h1" sx={{ fontSize: { xs: 26, md: 32 }, fontWeight: 900, color: D.t1, letterSpacing: "-0.02em" }}>Milestones</Typography>
                <Typography sx={{ fontSize: 14, color: D.t2, mt: 0.5 }}>
                  Achievements reward strong trading habits and portfolio growth.
                </Typography>
              </Box>
              <Box sx={{ ...CARD, p: 2.5, minWidth: 280 }}>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 900, color: D.t3, fontFamily: MONO }}>COMPLETION</Typography>
                  <motion.div key={completionPct} initial={reduceMotion ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 900, color: D.brandText, fontFamily: MONO }}>{completionPct}%</Typography>
                  </motion.div>
                </Stack>
                <LinearProgress variant="determinate" value={completionPct}
                  sx={{ height: 6, borderRadius: 99, bgcolor: D.overlay, "& .MuiLinearProgress-bar": { bgcolor: D.brand, borderRadius: 99 } }} />
                <Typography sx={{ fontSize: 12, color: D.t3, mt: 1 }}>{unlockedCount} of {totalCount} unlocked · {totalXP} XP earned</Typography>
                <Stack direction="row" justifyContent="space-between" sx={{ mt: 1.5, mb: 0.6 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 900, color: D.brandText, fontFamily: MONO }}>LEVEL {playerLevel.level}</Typography>
                  <Typography sx={{ fontSize: 12, color: D.t3, fontFamily: MONO }}>{playerLevel.xpIntoLevel}/{playerLevel.xpForNextLevel} XP</Typography>
                </Stack>
                <LinearProgress variant="determinate" value={playerLevel.progress}
                  sx={{ height: 5, borderRadius: 99, bgcolor: D.overlay, "& .MuiLinearProgress-bar": { bgcolor: D.green, borderRadius: 99 } }} />
              </Box>
            </Stack>
          </motion.div>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
        <MotionPresence initial={false}>
          {persistenceError && (
            <motion.div initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.24 }}>
              <Alert
                severity="error"
                action={
                  <Button color="inherit" size="small" onClick={() => void retryPersistence()}>
                    Retry
                  </Button>
                }
                sx={{ mb: 3 }}
              >
                {persistenceError}
              </Alert>
            </motion.div>
          )}
        </MotionPresence>

        {/* Stats */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: "Unlocked",  val: unlockedCount.toString(),            icon: <CheckCircleIcon sx={{ fontSize: 20 }} />,         up: true       },
            { label: "Level",     val: playerLevel.level.toString(),            icon: <EmojiEventsIcon sx={{ fontSize: 20 }} />,   up: undefined  },
            { label: "Total XP",  val: totalXP.toString(),                  icon: <LocalFireDepartmentIcon sx={{ fontSize: 20 }} />, up: true       },
            { label: "Next Goal", val: nextGoal?.title ?? "All done!",      icon: <PieChartIcon sx={{ fontSize: 20 }} />,            up: undefined  },
          ].map((s) => {
            const color = D.t2;
            const bg    = D.overlay;
            return (
              <Grid item xs={6} md={3} key={s.label}>
                <Box component={motion.div}
                  sx={{ ...CARD, p: 2.5, height: "100%", boxSizing: "border-box" }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography sx={{ fontSize: 12, fontWeight: 900, color: D.t3, fontFamily: MONO, mb: 0.8 }}>{s.label.toUpperCase()}</Typography>
                      <motion.div key={s.val} initial={reduceMotion ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }}>
                        <Typography sx={{ fontSize: 20, fontWeight: 900, color: D.t1, fontFamily: /\d/.test(String(s.val)) ? MONO : undefined }}>{s.val}</Typography>
                      </motion.div>
                    </Box>
                    <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: bg, color, display: { xs: "none", sm: "grid" }, placeItems: "center", flexShrink: 0 }}>{s.icon}</Box>
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
                <Typography component="h2" sx={{ fontWeight: 900, fontSize: 16, color: D.t1 }}>Achievement Progress</Typography>
                <Typography sx={{ fontSize: 14, color: D.t3 }}>Progress updates live as you trade.</Typography>
              </Box>
              <Box sx={{ p: 2.5 }}>
                <Grid container spacing={2}>
                  {achievements.map((a) => (
                    <Grid item xs={12} sm={6} key={a.id}>
                      <Box
                        sx={{
                        p: 2.5, borderRadius: 2, height: "100%",
                        bgcolor: a.unlocked ? D.surface : D.elevated,
                        border: `1px solid ${a.unlocked ? D.t3 : D.border}`,
                      }}>
                        <Stack direction="row" spacing={1.5} alignItems="flex-start">
                          <Box sx={{ position: "relative", width: 44, height: 44, flexShrink: 0 }}>
                            <Box sx={{
                              width: 44, height: 44, borderRadius: 2, display: "grid", placeItems: "center",
                              bgcolor: a.unlocked ? D.surface : D.overlay,
                              color:   a.unlocked ? D.greenText : D.t3,
                            }}>
                              <AchievementIcon id={a.id} />
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
                                  bgcolor: a.unlocked ? D.surface : D.overlay,
                                  color:   a.unlocked ? D.greenText : D.t3,
                                  border: `1px solid ${a.unlocked ? D.t3 : D.border}`,
                                  fontWeight: 800, fontSize: 12,
                                }} />
                            </Stack>
                            <Typography sx={{ fontSize: 14, color: D.t2, mt: 0.5, mb: 1.5, lineHeight: 1.6 }}>{a.description}</Typography>
                            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.6 }}>
                              <Typography sx={{ fontSize: 12, color: D.t3 }}>{a.category}</Typography>
                              <Typography sx={{ fontSize: 12, fontWeight: 800, color: D.t2 }}>{a.progress}%</Typography>
                            </Stack>
                            <LinearProgress variant="determinate" value={a.progress}
                              sx={{ height: 4, borderRadius: 99, bgcolor: D.border, "& .MuiLinearProgress-bar": { bgcolor: a.unlocked ? D.green : D.brand, borderRadius: 99 } }} />
                            <Typography sx={{ fontSize: 12, fontWeight: 800, color: a.unlocked ? D.greenText : D.brandText, mt: 1 }}>
                              {a.reward}
                              {a.unlockedAt && (
                                <Typography component="span" sx={{ fontSize: 12, fontWeight: 600, color: D.t3, ml: 1 }}>
                                  · {new Date(a.unlockedAt).toLocaleDateString()}
                                </Typography>
                              )}
                            </Typography>
                            <Typography sx={{ mt: 0.6, fontSize: 12, color: D.t3 }}>
                              {a.achievedByPercent.toFixed(1)}% of players unlocked this
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
            <Stack spacing={2.5} sx={{ position: { md: "sticky" }, top: { md: 89 } }}>
              {/* Next unlock */}
              {nextGoal && (
                <Box sx={{ bgcolor: D.elevated, border: `1px solid ${D.border}`, borderRadius: 2, p: 3 }}>
                  <Typography component="h2" sx={{ fontWeight: 900, fontSize: 16, color: D.t1, mb: 0.5 }}>Next Unlock</Typography>
                  <Typography sx={{ fontSize: 14, color: D.t3, mb: 2 }}>You are closest to unlocking {nextGoal.title}.</Typography>
                  <Box sx={{ p: 2, borderRadius: 2, bgcolor: D.surface, border: `1px solid ${D.border}`, mb: 2 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: D.brandBg, color: D.brandText, display: "grid", placeItems: "center", flexShrink: 0 }}>
                        <AchievementIcon id={nextGoal.id} size={22} />
                      </Box>
                      <Box>
                        <Typography sx={{ fontWeight: 900, fontSize: 14, color: D.t1 }}>{nextGoal.title}</Typography>
                        <Typography sx={{ fontSize: 14, color: D.t3 }}>{nextGoal.description}</Typography>
                      </Box>
                    </Stack>
                    <Box sx={{ mt: 2 }}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.6 }}>
                        <Typography sx={{ fontSize: 12, color: D.t3 }}>Progress</Typography>
                        <Typography sx={{ fontSize: 12, fontWeight: 800, color: D.brandText }}>{nextGoal.progress}%</Typography>
                      </Stack>
                      <LinearProgress variant="determinate" value={nextGoal.progress}
                        sx={{ height: 5, borderRadius: 99, bgcolor: D.border, "& .MuiLinearProgress-bar": { bgcolor: D.brand, borderRadius: 99 } }} />
                    </Box>
                  </Box>
                  <motion.div whileTap={reduceMotion ? undefined : { scale: 0.98 }}>
                    <Button fullWidth component={RouterLink} to="/game" variant="contained"
                      sx={{ bgcolor: D.brand, fontWeight: 800, textTransform: "none", borderRadius: 1.5, boxShadow: "none", "&:hover": { bgcolor: D.brandMid, boxShadow: "none" } }}>
                      Continue Trading →
                    </Button>
                  </motion.div>
                </Box>
              )}

              <Box sx={{ ...CARD, p: 3 }}>
                <Typography component="h2" sx={{ fontWeight: 900, fontSize: 16, color: D.t1, mb: 0.5 }}>How to Unlock More</Typography>
                <Typography sx={{ fontSize: 14, color: D.t3, mb: 2 }}>Focus on these habits while playing.</Typography>
                <Stack spacing={1}>
                  {[
                    "Buy your first stock to start progress.",
                    "Trade regularly and diversify across companies and sectors.",
                    "Track interesting companies on your watchlist.",
                    "Grow net worth above $15,000 then $50,000.",
                    "Keep enough cash to survive market drops.",
                    "Advance game days to build streak and progress records.",
                  ].map((tip) => (
                    <Stack key={tip} direction="row" spacing={1} alignItems="flex-start">
                      <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: D.brandText, mt: 0.8, flexShrink: 0 }} />
                      <Typography sx={{ fontSize: 14, color: D.t2, lineHeight: 1.6 }}>{tip}</Typography>
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
