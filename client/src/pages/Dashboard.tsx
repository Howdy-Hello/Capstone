import React from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  Typography,
  useTheme,
  Grid,
  LinearProgress,
  Tooltip,
  IconButton,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  Legend,
  Brush,
  ReferenceLine,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

// ---------------- Mock Data ----------------

type SegmentKey = "Retail" | "SME" | "Enterprise";

const SEGMENTS: SegmentKey[] = ["Retail", "SME", "Enterprise"];
const COLORS = ["#3f51b5", "#00bcd4", "#ff9800", "#8bc34a", "#f44336", "#9c27b0"];

// generate timeseries for N days
function genSeries(days: number, seed = 1, segments = SEGMENTS) {
  const data: Array<any> = [];
  let r1 = 1000 + seed * 37;
  let r2 = 700 + seed * 19;
  let r3 = 300 + seed * 11;

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    // random walk per segment
    r1 += (Math.random() - 0.4) * 40;
    r2 += (Math.random() - 0.5) * 25;
    r3 += (Math.random() - 0.6) * 18;
    const point: any = {
      date: d.toISOString().slice(0, 10),
      total: Math.max(0, r1 + r2 + r3),
    };
    segments.forEach((s, idx) => {
      const base = idx === 0 ? r1 : idx === 1 ? r2 : r3;
      point[s] = Math.max(0, base + (Math.random() - 0.5) * 25);
    });
    // extra metrics for composed charts
    point.conversion = Math.min(0.25 + Math.random() * 0.15, 0.6);
    point.arpu = 5 + Math.random() * 3 + (seed % 7) * 0.2;
    data.push(point);
  }
  return data;
}

const ALL_DATA_30 = genSeries(30);
const ALL_DATA_90 = genSeries(90, 2);
const ALL_DATA_180 = genSeries(180, 3);
const ALL_DATA_365 = genSeries(365, 7);

function pickData(range: string) {
  switch (range) {
    case "30d":
      return ALL_DATA_30;
    case "90d":
      return ALL_DATA_90;
    case "180d":
      return ALL_DATA_180;
    case "365d":
    default:
      return ALL_DATA_365;
  }
}

const CHANNEL_MIX = [
  { name: "Organic", value: 420 },
  { name: "Paid", value: 360 },
  { name: "Referral", value: 210 },
  { name: "Partnerships", value: 140 },
  { name: "Other", value: 80 },
];

const RADAR_METRICS = [
  { metric: "Acquisition", Retail: 120, SME: 98, Enterprise: 86 },
  { metric: "Activation", Retail: 110, SME: 120, Enterprise: 92 },
  { metric: "Retention", Retail: 95, SME: 105, Enterprise: 118 },
  { metric: "Revenue", Retail: 100, SME: 115, Enterprise: 130 },
  { metric: "Referral", Retail: 85, SME: 92, Enterprise: 88 },
];

const COHORT_POINTS = Array.from({ length: 30 }, (_, i) => ({
  cohort: `C${i + 1}`,
  ltv: Math.round(200 + Math.random() * 400),
  cac: Math.round(40 + Math.random() * 140),
  size: Math.round(20 + Math.random() * 80),
}));

// ---------------- Page ----------------

