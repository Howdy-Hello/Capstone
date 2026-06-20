import React, { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import BalanceIcon from "@mui/icons-material/Balance";
import CandlestickChartIcon from "@mui/icons-material/CandlestickChart";
import NewspaperIcon from "@mui/icons-material/Newspaper";
import PieChartIcon from "@mui/icons-material/PieChart";
import PsychologyIcon from "@mui/icons-material/Psychology";
import QueryStatsIcon from "@mui/icons-material/QueryStats";
import SavingsIcon from "@mui/icons-material/Savings";
import SchoolIcon from "@mui/icons-material/School";
import ShieldIcon from "@mui/icons-material/Shield";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { Link as RouterLink } from "react-router-dom";

const BRAND = { navy: "#0F1923", navyMid: "#1A2A3A", red: "#E84040", green: "#5CC87A", muted: "#7A8FA6", paper: "#F4F6F9", border: "#DDE3EB" };

/* ─── Data ─────────────────────────────────────────────────── */
const tutorialSteps = [
  { title: "Start with Cash", desc: "You begin with $2,000 of virtual capital. Allocate carefully — cash is your safety net when markets turn.", icon: <AccountBalanceWalletIcon /> },
  { title: "Buy Stocks", desc: "Pick companies you believe will rise. The core objective: buy low, sell higher. Position size matters as much as selection.", icon: <TrendingUpIcon /> },
  { title: "Read the News", desc: "Each day surfaces market events. Strong traders read headlines before placing orders, not after prices have already moved.", icon: <NewspaperIcon /> },
  { title: "Manage Risk", desc: "Never concentrate everything in one position. Spreading across sectors limits the damage of any single bad bet.", icon: <WarningAmberIcon /> },
];

const strategyTips = [
  "Buy a strong company that fell on temporary negative news.",
  "Sell into strength — lock in profit before momentum reverses.",
  "Never deploy 100% of cash at once; keep dry powder.",
  "Watch sector exposure — diversify across industries.",
  "Track your reasoning; log why you entered before entering.",
];

const daySteps = [
  { title: "Review your position", text: "Check cash balance and current holdings before making any new order." },
  { title: "Read the market news", text: "Headlines signal which companies may rise or fall this turn." },
  { title: "Place orders", text: "Buy stocks you expect to rise. Sell to realise profit or cut a losing position." },
  { title: "Advance the day", text: "The market updates, prices shift, and fresh events appear." },
];

const quickLessons = [
  { title: "A stock is ownership", text: "Buying a share means buying a tiny ownership stake in a public company. Share price reflects what investors believe that stake is worth today.", icon: <AccountBalanceIcon /> },
  { title: "Price is not value", text: "A $20 stock is not cheaper than a $200 stock. Valuation compares price against earnings, growth, debt, margins, and expectations.", icon: <BalanceIcon /> },
  { title: "Risk is always present", text: "Even elite companies fall. Earnings misses, lawsuits, rate moves, or market panic can shift prices fast and without warning.", icon: <ShieldIcon /> },
  { title: "News needs interpretation", text: "A good headline can be priced in. A bad one can be temporary. Markets react to surprise, scale, and credibility — not tone.", icon: <NewspaperIcon /> },
];

const coreConcepts = [
  { title: "Market Capitalization", text: "Share price × shares outstanding. It sizes a company relative to others. Large-cap firms are generally more stable; small-cap stocks move faster but carry more risk." },
  { title: "Earnings & EPS", text: "EPS = earnings per share. Rising EPS over time usually justifies a higher stock price, because each share owns a larger slice of growing profit." },
  { title: "P/E Ratio", text: "Price divided by annual earnings per share. High P/E signals growth expectations; low P/E may mean value or deteriorating fundamentals — context matters." },
  { title: "Revenue Growth", text: "Expanding revenue confirms demand. It matters most when the company can eventually convert sales into profit at meaningful margins." },
  { title: "Profit Margin", text: "Revenue minus costs as a percentage. High margins signal pricing power or efficiency. Falling margins warn of rising costs or competitive pressure." },
  { title: "Debt & Interest Rates", text: "Debt amplifies returns in good times and losses in bad. Rising rates hurt heavily leveraged companies and compress high-valuation multiples." },
  { title: "Dividends", text: "Cash paid to shareholders from profits. Mature, stable businesses pay dividends. An unusually high yield sometimes signals the dividend may be cut." },
  { title: "Volatility", text: "How much a price moves. High volatility creates opportunity but can force premature exits if position sizing is too large." },
];

const orderTypes = [
  { title: "Market Order", text: "Executes immediately at the best available price. Fast, but the fill price may differ from what you expected in thin or volatile markets." },
  { title: "Limit Order", text: "Sets your price ceiling when buying or floor when selling. Gives price control, but the trade may never execute if the price never reaches your level." },
  { title: "Stop Order", text: "Triggers a buy or sell when the stock crosses a threshold. Used to limit losses, but fast moves can still produce worse-than-expected fills." },
  { title: "Position Size", text: "The share of your portfolio allocated to one trade. Sizing is the most practical risk control — even a correct thesis can lose money if the size is too large." },
];

const marketForces = [
  "Company earnings, guidance, product launches, leadership changes, lawsuits, recalls, and contract wins.",
  "Interest rates, inflation, employment data, credit conditions, and commodity prices.",
  "Sector rotation: capital moving from one industry to another as economic expectations shift.",
  "Institutional flows, short covering, momentum, and supply-demand imbalances for a specific stock.",
  "Expectations. Prices move most when reality diverges from what the market already priced in.",
];

const newsChecklist = [
  "Is the source credible, or is it rumour?",
  "Does it affect revenue, profit, debt, or long-term growth?",
  "Is the event one-time, or does it change the business permanently?",
  "Was this already expected by the market?",
  "Which competitors, suppliers, or customers are also affected?",
  "Is the market overreacting in the short term?",
];

const sectorGuide = [
  { name: "Technology", risk: 84, text: "Driven by growth expectations, AI, cloud margins, and interest rates. Can rally hard — and correct hard." },
  { name: "Healthcare", risk: 64, text: "FDA approvals, trials, patent cliffs, and insurance reimbursement define outcomes. Biotech is especially binary." },
  { name: "Finance", risk: 58, text: "Banks react to interest rates, credit quality, loan demand, and economic confidence." },
  { name: "Energy", risk: 72, text: "Moves with oil and gas prices, climate policy, capex cycles, and geopolitical supply risk." },
  { name: "Consumer", risk: 50, text: "Tied to household spending, brand strength, input costs, and whether products are essential or discretionary." },
  { name: "Industrials", risk: 62, text: "Sensitive to construction, automation, supply chains, and business investment cycles." },
];

const investorMistakes = [
  "Chasing price — buying because a stock is already up.",
  "Panic selling without checking whether the original thesis changed.",
  "Overconcentrating in one company or sector.",
  "Confusing a great company with a great stock price.",
  "Ignoring debt, margins, or cash flow.",
  "Trusting rumours without evaluating credibility.",
  "Trading too frequently without a written plan.",
  "Refusing to exit when the thesis is proven wrong.",
];

const decisionFramework = [
  { title: "1. Business", text: "What does the company sell, who buys it, and why might demand grow or shrink?" },
  { title: "2. Financials", text: "Is revenue, EPS, margin, debt, and cash flow improving or deteriorating?" },
  { title: "3. Valuation", text: "Does the price already assume great results, or is the market underestimating the company?" },
  { title: "4. Catalyst", text: "What would change investor opinion: earnings, product news, policy, or macro data?" },
  { title: "5. Risk", text: "What could go wrong, how much could you lose, and what specifically would make you sell?" },
];

const mindsetRules = [
  "Write down your reason before entering the trade.",
  "Expect to be wrong sometimes — size accordingly.",
  "Protect cash so one mistake cannot end the game.",
  "Judge decisions by process, not only by outcome.",
  "Let new evidence change your mind without ego.",
];

/* ─── Sub-components ──────────────────────────────────────── */

const panelStyle = { borderRadius: 3, boxShadow: "0 2px 12px rgba(15,25,35,0.07)", border: `1px solid ${BRAND.border}`, bgcolor: "#fff" };

function StatBadge({ label, value, up }: { label: string; value: string; up?: boolean }) {
  return (
    <Box sx={{ px: 2, py: 1.2, borderRadius: 2, bgcolor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", textAlign: "center", minWidth: 100 }}>
      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.55)", fontWeight: 700, display: "block" }}>{label}</Typography>
      <Typography sx={{ fontWeight: 900, color: up === undefined ? "#fff" : up ? BRAND.green : BRAND.red }}>{value}</Typography>
    </Box>
  );
}

function StepRow({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <Stack direction="row" spacing={2} sx={{ p: 2, borderRadius: 2.5, bgcolor: BRAND.paper, border: `1px solid ${BRAND.border}`, mb: 1.5 }}>
      <Box sx={{ minWidth: 36, height: 36, borderRadius: 2, bgcolor: BRAND.green, color: BRAND.navy, display: "grid", placeItems: "center", fontWeight: 950, fontSize: 15, flexShrink: 0 }}>{number}</Box>
      <Box>
        <Typography sx={{ fontWeight: 900, color: BRAND.navy }}>{title}</Typography>
        <Typography variant="body2" color="text.secondary">{text}</Typography>
      </Box>
    </Stack>
  );
}

function InfoBlock({ title, text }: { title: string; text: string }) {
  return (
    <Box sx={{ p: 2, height: "100%", borderRadius: 2.5, bgcolor: BRAND.paper, border: `1px solid ${BRAND.border}` }}>
      <Typography sx={{ fontWeight: 900, mb: 0.6, color: BRAND.navy, fontSize: 13, textTransform: "uppercase", letterSpacing: 0.4 }}>{title}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>{text}</Typography>
    </Box>
  );
}

function NumberedPoint({ number, text }: { number: number; text: string }) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ p: 1.8, borderRadius: 2.5, bgcolor: BRAND.paper, border: `1px solid ${BRAND.border}` }}>
      <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: BRAND.green, color: BRAND.navy, display: "grid", placeItems: "center", fontWeight: 950, fontSize: 13, flexShrink: 0 }}>{number}</Box>
      <Typography variant="body2" color="text.secondary" sx={{ pt: 0.2, lineHeight: 1.6 }}>{text}</Typography>
    </Stack>
  );
}

