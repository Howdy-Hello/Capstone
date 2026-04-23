import React from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  Tooltip,
  Typography,
  LinearProgress,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import SpeedIcon from "@mui/icons-material/Speed";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ReferenceLine,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";

const BRAND = {
  navy: "#2C3947",
  red: "#FF3737",
  green: "#9AD872",
  paper: "#F6F8FA",
};

type StrategyKey = "Growth" | "Value" | "Momentum" | "Defensive";
const STRATEGIES: StrategyKey[] = ["Growth", "Value", "Momentum", "Defensive"];
const COLORS = [BRAND.green, BRAND.red, "#78A9FF", "#F4C95D", "#A78BFA", "#35D0BA"];

function createSeries(days: number, seed = 1) {
  const data: Array<any> = [];
  let portfolio = 210000 + seed * 3100;
  let benchmark = 205000 + seed * 2400;

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const shock = Math.sin((days - i) / 7) * 1150 + (Math.random() - 0.48) * 2400;
    const benchShock = Math.sin((days - i) / 8) * 850 + (Math.random() - 0.5) * 1600;
    portfolio = Math.max(100000, portfolio + shock);
    benchmark = Math.max(100000, benchmark + benchShock);

    data.push({
      date: d.toISOString().slice(5, 10),
      portfolio: Math.round(portfolio),
      benchmark: Math.round(benchmark),
      pnl: Math.round(shock),
      volatility: Number((12 + Math.random() * 9 + Math.abs(shock) / 1300).toFixed(2)),
      exposure: Number((58 + Math.random() * 30).toFixed(1)),
      cash: Math.round(25000 + Math.random() * 28000),
    });
  }

  return data;
}

const DATA = {
  "30d": createSeries(30, 1),
  "90d": createSeries(90, 2),
  "180d": createSeries(180, 3),
  "365d": createSeries(365, 4),
};

const holdings = [
  { symbol: "NVDA", name: "NVIDIA", allocation: 22, pnl: 18420, up: true },
  { symbol: "MSFT", name: "Microsoft", allocation: 17, pnl: 7320, up: true },
  { symbol: "AAPL", name: "Apple", allocation: 15, pnl: 4410, up: true },
  { symbol: "TSLA", name: "Tesla", allocation: 11, pnl: -3920, up: false },
  { symbol: "JPM", name: "JPMorgan", allocation: 9, pnl: 1260, up: true },
];

const sectorMix = [
  { name: "Technology", value: 42 },
  { name: "Financials", value: 18 },
  { name: "Consumer", value: 16 },
  { name: "Healthcare", value: 13 },
  { name: "Cash", value: 11 },
];

const riskScatter = Array.from({ length: 28 }, (_, i) => ({
  name: `Trade ${i + 1}`,
  risk: Math.round(20 + Math.random() * 72),
  reward: Math.round(-15 + Math.random() * 52),
  size: Math.round(35 + Math.random() * 120),
}));

