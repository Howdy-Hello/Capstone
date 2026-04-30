import React from "react";
import {
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
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import LockIcon from "@mui/icons-material/Lock";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import PieChartIcon from "@mui/icons-material/PieChart";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ShieldIcon from "@mui/icons-material/Shield";
import { Link as RouterLink } from "react-router-dom";

const BRAND = {
  navy: "#2C3947",
  red: "#FF3737",
  green: "#9AD872",
  background: "#F5F7F9",
};

type Achievement = {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  progress: number;
  reward: string;
  category: "Trading" | "Portfolio" | "Risk" | "Mastery";
  icon: React.ReactNode;
};

const achievements: Achievement[] = [
  {
    id: "1",
    title: "First Trade",
    description: "Buy your first stock.",
    unlocked: true,
    progress: 100,
    reward: "+100 XP",
    category: "Trading",
    icon: <TrendingUpIcon />,
  },
  {
    id: "2",
    title: "Smart Investor",
    description: "Reach a net worth of $15,000.",
    unlocked: true,
    progress: 100,
    reward: "+250 XP",
    category: "Portfolio",
    icon: <AccountBalanceWalletIcon />,
  },
  {
    id: "3",
    title: "Risk Taker",
    description: "Invest in three different companies.",
    unlocked: false,
    progress: 67,
    reward: "+300 XP",
    category: "Trading",
    icon: <PieChartIcon />,
  },
  {
    id: "4",
    title: "Cash Discipline",
    description: "Keep at least 20% of your net worth in cash for 5 game days.",
    unlocked: false,
    progress: 45,
    reward: "+350 XP",
    category: "Risk",
    icon: <ShieldIcon />,
  },
  {
    id: "5",
    title: "Market Master",
    description: "Reach a net worth of $50,000.",
    unlocked: false,
    progress: 37,
    reward: "+750 XP",
    category: "Mastery",
    icon: <EmojiEventsIcon />,
  },
  {
    id: "6",
    title: "Hot Streak",
    description: "Finish 3 game days in a row with positive portfolio growth.",
    unlocked: false,
    progress: 33,
    reward: "+500 XP",
    category: "Mastery",
    icon: <LocalFireDepartmentIcon />,
  },
];

const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length;
const totalCount = achievements.length;
const completionPct = Math.round((unlockedCount / totalCount) * 100);

export default function Achievements() {
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
              icon={<EmojiEventsIcon />}
              label="Achievement System"
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
              Unlock milestones as you trade smarter.
            </Typography>

            <Typography
              sx={{
                color: "rgba(255,255,255,0.72)",
                maxWidth: 720,
                fontSize: 18,
              }}
            >
              Achievements reward strong trading habits: buying your first stock,
              diversifying, protecting cash, and growing your net worth.
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
                  COMPLETION
                </Typography>

                <Typography variant="h3" sx={{ fontWeight: 950, my: 1 }}>
                  {completionPct}%
                </Typography>

                <Typography sx={{ color: "rgba(255,255,255,0.7)", mb: 3 }}>
                  {unlockedCount} of {totalCount} achievements unlocked.
                </Typography>

                <LinearProgress
                  variant="determinate"
                  value={completionPct}
                  sx={{
                    height: 12,
                    borderRadius: 99,
                    bgcolor: "rgba(255,255,255,0.12)",
                    "& .MuiLinearProgress-bar": {
                      bgcolor: BRAND.green,
                      borderRadius: 99,
                    },
                  }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ px: { xs: 2, md: 8 }, py: 4 }}>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <SummaryCard
              title="Unlocked"
              value={unlockedCount.toString()}
              icon={<CheckCircleIcon />}
              color={BRAND.green}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <SummaryCard
              title="Locked"
              value={(totalCount - unlockedCount).toString()}
              icon={<LockIcon />}
              color={BRAND.red}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <SummaryCard
              title="Total XP"
              value="350"
              icon={<LocalFireDepartmentIcon />}
              color={BRAND.green}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <SummaryCard
              title="Next Goal"
              value="Risk Taker"
              icon={<PieChartIcon />}
              color={BRAND.red}
            />
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card sx={panelStyle}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 950 }}>
                  Achievement Progress
                </Typography>

                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  Track what you have unlocked and what to aim for next.
                </Typography>

                <Divider sx={{ mb: 2 }} />

                <Grid container spacing={2}>
                  {achievements.map((achievement) => (
                    <Grid item xs={12} sm={6} key={achievement.id}>
                      <AchievementCard achievement={achievement} />
                    </Grid>
                  ))}
                </Grid>
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
                  Next Unlock
                </Typography>

                <Typography sx={{ color: "rgba(255,255,255,0.65)", mb: 3 }}>
                  You are close to unlocking Risk Taker.
                </Typography>

                <Box
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    bgcolor: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    mb: 2,
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2,
                        bgcolor: "rgba(154,216,114,0.18)",
                        color: BRAND.green,
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <PieChartIcon />
                    </Box>

                    <Box>
                      <Typography sx={{ fontWeight: 950 }}>Risk Taker</Typography>
                      <Typography sx={{ color: "rgba(255,255,255,0.62)", fontSize: 14 }}>
                        Invest in 3 companies.
                      </Typography>
                    </Box>
                  </Stack>

                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.7 }}>
                      <Typography variant="body2">Progress</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 900 }}>
                        67%
                      </Typography>
                    </Box>

                    <LinearProgress
                      variant="determinate"
                      value={67}
                      sx={{
                        height: 10,
                        borderRadius: 99,
                        bgcolor: "rgba(255,255,255,0.12)",
                        "& .MuiLinearProgress-bar": {
                          bgcolor: BRAND.green,
                          borderRadius: 99,
                        },
                      }}
                    />
                  </Box>
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  component={RouterLink}
                  to="/game"
                  sx={{
                    bgcolor: BRAND.red,
                    fontWeight: 950,
                    borderRadius: 2.2,
                    "&:hover": { bgcolor: "#E63131" },
                  }}
                >
                  Continue Trading
                </Button>
              </CardContent>
            </Card>

            <Card sx={panelStyle}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 950 }}>
                  How to Unlock More
                </Typography>

                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  Focus on these habits while playing.
                </Typography>

                <Tip text="Buy your first stock to start progress." />
                <Tip text="Diversify across multiple companies." />
                <Tip text="Grow net worth steadily instead of gambling." />
                <Tip text="Keep enough cash to survive market drops." />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}

