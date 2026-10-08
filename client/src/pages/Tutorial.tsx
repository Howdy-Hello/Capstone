import { useEffect } from "react";
import { Box, CircularProgress } from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { requestTutorial } from "../lib/tutorial";
import { D } from "../theme/design";

export default function Tutorial() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const requested = params.get("course");
    if (requested === "game") { navigate("/practice", { replace: true }); return; }
    requestTutorial(requested === "advanced" ? "advanced" : requested === "game" ? "game" : "ui");
    navigate("/game", { replace: true });
  }, [navigate, params]);

  return <Box sx={{ minHeight: "70vh", display: "grid", placeItems: "center", bgcolor: D.bg }}><CircularProgress sx={{ color: D.brand }} /></Box>;
}
