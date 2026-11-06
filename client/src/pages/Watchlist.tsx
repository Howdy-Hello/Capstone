import { Box, Button, Chip, Container, Grid, IconButton, Stack, Typography } from "@mui/material";
import DayBar from "../components/DayBar";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import StarIcon from "@mui/icons-material/Star";
import { Link as RouterLink } from "react-router-dom";
import { useGame } from "../context/GameContext";
import { getSharesOwned } from "../data/tradingState";
import { CARD, D, MONO, money, pct } from "../theme/design";
import { usePageTitle } from "../lib/usePageTitle";

export default function Watchlist() {
  usePageTitle("Watchlist");
  const trading = useGame();

  return (
    <Box sx={{ bgcolor: D.bg, minHeight: "100vh" }}>
      <DayBar />
      <Container data-tour="watchlist-page" maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
        <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 1 }}>
          <StarIcon sx={{ color: D.amber }} />
          <Typography component="h1" sx={{ color: D.t1, fontSize: { xs: 26, md: 32 }, fontWeight: 900 , letterSpacing: "-0.02em" }}>Watchlist</Typography>
          <Chip label={trading.watchlistStocks.length} size="small" sx={{ bgcolor: D.overlay, color: D.t2, fontWeight: 900 }} />
        </Stack>
        <Typography sx={{ color: D.t3, mb: 3 }}>Track stocks you want to revisit without buying them.</Typography>

        {trading.watchlistStocks.length === 0 ? (
          <Box sx={{ ...CARD, p: { xs: 2.5, sm: 3 } }}>
            <Typography sx={{ color: D.t1, fontWeight: 800, mb: 1 }}>Your watchlist is empty</Typography>
            <Typography sx={{ color: D.t3, fontSize: 14, mb: 2 }}>Use the star beside a ticker in the market to add it here.</Typography>
            <Typography component="h2" sx={{ color: D.t1, fontSize: 16, fontWeight: 900, mt: 3, mb: 1 }}>Market Movers</Typography>
            <Stack sx={{ mb: 2.5 }}>
              {[...trading.stocks].sort((a, b) => Math.abs(b.dayChangePercent) - Math.abs(a.dayChangePercent)).slice(0, 4).map((stock) => (
                <Stack key={stock.symbol} direction="row" alignItems="center" spacing={1} sx={{ py: 1, borderTop: `1px solid ${D.border}` }}>
                  <IconButton size="small" aria-label={`Add ${stock.name} to watchlist`} title="Add to watchlist" onClick={() => trading.toggleWatchlist(stock)} sx={{ color: D.t3, "&:hover": { color: D.amber } }}>
                    <StarBorderIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                  <Typography sx={{ color: D.t1, fontSize: 14, fontWeight: 900, fontFamily: MONO }}>{stock.symbol}</Typography>
                  <Typography noWrap sx={{ color: D.t2, fontSize: 14, flex: 1, minWidth: 0 }}>{stock.name}</Typography>
                  <Typography sx={{ color: stock.dayChangePercent >= 0 ? D.greenText : D.redText, fontSize: 14, fontWeight: 800, fontFamily: MONO }}>{pct(stock.dayChangePercent)}</Typography>
                </Stack>
              ))}
            </Stack>
            <Button component={RouterLink} to="/game" variant="contained" sx={{ bgcolor: D.brand, textTransform: "none", fontWeight: 800 }}>Browse market</Button>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {trading.watchlistStocks.map((stock) => {
              const up = stock.dayChangePercent >= 0;
              const owned = getSharesOwned(trading.account, stock.symbol);
              // Only the left side is pinned; /compare resolves the counterpart with
              // the same rules it uses everywhere else, and offers a picker to change it.
              const canCompare = trading.stocks.some((item) => item.symbol !== stock.symbol);
              return (
                <Grid item xs={12} sm={6} md={4} key={stock.symbol}>
                  <Box sx={{ ...CARD, p: 2.5, height: "100%" }}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 1.5 }}>
                      <Box>
                        <Typography sx={{ color: D.t1, fontFamily: MONO, fontWeight: 900, fontSize: 18 }}>{stock.symbol}</Typography>
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
                      {canCompare && <Button component={RouterLink} to={`/compare?left=${stock.symbol}`} size="small" sx={{ color: D.greenText, textTransform: "none", fontWeight: 800 }}>Compare</Button>}
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