function AchievementCard({ achievement }: { achievement: Achievement }) {
  return (
    <Box
      sx={{
        p: 2.2,
        borderRadius: 3,
        bgcolor: achievement.unlocked ? "rgba(154,216,114,0.18)" : "#F7F9FB",
        border: achievement.unlocked
          ? `1px solid ${BRAND.green}`
          : "1px solid #E5E9EF",
        height: "100%",
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            bgcolor: achievement.unlocked
              ? "rgba(154,216,114,0.28)"
              : "rgba(44,57,71,0.08)",
            color: achievement.unlocked ? BRAND.green : BRAND.navy,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          {achievement.unlocked ? <CheckCircleIcon /> : achievement.icon}
        </Box>

        <Box sx={{ flex: 1 }}>
          <Stack direction="row" justifyContent="space-between" gap={1}>
            <Typography sx={{ fontWeight: 950, color: BRAND.navy }}>
              {achievement.title}
            </Typography>

            <Chip
              size="small"
              label={achievement.unlocked ? "Unlocked" : "Locked"}
              sx={{
                bgcolor: achievement.unlocked ? BRAND.green : "#E8EDF2",
                color: achievement.unlocked ? BRAND.navy : "text.secondary",
                fontWeight: 900,
              }}
            />
          </Stack>

          <Typography color="text.secondary" sx={{ mt: 0.7, mb: 1.5 }}>
            {achievement.description}
          </Typography>

          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.7 }}>
            <Typography variant="body2" color="text.secondary">
              {achievement.category}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 900 }}>
              {achievement.progress}%
            </Typography>
          </Box>

          <LinearProgress
            variant="determinate"
            value={achievement.progress}
            sx={{
              height: 9,
              borderRadius: 99,
              bgcolor: "#E5E9EF",
              "& .MuiLinearProgress-bar": {
                bgcolor: achievement.unlocked ? BRAND.green : BRAND.red,
                borderRadius: 99,
              },
            }}
          />

          <Typography
            variant="body2"
            sx={{
              mt: 1.2,
              fontWeight: 900,
              color: achievement.unlocked ? BRAND.green : BRAND.red,
            }}
          >
            Reward: {achievement.reward}
          </Typography>
        </Box>
      </Stack>
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

function Tip({ text }: { text: string }) {
  return (
    <Box
      sx={{
        p: 1.5,
        mb: 1.2,
        borderRadius: 3,
        bgcolor: "#F7F9FB",
        border: "1px solid #E5E9EF",
      }}
    >
      <Typography sx={{ fontWeight: 800, color: BRAND.navy }}>{text}</Typography>
    </Box>
  );
}

const panelStyle = {
  borderRadius: 4,
  boxShadow: "0 18px 45px rgba(44,57,71,0.08)",
  border: "1px solid rgba(44,57,71,0.08)",
};