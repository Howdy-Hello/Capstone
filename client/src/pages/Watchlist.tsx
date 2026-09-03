import { Box, Button, Chip, Container, Grid, Stack, Typography } from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import { Link as RouterLink } from "react-router-dom";
import { useGame } from "../context/GameContext";
import { getSharesOwned } from "../data/tradingState";
import { CARD, D, MONO, money, pct } from "../theme/design";

export default function Watchlist() {
  const trading = useGame();

  return (
    <Box sx={{ bgcolor: D.bg, minHeight: "100vh", py: { xs: 3, md: 5 } }}>
      <Container maxWidth="lg">
        <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 1 }}>
          <StarIcon sx={{ color: D.amber }} />
          <Typography sx={{ color: D.t1, fontSize: { xs: 26, md: 32 }, fontWeight: 950 }}>Watchlist</Typography>
          <Chip label={trading.watchlistStocks.length} size="small" sx={{ bgcolor: D.overlay, color: D.t2, fontWeight: 900 }} />
        </Stack>
        <Typography sx={{ color: D.t3, mb: 3 }}>Track stocks you want to revisit without buying them.</Typography>

        {trading.watchlistStocks.length === 0 ? (
          <Box sx={{ ...CARD, p: 5, textAlign: "center" }}>
            <Typography sx={{ color: D.t1, fontWeight: 800, mb: 1 }}>Your watchlist is empty</Typography>
            <Typography sx={{ color: D.t3, fontSize: 13, mb: 2 }}>Use the star beside a ticker in the market to add it here.</Typography>
            <Button component={RouterLink} to="/game" variant="contained" sx={{ bgcolor: D.brand, textTransform: "none", fontWeight: 800 }}>Browse market</Button>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {trading.watchlistStocks.map((stock) => {
              const up = stock.dayChangePercent >= 0;
              const owned = getSharesOwned(trading.account, stock.symbol);
              const comparison = trading.watchlistStocks.find((item) => item.symbol !== stock.symbol) ?? trading.stocks.find((item) => item.symbol !== stock.symbol);
              return (
                <Grid item xs={12} sm={6} md={4} key={stock.symbol}>
                  <Box sx={{ ...CARD, p: 2.5, height: "100%" }}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 1.5 }}>
                      <Box>
                        <Typography sx={{ color: D.t1, fontFamily: MONO, fontWeight: 950, fontSize: 18 }}>{stock.symbol}</Typography>
                        <Typography sx={{ color: D.t3, fontSize: 12 }}>{stock.name}</Typography>
                      </Box>
                      <Box sx={{ textAlign: "right" }}>
                        <Typography sx={{ color: D.t1, fontFamily: MONO, fontWeight: 900 }}>{money(stock.currentPrice)}</Typography>
                        <Typography sx={{ color: up ? D.greenText : D.redText, fontWeight: 800, fontSize: 12 }}>{pct(stock.dayChangePercent)}</Typography>
                      </Box>
                    </Stack>
                    <Typography sx={{ color: D.t3, fontSize: 12, mb: 2 }}>{owned ? `${owned} shares owned` : "Not owned"}</Typography>
                    <Stack direction="row" spacing={1}>
                      <Button component={RouterLink} to={`/stocks/${stock.symbol}`} size="small" sx={{ color: D.brandText, textTransform: "none", fontWeight: 800 }}>Details</Button>
                      {comparison && <Button component={RouterLink} to={`/compare?left=${stock.symbol}&right=${comparison.symbol}`} size="small" sx={{ color: D.greenText, textTransform: "none", fontWeight: 800 }}>Compare</Button>}
                      <Button size="small" onClick={() => trading.removeFromWatchlist(stock)} sx={{ ml: "auto!important", color: D.t3, textTransform: "none" }}>Remove</Button>
                    </Stack>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Container>
    </Box>
  );
}
