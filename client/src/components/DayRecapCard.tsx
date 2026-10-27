import React from "react";
import { Box, Button, IconButton, Stack, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { D, CARD, MONO, money, pct } from "../theme/design";
import type { DayRecap, RecapMover } from "../lib/dayRecap";

const signedMoney = (n: number) => `${n >= 0 ? "+" : ""}${money(n)}`;
const tone = (n: number) => (n >= 0 ? D.greenText : D.redText);

function MoverRow({ label, mover, perShare = false, onOpen }: {
  label: string; mover: RecapMover; perShare?: boolean; onOpen: (symbol: string) => void;
}) {
  return (
    <Stack direction="row" alignItems="baseline" spacing={1.2} sx={{ py: 0.3 }}>
      <Typography sx={{ width: 84, flexShrink: 0, fontSize: 12, fontWeight: 700, color: D.t3 }}>{label}</Typography>
      <Button onClick={() => onOpen(mover.symbol)} title={`Open ${mover.name}`}
        sx={{ p: 0, minWidth: 0, color: D.t1, fontFamily: MONO, fontWeight: 900, fontSize: 13, textTransform: "none", "&:hover": { color: D.brandText, bgcolor: "transparent" } }}>
        {mover.symbol}
      </Button>
      <Typography sx={{ fontSize: 13, fontWeight: 800, color: tone(mover.changePct) }}>{pct(mover.changePct, 1)}</Typography>
      <Typography sx={{ fontSize: 12, color: D.t3, fontFamily: MONO }}>{signedMoney(mover.change)}{perShare ? " a share" : ""}</Typography>
    </Stack>
  );
}

/** What changed overnight: shown at the start of each day so advancing has a result to react to. */
export default function DayRecapCard({ recap, rival, onOpenStock, onDismiss }: {
  recap: DayRecap;
  rival: { name: string; playerAhead: boolean; gap: number };
  onOpenStock: (symbol: string) => void;
  onDismiss: () => void;
}) {
  const best = recap.movers[0];
  const worst = recap.movers.length > 1 ? recap.movers[recap.movers.length - 1] : null;
  const vsRival = recap.rivalChange === null ? null : recap.netWorthChange - recap.rivalChange;

  return (
    <Box component="section" aria-label={`Day ${recap.day} recap`} sx={{ ...CARD, p: 2.5, height: "100%", boxSizing: "border-box" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
        <Box>
          <Typography sx={{ fontWeight: 900, fontSize: 15, color: D.t1 }}>Day {recap.day} recap</Typography>
          <Typography sx={{ fontSize: 12.5, color: D.t3 }}>Since yesterday's close</Typography>
        </Box>
        <IconButton onClick={onDismiss} size="small" aria-label="Dismiss day recap" sx={{ color: D.t3, mt: -0.5, mr: -0.5 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mt: 1.2 }}>
        <Typography sx={{ fontSize: 24, fontWeight: 950, fontFamily: MONO, color: tone(recap.netWorthChange) }}>
          {signedMoney(recap.netWorthChange)}
        </Typography>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: D.t3 }}>net worth</Typography>
      </Stack>
      {(recap.stocksChangePct !== null || recap.bill > 0) && (
        <Typography sx={{ fontSize: 12.5, color: D.t2 }}>
          {recap.stocksChangePct !== null && (
            <Box component="span" sx={{ whiteSpace: "nowrap" }}>Stocks {signedMoney(recap.stocksChange)} ({pct(recap.stocksChangePct, 1)})</Box>
          )}
          {recap.stocksChangePct !== null && recap.bill > 0 && " · "}
          {recap.bill > 0 && <Box component="span" sx={{ whiteSpace: "nowrap" }}>Living costs −{money(recap.bill)}</Box>}
        </Typography>
      )}

      <Box sx={{ mt: 1.5 }}>
        {best ? (
          <>
            <MoverRow label={worst ? "Best" : "Your stock"} mover={best} onOpen={onOpenStock} />
            {worst && <MoverRow label="Worst" mover={worst} onOpen={onOpenStock} />}
          </>
        ) : (
          <>
            <Typography sx={{ fontSize: 13, color: D.t2, mb: 0.5 }}>
              You held only cash overnight, so price moves didn't affect you. Market average {pct(recap.marketAverageMovePct, 1)}.
            </Typography>
            {recap.marketTopMover && <MoverRow label="Biggest move" mover={recap.marketTopMover} perShare onOpen={onOpenStock} />}
          </>
        )}
      </Box>

      {recap.story && (
        <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 1.5, bgcolor: D.elevated, border: `1px solid ${D.border}` }}>
          <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: D.t3 }}>In yesterday's news · {recap.story.relatedTickers.join(", ")}</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 800, color: D.t1 }}>{recap.story.headline}</Typography>
        </Box>
      )}

      {recap.rivalChange !== null && vsRival !== null && (
        <Typography sx={{ mt: 1.5, fontSize: 12.5, color: D.t2 }}>
          {rival.name} {signedMoney(recap.rivalChange)} today.{" "}
          <Box component="span" sx={{ fontWeight: 800, color: Math.abs(vsRival) < 0.005 ? D.t2 : tone(vsRival) }}>
            {Math.abs(vsRival) < 0.005 ? "Level with them today." : vsRival > 0 ? `You gained ${money(vsRival)} on them.` : `They gained ${money(-vsRival)} on you.`}
          </Box>{" "}
          {rival.playerAhead ? `You lead by ${money(rival.gap)}.` : `${rival.name} leads by ${money(rival.gap)}.`}
        </Typography>
      )}
    </Box>
  );
}
