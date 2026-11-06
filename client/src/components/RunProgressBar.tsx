import React from "react";
import { Box, LinearProgress } from "@mui/material";
import { D } from "../theme/design";

type Props = {
  day: number;
  /** null for an endless run, which has no finish line. */
  maxDay: number | null;
  height: number;
  color: string;
};

// An endless run used an indeterminate LinearProgress. MUI animates that bar's
// left/right, so it re-laid out the whole page on every frame for as long as the
// page was open: about two thirds of the main thread on an idle Game page, and
// the lag players felt on every click. It also announced a permanent "loading".
export default function RunProgressBar({ day, maxDay, height, color }: Props) {
  if (!maxDay) {
    return (
      <Box aria-hidden
        sx={{ height, borderRadius: 99, bgcolor: color, opacity: 0.25 }} />
    );
  }
  return (
    <LinearProgress variant="determinate" value={Math.min(100, (day / maxDay) * 100)} aria-label="Run progress"
      sx={{ height, borderRadius: 99, bgcolor: D.overlay, "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 99 } }} />
  );
}