const Dashboard: React.FC = () => {
  const theme = useTheme();
  const [range, setRange] = React.useState<"30d" | "90d" | "180d" | "365d">("90d");
  const [segments, setSegments] = React.useState<SegmentKey[]>(["Retail", "SME", "Enterprise"]);
  const [activeSlice, setActiveSlice] = React.useState<number | null>(null);

  const data = React.useMemo(() => {
    const base = pickData(range);
    // filter segment totals accordingly
    return base.map((d) => {
      const selectedTotal = segments.reduce((acc, s) => acc + (d[s] ?? 0), 0);
      return { ...d, selectedTotal };
    });
  }, [range, segments]);

  const totals = React.useMemo(() => {
    const last = data[data.length - 1] || {};
    const first = data[0] || {};
    const totalNow = Math.round(last.selectedTotal || 0);
    const totalPrev = Math.round(first.selectedTotal || 1);
    const growth = ((totalNow - totalPrev) / totalPrev) * 100;
    const convAvg =
      data.reduce((a, c) => a + (c.conversion || 0), 0) / Math.max(1, data.length);
    const arpuAvg =
      data.reduce((a, c) => a + (c.arpu || 0), 0) / Math.max(1, data.length);
    return {
      totalNow,
      growth,
      convAvg,
      arpuAvg,
    };
  }, [data]);

  const handleRange = (e: SelectChangeEvent) => setRange(e.target.value as any);

  const toggleSegment = (s: SegmentKey) => {
    setSegments((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  return (
    <Box sx={{ minHeight: "100dvh", background: (t) =>
      `radial-gradient(1200px 600px at -10% -10%, ${t.palette.primary.light}15, transparent 60%),
       radial-gradient(1200px 600px at 110% 110%, ${t.palette.secondary.light}15, transparent 60%)`
    }}>
      <Container sx={{ py: { xs: 3, md: 5 } }}>
        {/* Header */}
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems="flex-start" gap={2} sx={{ mb: 3 }}>
          <Box>
            <Stack direction="row" alignItems="center" gap={1}>
              <Typography variant="h4" fontWeight={900}>Dashboard</Typography>
              <Tooltip title="Mock data; wire to your API when ready">
                <IconButton size="small"><InfoOutlinedIcon fontSize="small" /></IconButton>
              </Tooltip>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Interactive analytics with filters, tooltips, legends, brushing, and more.
            </Typography>
          </Box>

          {/* Filters */}
          <Stack direction="row" flexWrap="wrap" gap={1.5} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel id="range">Date Range</InputLabel>
              <Select labelId="range" label="Date Range" value={range} onChange={handleRange}>
                <MenuItem value="30d">Last 30 days</MenuItem>
                <MenuItem value="90d">Last 90 days</MenuItem>
                <MenuItem value="180d">Last 180 days</MenuItem>
                <MenuItem value="365d">Last 365 days</MenuItem>
              </Select>
            </FormControl>

            <Stack direction="row" gap={1} alignItems="center">
              {SEGMENTS.map((s, i) => (
                <Chip
                  key={s}
                  label={s}
                  onClick={() => toggleSegment(s)}
                  variant={segments.includes(s) ? "filled" : "outlined"}
                  sx={{
                    bgcolor: segments.includes(s) ? COLORS[i] : "transparent",
                    color: segments.includes(s) ? "#fff" : "inherit",
                    borderColor: COLORS[i],
                    fontWeight: 600,
                  }}
                />
              ))}
            </Stack>
          </Stack>
        </Stack>

        {/* KPIs */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={3}>
            <Card sx={{ borderRadius: 3, border: (t) => `1px solid ${t.palette.divider}` }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary">Active Users</Typography>
                <Typography variant="h5" fontWeight={800}>{totals.totalNow.toLocaleString()}</Typography>
                <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, Math.max(0, 50 + totals.growth))}
                    sx={{ flex: 1, height: 8, borderRadius: 1 }}
                  />
                  <Typography variant="body2" color={totals.growth >= 0 ? "success.main" : "error.main"}>
                    {totals.growth >= 0 ? "+" : ""}
                    {totals.growth.toFixed(1)}%
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{ borderRadius: 3, border: (t) => `1px solid ${t.palette.divider}` }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary">Avg. Conversion</Typography>
                <Typography variant="h5" fontWeight={800}>{(totals.convAvg * 100).toFixed(1)}%</Typography>
                <Typography variant="body2" color="text.secondary">Across selected range</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{ borderRadius: 3, border: (t) => `1px solid ${t.palette.divider}` }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary">Avg. ARPU</Typography>
                <Typography variant="h5" fontWeight={800}>${totals.arpuAvg.toFixed(2)}</Typography>
                <Typography variant="body2" color="text.secondary">Per user</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{ borderRadius: 3, border: (t) => `1px solid ${t.palette.divider}` }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary">Segments Active</Typography>
                <Typography variant="h5" fontWeight={800}>{segments.length} / {SEGMENTS.length}</Typography>
                <Typography variant="body2" color="text.secondary">Click chips to toggle</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Charts */}
        <Grid container spacing={2}>
          {/* Trend + Brush */}
          <Grid item xs={12} md={8}>
            <Card sx={{ height: 360, borderRadius: 3, border: (t) => `1px solid ${t.palette.divider}` }}>
              <CardContent sx={{ height: "100%" }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                  Active Users Trend
                </Typography>
                <ResponsiveContainer width="100%" height="85%">
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" minTickGap={24} />
                    <YAxis />
                    <RTooltip />
                    <Legend />
                    {segments.map((s, i) => (
                      <Line
                        key={s}
                        dot={false}
                        type="monotone"
                        dataKey={s}
                        stroke={COLORS[i % COLORS.length]}
                        strokeWidth={2}
                        animationDuration={300}
                      />
                    ))}
                    <ReferenceLine y={0} stroke="#888" />
                    <Brush dataKey="date" height={20} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Channel Mix (Donut) */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: 360, borderRadius: 3, border: (t) => `1px solid ${t.palette.divider}` }}>
              <CardContent sx={{ height: "100%" }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                  Channel Mix
                </Typography>
                <ResponsiveContainer width="100%" height="85%">
                  <PieChart>
                    <RTooltip />
                    <Pie
                      data={CHANNEL_MIX}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="55%"
                      outerRadius="80%"
                      paddingAngle={2}
                      onMouseEnter={(_, idx) => setActiveSlice(idx)}
                      onMouseLeave={() => setActiveSlice(null)}
                    >
                      {CHANNEL_MIX.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                          opacity={activeSlice === null || activeSlice === index ? 1 : 0.4}
                        />
                      ))}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Conversion (Area) & ARPU (Bar) */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: 320, borderRadius: 3, border: (t) => `1px solid ${t.palette.divider}` }}>
              <CardContent sx={{ height: "100%" }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                  Conversion Rate
                </Typography>
                <ResponsiveContainer width="100%" height="85%">
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id="convFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.palette.success.main} stopOpacity={0.35}/>
                        <stop offset="95%" stopColor={theme.palette.success.main} stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" minTickGap={20}/>
                    <YAxis tickFormatter={(v) => `${Math.round(v * 100)}%`} />
                    <RTooltip formatter={(v: any) => `${(v * 100).toFixed(1)}%`} />
                    <Area type="monotone" dataKey="conversion" stroke={theme.palette.success.main} fill="url(#convFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ height: 320, borderRadius: 3, border: (t) => `1px solid ${t.palette.divider}` }}>
              <CardContent sx={{ height: "100%" }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                  ARPU by Day
                </Typography>
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" minTickGap={20}/>
                    <YAxis />
                    <RTooltip />
                    <Bar dataKey="arpu" fill={theme.palette.primary.main} radius={[6,6,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Segment Quality: Radar */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: 360, borderRadius: 3, border: (t) => `1px solid ${t.palette.divider}` }}>
              <CardContent sx={{ height: "100%" }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                  Segment Quality (North Star metrics)
                </Typography>
                <ResponsiveContainer width="100%" height="85%">
                  <RadarChart data={RADAR_METRICS}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" />
                    <PolarRadiusAxis />
                    <Radar name="Retail" dataKey="Retail" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.35}/>
                    <Radar name="SME" dataKey="SME" stroke={COLORS[1]} fill={COLORS[1]} fillOpacity={0.35}/>
                    <Radar name="Enterprise" dataKey="Enterprise" stroke={COLORS[2]} fill={COLORS[2]} fillOpacity={0.35}/>
                    <Legend />
                    <RTooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* LTV vs CAC Scatter (with bubble size = cohort size) */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: 360, borderRadius: 3, border: (t) => `1px solid ${t.palette.divider}` }}>
              <CardContent sx={{ height: "100%" }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                  Cohorts: LTV vs CAC
                </Typography>
                <ResponsiveContainer width="100%" height="85%">
                  <ScatterChart>
                    <CartesianGrid />
                    <XAxis type="number" dataKey="cac" name="CAC" />
                    <YAxis type="number" dataKey="ltv" name="LTV" />
                    <ZAxis type="number" dataKey="size" range={[60, 400]} />
                    <RTooltip cursor={{ strokeDasharray: "3 3" }} />
                    <Legend />
                    <ReferenceLine x={120} stroke="#ef5350" label="CAC High" />
                    <ReferenceLine y={300} stroke="#66bb6a" label="LTV Target" />
                    <Scatter name="Cohorts" data={COHORT_POINTS} fill={theme.palette.secondary.main} />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Typography variant="body2" color="text.secondary">
          All charts are interactive (hover tooltips, legends, brush/zoom on trend). Swap mock data with API calls when your backend is ready.
        </Typography>
      </Container>
    </Box>
  );
};

export default Dashboard;
