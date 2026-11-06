import React, { useMemo } from "react";
import {
  Avatar, Box, Chip, Container, Divider, LinearProgress, Stack, Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer,
  Tooltip as ReTooltip, XAxis, YAxis,
} from "recharts";

import SportsMmaIcon from "@mui/icons-material/SportsMma";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import MailOutlineIcon from "@mui/icons-material/MailOutline";

import { useGame } from "../context/GameContext";
import { useRivalTrader, RIVAL_STARTING_CASH } from "../hooks/useRivalTrader";
import { useInboxMessages } from "../lib/inbox";
import { D, MONO, money, pct } from "../theme/design";
import { usePageTitle } from "../lib/usePageTitle";

function StatCard({ label, value, sub, accent }: {
  label: string; value: string; sub?: React.ReactNode; accent?: string;
}) {
  return (
    <Box
      component={motion.div}
      sx={{ flex: 1, minWidth: 0, bgcolor: D.surface, border: `1px solid ${D.border}`, borderRadius: 3, p: 2.5 }}
    >
      <Typography sx={{ fontSize: 12, color: D.t3, fontFamily: MONO, letterSpacing: 0.6, mb: 0.75 }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 900, fontSize: 24, color: accent ?? D.t1, fontFamily: MONO, lineHeight: 1.1 }}>
        {value}
      </Typography>
      {sub && <Box sx={{ mt: 0.75 }}>{sub}</Box>}
    </Box>
  );
}