const Dashboard: React.FC = () => {
  const [range, setRange] = React.useState<"30d" | "90d" | "180d" | "365d">("90d");
  const [strategy, setStrategy] = React.useState<StrategyKey>("Growth");
  const data = DATA[range];

  const totals = React.useMemo(() => {
    const first = data[0];
    const last = data[data.length - 1];
    const pnl = last.portfolio - first.portfolio;
    const returnPct = (pnl / first.portfolio) * 100;
    const winRate = 54 + Math.min(18, Math.max(-8, returnPct * 1.3));
    const riskScore = Math.round(data.reduce((a, b) => a + b.volatility, 0) / data.length * 3.2);

    return {
      portfolio: last.portfolio,
      pnl,
      returnPct,
      winRate,
      riskScore: Math.min(100, riskScore),
      cash: last.cash,
      exposure: last.exposure,
    };
  }, [data]);

  const handleRange = (e: SelectChangeEvent) => setRange(e.target.value as any);
  const handleStrategy = (e: SelectChangeEvent) => setStrategy(e.target.value as StrategyKey);

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: BRAND.paper }}>
      <Box sx={{ bgcolor: BRAND.navy, color: "#fff", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <Container sx={{ py: { xs: 3, md: 4 } }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="h3" fontWeight={950} sx={{ letterSpacing: -1.2 }}>
                  Stock Simulator
                </Typography>
                <Tooltip title="Mock simulator data. Replace with API data when backend is ready.">
                  <IconButton size="small" sx={{ color: "rgba(255,255,255,0.72)" }}><InfoOutlinedIcon fontSize="small" /></IconButton>
                </Tooltip>
              </Stack>
              <Typography sx={{ color: "rgba(255,255,255,0.68)", mt: 0.8 }}>
                Portfolio cockpit for simulated trading, risk control, and performance decisions.
              </Typography>
            </Box>

            <Stack direction="row" flexWrap="wrap" gap={1.5} alignItems="center">
              <FormControl size="small" sx={{ minWidth: 145, bgcolor: "rgba(255,255,255,0.08)", borderRadius: 2 }}>
                <InputLabel id="range" sx={{ color: "rgba(255,255,255,0.7)" }}>Range</InputLabel>
                <Select labelId="range" label="Range" value={range} onChange={handleRange} sx={{ color: "#fff", ".MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.2)" }, ".MuiSvgIcon-root": { color: "#fff" } }}>
                  <MenuItem value="30d">Last 30 days</MenuItem>
                  <MenuItem value="90d">Last 90 days</MenuItem>
                  <MenuItem value="180d">Last 180 days</MenuItem>
                  <MenuItem value="365d">Last 365 days</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 155, bgcolor: "rgba(255,255,255,0.08)", borderRadius: 2 }}>
                <InputLabel id="strategy" sx={{ color: "rgba(255,255,255,0.7)" }}>Strategy</InputLabel>
                <Select labelId="strategy" label="Strategy" value={strategy} onChange={handleStrategy} sx={{ color: "#fff", ".MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.2)" }, ".MuiSvgIcon-root": { color: "#fff" } }}>
                  {STRATEGIES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Container sx={{ py: { xs: 3, md: 4 } }}>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {[
            { label: "Portfolio Value", value: `$${totals.portfolio.toLocaleString()}`, icon: <AccountBalanceWalletIcon />, color: BRAND.green },
            { label: "Total P/L", value: `${totals.pnl >= 0 ? "+" : ""}$${totals.pnl.toLocaleString()}`, icon: totals.pnl >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />, color: totals.pnl >= 0 ? BRAND.green : BRAND.red },
            { label: "Return", value: `${totals.returnPct >= 0 ? "+" : ""}${totals.returnPct.toFixed(2)}%`, icon: <SpeedIcon />, color: totals.returnPct >= 0 ? BRAND.green : BRAND.red },
            { label: "Risk Score", value: `${totals.riskScore}/100`, icon: <ShieldOutlinedIcon />, color: BRAND.red },
          ].map((kpi) => (
            <Grid item xs={12} sm={6} md={3} key={kpi.label}>
              <Card sx={{ borderRadius: 4, border: "1px solid rgba(44,57,71,0.1)", boxShadow: "0 14px 34px rgba(44,57,71,0.08)" }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="overline" color="text.secondary" fontWeight={900}>{kpi.label}</Typography>
                      <Typography variant="h5" fontWeight={950} color={BRAND.navy}>{kpi.value}</Typography>
                    </Box>
                    <Box sx={{ width: 42, height: 42, borderRadius: 2.5, display: "grid", placeItems: "center", bgcolor: `${kpi.color}26`, color: kpi.color }}>
                      {kpi.icon}
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={2}>
          <Grid item xs={12} lg={8}>
            <Card sx={{ height: 430, borderRadius: 4, border: "1px solid rgba(44,57,71,0.1)", boxShadow: "0 14px 34px rgba(44,57,71,0.08)" }}>
              <CardContent sx={{ height: "100%" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Box>
                    <Typography variant="h6" fontWeight={950} color={BRAND.navy}>Portfolio vs Benchmark</Typography>
                    <Typography variant="body2" color="text.secondary">Simulated mark-to-market movement</Typography>
                  </Box>
                  <Chip label={strategy} sx={{ bgcolor: BRAND.navy, color: "#fff", fontWeight: 900 }} />
                </Stack>
                <ResponsiveContainer width="100%" height="84%">
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id="portfolioFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={BRAND.green} stopOpacity={0.5} />
                        <stop offset="95%" stopColor={BRAND.green} stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(44,57,71,0.12)" />
                    <XAxis dataKey="date" minTickGap={22} />
                    <YAxis tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`} />
                    <RTooltip formatter={(v: any) => `$${Number(v).toLocaleString()}`} />
                    <Legend />
                    <Area type="monotone" dataKey="portfolio" name="Portfolio" stroke={BRAND.green} fill="url(#portfolioFill)" strokeWidth={3} />
                    <Line type="monotone" dataKey="benchmark" name="Benchmark" stroke={BRAND.red} strokeWidth={2.5} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} lg={4}>
            <Card sx={{ height: 430, borderRadius: 4, bgcolor: BRAND.navy, color: "#fff", boxShadow: "0 14px 34px rgba(44,57,71,0.18)" }}>
              <CardContent sx={{ height: "100%" }}>
                <Typography variant="h6" fontWeight={950}>Top Holdings</Typography>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.62)", mb: 2 }}>Allocation and unrealized P/L</Typography>
                <Stack spacing={1.4}>
                  {holdings.map((h) => (
                    <Box key={h.symbol} sx={{ p: 1.45, borderRadius: 3, bgcolor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Box>
                          <Typography fontWeight={950}>{h.symbol}</Typography>
                          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.55)" }}>{h.name}</Typography>
                        </Box>
                        <Typography fontWeight={950} sx={{ color: h.up ? BRAND.green : BRAND.red }}>
                          {h.pnl >= 0 ? "+" : ""}${h.pnl.toLocaleString()}
                        </Typography>
                      </Stack>
                      <LinearProgress variant="determinate" value={h.allocation} sx={{ height: 8, borderRadius: 99, bgcolor: "rgba(255,255,255,0.1)", "& .MuiLinearProgress-bar": { bgcolor: h.up ? BRAND.green : BRAND.red, borderRadius: 99 } }} />
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ height: 330, borderRadius: 4, border: "1px solid rgba(44,57,71,0.1)" }}>
              <CardContent sx={{ height: "100%" }}>
                <Typography variant="h6" fontWeight={950} color={BRAND.navy}>Sector Allocation</Typography>
                <ResponsiveContainer width="100%" height="86%">
                  <PieChart>
                    <RTooltip />
                    <Pie data={sectorMix} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="82%" paddingAngle={2}>
                      {sectorMix.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ height: 330, borderRadius: 4, border: "1px solid rgba(44,57,71,0.1)" }}>
              <CardContent sx={{ height: "100%" }}>
                <Typography variant="h6" fontWeight={950} color={BRAND.navy}>Daily P/L</Typography>
                <ResponsiveContainer width="100%" height="86%">
                  <BarChart data={data.slice(-30)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(44,57,71,0.12)" />
                    <XAxis dataKey="date" minTickGap={14} />
                    <YAxis />
                    <RTooltip formatter={(v: any) => `$${Number(v).toLocaleString()}`} />
                    <Bar dataKey="pnl" name="Daily P/L" radius={[6, 6, 0, 0]}>
                      {data.slice(-30).map((entry, index) => <Cell key={index} fill={entry.pnl >= 0 ? BRAND.green : BRAND.red} />)}
                    </Bar>
                    <ReferenceLine y={0} stroke={BRAND.navy} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ height: 330, borderRadius: 4, border: "1px solid rgba(44,57,71,0.1)" }}>
              <CardContent sx={{ height: "100%" }}>
                <Typography variant="h6" fontWeight={950} color={BRAND.navy}>Risk / Reward Map</Typography>
                <ResponsiveContainer width="100%" height="86%">
                  <ScatterChart>
                    <CartesianGrid stroke="rgba(44,57,71,0.12)" />
                    <XAxis type="number" dataKey="risk" name="Risk" />
                    <YAxis type="number" dataKey="reward" name="Reward" />
                    <ZAxis type="number" dataKey="size" range={[60, 420]} />
                    <RTooltip cursor={{ strokeDasharray: "3 3" }} />
                    <ReferenceLine x={70} stroke={BRAND.red} label="High Risk" />
                    <ReferenceLine y={0} stroke={BRAND.navy} />
                    <Scatter name="Trades" data={riskScatter} fill={BRAND.red} />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />
        <Typography variant="body2" color="text.secondary">
          Simulator data is currently generated in the frontend. Replace the mock arrays with API-backed portfolio, order, and market-data endpoints when ready.
        </Typography>
      </Container>
    </Box>
  );
};

export default Dashboard;
