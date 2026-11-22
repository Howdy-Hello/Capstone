import { Box, Typography } from "@mui/material";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { buildMarketHistory } from "../data/marketHistory";
import { formatMarketDay } from "../data/marketPrelude";
import { D, MONO } from "../theme/design";
import { Candlestick, CandleTooltip } from "./Candlestick";

export default function MarketHistoryChart({ history, startDate }: { history: ReturnType<typeof buildMarketHistory>; startDate?: string }) {
  const data = history.map((point) => ({ ...point, range: [point.lowPrice, point.highPrice] }));
  const firstDay = data[0]?.gameDay ?? 1;
  const lastDay = data[data.length - 1]?.gameDay ?? 1;

  return (
    <Box component="figure" sx={{ m: 0, minWidth: 0 }}>
      <Typography component="figcaption" title="Each stock has equal weight. The wicks estimate the range from each stock's daily high and low."
        sx={{ color: D.t3, fontSize: 12, fontWeight: 800, fontFamily: MONO }}>
        MARKET INDEX
      </Typography>
      {data.length > 0 ? (
        <>
          <Box sx={{ height: 68, mt: 0.25 }} role="img"
            aria-label={`Equal-weight market candlesticks, ${formatMarketDay(firstDay, startDate)} to ${formatMarketDay(lastDay, startDate)}. Index opened at 100 and last closed at ${data[data.length - 1].closePrice.toFixed(2)}. Wicks estimate the daily range.`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 4, right: 2, bottom: 4, left: 2 }}>
                <CartesianGrid vertical={false} stroke={D.border} strokeDasharray="3 3" />
                <XAxis dataKey="gameDay" hide />
                <YAxis domain={["dataMin - 0.2", "dataMax + 0.2"]} hide />
                <Tooltip cursor={{ fill: D.overlay }} content={<CandleTooltip startDate={startDate} format={(value) => value.toFixed(2)} />} />
                <Bar dataKey="range" shape={<Candlestick />} isAnimationActive={false} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", color: D.t3, fontSize: 11, fontFamily: MONO }} aria-hidden="true">
            <span>{formatMarketDay(firstDay, startDate)}</span>
            {lastDay !== firstDay && <span>{formatMarketDay(lastDay, startDate)}</span>}
          </Box>
        </>
      ) : (
        <Typography sx={{ color: D.t3, fontSize: 12, mt: 1 }}>No market history yet.</Typography>
      )}
    </Box>
  );
}
