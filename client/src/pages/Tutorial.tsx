import { useEffect } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { requestTutorial } from "../lib/tutorial";
import { D } from "../theme/design";
import { usePageTitle } from "../lib/usePageTitle";

// Screen-reader-only heading: this route only shows a spinner before redirecting.
const visuallyHidden = {
  position: "absolute", width: "1px", height: "1px", overflow: "hidden", clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap", margin: "-1px", padding: 0, border: 0,
} as const;

export default function Tutorial() {
  usePageTitle("Tutorial");
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const requested = params.get("course");
    if (requested === "game") { navigate("/practice", { replace: true }); return; }
    requestTutorial(requested === "advanced" ? "advanced" : requested === "game" ? "game" : "ui");
    navigate("/game", { replace: true });
  }, [navigate, params]);

  return <Box sx={{ minHeight: "70vh", display: "grid", placeItems: "center", bgcolor: D.bg }}><Typography component="h1" sx={visuallyHidden}>Tutorial</Typography><CircularProgress sx={{ color: D.brand }} /></Box>;
}
