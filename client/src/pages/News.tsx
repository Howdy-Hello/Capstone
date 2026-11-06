import React from "react";
import DayBar from "../components/DayBar";
import { useMemo, useState } from "react";
import {
  Box, Button, Chip, Container, FormControl, Grid, InputLabel, MenuItem, Select, Stack,
  TextField, Typography,
} from "@mui/material";
import NewspaperIcon from "@mui/icons-material/Newspaper";
import SearchIcon from "@mui/icons-material/Search";
import { useGame } from "../context/GameContext";
import { getNewsCredibility, MarketNews } from "../data/mockStocks";
import { CARD, D, MONO } from "../theme/design";
import { usePageTitle } from "../lib/usePageTitle";

const all = "All";

export default function News() {
  usePageTitle("News");
  const { gameDay, marketPhase, newsHistory } = useGame();
  const [query, setQuery] = useState("");
  const [publisher, setPublisher] = useState(all);
  const [category, setCategory] = useState(all);
  const [sector, setSector] = useState(all);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAllNews, setShowAllNews] = useState(false);
  // Same rule as the Game page: reports are filed under the day whose close
  // revealed them, so during trading the latest brief is yesterday's.
  const briefDay = marketPhase === "after_hours" ? gameDay : gameDay - 1;

  const availableNews = useMemo(
    () => showAllNews ? newsHistory : newsHistory.filter((item) => item.gameDay === briefDay),
    [briefDay, newsHistory, showAllNews],
  );

  const options = useMemo(() => ({
    publishers: Array.from(new Set(availableNews.map((item) => item.source))).sort(),
    categories: Array.from(new Set(availableNews.map((item) => item.category))).sort(),
    sectors: Array.from(new Set(availableNews.flatMap((item) => item.affectedSectors ?? []))).sort(),
  }), [availableNews]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return availableNews.filter((item) => (
      (!needle || `${item.headline} ${item.body} ${item.relatedTickers.join(" ")}`.toLowerCase().includes(needle))
      && (publisher === all || item.source === publisher)
      && (category === all || item.category === category)
      && (sector === all || item.affectedSectors?.includes(sector))
    ));
  }, [availableNews, category, publisher, query, sector]);

  const selected = filtered.find((item) => item.newsId === selectedId) ?? filtered[0] ?? null;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: D.bg }}>
      <DayBar />
      <Box sx={{ bgcolor: D.surface, borderBottom: `1px solid ${D.border}` }}>
        <Container maxWidth="xl" sx={{ py: { xs: 2.5, md: 3 } }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ width: 42, height: 42, borderRadius: 2, bgcolor: D.brandBg, color: D.brandText, display: "grid", placeItems: "center" }}><NewspaperIcon /></Box>
            <Box>
              <Typography component="h1" sx={{ color: D.t1, fontSize: { xs: 26, md: 32 }, fontWeight: 900 , letterSpacing: "-0.02em" }}>Market Newsroom</Typography>
              <Typography sx={{ color: D.t3, fontSize: 14 }}>Browse revealed reports by company, sector, publisher, and event type.</Typography>
            </Box>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1.5} sx={{ mb: 2.5 }}>
          <Box>
            <Typography component="h2" sx={{ color: D.t1, fontSize: 18, fontWeight: 900 }}>{showAllNews ? "All revealed news" : (briefDay >= 1 ? `Day ${briefDay} after-hours news` : "No news yet")}</Typography>
            <Typography sx={{ color: D.t3, fontSize: 14 }}>{showAllNews ? "Current and previous-day articles." : "The latest articles, revealed when the market last closed."}</Typography>
          </Box>
          <Button variant="outlined" aria-pressed={showAllNews} onClick={() => { setShowAllNews((value) => !value); setSelectedId(null); setPublisher(all); setCategory(all); setSector(all); }}
            sx={{ alignSelf: { xs: "stretch", sm: "center" }, color: D.brandText, borderColor: D.brandBd, textTransform: "none", fontWeight: 850, borderRadius: 1.5, "&:hover": { bgcolor: D.brandBg, borderColor: D.brand } }}>
            {showAllNews ? "Show Latest News" : "See All News"}
          </Button>
        </Stack>

        <Box component="details" sx={{ mb: 2, color: D.t2 }}><summary>Reading the evidence</summary>
        <Typography sx={{ fontSize: 14, lineHeight: 1.6 }}>
          Consider what the report could change about a company's sales, costs, and risks. An advisor on the company's stock page can help you interpret the evidence.
          Credibility estimates report reliability from the publisher and rumor status. A score out of 100 is not a probability of profit.
        </Typography></Box>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={5}><TextField fullWidth size="small" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search headlines, companies, or tickers" inputProps={{ "aria-label": "Search news" }} InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: D.t3 }} /> }} /></Grid>
          {([
            ["Publisher", publisher, setPublisher, options.publishers, "All publishers"],
            ["Category", category, setCategory, options.categories, "All categories"],
            ["Sector", sector, setSector, options.sectors, "All sectors"],
          ] as const).map(([label, value, setter, values, allLabel]) => (
            <Grid item xs={12} sm={4} md key={label}>
              <FormControl fullWidth size="small"><InputLabel id={`news-filter-${label}`}>{label}</InputLabel><Select labelId={`news-filter-${label}`} value={value} label={label} onChange={(event) => setter(event.target.value)}>
                <MenuItem value={all}>{allLabel}</MenuItem>{values.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
              </Select></FormControl>
            </Grid>
          ))}
        </Grid>

        {showAllNews ? (
          <Stack spacing={1.2}>
            <Typography sx={{ color: D.t3, fontSize: 12, fontFamily: MONO }}>{filtered.length} REVEALED ARTICLE{filtered.length === 1 ? "" : "S"}</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
              {filtered.map((item) => <ArchiveCard key={item.newsId} item={item} />)}
            </Box>
            {!filtered.length && <Box sx={{ ...CARD, p: 3 }}><Typography sx={{ color: D.t3 }}>No revealed articles match these filters.</Typography></Box>}
          </Stack>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12} md={5}>
              <Stack spacing={1.2}>
                <Typography sx={{ color: D.t3, fontSize: 12, fontFamily: MONO }}>{filtered.length} DAY {Math.max(briefDay, 0)} ARTICLE{filtered.length === 1 ? "" : "S"}</Typography>
                {filtered.map((item) => (
                  <React.Fragment key={item.newsId}>
                    <ArticleRow item={item} selected={selected?.newsId === item.newsId} onClick={() => setSelectedId(item.newsId)} />
                    {selected?.newsId === item.newsId && <Box sx={{ display: { xs: "block", md: "none" } }}><ArticleDetail item={item} /></Box>}
                  </React.Fragment>
                ))}
                {!filtered.length && <Box sx={{ ...CARD, p: 3 }}><Typography sx={{ color: D.t3 }}>{availableNews.length === 0 ? "No reports have been revealed yet. Close the market to receive the first ones." : "No revealed articles match these filters."}</Typography></Box>}
              </Stack>
            </Grid>
            <Grid item xs={12} md={7} sx={{ display: { xs: "none", md: "block" } }}>
              {selected && <ArticleDetail item={selected} />}
            </Grid>
          </Grid>
        )}
      </Container>
    </Box>
  );
}