function ChecklistItem({ text, warning = false }: { text: string; warning?: boolean }) {
  return (
    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: warning ? "#FFF2F2" : BRAND.paper, border: warning ? "1px solid rgba(232,64,64,0.28)" : `1px solid ${BRAND.border}` }}>
      <Typography sx={{ fontWeight: 800, color: warning ? BRAND.red : BRAND.navy, fontSize: 13 }}>{text}</Typography>
    </Box>
  );
}

function SectionCard({ icon, title, subtitle, children, sx }: { icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode; sx?: object }) {
  return (
    <Card sx={{ ...panelStyle, ...sx }}>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 0.6 }}>
          <Box sx={{ color: BRAND.green, display: "grid", placeItems: "center", "& svg": { fontSize: 20 } }}>{icon}</Box>
          <Typography variant="h6" sx={{ fontWeight: 950, color: BRAND.navy }}>{title}</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{subtitle}</Typography>
        <Divider sx={{ mb: 2.5, borderColor: BRAND.border }} />
        {children}
      </CardContent>
    </Card>
  );
}

function IconChip({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <Box sx={{ width: 42, height: 42, borderRadius: 2, bgcolor: `${color}22`, color, display: "grid", placeItems: "center", mb: 1.8, "& svg": { fontSize: 22 } }}>{children}</Box>
  );
}

