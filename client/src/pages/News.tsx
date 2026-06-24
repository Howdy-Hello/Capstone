import React from "react";
import {
  Box, Button, Chip, Container, Grid, Stack, Typography,
} from "@mui/material";
import NewspaperIcon from "@mui/icons-material/Newspaper";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import { Link as RouterLink, useLocation } from "react-router-dom";

import {
  getSeasonDay, MarketNews, SEASON_LENGTH,
} from "../data/mockStocks";
import { useGame } from "../context/GameContext";
import { D, CARD, MONO } from "../theme/design";

type LocationState = { gameDay?: number };

function NewsCard({ news }: { news: MarketNews }) {
  const imp = news.importance === "High";
  return (
    <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: D.elevated, border: `1px solid ${D.border}`, mb: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} sx={{ mb: 1.2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 11, color: D.t3, fontFamily: MONO, mb: 0.4 }}>
            {news.source} · Day {news.gameDay} · {news.category}
          </Typography>
          <Typography sx={{ fontWeight: 800, fontSize: 15, color: D.t1, lineHeight: 1.5 }}>{news.headline}</Typography>
        </Box>
        <Chip size="small" label={news.importance}
          sx={{ bgcolor: imp ? D.redBg : D.amberBg, color: imp ? D.redText : D.amber, border: `1px solid ${imp ? D.redBd : "rgba(245,158,11,0.3)"}`, fontWeight: 800, fontSize: 10, flexShrink: 0 }} />
      </Stack>
      <Typography sx={{ fontSize: 13, color: D.t2, lineHeight: 1.7, mb: 1.5 }}>{news.body}</Typography>
      <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
        {news.isRumor && (
          <Chip size="small" label={news.isAccurate ? "Rumor" : "Unconfirmed"} sx={{ bgcolor: D.overlay, color: D.t3, fontWeight: 700, fontSize: 10 }} />
        )}
        {news.relatedTickers.map((t) => (
          <Chip key={t} size="small" label={t} sx={{ bgcolor: D.brandBg, color: D.brandText, border: `1px solid ${D.brandBd}`, fontWeight: 800, fontSize: 10, fontFamily: MONO }} />
        ))}
      </Stack>
    </Box>
  );
}