function ArticleRow({ item, selected, onClick }: { item: MarketNews; selected: boolean; onClick: () => void }) {
  return <Box component="button" onClick={onClick} sx={{ ...CARD, width: "100%", p: 2, textAlign: "left", cursor: "pointer", bgcolor: selected ? D.brandBg : D.surface, borderColor: selected ? D.brandBd : D.border }}>
    <Stack direction="row" justifyContent="space-between" spacing={1}><Typography sx={{ color: D.brandText, fontSize: 12, fontWeight: 900, fontFamily: MONO }}>DAY {item.gameDay}</Typography><Typography sx={{ color: D.t3, fontSize: 12 }}>{item.source}</Typography></Stack>
    <Typography sx={{ color: D.t1, fontSize: 14, fontWeight: 850, my: 0.7 }}>{item.headline}</Typography>
    <Typography noWrap sx={{ color: D.t3, fontSize: 12 }}>{item.relatedTickers.join(" · ")} · {item.category}</Typography>
  </Box>;
}

function ArchiveCard({ item }: { item: MarketNews }) {
  const credibility = getNewsCredibility(item);
  return <Box component="article" sx={{ ...CARD, p: 2.5, height: "100%" }}>
    <Stack direction="row" justifyContent="space-between" spacing={1}><Typography sx={{ color: D.brandText, fontSize: 12, fontWeight: 900, fontFamily: MONO }}>DAY {item.gameDay}</Typography><Typography sx={{ color: D.t3, fontSize: 12 }}>{item.source}</Typography></Stack>
    <Typography sx={{ color: D.t1, fontSize: 18, lineHeight: 1.3, fontWeight: 900, my: 1 }}>{item.headline}</Typography>
    <Typography sx={{ color: D.t2, fontSize: 14, lineHeight: 1.7, mb: 2 }}>{item.body}</Typography>
    <Stack direction="row" gap={.75} flexWrap="wrap">
      <Chip size="small" label={`Credibility ${credibility.score}/100 · ${credibility.label}`} />
      {item.relatedTickers.map((ticker) => <Chip key={ticker} size="small" label={ticker} sx={{ bgcolor: D.elevated, color: D.t1 }} />)}
    </Stack>
  </Box>;
}

