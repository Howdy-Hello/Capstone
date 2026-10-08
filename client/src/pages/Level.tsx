import React, { useMemo } from "react";
import {
  Box, Button, Chip, CircularProgress, Container, Grid, LinearProgress, Stack, Typography,
} from "@mui/material";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import LockIcon from "@mui/icons-material/Lock";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { Link as RouterLink } from "react-router-dom";

import { useAchievements } from "../hooks/useAchievements";
import {
  getLevelCashReward, getPlayerLevel, getTotalXpForLevel, getXpRequirement,
} from "../data/levelSystem";
import { CARD, D, MONO } from "../theme/design";
import { usePageTitle } from "../lib/usePageTitle";

export default function Level() {
  usePageTitle("Level");
  const { achievements, totalXP, loading } = useAchievements();
  const playerLevel = useMemo(() => getPlayerLevel(totalXP), [totalXP]);
  const remainingXp = playerLevel.xpForNextLevel - playerLevel.xpIntoLevel;
  const nextRewardLevel = playerLevel.level + 1;
  const nextCashReward = getLevelCashReward(nextRewardLevel);
  const upcomingLevels = useMemo(
    () => Array.from({ length: 6 }, (_, index) => {
      const level = playerLevel.level + index;
      return {
        level,
        requirement: getXpRequirement(level),
        totalRequired: getTotalXpForLevel(level + 1),
      };
    }),
    [playerLevel.level],
  );
  const unlocked = achievements.filter((achievement) => achievement.unlocked);
  const available = achievements
    .filter((achievement) => !achievement.unlocked)
    .sort((a, b) => b.progress - a.progress);

  if (loading) {
    return (
      <Box sx={{ bgcolor: D.bg, minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <CircularProgress sx={{ color: D.brandText }} />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: D.bg, minHeight: "100vh" }}>
      <Box sx={{ bgcolor: D.surface, borderBottom: `1px solid ${D.border}` }}>
        <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={3}>
            <Box>
              <Chip label="PLAYER PROGRESSION" size="small"
                sx={{ bgcolor: D.brandBg, color: D.brandText, border: `1px solid ${D.brandBd}`, fontWeight: 900, fontSize: 10, fontFamily: MONO, letterSpacing: 1, mb: 1 }} />
              <Typography component="h1" sx={{ fontSize: { xs: 26, md: 34 }, fontWeight: 950, color: D.t1, letterSpacing: -1 }}>
                Level {playerLevel.level}
              </Typography>
              <Typography sx={{ fontSize: 13, color: D.t2, mt: 0.5 }}>
                Earn XP from achievements to raise your player level. Cash level-up rewards apply only to Endless mode.
              </Typography>
            </Box>
            <Box sx={{ ...CARD, p: 2.5, width: { xs: "100%", md: 390 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-end" sx={{ mb: 1 }}>
                <Box>
                  <Typography sx={{ fontSize: 10.5, fontWeight: 900, color: D.t3, fontFamily: MONO }}>NEXT LEVEL</Typography>
                  <Typography sx={{ fontSize: 20, fontWeight: 950, color: D.brandText, fontFamily: MONO }}>LV {playerLevel.level + 1}</Typography>
                </Box>
                <Typography sx={{ fontSize: 12, fontWeight: 900, color: D.t2, fontFamily: MONO }}>
                  {playerLevel.xpIntoLevel} / {playerLevel.xpForNextLevel} XP
                </Typography>
              </Stack>
              <LinearProgress variant="determinate" value={playerLevel.progress}
                sx={{ height: 8, borderRadius: 99, bgcolor: D.overlay, "& .MuiLinearProgress-bar": { bgcolor: D.brand, borderRadius: 99 } }} />
              <Typography sx={{ fontSize: 11.5, color: D.t3, mt: 1 }}>{remainingXp} XP remaining</Typography>
            </Box>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: "Current Level", value: playerLevel.level, icon: <WorkspacePremiumIcon /> },
            { label: "Total XP", value: totalXP, icon: <TrendingUpIcon /> },
            { label: "XP to Next Level", value: remainingXp, icon: <EmojiEventsIcon /> },
            { label: "XP Achievements", value: `${unlocked.length}/${achievements.length}`, icon: <CheckCircleIcon /> },
          ].map((stat) => (
            <Grid item xs={12} sm={6} md={3} key={stat.label}>
              <Box sx={{ ...CARD, p: 2.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography sx={{ fontSize: 10.5, fontWeight: 900, color: D.t3, fontFamily: MONO }}>{stat.label.toUpperCase()}</Typography>
                    <Typography sx={{ fontSize: 21, fontWeight: 950, color: D.t1, fontFamily: MONO, mt: 0.5 }}>{stat.value}</Typography>
                  </Box>
                  <Box sx={{ width: 38, height: 38, borderRadius: 2, display: "grid", placeItems: "center", bgcolor: D.brandBg, color: D.brandText }}>
                    {stat.icon}
                  </Box>
                </Stack>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Box sx={{ ...CARD, overflow: "hidden" }}>
              <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${D.border}` }}>
                <Typography sx={{ fontWeight: 900, fontSize: 16, color: D.t1 }}>Level Roadmap</Typography>
                <Typography sx={{ fontSize: 12.5, color: D.t3 }}>Every level requires more XP than the one before it.</Typography>
              </Box>
              <Stack spacing={1.2} sx={{ p: 2.5 }}>
                {upcomingLevels.map((entry, index) => (
                  <Box key={entry.level} sx={{ p: 2, borderRadius: 2, bgcolor: index === 0 ? D.brandBg : D.elevated, border: `1px solid ${index === 0 ? D.brandBd : D.border}` }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={1.2} alignItems="center">
                        <Box sx={{ width: 34, height: 34, borderRadius: 2, display: "grid", placeItems: "center", bgcolor: index === 0 ? D.brand : D.overlay, color: index === 0 ? "#fff" : D.t3 }}>
                          {index === 0 ? <WorkspacePremiumIcon sx={{ fontSize: 18 }} /> : <LockIcon sx={{ fontSize: 16 }} />}
                        </Box>
                        <Box>
                          <Typography sx={{ fontSize: 14, fontWeight: 900, color: index === 0 ? D.brandText : D.t1 }}>Level {entry.level} → {entry.level + 1}</Typography>
                          <Typography sx={{ fontSize: 11, color: D.t3 }}>{entry.totalRequired.toLocaleString("en-US")} total XP to reach Level {entry.level + 1}</Typography>
                        </Box>
                      </Stack>
                      <Typography sx={{ fontSize: 13, fontWeight: 900, color: D.t2, fontFamily: MONO }}>{entry.requirement.toLocaleString("en-US")} XP</Typography>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Grid>

          <Grid item xs={12} md={5}>
            <Stack spacing={2.5}>
              <Box sx={{ ...CARD, p: 3 }}>
                <Typography sx={{ fontWeight: 900, fontSize: 16, color: D.t1 }}>XP Earned</Typography>
                <Typography sx={{ fontSize: 12.5, color: D.t3, mb: 2 }}>Unlocked achievements contributing to your level.</Typography>
                {unlocked.length ? (
                  <Stack spacing={1}>
                    {unlocked.map((achievement) => (
                      <Stack key={achievement.id} direction="row" justifyContent="space-between" sx={{ p: 1.4, borderRadius: 1.5, bgcolor: D.greenBg, border: `1px solid ${D.greenBd}` }}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: D.t1 }}>{achievement.title}</Typography>
                        <Typography sx={{ fontSize: 11.5, fontWeight: 900, color: D.greenText, fontFamily: MONO }}>+{achievement.rewardXp} XP</Typography>
                      </Stack>
                    ))}
                  </Stack>
                ) : (
                  <Typography sx={{ fontSize: 13, color: D.t3 }}>No XP earned yet. Unlock an achievement to begin leveling.</Typography>
                )}
              </Box>

              <Box sx={{ ...CARD, p: 3 }}>
                <Typography sx={{ fontWeight: 900, fontSize: 16, color: D.t1 }}>Rewards</Typography>
                <Typography sx={{ fontSize: 12.5, color: D.t3, mt: 0.5, mb: 2 }}>
                  Your next one-time cash reward is available only when leveling up in Endless mode.
                </Typography>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2, borderRadius: 2, bgcolor: D.greenBg, border: `1px solid ${D.greenBd}` }}>
                  <Box>
                    <Typography sx={{ fontSize: 10.5, fontWeight: 900, color: D.t3, fontFamily: MONO }}>UNLOCKS AT</Typography>
                    <Typography sx={{ fontSize: 18, fontWeight: 950, color: D.t1, fontFamily: MONO }}>Level {nextRewardLevel}</Typography>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography sx={{ fontSize: 10.5, fontWeight: 900, color: D.t3, fontFamily: MONO }}>CASH REWARD</Typography>
                    <Typography sx={{ fontSize: 22, fontWeight: 950, color: D.greenText, fontFamily: MONO }}>${nextCashReward.toLocaleString("en-US")}</Typography>
                  </Box>
                </Stack>
              </Box>

              <Box sx={{ ...CARD, p: 3 }}>
                <Typography sx={{ fontWeight: 900, fontSize: 16, color: D.t1 }}>Next XP Opportunity</Typography>
                {available[0] ? (
                  <>
                    <Typography sx={{ fontSize: 14, fontWeight: 800, color: D.brandText, mt: 1 }}>{available[0].title} · +{available[0].rewardXp} XP</Typography>
                    <Typography sx={{ fontSize: 12.5, color: D.t3, mt: 0.5, mb: 1.5 }}>{available[0].description}</Typography>
                    <LinearProgress variant="determinate" value={available[0].progress}
                      sx={{ height: 5, borderRadius: 99, bgcolor: D.overlay, "& .MuiLinearProgress-bar": { bgcolor: D.green, borderRadius: 99 } }} />
                  </>
                ) : (
                  <Typography sx={{ fontSize: 13, color: D.greenText, mt: 1 }}>Every achievement is unlocked.</Typography>
                )}
                <Button component={RouterLink} to="/achievements" fullWidth sx={{ mt: 2, color: D.brandText, border: `1px solid ${D.brandBd}`, fontWeight: 800, textTransform: "none" }}>
                  View Achievements
                </Button>
              </Box>
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