export default function News() {
  const location = useLocation();
  const state = location.state as LocationState | null;
  const game = useGame();
  const gameDay = state?.gameDay ?? game.gameDay;
  const seasonDay = getSeasonDay(gameDay);
  const marketNews = gameDay === game.gameDay ? game.news : [];
  const relatedTickerCount = new Set(marketNews.flatMap((n) => n.relatedTickers)).size;
  const highImportance = marketNews.filter((n) => n.importance === "High");

  return (
    <Box sx={{ bgcolor: D.bg, minHeight: "100vh" }}>
      {/* Hero */}
      <Box sx={{ bgcolor: D.surface, borderBottom: `1px solid ${D.border}` }}>
        <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={2}>
            <Box>
              <Chip label={`DAY ${gameDay} NEWS`} size="small" sx={{ bgcolor: D.brandBg, color: D.brandText, border: `1px solid ${D.brandBd}`, fontWeight: 900, fontSize: 10, fontFamily: MONO, letterSpacing: 1, mb: 1 }} />
              <Typography sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 950, color: D.t1, letterSpacing: -1 }}>Market Headlines</Typography>
              <Typography sx={{ fontSize: 13, color: D.t2, mt: 0.5 }}>Events driving simulator prices on Day {gameDay} · Season {seasonDay}/{SEASON_LENGTH}</Typography>
            </Box>
            <Button component={RouterLink} to="/game" variant="contained"
              sx={{ bgcolor: D.brand, fontWeight: 800, fontSize: 13, textTransform: "none", borderRadius: 1.5, boxShadow: "none", "&:hover": { bgcolor: D.brandMid, boxShadow: "none" }, alignSelf: { xs: "flex-start", md: "center" } }}>
              Trade the Market →
            </Button>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
        {/* Summary tiles */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: "Game Day",       val: gameDay.toString(),           icon: <NewspaperIcon sx={{ fontSize: 20 }} />,      up: undefined },
            { label: "Stories",        val: marketNews.length.toString(), icon: <NewspaperIcon sx={{ fontSize: 20 }} />,      up: undefined },
            { label: "Tickers",        val: relatedTickerCount.toString(), icon: <NewspaperIcon sx={{ fontSize: 20 }} />,      up: undefined },
            { label: "High Priority",  val: highImportance.length.toString(), icon: <ReportProblemIcon sx={{ fontSize: 20 }} />, up: false },
          ].map((s) => {
            const color = s.up === undefined ? D.brandText : s.up ? D.greenText : D.redText;
            const bg    = s.up === undefined ? D.brandBg   : s.up ? D.greenBg   : D.redBg;
            return (
              <Grid item xs={6} sm={3} key={s.label}>
                <Box sx={{ ...CARD, p: 2.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography sx={{ fontSize: 10.5, fontWeight: 900, letterSpacing: 0.8, color: D.t3, fontFamily: MONO, mb: 0.8 }}>{s.label.toUpperCase()}</Typography>
                      <Typography sx={{ fontSize: 24, fontWeight: 950, color: D.t1, fontFamily: MONO }}>{s.val}</Typography>
                    </Box>
                    <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: bg, color, display: "grid", placeItems: "center", flexShrink: 0 }}>{s.icon}</Box>
                  </Stack>
                </Box>
              </Grid>
            );
          })}
        </Grid>

        <Grid container spacing={3}>
          {/* Main news feed */}
          <Grid item xs={12} md={8}>
            <Box sx={{ ...CARD, p: 0, overflow: "hidden" }}>
              <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${D.border}` }}>
                <Typography sx={{ fontWeight: 900, fontSize: 16, color: D.t1 }}>Day {gameDay} Headlines</Typography>
                <Typography sx={{ fontSize: 12.5, color: D.t3 }}>Same events as the trading screen.</Typography>
              </Box>
              <Box sx={{ p: 2.5 }}>
                {marketNews.length === 0 ? (
                  <Box sx={{ p: 3, borderRadius: 2, bgcolor: D.elevated, border: `1px solid ${D.border}` }}>
                    <Typography sx={{ fontWeight: 800, color: D.t2, mb: 0.5 }}>No major news today.</Typography>
                    <Typography sx={{ fontSize: 13, color: D.t3 }}>Prices still move from drift, sector trends, and volatility.</Typography>
                  </Box>
                ) : (
                  marketNews.map((n) => <NewsCard key={n.newsId} news={n} />)
                )}
              </Box>
            </Box>
          </Grid>

          {/* Sidebar */}
          <Grid item xs={12} md={4}>
            <Box sx={{ bgcolor: D.elevated, border: `1px solid ${D.border}`, borderRadius: 2, p: 3, mb: 2.5 }}>
              <Typography sx={{ fontWeight: 900, fontSize: 15, color: D.t1, mb: 0.5 }}>How to Predict Movement</Typography>
              <Typography sx={{ fontSize: 13, color: D.t3, mb: 2 }}>Traders think about how others will react, not just what happened.</Typography>
              <Stack spacing={1}>
                {[
                  "Check if the news affects future profits.",
                  "Notice whether the headline is confirmed or uncertain.",
                  "Compare the news to the company's current trend.",
                  "Think about whether traders may overreact.",
                  "Watch for rumors that may move prices quickly.",
                ].map((tip, i) => (
                  <Stack key={i} direction="row" spacing={1.2} alignItems="flex-start">
                    <Box sx={{ width: 20, height: 20, borderRadius: 1, bgcolor: D.brandBg, border: `1px solid ${D.brandBd}`, display: "grid", placeItems: "center", flexShrink: 0, mt: 0.15 }}>
                      <Typography sx={{ fontSize: 10, fontWeight: 900, color: D.brandText, fontFamily: MONO }}>{i + 1}</Typography>
                    </Box>
                    <Typography sx={{ fontSize: 13, color: D.t2, lineHeight: 1.6 }}>{tip}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>

            <Box sx={{ ...CARD, p: 3 }}>
              <Typography sx={{ fontWeight: 900, fontSize: 15, color: D.t1, mb: 0.5 }}>News Reading Rules</Typography>
              <Typography sx={{ fontSize: 13, color: D.t3, mb: 2 }}>Not all headlines are equal.</Typography>
              <Stack spacing={1.2}>
                {[
                  { title: "Strong news", text: "Earnings, product approvals, contracts, lawsuits, and major economic reports." },
                  { title: "Weak news",   text: "Opinions, vague rumors, and repeated information may fade quickly." },
                  { title: "Mixed news",  text: "Both good and bad parts — creates volatility instead of clear direction." },
                ].map((r) => (
                  <Box key={r.title} sx={{ p: 1.8, borderRadius: 2, bgcolor: D.elevated, border: `1px solid ${D.border}` }}>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: D.t1, mb: 0.3 }}>{r.title}</Typography>
                    <Typography sx={{ fontSize: 12.5, color: D.t3 }}>{r.text}</Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Grid>
        </Grid>

        {/* CTA footer */}
        <Box sx={{ ...CARD, mt: 3, p: 3 }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={2}>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: 17, color: D.t1 }}>Think before you trade.</Typography>
              <Typography sx={{ fontSize: 13, color: D.t3 }}>Headlines create opportunity, but they also trick careless traders.</Typography>
            </Box>
            <Button component={RouterLink} to="/game" variant="contained"
              sx={{ bgcolor: D.brand, fontWeight: 800, fontSize: 13, textTransform: "none", borderRadius: 1.5, boxShadow: "none", px: 3, "&:hover": { bgcolor: D.brandMid, boxShadow: "none" }, flexShrink: 0 }}>
              Open Simulator →
            </Button>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