function ArticleDetail({ item }: { item: MarketNews }) {
  const credibility = getNewsCredibility(item);
  return <Box sx={{ ...CARD, p: { xs: 2.5, md: 4 }, position: { md: "sticky" }, top: { md: 82 } }}>
    <Typography sx={{ color: D.brandText, fontSize: 12, fontWeight: 900, fontFamily: MONO }}>DAY {item.gameDay} · {item.source.toUpperCase()}</Typography>
    <Typography sx={{ color: D.t1, fontSize: { xs: 22, md: 28 }, lineHeight: 1.2, fontWeight: 900, my: 1.5 }}>{item.headline}</Typography>
    <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2.5 }}>
      <Chip size="small" label={`${item.confidence ?? "Medium"} confidence`} />
      <Chip size="small" label={item.horizon ?? "Next session"} />
      <Chip size="small" label={`Credibility ${credibility.score}/100 · ${credibility.label}`} />
      {item.followUpTo && <Chip size="small" color="info" label="Follow-up" />}
      {item.arcKey && <Chip size="small" label={`Story: ${item.arcKey.replace(/_/g, " ")}`} />}
    </Stack>
    <Typography sx={{ color: D.t2, fontSize: 16, lineHeight: 1.85 }}>{item.body}</Typography>
    <Box sx={{ mt: 3, pt: 2.5, borderTop: `1px solid ${D.border}` }}>
      <Typography sx={{ color: D.t3, fontSize: 12, fontWeight: 900, fontFamily: MONO, mb: 1 }}>MARKET EXPOSURE</Typography>
      <Stack direction="row" gap={1} flexWrap="wrap">{item.relatedTickers.map((ticker) => <Chip key={ticker} size="small" label={ticker} sx={{ bgcolor: D.elevated, color: D.t1 }} />)}{item.affectedSectors?.map((name) => <Chip key={name} size="small" label={name} sx={{ bgcolor: D.brandBg, color: D.brandText }} />)}</Stack>
    </Box>
    <Typography sx={{ color: D.t3, fontSize: 12, mt: 3 }}>Reports provide evidence to assess, not guaranteed returns. Exact price impacts remain hidden.</Typography>
  </Box>;
}
