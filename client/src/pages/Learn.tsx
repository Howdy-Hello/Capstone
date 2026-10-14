import React from "react";
import { useAuth } from "../context/AuthContext";
import InvestingPath from "../components/learning/InvestingPath";
import { useSearchParams } from "react-router-dom";
import {
  Box, Button, Chip, Container, Divider, Grid, LinearProgress, Stack, Tab, Tabs, Typography,
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
import { D, CARD, MONO } from "../theme/design";
import { usePageTitle } from "../lib/usePageTitle";

/* ─── Data ─────────────────────────────────────────────────── */
const tutorialSteps = [
  { title: "Start with Cash",  desc: "You begin with $2,000 of virtual capital. Allocate carefully — cash is your safety net when markets turn.",                               icon: <AccountBalanceWalletIcon /> },
  { title: "Buy Stocks",       desc: "Research a business and explain your decision. A small position or a decision to wait can both fit a plan.",               icon: <TrendingUpIcon /> },
  { title: "Read the News",    desc: "Read credible evidence and ask whether it changes the business. Real prices may react immediately; our turn-based news window is simplified.",               icon: <NewspaperIcon /> },
  { title: "Manage Risk",      desc: "Never concentrate everything in one position. Spreading across sectors limits the damage of any single bad bet.",                         icon: <WarningAmberIcon /> },
];
const strategyTips = [
  "Investigate whether bad news changes long-term earnings; a falling price alone is not a reason to buy.",
  "Use your goal and exit rule rather than guessing the next price move.",
  "Never deploy 100% of cash at once; keep dry powder.",
  "Watch sector exposure — diversify across industries.",
  "Track your reasoning; log why you entered before entering.",
];
const daySteps = [
  { title: "Review your position", text: "Check cash balance and current holdings before making any new order." },
  { title: "Read the market news",  text: "Ask whether a headline is credible, unexpected, and relevant to the business." },
  { title: "Place orders",          text: "Choose whether to buy, sell, or wait based on evidence, cash needs, and your plan." },
  { title: "Advance the day",       text: "The market updates, prices shift, and fresh events appear." },
];
const quickLessons = [
  { title: "A stock is ownership",       text: "Buying a share means buying a tiny ownership stake in a public company. Share price reflects what investors believe that stake is worth today.", icon: <AccountBalanceIcon /> },
  { title: "Price is not value",         text: "A $20 stock is not cheaper than a $200 stock. Valuation compares price against earnings, growth, debt, margins, and expectations.",           icon: <BalanceIcon /> },
  { title: "Risk is always present",     text: "Even elite companies fall. Earnings misses, lawsuits, rate moves, or market panic can shift prices fast and without warning.",                  icon: <ShieldIcon /> },
  { title: "News needs interpretation",  text: "A good headline can be priced in. A bad one can be temporary. Markets react to surprise, scale, and credibility — not tone.",                   icon: <NewspaperIcon /> },
];
const coreConcepts = [
  { title: "Market Capitalization", text: "Share price × shares outstanding. It sizes a company relative to others. Size can affect risk and liquidity, but large companies can also suffer major losses." },
  { title: "Earnings & EPS",        text: "EPS = earnings per share. Compare earnings quality and changes over time; raw EPS differs with share counts and is not a ranking across companies." },
  { title: "P/E Ratio",             text: "Price divided by annual earnings per share. High P/E signals growth expectations; low P/E may mean value or deteriorating fundamentals." },
  { title: "Revenue Growth",        text: "Expanding revenue confirms demand. It matters most when the company can eventually convert sales into profit at meaningful margins." },
  { title: "Profit Margin",         text: "Revenue minus costs as a percentage. High margins signal pricing power or efficiency." },
  { title: "Debt & Interest Rates", text: "Debt amplifies returns in good times and losses in bad. Rising rates hurt leveraged companies." },
  { title: "Dividends",             text: "Cash paid to shareholders from profits. An unusually high yield sometimes signals the dividend may be cut." },
  { title: "Volatility",            text: "How much a price moves. High volatility creates opportunity but can force premature exits if position sizing is too large." },
];
const orderTypes = [
  { title: "Market Order",   text: "Executes immediately at the best available price. Fast, but the fill price may differ from what you expected." },
  { title: "Limit Order",    text: "Sets your price ceiling when buying or floor when selling. Gives price control, but may never execute." },
  { title: "Stop Order",     text: "Becomes a market order once triggered. The stop price is not a guaranteed fill price, especially during a gap." },
  { title: "Position Size",  text: "The share of your portfolio in one trade. Sizing is the most practical risk control." },
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
  { name: "Technology", risk: 84, text: "Driven by growth expectations, AI, cloud margins, and interest rates." },
  { name: "Healthcare",  risk: 64, text: "FDA approvals, trials, patent cliffs, and insurance reimbursement define outcomes." },
  { name: "Finance",     risk: 58, text: "Banks react to interest rates, credit quality, loan demand, and economic confidence." },
  { name: "Energy",      risk: 72, text: "Moves with oil and gas prices, climate policy, capex cycles, and geopolitical supply risk." },
  { name: "Consumer",    risk: 50, text: "Tied to household spending, brand strength, input costs, and discretionary vs. essential split." },
  { name: "Industrials", risk: 62, text: "Sensitive to construction, automation, supply chains, and business investment cycles." },
];
const investorMistakes = [
  "Chasing price — buying because a stock is already up.",
  "Panic selling without checking whether the original reason for buying changed.",
  "Overconcentrating in one company or sector.",
  "Confusing a great company with a great stock price.",
  "Ignoring debt, margins, or cash flow.",
  "Trusting rumours without evaluating credibility.",
  "Trading too frequently without a written plan.",
  "Refusing to exit when the reason for buying is no longer supported.",
];
const decisionFramework = [
  { title: "1. Business",    text: "What does the company sell, who buys it, and why might demand grow or shrink?" },
  { title: "2. Financials",  text: "Is revenue, EPS, margin, debt, and cash flow improving or deteriorating?" },
  { title: "3. Valuation",   text: "Does the price already assume great results, or is the market underestimating the company?" },
  { title: "4. Catalyst",    text: "What would change investor opinion: earnings, product news, policy, or macro data?" },
  { title: "5. Risk",        text: "What could go wrong, how much could you lose, and what specifically would make you sell?" },
];
const mindsetRules = [
  "Write down your reason before entering the trade.",
  "Expect to be wrong sometimes — size accordingly.",
  "Protect cash so one mistake cannot end the game.",
  "Judge decisions by process, not only by outcome.",
  "Let new evidence change your mind without ego.",
];

/* ─── Shared small components ─────────────────────────────── */
function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${D.border}` }}>
      <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 0.4 }}>
        <Box sx={{ color: D.brandText, display: "grid", placeItems: "center", "& svg": { fontSize: 18 } }}>{icon}</Box>
        <Typography sx={{ fontWeight: 900, fontSize: 16, color: D.t1 }}>{title}</Typography>
      </Stack>
      <Typography sx={{ fontSize: 12.5, color: D.t3 }}>{subtitle}</Typography>
    </Box>
  );
}

function InfoBlock({ title, text }: { title: string; text: string }) {
  return (
    <Box sx={{ p: 2, borderRadius: 2, bgcolor: D.elevated, border: `1px solid ${D.border}`, height: "100%" }}>
      <Typography sx={{ fontWeight: 900, fontSize: 12, color: D.t3, fontFamily: MONO, textTransform: "uppercase", letterSpacing: 0.5, mb: 0.6 }}>{title}</Typography>
      <Typography sx={{ fontSize: 13, color: D.t2, lineHeight: 1.65 }}>{text}</Typography>
    </Box>
  );
}

function NumberedPoint({ number, text }: { number: number; text: string }) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ p: 1.8, borderRadius: 2, bgcolor: D.elevated, border: `1px solid ${D.border}` }}>
      <Box sx={{ width: 26, height: 26, borderRadius: 1.5, bgcolor: D.brandBg, color: D.brandText, display: "grid", placeItems: "center", fontWeight: 950, fontSize: 12, flexShrink: 0, fontFamily: MONO }}>{number}</Box>
      <Typography sx={{ fontSize: 13, color: D.t2, lineHeight: 1.65 }}>{text}</Typography>
    </Stack>
  );
}

/* ─── Tutorial Tab ───────────────────────────────────────── */
function TutorialTab() {
  const { user } = useAuth();
  return (
    <Grid container spacing={3}>
      {tutorialSteps.map((step) => (
        <Grid item xs={12} sm={6} md={3} key={step.title}>
          <Box sx={{ ...CARD, p: 3, height: "100%" }}>
            <Box sx={{ width: 42, height: 42, borderRadius: 2, bgcolor: D.greenBg, color: D.greenText, display: "grid", placeItems: "center", mb: 2, "& svg": { fontSize: 22 } }}>{step.icon}</Box>
            <Typography sx={{ fontWeight: 900, fontSize: 15, color: D.t1, mb: 0.8 }}>{step.title}</Typography>
            <Typography sx={{ fontSize: 13, color: D.t2, lineHeight: 1.65 }}>{step.desc}</Typography>
          </Box>
        </Grid>
      ))}

      <Grid item xs={12} md={8}>
        <Box sx={{ ...CARD, p: 0, overflow: "hidden" }}>
          <SectionHeader icon={<CandlestickChartIcon />} title="How a Turn Works" subtitle="Each turn is one game day. Follow this order every time." />
          <Box sx={{ p: 2.5 }}>
            <Stack spacing={1.2}>
              {daySteps.map((s, i) => (
                <Stack key={s.title} direction="row" spacing={2} sx={{ p: 2, borderRadius: 2, bgcolor: D.elevated, border: `1px solid ${D.border}` }}>
                  <Box sx={{ width: 32, height: 32, borderRadius: 2, bgcolor: D.greenBg, color: D.greenText, display: "grid", placeItems: "center", fontWeight: 950, fontSize: 14, flexShrink: 0, fontFamily: MONO }}>{i + 1}</Box>
                  <Box>
                    <Typography sx={{ fontWeight: 900, color: D.t1, fontSize: 14 }}>{s.title}</Typography>
                    <Typography sx={{ fontSize: 13, color: D.t2, lineHeight: 1.6 }}>{s.text}</Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          </Box>
        </Box>
      </Grid>

      <Grid item xs={12} md={4}>
        <Box sx={{ bgcolor: D.elevated, border: `1px solid ${D.border}`, borderRadius: 2, p: 3, height: "100%" }}>
          <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 0.4 }}>
            <TrendingUpIcon sx={{ color: D.greenText, fontSize: 18 }} />
            <Typography sx={{ fontWeight: 900, fontSize: 15, color: D.t1 }}>Strategy Tips</Typography>
          </Stack>
          <Typography sx={{ fontSize: 13, color: D.t3, mb: 2 }}>Rules that improve decision quality each turn.</Typography>
          <Divider sx={{ borderColor: D.border, mb: 2 }} />
          <Stack spacing={1.2}>
            {strategyTips.map((tip, i) => (
              <Box key={tip} sx={{ p: 1.8, borderRadius: 2, bgcolor: D.surface, border: `1px solid ${D.border}` }}>
                <Typography sx={{ fontSize: 13, color: D.t2, fontWeight: 700 }}>{i + 1}. {tip}</Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      </Grid>

      <Grid item xs={12}>
        <Box sx={{ ...CARD, p: 3 }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2}>
            <Box>
              <Typography sx={{ fontWeight: 950, fontSize: 17, color: D.t1 }}>{user ? "Ready to test your strategy?" : "Try your first practice decision"}</Typography>
              <Typography sx={{ fontSize: 13, color: D.t3 }}>{user ? "Open the simulator to research stocks and manage your portfolio." : "Research, decide, and reflect. No account required; your saved game stays safe."}</Typography>
            </Box>
            <Button variant="contained" component={RouterLink} to={user ? "/game" : "/practice"}
              sx={{ bgcolor: D.brand, fontWeight: 900, textTransform: "none", borderRadius: 1.5, px: 4, whiteSpace: "nowrap", boxShadow: "none", "&:hover": { bgcolor: D.brandMid, boxShadow: "none" } }}>
              {user ? "Open Simulator" : "Try practice"}
            </Button>
          </Stack>
        </Box>
      </Grid>
    </Grid>
  );
}

/* ─── Guide Tab ──────────────────────────────────────────── */
function GuideTab() {
  return (
    <Grid container spacing={3}>
      {quickLessons.map((item) => (
        <Grid item xs={12} sm={6} md={3} key={item.title}>
          <Box sx={{ ...CARD, p: 3, height: "100%" }}>
            <Box sx={{ width: 42, height: 42, borderRadius: 2, bgcolor: D.brandBg, color: D.brandText, display: "grid", placeItems: "center", mb: 2, "& svg": { fontSize: 22 } }}>{item.icon}</Box>
            <Typography sx={{ fontWeight: 900, fontSize: 15, color: D.t1, mb: 0.8 }}>{item.title}</Typography>
            <Typography sx={{ fontSize: 13, color: D.t2, lineHeight: 1.65 }}>{item.text}</Typography>
          </Box>
        </Grid>
      ))}

      <Grid item xs={12} lg={8}>
        <Stack spacing={3}>
          <Box sx={{ ...CARD, p: 0, overflow: "hidden" }}>
            <SectionHeader icon={<CandlestickChartIcon />} title="Stock Market Basics" subtitle="Foundational concepts every investor needs before reading charts or headlines." />
            <Box sx={{ p: 2.5 }}><Grid container spacing={2}>{coreConcepts.map((c) => <Grid item xs={12} md={6} key={c.title}><InfoBlock title={c.title} text={c.text} /></Grid>)}</Grid></Box>
          </Box>

          <Box sx={{ ...CARD, p: 0, overflow: "hidden" }}>
            <SectionHeader icon={<SavingsIcon />} title="Trading Mechanics" subtitle="How orders, execution, and position sizing work in real markets." />
            <Box sx={{ p: 2.5 }}><Grid container spacing={2}>{orderTypes.map((o) => <Grid item xs={12} md={6} key={o.title}><InfoBlock title={o.title} text={o.text} /></Grid>)}</Grid></Box>
          </Box>

          <Box sx={{ ...CARD, p: 0, overflow: "hidden" }}>
            <SectionHeader icon={<QueryStatsIcon />} title="Why Prices Move" subtitle="Stocks react to business results, the economy, investor behaviour, and surprise." />
            <Box sx={{ p: 2.5 }}><Stack spacing={1.2}>{marketForces.map((f, i) => <NumberedPoint key={f} number={i + 1} text={f} />)}</Stack></Box>
          </Box>

          <Box sx={{ ...CARD, p: 0, overflow: "hidden" }}>
            <SectionHeader icon={<NewspaperIcon />} title="How to Read Market News" subtitle="Don't ask whether a headline sounds good. Ask whether it changes expected future cash flow." />
            <Box sx={{ p: 2.5 }}>
              <Grid container spacing={1.5}>
                {newsChecklist.map((item) => (
                  <Grid item xs={12} sm={6} key={item}>
                    <Box sx={{ p: 1.8, borderRadius: 2, bgcolor: D.elevated, border: `1px solid ${D.border}` }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 800, color: D.t1 }}>{item}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Box>

          <Box sx={{ ...CARD, p: 0, overflow: "hidden" }}>
            <SectionHeader icon={<ShowChartIcon />} title="Research Framework" subtitle="Apply this before buying any stock in the simulator — or in real life." />
            <Box sx={{ p: 2.5 }}><Stack spacing={1.2}>{decisionFramework.map((item) => <InfoBlock key={item.title} title={item.title} text={item.text} />)}</Stack></Box>
          </Box>
        </Stack>
      </Grid>

      <Grid item xs={12} lg={4}>
        <Stack spacing={3}>
          <Box sx={{ bgcolor: D.elevated, border: `1px solid ${D.border}`, borderRadius: 2, p: 3 }}>
            <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 0.4 }}>
              <PsychologyIcon sx={{ color: D.brandText, fontSize: 18 }} />
              <Typography sx={{ fontWeight: 900, fontSize: 15, color: D.t1 }}>Investor Mindset</Typography>
            </Stack>
            <Typography sx={{ fontSize: 13, color: D.t3, mb: 2 }}>Great investing survives uncertainty — not just predicts correctly.</Typography>
            <Divider sx={{ borderColor: D.border, mb: 2 }} />
            <Stack spacing={1.2}>
              {mindsetRules.map((rule, i) => (
                <Box key={rule} sx={{ p: 1.8, borderRadius: 2, bgcolor: D.surface, border: `1px solid ${D.border}` }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: D.t2 }}>{i + 1}. {rule}</Typography>
                </Box>
              ))}
            </Stack>
          </Box>

          <Box sx={{ ...CARD, p: 3 }}>
            <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 0.4 }}>
              <PieChartIcon sx={{ color: D.brandText, fontSize: 18 }} />
              <Typography sx={{ fontWeight: 900, fontSize: 15, color: D.t1 }}>Sector Volatility</Typography>
            </Stack>
            <Typography sx={{ fontSize: 13, color: D.t3, mb: 2 }}>Illustrative game scores, not measured real-world risk. Industries react differently to economic conditions.</Typography>
            <Divider sx={{ borderColor: D.border, mb: 2.5 }} />
            {sectorGuide.map((sector) => (
              <Box key={sector.name} sx={{ mb: 2.5 }}>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.7 }}>
                  <Typography sx={{ fontWeight: 900, color: D.t1, fontSize: 13 }}>{sector.name}</Typography>
                  <Typography sx={{ fontWeight: 900, fontSize: 13, color: sector.risk > 70 ? D.redText : D.greenText, fontFamily: MONO }}>{sector.risk}/100</Typography>
                </Stack>
                <LinearProgress variant="determinate" value={sector.risk} sx={{ height: 5, borderRadius: 99, bgcolor: D.overlay, "& .MuiLinearProgress-bar": { bgcolor: sector.risk > 70 ? D.red : D.green, borderRadius: 99 } }} />
                <Typography sx={{ fontSize: 11.5, color: D.t3, mt: 0.6, lineHeight: 1.5 }}>{sector.text}</Typography>
              </Box>
            ))}
          </Box>

          <Box sx={{ ...CARD, p: 3 }}>
            <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 0.4 }}>
              <ShieldIcon sx={{ color: D.redText, fontSize: 18 }} />
              <Typography sx={{ fontWeight: 900, fontSize: 15, color: D.t1 }}>Common Mistakes</Typography>
            </Stack>
            <Typography sx={{ fontSize: 13, color: D.t3, mb: 2 }}>Most avoidable losses come from behaviour, not math.</Typography>
            <Divider sx={{ borderColor: D.border, mb: 2.5 }} />
            <Stack spacing={1}>
              {investorMistakes.map((m) => (
                <Box key={m} sx={{ p: 1.5, borderRadius: 2, bgcolor: D.redBg, border: `1px solid ${D.redBd}` }}>
                  <Typography sx={{ fontWeight: 800, color: D.redText, fontSize: 13 }}>{m}</Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        </Stack>
      </Grid>

      <Grid item xs={12}>
        <Box sx={{ ...CARD, p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Typography sx={{ fontWeight: 950, fontSize: 17, color: D.t1 }}>Simulator → Real Market</Typography>
              <Typography sx={{ fontSize: 13, color: D.t2, mt: 1, lineHeight: 1.7 }}>
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
          <Divider sx={{ my: 3, borderColor: D.border }} />
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2}>
            <Box>
              <Typography sx={{ fontWeight: 950, fontSize: 17, color: D.t1 }}>Ready to test the framework?</Typography>
              <Typography sx={{ fontSize: 13, color: D.t3 }}>Use the Game page to practise, then review the Dashboard to see how your positions behave.</Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
              <Button variant="contained" component={RouterLink} to="/practice"
                sx={{ bgcolor: D.brand, fontWeight: 900, textTransform: "none", borderRadius: 1.5, px: 3, whiteSpace: "nowrap", boxShadow: "none", "&:hover": { bgcolor: D.brandMid, boxShadow: "none" } }}>
                Try practice
              </Button>
              <Button component={RouterLink} to="/inbox"
                sx={{ color: D.t2, border: `1px solid ${D.border}`, fontWeight: 700, textTransform: "none", borderRadius: 1.5, px: 3, whiteSpace: "nowrap", "&:hover": { color: D.t1, borderColor: D.borderHi } }}>
                Read Inbox
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Grid>
    </Grid>
  );
}

/* ─── Page ───────────────────────────────────────────────── */
export default function Learn() {
  usePageTitle("Learn");
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "investing" ? 2 : searchParams.get("tab") === "guide" ? 1 : 0;
  const setTab = (value: number) => {
    setSearchParams(value === 2 ? { tab: "investing" } : value === 1 ? { tab: "guide" } : {}, { replace: true });
  };
  return (
    <Box sx={{ bgcolor: D.bg, minHeight: "100vh" }}>
      {/* Hero */}
      <Box sx={{ bgcolor: D.surface, borderBottom: `1px solid ${D.border}` }}>
        <Container maxWidth="xl" sx={{ pt: { xs: 4, md: 5 }, pb: 0 }}>
          <Grid container spacing={4} alignItems="center" sx={{ pb: 3 }}>
            <Grid item xs={12} md={7}>
              <Chip label={tab === 0 ? "BEGINNER TUTORIAL" : "REAL MARKET GUIDE"} size="small"
                sx={{ bgcolor: D.brandBg, color: D.brandText, border: `1px solid ${D.brandBd}`, fontWeight: 900, fontSize: 10, fontFamily: MONO, letterSpacing: 1, mb: 1.5 }} />
              <Typography component="h1" sx={{ fontSize: { xs: 26, md: 34 }, fontWeight: 950, letterSpacing: -1, color: D.t1, lineHeight: 1.1, mb: 1.5 }}>
                {tab === 2 ? "Build an investing plan." : tab === 0 ? "Learn to make a reasoned decision." : "How the stock market actually works."}
              </Typography>
              <Typography sx={{ fontSize: 14, color: D.t2, lineHeight: 1.7, maxWidth: 600 }}>
                {tab === 0
                  ? "This tutorial covers buying, selling, reading market news, and building better decision habits in the StockPilot simulator."
                  : "Explore investing concepts beyond the game: valuation, uncertainty, diversification, and risk. Try the Investing Path for longer horizons and execution lessons."}
              </Typography>
            </Grid>
            <Grid item xs={12} md={5}>
              <Box sx={{ bgcolor: D.elevated, border: `1px solid ${D.border}`, borderRadius: 2, p: 3 }}>
                <Typography sx={{ fontSize: 10.5, fontWeight: 900, color: D.t3, fontFamily: MONO, letterSpacing: 1, mb: 0.5 }}>{tab === 0 ? "QUICK OBJECTIVE" : "CORE IDEA"}</Typography>
                <Typography sx={{ fontWeight: 950, fontSize: 17, color: D.t1, my: 0.8 }}>
                  {tab === 0 ? "Explain your decision." : "Stocks move when expectations change."}
                </Typography>
                <Typography sx={{ fontSize: 13, color: D.t3, mb: 2.5, lineHeight: 1.7 }}>
                  {tab === 0
                    ? "Learning progress comes from research, risk awareness, and reflection. A thoughtful decision to wait counts. Profit competition is an optional challenge."
                    : "The market compares new information against what investors already believed. Your job is to judge whether new info truly changes the business."}
                </Typography>
                <Stack direction="row" spacing={1.2} flexWrap="wrap" useFlexGap>
                  {[
                    { label: "Starting Capital", val: "$2,000" },
                    { label: "Learning Goal",    val: "Explain why" },
                    { label: "Risk",             val: "Always" },
                  ].map((b) => (
                    <Box key={b.label} sx={{ px: 2, py: 1.2, borderRadius: 2, bgcolor: D.overlay, border: `1px solid ${D.borderHi}`, textAlign: "center", minWidth: 100 }}>
                      <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: D.t3, display: "block" }}>{b.label}</Typography>
                      <Typography sx={{ fontWeight: 900, color: D.t1, fontFamily: MONO }}>{b.val}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Grid>
          </Grid>

          {/* Tabs */}
          <Box sx={{ borderTop: `1px solid ${D.border}` }}>
            <Tabs variant="scrollable" scrollButtons="auto" value={tab} onChange={(_, v) => setTab(v)} sx={{
              "& .MuiTab-root": { color: D.t3, fontWeight: 900, fontSize: 13.5, textTransform: "none", px: 3, py: 2, minHeight: 52 },
              "& .Mui-selected": { color: D.t1 },
              "& .MuiTabs-indicator": { bgcolor: D.brand, height: 3, borderRadius: "2px 2px 0 0" },
            }}>
              <Tab label="Tutorial — How to Play"        icon={<SchoolIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
              <Tab label="Market Guide — Real Concepts" icon={<AutoStoriesIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
              <Tab label="Investing Path — Goals & Practice" icon={<SavingsIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
            </Tabs>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
        {tab === 2 ? <InvestingPath /> : tab === 0 ? <TutorialTab /> : <GuideTab />}
      </Container>
    </Box>
  );
}
