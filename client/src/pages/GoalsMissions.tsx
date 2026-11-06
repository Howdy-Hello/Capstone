import { Link as RouterLink } from "react-router-dom";
import DecisionNote from "../components/learning/DecisionNote";
import { LearningKind } from "../lib/learning";
import { Alert, Button, Box, Chip, Container, Grid, LinearProgress, Stack, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import FlagIcon from "@mui/icons-material/Flag";
import { useDailyGoals } from "../hooks/useDailyGoals";
import { useMissions } from "../hooks/useMissions";
import { useGame } from "../context/GameContext";
import { CARD, D } from "../theme/design";
import { usePageTitle } from "../lib/usePageTitle";

const GoalList = ({ items }: { items: Array<{ id: string; title: string; description: string; kind?: LearningKind; progress: number; done: boolean }> }) => (
  <Stack spacing={1.2}>
    {items.map((item) => (
      <Box key={item.id} sx={{ p: 2, borderRadius: 2, bgcolor: D.elevated, border: `1px solid ${item.done ? D.greenBd : D.border}` }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.6 }}>
          <Stack direction="row" spacing={0.8} alignItems="center">
            {item.done && <CheckCircleIcon sx={{ fontSize: 16, color: D.greenText }} />}
            <Typography sx={{ color: item.done ? D.greenText : D.t1, fontWeight: 800, fontSize: 14 }}>{item.title}</Typography>
          </Stack>
        </Stack>
        <Typography sx={{ color: D.t3, fontSize: 12, mb: 1 }}>{item.description}</Typography>
        {item.kind ? <Box component="details" sx={{ mb: 2, color: D.t1 }}><Box component="summary" sx={{ cursor: "pointer", color: D.brandText, fontWeight: 800, fontSize: 14 }}>Record my answer</Box><Box sx={{ mt: 2 }}><DecisionNote kind={item.kind} /></Box></Box> : item.id === "watch2" ? <Button component={RouterLink} to="/game/watchlist" sx={{ textTransform: "none" }}>Open watchlist</Button> : null}
        <LinearProgress variant="determinate" value={item.progress} sx={{ height: 6, borderRadius: 99, bgcolor: D.overlay, "& .MuiLinearProgress-bar": { bgcolor: item.done ? D.green : D.brand } }} />
      </Box>
    ))}
  </Stack>
);

export default function GoalsMissions() {
  usePageTitle("Learning goals");
  const daily = useDailyGoals();
  const missions = useMissions();
  const { gameDay } = useGame();

  return (
    <Box sx={{ bgcolor: D.bg, minHeight: "100vh", py: { xs: 3, md: 5 } }}>
      <Container maxWidth="lg">
        <Typography component="h1" sx={{ color: D.t1, fontSize: { xs: 26, md: 32 }, fontWeight: 900, mb: 1 , letterSpacing: "-0.02em" }}>Learning Goals</Typography>
        <Typography sx={{ color: D.t3, mb: 3 }}>Research, explain, and reflect. You can complete every daily goal without buying anything. Notes record practice; they do not certify decision quality.</Typography>
        {missions.persistenceError && <Alert severity="error" action={<Button onClick={missions.retryPersistence}>Retry</Button>}>{missions.persistenceError}</Alert>}
        {daily.persistenceError && <Alert severity="error" action={<Button onClick={daily.retryPersistence}>Retry</Button>}>{daily.persistenceError}</Alert>}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box sx={{ ...CARD, p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center"><CheckCircleIcon sx={{ color: D.brandText }} /><Typography sx={{ color: D.t1, fontWeight: 900 }}>Daily Goals · Day {gameDay}</Typography></Stack>
                <Chip label={`${daily.completedCount}/${daily.goals.length}`} size="small" sx={{ bgcolor: D.overlay, color: D.t2, fontWeight: 900 }} />
              </Stack>
              <GoalList items={daily.goals} />
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ ...CARD, p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center"><FlagIcon sx={{ color: D.greenText }} /><Typography component="h2" sx={{ color: D.t1, fontWeight: 900 }}>Getting Started Missions</Typography></Stack>
                <Chip label={`${missions.completedCount}/${missions.totalCount}`} size="small" sx={{ bgcolor: D.overlay, color: D.t2, fontWeight: 900 }} />
              </Stack>
              <GoalList items={missions.missions} />
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
