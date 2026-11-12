import React from "react";
import { Alert, Box, Button, LinearProgress, Stack, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { Link as RouterLink } from "react-router-dom";
import DecisionNote from "./learning/DecisionNote";
import type { DailyGoal } from "../hooks/useDailyGoals";
import { D, CARD } from "../theme/design";

/** The day's next learning goal, on the Game page so each day has a target. */
export default function TodayGoalCard({ day, goals, completedCount, error, onRetry }: {
  day: number;
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
        {next && <Typography component="span" sx={{ display: "block", mt: 0.5, fontSize: 14, color: D.t2 }}>{next.title}</Typography>}
      </Box>
      <Box sx={{ px: 2, pb: 2 }}>
        <LinearProgress variant="determinate" value={(completedCount / goals.length) * 100} aria-label="Today's goals done"
          sx={{ mt: 1, mb: 1.5, height: 4, borderRadius: 99, bgcolor: D.border, "& .MuiLinearProgress-bar": { bgcolor: allDone ? D.green : D.brand, borderRadius: 99 } }} />

        {next ? (
          <>
            <Typography sx={{ fontSize: 14, color: D.t2, lineHeight: 1.6, mb: 1 }}>{next.description}</Typography>
            {next.kind ? (
              // Keyed by goal so the form closes when the next goal takes over.
              <Box component="details" key={next.id} sx={{ color: D.t1,
                "& > summary": { cursor: "pointer", color: D.brandText, fontWeight: 800, fontSize: 14 },
                "& > summary:focus-visible": { outline: `2px solid ${D.brand}`, outlineOffset: 2 } }}>
                <Box component="summary">Record my answer</Box>
                <Box sx={{ mt: 2 }}><DecisionNote kind={next.kind} /></Box>
              </Box>
            ) : next.id === "watch2" ? (
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: D.brandText }}>
                Use the star on a stock row to watch it · {Math.min(next.current, next.target)}/{next.target}
              </Typography>
            ) : null}
          </>
        ) : (
          <Stack direction="row" spacing={1} alignItems="center">
            <CheckCircleIcon sx={{ fontSize: 18, color: D.greenText }} />
            <Typography sx={{ fontSize: 14, color: D.t2 }}>All of Day {day}'s goals are done. New ones arrive when you advance.</Typography>
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