export default function Rival() {
  usePageTitle("Rival");
  const { gameDay, gameMode } = useGame();
  const {
    rivalName, rivalNetWorth, playerNetWorth, playerAhead, gapPct, positions, equityCurve,
  } = useRivalTrader();
  const messages = useInboxMessages();

  const rivalReturnPct = (rivalNetWorth / RIVAL_STARTING_CASH - 1) * 100;
  const playerReturnPct = (playerNetWorth / RIVAL_STARTING_CASH - 1) * 100;
  const leadColor = playerAhead ? D.greenText : D.redText;

  // Share of the head-to-head bar, so the two figures read as a contest rather
  // than two unrelated numbers.
  const combined = playerNetWorth + rivalNetWorth;
  const playerShare = combined > 0 ? (playerNetWorth / combined) * 100 : 50;

  const rivalMail = useMemo(
    () => messages.filter((m) => m.category === "rival").slice(0, 6),
    [messages]
  );

  const best = useMemo(
    () => [...positions].sort((a, b) => b.returnPct - a.returnPct)[0] ?? null,
    [positions]
  );
  const worst = useMemo(
    () => [...positions].sort((a, b) => a.returnPct - b.returnPct)[0] ?? null,
    [positions]
  );

  return (
    <Box sx={{ bgcolor: D.bg, minHeight: "100vh" }}>
      {/* Hero */}
      <Box sx={{ bgcolor: D.surface, borderBottom: `1px solid ${D.border}` }}>
        <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
          <motion.div>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2.5} alignItems={{ sm: "center" }}>
              <Avatar sx={{ width: 64, height: 64, bgcolor: D.amberBg, color: D.amber, border: `2px solid ${D.border}`, flexShrink: 0 }}>
                <SportsMmaIcon sx={{ fontSize: 30 }} />
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography component="h1" sx={{ fontWeight: 900, fontSize: { xs: 26, md: 32 }, color: D.t1, lineHeight: 1.05 , letterSpacing: "-0.02em" }}>
                  {rivalName}
                </Typography>
                <Typography sx={{ fontSize: 14, color: D.t3, mt: 0.75 }}>
                  Your rival holds these stocks throughout the run.
                </Typography>
              </Box>
              <Chip
                label={playerAhead ? "YOU'RE AHEAD" : "THEY'RE AHEAD"}
                sx={{
                  bgcolor: playerAhead ? D.greenBg : D.redBg,
                  color: leadColor,
                  border: `1px solid ${playerAhead ? D.greenBd : D.redBd}`,
                  fontWeight: 900, fontSize: 12, fontFamily: MONO, letterSpacing: 0.5,
                  px: 1, height: 32, flexShrink: 0,
                }}
              />
            </Stack>
          </motion.div>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
        <Stack spacing={3}>
          {/* Head to head */}
          <Box
            component={motion.div}
            sx={{ bgcolor: D.surface, border: `1px solid ${D.border}`, borderRadius: 3, p: { xs: 2.5, md: 3 } }}
          >
            <Typography sx={{ fontSize: 12, color: D.t3, fontFamily: MONO, letterSpacing: 0.6, mb: 2 }}>
              HEAD TO HEAD · DAY {gameDay}
            </Typography>

            <Stack direction="row" justifyContent="space-between" alignItems="flex-end" sx={{ mb: 1.25 }}>
              <Box>
                <Typography sx={{ fontSize: 12, color: D.t3, mb: 0.25 }}>You</Typography>
                <Typography sx={{ fontWeight: 900, fontSize: { xs: 20, md: 26 }, color: D.t1, fontFamily: MONO }}>
                  {money(playerNetWorth)}
                </Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 800, color: playerReturnPct >= 0 ? D.greenText : D.redText }}>
                  {pct(playerReturnPct)}
                </Typography>
              </Box>
              <Box sx={{ textAlign: "right" }}>
                <Typography sx={{ fontSize: 12, color: D.t3, mb: 0.25 }}>{rivalName}</Typography>
                <Typography sx={{ fontWeight: 900, fontSize: { xs: 20, md: 26 }, color: D.t1, fontFamily: MONO }}>
                  {money(rivalNetWorth)}
                </Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 800, color: rivalReturnPct >= 0 ? D.greenText : D.redText }}>
                  {pct(rivalReturnPct)}
                </Typography>
              </Box>
            </Stack>

            {/* Contest bar */}
            <Box
              role="img"
              aria-label={`You hold ${money(playerNetWorth)}, ${rivalName} holds ${money(rivalNetWorth)}`}
              sx={{ display: "flex", height: 10, borderRadius: 99, overflow: "hidden", bgcolor: D.overlay }}
            >
              <Box sx={{ width: `${playerShare}%`, bgcolor: D.brand, transition: "width .4s ease" }} />
              <Box sx={{ width: `${100 - playerShare}%`, bgcolor: D.amber, transition: "width .4s ease" }} />
            </Box>

            <Typography sx={{ fontSize: 14, fontWeight: 800, color: leadColor, mt: 1.5 }}>
              {playerAhead
                ? `You're ahead by ${money(Math.abs(playerNetWorth - rivalNetWorth))} (${gapPct >= 0 ? "+" : ""}${gapPct.toFixed(1)}%).`
                : `${rivalName} is ahead by ${money(Math.abs(rivalNetWorth - playerNetWorth))} (${gapPct.toFixed(1)}%).`}
            </Typography>
          </Box>

          {/* Stats */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <StatCard label="RIVAL RETURN" value={pct(rivalReturnPct)}
              accent={rivalReturnPct >= 0 ? D.greenText : D.redText}
              sub={<Typography sx={{ fontSize: 12, color: D.t3 }}>from {money(RIVAL_STARTING_CASH)} on Day 1</Typography>} />
            <StatCard label="BEST HOLDING" value={best ? best.company.symbol : "—"}
              accent={best && best.returnPct >= 0 ? D.greenText : D.redText}
              sub={best && (
                <Typography sx={{ fontSize: 12, color: D.t3 }}>{pct(best.returnPct)} · {best.company.sector}</Typography>
              )} />
            <StatCard label="WORST HOLDING" value={worst ? worst.company.symbol : "—"}
              accent={worst && worst.returnPct >= 0 ? D.greenText : D.redText}
              sub={worst && (
                <Typography sx={{ fontSize: 12, color: D.t3 }}>{pct(worst.returnPct)} · {worst.company.sector}</Typography>
              )} />
          </Stack>

          {/* Equity curve */}
          {equityCurve.length > 1 && (
            <Box
              component={motion.div}
              sx={{ bgcolor: D.surface, border: `1px solid ${D.border}`, borderRadius: 3, p: { xs: 2, md: 3 } }}
            >
              <Typography sx={{ fontWeight: 900, fontSize: 16, color: D.t1, mb: 0.25 }}>
                {rivalName}&rsquo;s equity curve
              </Typography>
              <Typography sx={{ fontSize: 14, color: D.t3, mb: 2.5 }}>
                Rival history compared with your current net worth.
              </Typography>
              <Box sx={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={equityCurve} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="rivalFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={D.amber} stopOpacity={0.28} />
                        <stop offset="100%" stopColor={D.amber} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={D.border} vertical={false} />
                    <XAxis dataKey="day" tick={{ fill: D.t3, fontSize: 12 }} tickFormatter={(d) => `D${d}`}
                      axisLine={{ stroke: D.border }} tickLine={false} />
                    <YAxis tick={{ fill: D.t3, fontSize: 12 }} tickFormatter={(v) => `$${Math.round(Number(v))}`}
                      axisLine={false} tickLine={false} domain={["dataMin - 60", "dataMax + 60"]} />
                    <ReTooltip
                      contentStyle={{ background: D.elevated, border: `1px solid ${D.border}`, borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: D.t3 }}
                      itemStyle={{ color: D.t1 }}
                      formatter={(value: number | string) => [money(Number(value)), rivalName]}
                      labelFormatter={(label) => `Day ${label}`}
                    />
                    <ReferenceLine y={playerNetWorth} stroke={D.brand} strokeDasharray="5 4"
                      label={{ value: "You today", position: "insideTopLeft", fill: D.brandText, fontSize: 12 }} />
                    <Area isAnimationActive={false} type="monotone" dataKey="rival" stroke={D.amber} strokeWidth={2} fill="url(#rivalFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          )}

          {/* Basket */}
          <Box
            component={motion.div}
            sx={{ bgcolor: D.surface, border: `1px solid ${D.border}`, borderRadius: 3, overflow: "hidden" }}
          >
            <Box sx={{ px: 3, py: 2.25, borderBottom: `1px solid ${D.border}` }}>
              <Typography component="h2" sx={{ fontWeight: 900, fontSize: 16, color: D.t1 }}>The basket</Typography>
              <Typography sx={{ fontSize: 14, color: D.t3, mt: 0.25 }}>
                Equal weight — {money(RIVAL_STARTING_CASH / Math.max(1, positions.length))} into each on Day 1, never rebalanced.
              </Typography>
            </Box>

            <Box sx={{ overflowX: "auto" }}>
              <Box sx={{ minWidth: 560 }}>
                <Stack direction="row" spacing={1} sx={{ px: 3, py: 1.25, borderBottom: `1px solid ${D.border}` }}>
                  {["COMPANY", "ENTRY", "NOW", "RETURN", "VALUE"].map((h, i) => (
                    <Typography key={h} sx={{
                      flex: i === 0 ? 2.2 : 1, fontSize: 12, color: D.t3, fontFamily: MONO,
                      letterSpacing: 0.5, textAlign: i === 0 ? "left" : "right",
                    }}>{h}</Typography>
                  ))}
                </Stack>

                {positions.map((position) => {
                  const up = position.returnPct >= 0;
                  return (
                    <Stack
                      key={position.company.symbol}
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      component={RouterLink}
                      to={`/stocks/${position.company.symbol}`}
                      sx={{
                        px: 3, py: 1.75, textDecoration: "none",
                        borderBottom: `1px solid ${D.border}`,
                        "&:last-of-type": { borderBottom: "none" },
                        "&:hover": { bgcolor: D.overlay },
                      }}
                    >
                      <Box sx={{ flex: 2.2, minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 900, fontSize: 14, color: D.t1, fontFamily: MONO }}>
                          {position.company.symbol}
                        </Typography>
                        <Typography noWrap sx={{ fontSize: 12, color: D.t3 }}>{position.company.name}</Typography>
                      </Box>
                      <Typography sx={{ flex: 1, textAlign: "right", fontSize: 14, color: D.t3, fontFamily: MONO }}>
                        {money(position.basis)}
                      </Typography>
                      <Typography sx={{ flex: 1, textAlign: "right", fontSize: 14, color: D.t1, fontFamily: MONO }}>
                        {money(position.price)}
                      </Typography>
                      <Stack direction="row" spacing={0.4} alignItems="center" justifyContent="flex-end" sx={{ flex: 1 }}>
                        {up
                          ? <TrendingUpIcon sx={{ fontSize: 14, color: D.greenText }} />
                          : <TrendingDownIcon sx={{ fontSize: 14, color: D.redText }} />}
                        <Typography sx={{ fontSize: 14, fontWeight: 800, color: up ? D.greenText : D.redText, fontFamily: MONO }}>
                          {pct(position.returnPct)}
                        </Typography>
                      </Stack>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ textAlign: "right", fontSize: 14, color: D.t1, fontFamily: MONO }}>
                          {money(position.value)}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(100, position.weightPct)}
                          sx={{
                            mt: 0.5, height: 3, borderRadius: 99, bgcolor: D.overlay,
                            "& .MuiLinearProgress-bar": { bgcolor: D.amber, borderRadius: 99 },
                          }}
                        />
                      </Box>
                    </Stack>
                  );
                })}
              </Box>
            </Box>
          </Box>

          {/* Trash talk */}
          {rivalMail.length > 0 && (
            <Box
              component={motion.div}
              sx={{ bgcolor: D.surface, border: `1px solid ${D.border}`, borderRadius: 3, overflow: "hidden" }}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 3, py: 2.25, borderBottom: `1px solid ${D.border}` }}>
                <MailOutlineIcon sx={{ color: D.amber, fontSize: 18 }} />
                <Typography component="h2" sx={{ fontWeight: 900, fontSize: 16, color: D.t1, flex: 1 }}>Recent messages</Typography>
                <Chip component={RouterLink} to="/inbox" clickable size="small" label="OPEN INBOX"
                  sx={{ bgcolor: D.brandBg, color: D.brandText, fontWeight: 900, fontSize: 12, fontFamily: MONO, textDecoration: "none" }} />
              </Stack>
              <Box sx={{ p: 3, pt: 2 }}>
                <Stack spacing={1.5}>
                  {rivalMail.map((message) => (
                    <Box key={message.id} sx={{ p: 2, borderRadius: 2, bgcolor: D.elevated, border: `1px solid ${D.border}` }}>
                      <Typography sx={{ fontWeight: 800, fontSize: 14, color: D.t1, mb: 0.4 }}>{message.subject}</Typography>
                      <Typography sx={{ fontSize: 14, color: D.t2, lineHeight: 1.65 }}>{message.body}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Box>
          )}

          {/* How it works */}
          <Box sx={{ bgcolor: D.surface, border: `1px solid ${D.border}`, borderRadius: 3, p: 3 }}>
            <Typography component="h2" sx={{ fontWeight: 900, fontSize: 16, color: D.t1, mb: 1.5 }}>How the rival works</Typography>
            <Divider sx={{ borderColor: D.border, mb: 2 }} />
            <Stack spacing={1.25}>
              {[
                `They start with the same ${money(RIVAL_STARTING_CASH)} you do, split equally across ${positions.length} companies on Day 1.`,
                "They never trade again — beating them means beating a disciplined buy-and-hold, which is harder than it sounds.",
                gameMode === "limited_30"
                  ? "In a 30-day run the comparison is settled on Day 30."
                  : "In an infinite run the comparison keeps updating for as long as you keep playing.",
              ].map((line) => (
                <Stack key={line} direction="row" spacing={1.25} alignItems="flex-start">
                  <Box sx={{ mt: 0.9, width: 5, height: 5, borderRadius: "50%", bgcolor: D.amber, flexShrink: 0 }} />
                  <Typography sx={{ fontSize: 14, color: D.t2, lineHeight: 1.7 }}>{line}</Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
