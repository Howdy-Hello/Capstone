import React from "react";
import { Alert, Box, Button, LinearProgress, Stack, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { Link as RouterLink } from "react-router-dom";
import DailyGoalRefresh from "./DailyGoalRefresh";
import type { DailyGoal } from "../hooks/useDailyGoals";
import { D, CARD } from "../theme/design";

/** The next daily action, available directly from the market. */
export default function TodayGoalCard({ goals, completedCount, error, onRetry, refreshAt }: {
  refreshAt: string;
  goals: DailyGoal[];
  completedCount: number;
  error: string | null;
  onRetry: () => void;
}) {
  if (goals.length === 0) return null;
  const next = goals.find((goal) => !goal.done);
  const allDone = completedCount === goals.length;

  return (
    <Box component="details" aria-label="Today's goal" sx={{ ...CARD,
      "& > summary": { cursor: "pointer", p: 2, fontWeight: 800, color: D.t1 },
      "& > summary:focus-visible": { outline: `2px solid ${D.brand}`, outlineOffset: -2 },
    }}>
      <Box component="summary">
        Today's goal
        <Typography component="span" sx={{ ml: 1, fontSize: 14, color: allDone ? D.greenText : D.t3 }}>
          {completedCount}/{goals.length} done
        </Typography>
        <DailyGoalRefresh refreshAt={refreshAt} />
        {next && <Typography component="span" sx={{ display: "block", mt: 0.5, fontSize: 14, color: D.t2 }}>{next.title}</Typography>}
      </Box>
      <Box sx={{ px: 2, pb: 2 }}>
        <LinearProgress variant="determinate" value={(completedCount / goals.length) * 100} aria-label="Today's goals done"
          sx={{ mt: 1, mb: 1.5, height: 4, borderRadius: 99, bgcolor: D.border, "& .MuiLinearProgress-bar": { bgcolor: allDone ? D.green : D.brand, borderRadius: 99 } }} />

        {next ? (
          <>
            <Typography sx={{ fontSize: 14, color: D.t2, lineHeight: 1.6, mb: 1 }}>{next.description}</Typography>
            <Button component={RouterLink} to={next.href} size="small" sx={{ color: D.brandText, textTransform: "none" }}>{next.actionLabel}</Button>
            <Typography sx={{ fontSize: 12, color: D.t3 }}>Progress: {Math.min(next.current, next.target)}/{next.target} · Tracked automatically</Typography>
          </>
        ) : (
          <Stack direction="row" spacing={1} alignItems="center">
            <CheckCircleIcon sx={{ fontSize: 18, color: D.greenText }} />
            <Typography sx={{ fontSize: 14, color: D.t2 }}>Today's goals are done.</Typography>
          </Stack>
        )}

        <Button component={RouterLink} to="/game/goals" size="small"
          sx={{ mt: 1.2, p: 0, minWidth: 0, minHeight: 24, color: D.t3, fontSize: 14, fontWeight: 700, textTransform: "none", "&:hover": { color: D.t1, bgcolor: "transparent" } }}>
          All goals and missions →
        </Button>
        {error && (
          <Alert severity="error" sx={{ mt: 1.5 }} action={<Button onClick={onRetry} size="small">Retry</Button>}>{error}</Alert>
        )}
      </Box>
    </Box>
  );
}
