import React from "react";
import {
  Avatar,
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
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import MilitaryTechIcon from "@mui/icons-material/MilitaryTech";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import { Link as RouterLink } from "react-router-dom";

const BRAND = {
  navy: "#2C3947",
  red: "#FF3737",
  green: "#9AD872",
  background: "#F5F7F9",
};

type LeaderboardPlayer = {
  id: string;
  username: string;
  netWorth: number;
  cash: number;
  portfolioValue: number;
  returnPct: number;
  rank: number;
  badge: "Champion" | "Expert" | "Rising" | "Player";
};

const mockPlayers: LeaderboardPlayer[] = [
  {
    id: "1",
    username: "MarketKing",
    netWorth: 52000,
    cash: 12000,
    portfolioValue: 40000,
    returnPct: 420,
    rank: 1,
    badge: "Champion",
  },
  {
    id: "2",
    username: "StockWizard",
    netWorth: 43000,
    cash: 8500,
    portfolioValue: 34500,
    returnPct: 330,
    rank: 2,
    badge: "Expert",
  },
  {
    id: "3",
    username: "BullTrader",
    netWorth: 39000,
    cash: 10000,
    portfolioValue: 29000,
    returnPct: 290,
    rank: 3,
    badge: "Rising",
  },
  {
    id: "4",
    username: "You",
    netWorth: 18500,
    cash: 7200,
    portfolioValue: 11300,
    returnPct: 85,
    rank: 8,
    badge: "Player",
  },
];

const topThree = mockPlayers.slice(0, 3);
const currentPlayer = mockPlayers.find((player) => player.username === "You");

export default function Leaderboard() {
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
              label="Global Rankings"
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
              Climb the leaderboard.
            </Typography>

            <Typography
              sx={{
                color: "rgba(255,255,255,0.72)",
                maxWidth: 720,
                fontSize: 18,
              }}
            >
              Compare your simulated trading performance against other players.
              Rankings are based on net worth, portfolio growth, and cash discipline.
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
                  YOUR CURRENT RANK
                </Typography>

                <Typography variant="h3" sx={{ fontWeight: 950, my: 1 }}>
                  #{currentPlayer?.rank ?? "--"}
                </Typography>

                <Typography sx={{ color: "rgba(255,255,255,0.7)", mb: 3 }}>
                  You are still early in the game. Keep growing your portfolio,
                  managing risk, and reacting to market news.
                </Typography>

                <Button
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
                  Improve Rank
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ px: { xs: 2, md: 8 }, py: 4 }}>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <SummaryCard
              title="Top Net Worth"
              value="$52,000"
              icon={<EmojiEventsIcon />}
              color={BRAND.green}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <SummaryCard
              title="Your Net Worth"
              value={`$${(currentPlayer?.netWorth ?? 0).toLocaleString()}`}
              icon={<AccountBalanceWalletIcon />}
              color={BRAND.green}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <SummaryCard
              title="Your Return"
              value={`+${currentPlayer?.returnPct ?? 0}%`}
              icon={<TrendingUpIcon />}
              color={BRAND.green}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <SummaryCard
              title="Players"
              value={mockPlayers.length.toString()}
              icon={<WorkspacePremiumIcon />}
              color={BRAND.red}
            />
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card
              sx={{
                bgcolor: BRAND.navy,
                color: "#fff",
                borderRadius: 4,
                boxShadow: "0 18px 45px rgba(44,57,71,0.22)",
                height: "100%",
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 950, mb: 1 }}>
                  Top Traders
                </Typography>

                <Typography sx={{ color: "rgba(255,255,255,0.65)", mb: 3 }}>
                  The strongest players balance profit with smart cash management.
                </Typography>

                <Stack spacing={2}>
                  {topThree.map((player) => (
                    <TopPlayerCard key={player.id} player={player} />
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

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
                      Full Leaderboard
                    </Typography>
                    <Typography color="text.secondary">
                      Ranked by total net worth.
                    </Typography>
                  </Box>

                  <Chip
                    icon={<ShowChartIcon />}
                    label="Updated after each game day"
                    sx={{
                      bgcolor: "rgba(154,216,114,0.25)",
                      color: BRAND.navy,
                      fontWeight: 900,
                    }}
                  />
                </Box>

                <Divider sx={{ mb: 2 }} />

                <Stack spacing={1.5}>
                  {mockPlayers.map((player) => (
                    <LeaderboardRow key={player.id} player={player} />
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
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

function TopPlayerCard({ player }: { player: LeaderboardPlayer }) {
  const medalColor =
    player.rank === 1 ? "#F4C95D" : player.rank === 2 ? "#C7CED8" : "#C98B5F";

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 3,
        bgcolor: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.12)",
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center">
        <Avatar
          sx={{
            bgcolor: medalColor,
            color: BRAND.navy,
            fontWeight: 950,
          }}
        >
          {player.rank}
        </Avatar>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 950 }}>{player.username}</Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.62)", fontSize: 14 }}>
            ${player.netWorth.toLocaleString()} net worth
          </Typography>
        </Box>

        <MilitaryTechIcon sx={{ color: medalColor }} />
      </Stack>
    </Box>
  );
}

function LeaderboardRow({ player }: { player: LeaderboardPlayer }) {
  const isCurrentUser = player.username === "You";
  const progress = Math.min(100, (player.netWorth / mockPlayers[0].netWorth) * 100);

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 3,
        bgcolor: isCurrentUser ? "rgba(154,216,114,0.18)" : "#F7F9FB",
        border: isCurrentUser
          ? `1px solid ${BRAND.green}`
          : "1px solid #E5E9EF",
      }}
    >
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={1.4}>
          <Chip
            label={`#${player.rank}`}
            sx={{
              bgcolor: player.rank <= 3 ? BRAND.navy : "#E9EEF3",
              color: player.rank <= 3 ? "#fff" : BRAND.navy,
              fontWeight: 950,
            }}
          />
        </Grid>

        <Grid item xs={12} sm={3}>
          <Typography sx={{ fontWeight: 950, color: BRAND.navy }}>
            {player.username}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {player.badge}
          </Typography>
        </Grid>

        <Grid item xs={6} sm={2.3}>
          <Typography variant="body2" color="text.secondary">
            Net Worth
          </Typography>
          <Typography sx={{ fontWeight: 950 }}>
            ${player.netWorth.toLocaleString()}
          </Typography>
        </Grid>

        <Grid item xs={6} sm={2.3}>
          <Typography variant="body2" color="text.secondary">
            Cash
          </Typography>
          <Typography sx={{ fontWeight: 950 }}>
            ${player.cash.toLocaleString()}
          </Typography>
        </Grid>

        <Grid item xs={12} sm={3}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Score Progress
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 900 }}>
              +{player.returnPct}%
            </Typography>
          </Box>

          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 9,
              borderRadius: 99,
              bgcolor: "#E5E9EF",
              "& .MuiLinearProgress-bar": {
                bgcolor: isCurrentUser ? BRAND.green : BRAND.red,
                borderRadius: 99,
              },
            }}
          />
        </Grid>
      </Grid>
    </Box>
  );
}

const panelStyle = {
  borderRadius: 4,
  boxShadow: "0 18px 45px rgba(44,57,71,0.08)",
  border: "1px solid rgba(44,57,71,0.08)",
};