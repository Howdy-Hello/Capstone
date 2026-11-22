import { useState } from "react";
import { Box, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { StockPriceHistory } from "../data/mockStocks";
import { formatMarketDay } from "../data/marketPrelude";
import { D, MONO, money } from "../theme/design";

type Candle = Pick<StockPriceHistory, "gameDay" | "openPrice" | "highPrice" | "lowPrice" | "closePrice">;

export function StockCandleChart({ history, gameDay, startDate }: { history: StockPriceHistory[]; gameDay: number; startDate?: string }) {
  const [days, setDays] = useState<number | "all">(30);
  const firstDay = history[0]?.gameDay ?? 1;
  const span = days === "all" ? Math.max(60, gameDay - firstDay + 1) : days;
  const historyByDay = new Map(history.map((point) => [point.gameDay, point]));
  // Empty day slots keep short histories anchored to the left at the chosen scale.
  const data = Array.from({ length: span }, (_, index) => {
    const day = Math.max(firstDay, gameDay - span + 1) + index;
    const point = historyByDay.get(day);
    return point ? { ...point, range: [point.lowPrice, point.highPrice] } : { gameDay: day };
  });

  return (
    <>
      <ToggleButtonGroup exclusive size="small" value={days} onChange={(_, value) => value !== null && setDays(value)} aria-label="Candlestick time range"
        sx={{ mx: 3, mt: 2, display: "flex", flexWrap: "wrap", "& .MuiToggleButton-root": { color: D.t3, borderColor: D.border, px: 1.25, fontSize: 12, fontWeight: 800, textTransform: "none", "&.Mui-selected": { color: D.brandText, bgcolor: D.brandBg }, "&.Mui-selected:hover": { bgcolor: D.brandBg } } }}>
        {[7, 15, 30, 60, "all"].map((value) => <ToggleButton key={value} value={value}>{value === "all" ? "All time" : `${value} days`}</ToggleButton>)}
      </ToggleButtonGroup>
      <Box sx={{ p: 2.5, height: 360 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="10%">
            <CartesianGrid strokeDasharray="3 3" stroke={D.border} />
            <XAxis dataKey="gameDay" tickFormatter={(value) => value > gameDay ? "" : formatMarketDay(value, startDate)} minTickGap={18} tick={{ fill: D.t3, fontSize: 12 }} />
            <YAxis tickFormatter={(value) => `$${Number(value).toFixed(0)}`} domain={["dataMin - 5", "dataMax + 5"]} tick={{ fill: D.t3, fontSize: 12 }} />
            <Tooltip cursor={{ fill: D.overlay }} content={<CandleTooltip startDate={startDate} />} />
            <Bar dataKey="range" shape={<Candlestick />} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </>
  );
}

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
  const candleWidth = Math.max(3, width * 0.65);
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

export function CandleTooltip({ active, payload, format = money, startDate }: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: Candle }>;
  format?: (value: number) => string;
  startDate?: string;
}) {
  const candle = payload?.[0]?.payload;
  if (!active || !candle) return null;
  const up = candle.closePrice >= candle.openPrice;
  return (
    <Box sx={{ bgcolor: D.elevated, border: `1px solid ${D.border}`, borderRadius: 2, p: 1.5, boxShadow: "0 10px 28px rgba(0,0,0,.35)" }}>
      <Typography sx={{ color: D.t1, fontWeight: 900, fontSize: 12, mb: 0.7 }}>{formatMarketDay(candle.gameDay, startDate)}</Typography>
      {[['Open', candle.openPrice], ['High', candle.highPrice], ['Low', candle.lowPrice], ['Close', candle.closePrice]].map(([label, value]) => (
        <Stack key={label} direction="row" justifyContent="space-between" spacing={2.5}>
          <Typography sx={{ color: D.t3, fontSize: 12 }}>{label}</Typography>
          <Typography sx={{ color: label === 'Close' ? (up ? D.greenText : D.redText) : D.t2, fontFamily: MONO, fontWeight: 800, fontSize: 12 }}>{format(Number(value))}</Typography>
        </Stack>
      ))}
    </Box>
  );
}
