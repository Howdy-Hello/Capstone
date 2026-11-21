import { Box, Stack, Typography } from "@mui/material";
import { StockPriceHistory } from "../data/mockStocks";
import { D, MONO, money } from "../theme/design";

type Candle = Pick<StockPriceHistory, "gameDay" | "openPrice" | "highPrice" | "lowPrice" | "closePrice">;

export function Candlestick({ x, y, width, height, payload }: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: Candle;
}) {
  if (!payload || typeof x !== "number" || typeof y !== "number" || width === undefined || height === undefined) return null;
  const { openPrice, closePrice, highPrice, lowPrice } = payload;
  if ([openPrice, closePrice, highPrice, lowPrice].some((v) => typeof v !== "number" || !Number.isFinite(v))) return null;

  const up = closePrice >= openPrice;
  const color = up ? D.green : D.red;
  const span = Math.max(0, height);
  const range = highPrice - lowPrice;
  const candleWidth = Math.max(3, Math.min(width * 0.65, 18));
  const centerX = x + width / 2;

  // A flat day has no high-low range to scale against, so the band collapses to
  // a single pixel row. Draw a doji tick at the close instead of dividing by a
  // fake range and landing open and close on top of each other.
  if (range <= 0 || span <= 0) {
    return <rect x={centerX - candleWidth / 2} y={y} width={candleWidth} height={2} fill={color} rx={1} />;
  }

  const openY = y + ((highPrice - openPrice) / range) * span;
  const closeY = y + ((highPrice - closePrice) / range) * span;
  const bodyY = Math.min(openY, closeY);
  const bodyHeight = Math.max(2, Math.abs(closeY - openY));

  return (
    <g>
      <line x1={centerX} x2={centerX} y1={y} y2={y + span} stroke={color} strokeWidth={1.5} />
      <rect x={centerX - candleWidth / 2} y={bodyY} width={candleWidth} height={bodyHeight} fill={color} rx={1} />
    </g>
  );
}

export function CandleTooltip({ active, payload, format = money }: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: Candle }>;
  format?: (value: number) => string;
}) {
  const candle = payload?.[0]?.payload;
  if (!active || !candle) return null;
  const up = candle.closePrice >= candle.openPrice;
  return (
    <Box sx={{ bgcolor: D.elevated, border: `1px solid ${D.border}`, borderRadius: 2, p: 1.5, boxShadow: "0 10px 28px rgba(0,0,0,.35)" }}>
      <Typography sx={{ color: D.t1, fontWeight: 900, fontSize: 12, mb: 0.7 }}>Day {candle.gameDay}</Typography>
      {[['Open', candle.openPrice], ['High', candle.highPrice], ['Low', candle.lowPrice], ['Close', candle.closePrice]].map(([label, value]) => (
        <Stack key={label} direction="row" justifyContent="space-between" spacing={2.5}>
          <Typography sx={{ color: D.t3, fontSize: 12 }}>{label}</Typography>
          <Typography sx={{ color: label === 'Close' ? (up ? D.greenText : D.redText) : D.t2, fontFamily: MONO, fontWeight: 800, fontSize: 12 }}>{format(Number(value))}</Typography>
        </Stack>
      ))}
    </Box>
  );
}