/* ─── Tutorial Tab ───────────────────────────────────────── */
function TutorialTab() {
  return (
    <Grid container spacing={3}>
      {/* Step cards */}
      {tutorialSteps.map((step) => (
        <Grid item xs={12} sm={6} md={3} key={step.title}>
          <Card sx={{ ...panelStyle, height: "100%" }}>
            <CardContent sx={{ p: 3 }}>
              <IconChip color={BRAND.green}>{step.icon}</IconChip>
              <Typography sx={{ fontWeight: 950, mb: 0.8, color: BRAND.navy }}>{step.title}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>{step.desc}</Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}

      {/* How a turn works */}
      <Grid item xs={12} md={8}>
        <SectionCard icon={<CandlestickChartIcon />} title="How a Turn Works" subtitle="Each turn represents one day in the virtual market. Follow this order every time.">
          {daySteps.map((s, i) => <StepRow key={s.title} number={String(i + 1)} title={s.title} text={s.text} />)}
        </SectionCard>
      </Grid>

      {/* Strategy tips */}
      <Grid item xs={12} md={4}>
        <Card sx={{ ...panelStyle, bgcolor: BRAND.navy, color: "#fff", height: "100%" }}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 0.6 }}>
              <TrendingUpIcon sx={{ color: BRAND.green, fontSize: 20 }} />
              <Typography variant="h6" sx={{ fontWeight: 950 }}>Strategy Tips</Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)", mb: 2 }}>Rules that improve decision quality each turn.</Typography>
            <Divider sx={{ mb: 2, borderColor: "rgba(255,255,255,0.1)" }} />
            <Stack spacing={1.1}>
              {strategyTips.map((tip, i) => (
                <Box key={tip} sx={{ p: 1.5, borderRadius: 2, bgcolor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>{i + 1}. {tip}</Typography>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {/* CTA */}
      <Grid item xs={12}>
        <Card sx={{ ...panelStyle }}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} justifyContent="space-between" spacing={2}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 950, color: BRAND.navy }}>Ready to test your strategy?</Typography>
                <Typography variant="body2" color="text.secondary">Launch the simulator and try to grow your portfolio without blowing up your cash.</Typography>
              </Box>
              <Button variant="contained" component={RouterLink} to="/game" sx={{ bgcolor: BRAND.red, fontWeight: 950, borderRadius: 2, px: 3, whiteSpace: "nowrap", "&:hover": { bgcolor: "#C93232" } }}>
                Open Simulator
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

/* ─── Guide Tab ──────────────────────────────────────────── */
function GuideTab() {
  return (
    <Grid container spacing={3}>
      {/* Quick lessons */}
      {quickLessons.map((item) => (
        <Grid item xs={12} sm={6} md={3} key={item.title}>
          <Card sx={{ ...panelStyle, height: "100%" }}>
            <CardContent sx={{ p: 3 }}>
              <IconChip color={BRAND.green}>{item.icon}</IconChip>
              <Typography sx={{ fontWeight: 950, mb: 0.8, color: BRAND.navy }}>{item.title}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>{item.text}</Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}

      {/* Left column — deep content */}
      <Grid item xs={12} lg={8}>
        <Stack spacing={3}>
          <SectionCard icon={<CandlestickChartIcon />} title="Stock Market Basics" subtitle="The foundational concepts every investor needs before reading charts or headlines.">
            <Grid container spacing={2}>
              {coreConcepts.map((c) => <Grid item xs={12} md={6} key={c.title}><InfoBlock title={c.title} text={c.text} /></Grid>)}
            </Grid>
          </SectionCard>

          <SectionCard icon={<SavingsIcon />} title="Trading Mechanics" subtitle="How orders, execution, and position sizing work in real markets.">
            <Grid container spacing={2}>
              {orderTypes.map((o) => <Grid item xs={12} md={6} key={o.title}><InfoBlock title={o.title} text={o.text} /></Grid>)}
            </Grid>
          </SectionCard>

          <SectionCard icon={<QueryStatsIcon />} title="Why Prices Move" subtitle="Stocks react to business results, the economy, investor behaviour, and surprise.">
            <Stack spacing={1.2}>
              {marketForces.map((f, i) => <NumberedPoint key={f} number={i + 1} text={f} />)}
            </Stack>
          </SectionCard>

          <SectionCard icon={<NewspaperIcon />} title="How to Read Market News" subtitle="Don't ask whether a headline sounds good. Ask whether it changes expected future cash flow.">
            <Grid container spacing={1.5}>
              {newsChecklist.map((item) => <Grid item xs={12} sm={6} key={item}><ChecklistItem text={item} /></Grid>)}
            </Grid>
          </SectionCard>

          <SectionCard icon={<ShowChartIcon />} title="Research Framework" subtitle="Apply this before buying any stock in the simulator — or in real life.">
            <Stack spacing={1.5}>
              {decisionFramework.map((item) => <InfoBlock key={item.title} title={item.title} text={item.text} />)}
            </Stack>
          </SectionCard>
        </Stack>
      </Grid>

      {/* Right sidebar */}
      <Grid item xs={12} lg={4}>
        <Stack spacing={3}>
          {/* Investor mindset */}
          <Card sx={{ ...panelStyle, bgcolor: BRAND.navy, color: "#fff" }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 0.6 }}>
                <PsychologyIcon sx={{ color: BRAND.green, fontSize: 20 }} />
                <Typography variant="h6" sx={{ fontWeight: 950 }}>Investor Mindset</Typography>
              </Stack>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)", mb: 2 }}>Great investing is about making decisions that survive uncertainty — not predicting every move.</Typography>
              <Divider sx={{ mb: 2, borderColor: "rgba(255,255,255,0.1)" }} />
              <Stack spacing={1}>
                {mindsetRules.map((rule, i) => (
                  <Box key={rule} sx={{ p: 1.5, borderRadius: 2, bgcolor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{i + 1}. {rule}</Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>

          {/* Sector risk */}
          <Card sx={panelStyle}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 0.6 }}>
                <PieChartIcon sx={{ color: BRAND.green, fontSize: 20 }} />
                <Typography variant="h6" sx={{ fontWeight: 950, color: BRAND.navy }}>Sector Volatility</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Industries react differently to the same economic conditions.</Typography>
              <Divider sx={{ mb: 2.5, borderColor: BRAND.border }} />
              {sectorGuide.map((sector) => (
                <Box key={sector.name} sx={{ mb: 2.5 }}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.7 }}>
                    <Typography sx={{ fontWeight: 900, color: BRAND.navy, fontSize: 13 }}>{sector.name}</Typography>
                    <Typography sx={{ fontWeight: 900, fontSize: 13, color: sector.risk > 70 ? BRAND.red : BRAND.green }}>{sector.risk}/100</Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={sector.risk} sx={{ height: 8, borderRadius: 99, bgcolor: BRAND.border, "& .MuiLinearProgress-bar": { bgcolor: sector.risk > 70 ? BRAND.red : BRAND.green, borderRadius: 99 } }} />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.6, display: "block", lineHeight: 1.5 }}>{sector.text}</Typography>
                </Box>
              ))}
            </CardContent>
          </Card>

          {/* Common mistakes */}
          <Card sx={panelStyle}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 0.6 }}>
                <ShieldIcon sx={{ color: BRAND.red, fontSize: 20 }} />
                <Typography variant="h6" sx={{ fontWeight: 950, color: BRAND.navy }}>Common Mistakes</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Most avoidable losses come from behaviour, not math.</Typography>
              <Divider sx={{ mb: 2.5, borderColor: BRAND.border }} />
              <Stack spacing={1}>
                {investorMistakes.map((m) => <ChecklistItem key={m} text={m} warning />)}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Grid>

      {/* Bottom bridge card */}
      <Grid item xs={12}>
        <Card sx={panelStyle}>
          <CardContent sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Typography variant="h6" sx={{ fontWeight: 950, color: BRAND.navy }}>Simulator → Real Market</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.7 }}>
                  The simulator simplifies real investing — but the habits carry over: read news carefully, size positions, compare fundamentals, and keep a record of your reasoning.
                </Typography>
              </Grid>
              <Grid item xs={12} md={8}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}><InfoBlock title="In the simulator" text="Prices move through mock news, sector drift, and fundamentals. Practice without risking real capital." /></Grid>
                  <Grid item xs={12} sm={4}><InfoBlock title="In real markets" text="Prices also reflect liquidity, institutions, taxes, fees, regulations, and unpredictable human behaviour." /></Grid>
                  <Grid item xs={12} sm={4}><InfoBlock title="Best habit" text="Before every trade, record the reason, risk, time horizon, and what would prove the idea wrong." /></Grid>
                </Grid>
              </Grid>
            </Grid>
            <Divider sx={{ my: 3, borderColor: BRAND.border }} />
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 950, color: BRAND.navy }}>Ready to test the framework?</Typography>
                <Typography variant="body2" color="text.secondary">Use the Game page to practise, then review the Dashboard to see how your positions behave.</Typography>
              </Box>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
                <Button variant="contained" component={RouterLink} to="/game" sx={{ bgcolor: BRAND.red, fontWeight: 950, borderRadius: 2, px: 3, whiteSpace: "nowrap", "&:hover": { bgcolor: "#C93232" } }}>Open Simulator</Button>
                <Button variant="outlined" component={RouterLink} to="/news" sx={{ borderColor: BRAND.navy, color: BRAND.navy, fontWeight: 950, borderRadius: 2, px: 3, whiteSpace: "nowrap" }}>Read News</Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

