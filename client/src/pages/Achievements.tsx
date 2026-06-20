import React from "react";
import {
  Box, Button, Chip, Container, Grid, LinearProgress, Stack, Typography,
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

type Achievement = {
  id: string; title: string; description: string; unlocked: boolean;
  progress: number; reward: string; category: string; icon: React.ReactNode;
};

const achievements: Achievement[] = [
  { id: "1", title: "First Trade",       description: "Buy your first stock.",                                          unlocked: true,  progress: 100, reward: "+100 XP", category: "Trading",   icon: <TrendingUpIcon /> },
  { id: "2", title: "Smart Investor",    description: "Reach a net worth of $15,000.",                                  unlocked: true,  progress: 100, reward: "+250 XP", category: "Portfolio", icon: <AccountBalanceWalletIcon /> },
  { id: "3", title: "Risk Taker",        description: "Invest in three different companies.",                           unlocked: false, progress: 67,  reward: "+300 XP", category: "Trading",   icon: <PieChartIcon /> },
  { id: "4", title: "Cash Discipline",   description: "Keep at least 20% of net worth in cash for 5 game days.",       unlocked: false, progress: 45,  reward: "+350 XP", category: "Risk",      icon: <ShieldIcon /> },
  { id: "5", title: "Market Master",     description: "Reach a net worth of $50,000.",                                 unlocked: false, progress: 37,  reward: "+750 XP", category: "Mastery",   icon: <EmojiEventsIcon /> },
  { id: "6", title: "Hot Streak",        description: "Finish 3 game days in a row with positive portfolio growth.",   unlocked: false, progress: 33,  reward: "+500 XP", category: "Mastery",   icon: <LocalFireDepartmentIcon /> },
];

const unlockedCount = achievements.filter((a) => a.unlocked).length;
const totalCount = achievements.length;
const completionPct = Math.round((unlockedCount / totalCount) * 100);

export default function Achievements() {
  return (
    <Box sx={{ bgcolor: D.bg, minHeight: "100vh" }}>
      {/* Hero */}
      <Box sx={{ bgcolor: D.surface, borderBottom: `1px solid ${D.border}` }}>
        <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={2}>
            <Box>
              <Chip label="ACHIEVEMENT SYSTEM" size="small" sx={{ bgcolor: D.brandBg, color: D.brandText, border: `1px solid ${D.brandBd}`, fontWeight: 900, fontSize: 10, fontFamily: MONO, letterSpacing: 1, mb: 1 }} />
              <Typography sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 950, color: D.t1, letterSpacing: -1 }}>Milestones</Typography>
              <Typography sx={{ fontSize: 13, color: D.t2, mt: 0.5 }}>Achievements reward strong trading habits and portfolio growth.</Typography>
            </Box>
            <Box sx={{ ...CARD, p: 2.5, minWidth: 280 }}>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography sx={{ fontSize: 10.5, fontWeight: 900, color: D.t3, fontFamily: MONO }}>COMPLETION</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 900, color: D.brandText, fontFamily: MONO }}>{completionPct}%</Typography>
              </Stack>
              <LinearProgress variant="determinate" value={completionPct}
                sx={{ height: 6, borderRadius: 99, bgcolor: D.overlay, "& .MuiLinearProgress-bar": { bgcolor: D.brand, borderRadius: 99 } }} />
              <Typography sx={{ fontSize: 11.5, color: D.t3, mt: 1 }}>{unlockedCount} of {totalCount} unlocked</Typography>
            </Box>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
        {/* Stats */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: "Unlocked",  val: unlockedCount.toString(),                         icon: <CheckCircleIcon sx={{ fontSize: 20 }} />,          up: true },
            { label: "Locked",    val: (totalCount - unlockedCount).toString(),           icon: <LockIcon sx={{ fontSize: 20 }} />,                 up: false },
            { label: "Total XP",  val: "350",                                             icon: <LocalFireDepartmentIcon sx={{ fontSize: 20 }} />,  up: true },
            { label: "Next Goal", val: "Risk Taker",                                      icon: <PieChartIcon sx={{ fontSize: 20 }} />,             up: undefined },
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
                <Typography sx={{ fontSize: 12.5, color: D.t3 }}>Track what you have unlocked and what to aim for next.</Typography>
              </Box>
              <Box sx={{ p: 2.5 }}>
                <Grid container spacing={2}>
                  {achievements.map((a) => (
                    <Grid item xs={12} sm={6} key={a.id}>
                      <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: a.unlocked ? D.greenBg : D.elevated, border: `1px solid ${a.unlocked ? D.greenBd : D.border}`, height: "100%" }}>
                        <Stack direction="row" spacing={1.5} alignItems="flex-start">
                          <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: a.unlocked ? D.greenBg : D.overlay, color: a.unlocked ? D.greenText : D.t3, display: "grid", placeItems: "center", flexShrink: 0 }}>
                            {a.unlocked ? <CheckCircleIcon sx={{ fontSize: 22 }} /> : a.icon}
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Stack direction="row" justifyContent="space-between" gap={1}>
                              <Typography sx={{ fontWeight: 900, fontSize: 14, color: D.t1 }}>{a.title}</Typography>
                              <Chip size="small" label={a.unlocked ? "Unlocked" : "Locked"}
                                sx={{ bgcolor: a.unlocked ? D.greenBg : D.overlay, color: a.unlocked ? D.greenText : D.t3, border: `1px solid ${a.unlocked ? D.greenBd : D.border}`, fontWeight: 800, fontSize: 10 }} />
                            </Stack>
                            <Typography sx={{ fontSize: 12.5, color: D.t2, mt: 0.5, mb: 1.5, lineHeight: 1.6 }}>{a.description}</Typography>
                            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.6 }}>
                              <Typography sx={{ fontSize: 11, color: D.t3 }}>{a.category}</Typography>
                              <Typography sx={{ fontSize: 11, fontWeight: 800, color: D.t2 }}>{a.progress}%</Typography>
                            </Stack>
                            <LinearProgress variant="determinate" value={a.progress}
                              sx={{ height: 4, borderRadius: 99, bgcolor: D.border, "& .MuiLinearProgress-bar": { bgcolor: a.unlocked ? D.green : D.brand, borderRadius: 99 } }} />
                            <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: a.unlocked ? D.greenText : D.brandText, mt: 1 }}>Reward: {a.reward}</Typography>
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
              <Box sx={{ bgcolor: D.elevated, border: `1px solid ${D.border}`, borderRadius: 2, p: 3 }}>
                <Typography sx={{ fontWeight: 900, fontSize: 15, color: D.t1, mb: 0.5 }}>Next Unlock</Typography>
                <Typography sx={{ fontSize: 13, color: D.t3, mb: 2 }}>You are close to unlocking Risk Taker.</Typography>
                <Box sx={{ p: 2, borderRadius: 2, bgcolor: D.surface, border: `1px solid ${D.border}`, mb: 2 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: D.brandBg, color: D.brandText, display: "grid", placeItems: "center", flexShrink: 0 }}>
                      <PieChartIcon sx={{ fontSize: 20 }} />
                    </Box>
                    <Box>
                      <Typography sx={{ fontWeight: 900, fontSize: 14, color: D.t1 }}>Risk Taker</Typography>
                      <Typography sx={{ fontSize: 12.5, color: D.t3 }}>Invest in 3 companies.</Typography>
                    </Box>
                  </Stack>
                  <Box sx={{ mt: 2 }}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.6 }}>
                      <Typography sx={{ fontSize: 11.5, color: D.t3 }}>Progress</Typography>
                      <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: D.brandText }}>67%</Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={67}
                      sx={{ height: 5, borderRadius: 99, bgcolor: D.border, "& .MuiLinearProgress-bar": { bgcolor: D.brand, borderRadius: 99 } }} />
                  </Box>
                </Box>
                <Button fullWidth component={RouterLink} to="/game" variant="contained"
                  sx={{ bgcolor: D.brand, fontWeight: 800, textTransform: "none", borderRadius: 1.5, boxShadow: "none", "&:hover": { bgcolor: D.brandMid, boxShadow: "none" } }}>
                  Continue Trading →
                </Button>
              </Box>

              <Box sx={{ ...CARD, p: 3 }}>
                <Typography sx={{ fontWeight: 900, fontSize: 15, color: D.t1, mb: 0.5 }}>How to Unlock More</Typography>
                <Typography sx={{ fontSize: 13, color: D.t3, mb: 2 }}>Focus on these habits while playing.</Typography>
                <Stack spacing={1}>
                  {[
                    "Buy your first stock to start progress.",
                    "Diversify across multiple companies.",
                    "Grow net worth steadily instead of gambling.",
                    "Keep enough cash to survive market drops.",
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
