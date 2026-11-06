import React from "react";
import { Box, Button, Chip, Container, GlobalStyles, Stack, Typography } from "@mui/material";
import AllInclusiveIcon from "@mui/icons-material/AllInclusive";
import TimerIcon from "@mui/icons-material/Timer";
import { motion, useReducedMotion } from "framer-motion";
import { Link as RouterLink } from "react-router-dom";
import RunProgressBar from "./RunProgressBar";
import { useGame } from "../context/GameContext";
import { getNetWorth } from "../data/tradingState";
import { D, MONO, isFlat, money, pct } from "../theme/design";

const STARTING_NET_WORTH = 2000;

// The day bar: where the run stands, and the one action that moves it on. Game
// passes its heading and Close Market; other screens link back to the market.
export default function DayBar({ heading, action, leadsThePage = false }: {
  heading?: React.ReactNode;
  action?: React.ReactNode;
  // Game only: sticks under the header, and the action becomes a phone bottom bar.
  leadsThePage?: boolean;
}) {
  const trading = useGame();
  const reduceMotion = useReducedMotion();
  const { gameDay, gameMode, isGameComplete, marketPhase, maxGameDay, stocks, account } = trading;
  const netWorth = getNetWorth(account, stocks);
  const change = ((netWorth - STARTING_NET_WORTH) / STARTING_NET_WORTH) * 100;
  const open = marketPhase === "market_open";

  return (
    <Box sx={{ position: leadsThePage ? { md: "sticky" } : "static", top: { md: 65 }, zIndex: 1100, bgcolor: D.surface, borderBottom: `1px solid ${D.border}` }}>
      {leadsThePage && <GlobalStyles styles={{ "@media (max-width: 899.95px)": { body: { paddingBottom: 72 } } }} />}
      <Container maxWidth="xl" sx={{ py: { xs: leadsThePage ? 2 : 1.5, md: 1.5 } }}>
        <Stack direction={{ xs: "column", md: "row" }} alignItems={{ md: "center" }} justifyContent="space-between" spacing={{ xs: leadsThePage ? 1.5 : 1, md: 3 }}>
          <Box sx={{ flex: { md: 1 }, minWidth: 0 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: heading ? 0.8 : 0 }}>
              <Chip label={`DAY ${gameDay}${maxGameDay ? ` / ${maxGameDay}` : ""}`} size="small"
                sx={{ bgcolor: D.elevated, color: D.t1, border: `1px solid ${D.border}`, fontWeight: 900, fontSize: 12 }} />
              <Chip icon={gameMode === "limited_30" ? <TimerIcon sx={{ fontSize: 14 }} /> : <AllInclusiveIcon sx={{ fontSize: 14 }} />}
                label={gameMode === "limited_30" ? "30-Day Challenge" : "Infinite"} size="small"
                title={gameMode === "limited_30" ? "A focused 30-day scoring run. Rankings use your final net worth at the finish." : "An open-ended sandbox. Keep advancing days as long as you want."}
                sx={{ bgcolor: D.elevated, color: D.t2, border: `1px solid ${D.border}`, fontWeight: 800, fontSize: 12 }} />
              <Chip label={open ? "MARKET OPEN" : "AFTER HOURS"} size="small"
                sx={{ bgcolor: open ? D.elevated : D.amberBg, color: open ? D.t2 : D.amber, border: `1px solid ${open ? D.border : D.amber}`, fontWeight: 800, fontSize: 12 }} />
            </Stack>
            {heading}
          </Box>
          <Box data-tour="net-worth" sx={{ textAlign: { md: "center" } }}>
            <Typography sx={{ fontSize: 12, fontWeight: 800, color: D.t3 }}>NET WORTH</Typography>
            <motion.div key={netWorth} initial={reduceMotion ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }}>
              <Typography sx={{ fontSize: { xs: leadsThePage ? 36 : 24, md: 44 }, fontWeight: 700, color: D.t1, fontFamily: MONO, lineHeight: 1.1, letterSpacing: "-0.02em" }}>{money(netWorth)}</Typography>
            </motion.div>
            <Typography sx={{ fontSize: 14, fontWeight: 800, color: isFlat(change) ? D.t2 : netWorth >= STARTING_NET_WORTH ? D.greenText : D.redText }}>
              {pct(change)} since Day 1
            </Typography>
          </Box>
          <Box sx={leadsThePage
            ? { flex: { md: 1 }, display: "flex", justifyContent: "flex-end", position: { xs: "fixed", md: "static" }, left: 0, right: 0, bottom: 0, zIndex: 1100, p: { xs: 1.5, md: 0 }, bgcolor: { xs: D.surface, md: "transparent" }, borderTop: { xs: `1px solid ${D.border}`, md: "none" } }
            : { flex: { md: 1 }, display: "flex", justifyContent: { md: "flex-end" } }}>
            {action ?? (
              <Button component={RouterLink} to="/game" variant="outlined" sx={{ minHeight: 44, color: D.t1, borderColor: D.borderHi, fontWeight: 800, textTransform: "none", borderRadius: 1.5, "&:hover": { borderColor: D.t2, bgcolor: D.overlay } }}>
                Back to Market
              </Button>
            )}
          </Box>
        </Stack>
        {maxGameDay ? <Box sx={{ mt: 1.2 }}><RunProgressBar day={gameDay} maxDay={maxGameDay} height={4} color={isGameComplete ? D.green : D.brand} /></Box> : null}
      </Container>
    </Box>
  );
}