/* ─── Page ───────────────────────────────────────────────── */
export default function Learn() {
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ bgcolor: BRAND.paper, minHeight: "100vh" }}>
      {/* ── Hero ── */}
      <Box sx={{ bgcolor: BRAND.navy, color: "#fff", px: { xs: 3, md: 8 }, pt: { xs: 5, md: 7 }, pb: 0 }}>
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={7}>
            <Chip
              icon={tab === 0 ? <SchoolIcon /> : <AutoStoriesIcon />}
              label={tab === 0 ? "Beginner Trading Tutorial" : "Real-World Market Guide"}
              sx={{ bgcolor: "rgba(92,200,122,0.15)", color: BRAND.green, fontWeight: 900, mb: 2, border: "1px solid rgba(92,200,122,0.25)" }}
            />
            <Typography variant="h2" sx={{ fontWeight: 950, letterSpacing: -1.5, lineHeight: 1.05, mb: 2, fontSize: { xs: "2rem", sm: "2.8rem", md: "3.4rem" } }}>
              {tab === 0 ? "Learn to trade before you trade." : "How the stock market actually works."}
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.68)", maxWidth: 680, fontSize: { xs: 15, md: 17 }, lineHeight: 1.7 }}>
              {tab === 0
                ? "This tutorial covers buying, selling, reading market news, and building better decision habits in the StockPilot simulator."
                : "This guide turns simulator experience into real market intuition: valuation, price movement, news analysis, and risk management before putting money to work."}
            </Typography>
          </Grid>

          <Grid item xs={12} md={5}>
            <Card sx={{ bgcolor: "rgba(255,255,255,0.07)", color: "#fff", borderRadius: 4, border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(10px)" }}>
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Typography variant="overline" sx={{ opacity: 0.55, fontWeight: 800, letterSpacing: 1 }}>
                  {tab === 0 ? "QUICK OBJECTIVE" : "CORE IDEA"}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 950, my: 1 }}>
                  {tab === 0 ? "Grow your net worth." : "Stocks move when expectations change."}
                </Typography>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.65)", mb: 3, lineHeight: 1.7 }}>
                  {tab === 0
                    ? "Net worth = cash + value of all held shares. The higher it climbs, the stronger your score."
                    : "The market compares new information against what investors already believed. Your job is to judge whether new information truly changes the business."}
                </Typography>
                <Stack direction="row" spacing={1.2} flexWrap="wrap" useFlexGap>
                  <StatBadge label="Starting Capital" value="$2,000" />
                  <StatBadge label="Win condition" value="Net worth ↑" up />
                  <StatBadge label="Risk" value="Always" up={false} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* ── Tabs ── */}
        <Box sx={{ mt: 5, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{
              "& .MuiTab-root": { color: "rgba(255,255,255,0.55)", fontWeight: 900, fontSize: 14, textTransform: "none", px: 3, py: 2, minHeight: 52, letterSpacing: 0.2 },
              "& .Mui-selected": { color: "#fff" },
              "& .MuiTabs-indicator": { bgcolor: BRAND.green, height: 3, borderRadius: "2px 2px 0 0" },
            }}
          >
            <Tab label="Tutorial — How to Play" icon={<SchoolIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
            <Tab label="Market Guide — Real Concepts" icon={<AutoStoriesIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          </Tabs>
        </Box>
      </Box>

      {/* ── Content ── */}
      <Box sx={{ px: { xs: 2, sm: 3, md: 6, lg: 8 }, py: { xs: 3, md: 5 } }}>
        {tab === 0 ? <TutorialTab /> : <GuideTab />}
      </Box>
    </Box>
  );
}
