import StarBorderIcon from "@mui/icons-material/StarBorder";
import { Box, Button, ButtonBase, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import { MARKET_CHART_DAYS } from "../data/marketHistory";
import { Stock, StockPriceHistory } from "../data/mockStocks";
import { CARD, D, MONO, isFlat, money, pct } from "../theme/design";

function StockSparkline({ stock, history }: { stock: Stock; history: readonly StockPriceHistory[] }) {
  const data = history.slice(-MARKET_CHART_DAYS);
  if (data.length === 0) return <Box />;

  const first = data[0];
  const last = data[data.length - 1];
  const color = isFlat(stock.dayChangePercent) ? D.t3 : stock.dayChangePercent > 0 ? D.green : D.red;
  const label = first === last
    ? `${stock.symbol} closed at ${money(last.closePrice)} on Day ${last.gameDay}.`
    : `${stock.symbol} closing prices from Day ${first.gameDay} to Day ${last.gameDay}, from ${money(first.closePrice)} to ${money(last.closePrice)}.`;

  return (
    <Box role="img" aria-label={label} sx={{ height: 30, minWidth: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 3, right: 3, bottom: 3, left: 3 }}>
          <YAxis domain={["dataMin", "dataMax"]} hide />
          <Line dataKey="closePrice" stroke={color} strokeWidth={2}
            dot={data.length === 1 ? { r: 2, fill: color } : false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}

export default function WatchlistWidget({ stocks, getHistory }: {
  stocks: readonly Stock[];
  getHistory: (symbol: string) => readonly StockPriceHistory[];
}) {
  return (
    <Box component="section" aria-labelledby="game-watchlist" sx={CARD}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, py: 1 }}>
        <StarBorderIcon sx={{ fontSize: 18, color: D.brandText }} />
        <Typography id="game-watchlist" component="h2" sx={{ flex: 1, color: D.t1, fontSize: 16, fontWeight: 800 }}>
          Watchlist
        </Typography>
        <Button component={RouterLink} to="/game/watchlist" size="small" aria-label="View full watchlist"
          sx={{ minHeight: 40, color: D.brandText, textTransform: "none" }}>
          View all
        </Button>
      </Stack>
      {stocks.length === 0 ? (
        <Typography sx={{ color: D.t3, fontSize: 14, px: 2, pb: 2 }}>Star a stock to add it here.</Typography>
      ) : (
        stocks.slice(0, 3).map((stock) => (
          <ButtonBase key={stock.symbol} component={RouterLink} to={`/stocks/${stock.symbol}`}
            sx={{
              display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(44px, 0.8fr) auto",
              gap: 1.5, width: "100%", px: 2, py: 1, textAlign: "left", borderTop: `1px solid ${D.border}`,
              "&:hover": { bgcolor: D.elevated },
              "&:focus-visible": { outline: `2px solid ${D.brand}`, outlineOffset: -2 },
            }}>
            <Box component="span" sx={{ minWidth: 0 }}>
              <Typography component="span" display="block" sx={{ color: D.t1, fontSize: 14, fontWeight: 900, fontFamily: MONO }}>{stock.symbol}</Typography>
              <Typography component="span" display="block" noWrap sx={{ color: D.t3, fontSize: 12 }}>{stock.name}</Typography>
            </Box>
            <StockSparkline stock={stock} history={getHistory(stock.symbol)} />
            <Box component="span" sx={{ textAlign: "right", fontFamily: MONO }}>
              <Typography component="span" display="block" sx={{ color: D.t1, font: "inherit", fontSize: 13, fontWeight: 800 }}>{money(stock.currentPrice)}</Typography>
              <Typography component="span" display="block" sx={{ color: isFlat(stock.dayChangePercent) ? D.t3 : stock.dayChangePercent > 0 ? D.greenText : D.redText, font: "inherit", fontSize: 12, fontWeight: 800 }}>
                {pct(stock.dayChangePercent)}
              </Typography>
            </Box>
          </ButtonBase>
        ))
      )}
    </Box>
  );
}
