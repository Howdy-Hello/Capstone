import React from "react";
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
  Typography,
} from "@mui/material";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import BalanceIcon from "@mui/icons-material/Balance";
import CandlestickChartIcon from "@mui/icons-material/CandlestickChart";
import NewspaperIcon from "@mui/icons-material/Newspaper";
import PieChartIcon from "@mui/icons-material/PieChart";
import PsychologyIcon from "@mui/icons-material/Psychology";
import QueryStatsIcon from "@mui/icons-material/QueryStats";
import SavingsIcon from "@mui/icons-material/Savings";
import ShieldIcon from "@mui/icons-material/Shield";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import { Link as RouterLink } from "react-router-dom";

const BRAND = {
  navy: "#2C3947",
  red: "#FF3737",
  green: "#9AD872",
  background: "#F5F7F9",
};

const quickLessons = [
  {
    title: "A stock is ownership",
    text: "Buying a share means buying a tiny ownership stake in a public company. The share price moves as investors update what they think that business is worth.",
    icon: <AccountBalanceIcon />,
  },
  {
    title: "Price is not value",
    text: "A $20 stock is not automatically cheaper than a $200 stock. Investors compare price with earnings, growth, debt, margins, and future expectations.",
    icon: <BalanceIcon />,
  },
  {
    title: "Risk is always present",
    text: "Even strong companies can fall. Earnings misses, lawsuits, interest rates, bad guidance, or market panic can move prices quickly.",
    icon: <ShieldIcon />,
  },
  {
    title: "News needs interpretation",
    text: "A headline can sound good but still be priced in. A headline can sound bad but be temporary. Markets react to surprise, scale, and credibility.",
    icon: <NewspaperIcon />,
  },
];

const coreConcepts = [
  {
    title: "Market Capitalization",
    text: "Market cap is the total market value of a company: share price multiplied by shares outstanding. It helps compare company size. Large-cap companies are often more stable, while small-cap companies can move faster but carry more risk.",
  },
  {
    title: "Earnings and EPS",
    text: "Earnings are company profits. EPS means earnings per share. If a company earns more profit per share over time, investors may be willing to pay more for the stock.",
  },
  {
    title: "P/E Ratio",
    text: "The price-to-earnings ratio compares stock price to annual earnings per share. A high P/E can mean investors expect fast growth, but it can also mean the stock is expensive if growth disappoints.",
  },
  {
    title: "Revenue Growth",
    text: "Revenue is money brought in from selling products or services. Growth shows whether demand is expanding. Strong revenue growth matters most when the company can eventually turn sales into profit.",
  },
  {
    title: "Profit Margin",
    text: "Profit margin shows how much of each dollar of revenue becomes profit. High margins can signal pricing power, efficiency, or strong products. Falling margins can warn that costs are rising.",
  },
  {
    title: "Debt and Interest Rates",
    text: "Debt can help a company expand, but too much debt makes it vulnerable when interest rates rise or cash flow weakens. Higher rates can also make investors less willing to pay high valuations.",
  },
  {
    title: "Dividends",
    text: "Dividends are cash payments to shareholders. Mature companies may pay dividends, while fast-growing companies often reinvest cash instead. A very high dividend yield can sometimes be a warning sign.",
  },
  {
    title: "Volatility",
    text: "Volatility measures how much prices move. High volatility can create opportunity, but it can also cause large losses if position size is too big or decisions are emotional.",
  },
];

const orderTypes = [
  {
    title: "Market Order",
    text: "Buys or sells immediately at the best available price. It is fast, but the final price can differ from what you expected, especially in volatile stocks.",
  },
  {
    title: "Limit Order",
    text: "Sets the maximum price you will pay when buying, or the minimum price you will accept when selling. It gives price control, but the trade may not execute.",
  },
  {
    title: "Stop Order",
    text: "Triggers a sale or purchase after a stock crosses a chosen price. Traders often use stops to limit losses, but fast moves can still execute at worse prices.",
  },
  {
    title: "Position Size",
    text: "The amount of your portfolio placed in one trade. Position sizing is one of the biggest risk controls because even a good idea can be wrong.",
  },
];

const marketForces = [
  "Company earnings, guidance, product launches, lawsuits, recalls, leadership changes, and contract wins.",
  "Interest rates, inflation, employment data, consumer confidence, commodity prices, and credit conditions.",
  "Sector rotation, where investors move money from one industry to another as the economy changes.",
  "Supply and demand for shares, including institutional buying, panic selling, short covering, and momentum trading.",
  "Expectations. Stocks often move most when reality is different from what investors already expected.",
];

const newsChecklist = [
  "Is the source credible or is it only a rumor?",
  "Does the news affect revenue, profit, debt, reputation, or future growth?",
  "Is the event temporary, or does it change the long-term business?",
  "Was the news already expected by investors?",
  "Which competitors, suppliers, or customers could also be affected?",
  "Could the market be overreacting in the short term?",
];

const sectorGuide = [
  {
    name: "Technology",
    risk: 84,
    text: "Often driven by growth expectations, innovation, margins, and interest rates. Can rise quickly but fall hard when expectations reset.",
  },
  {
    name: "Healthcare",
    risk: 64,
    text: "Affected by approvals, trials, lawsuits, patents, insurance reimbursement, and regulation. Biotech can be especially volatile.",
  },
  {
    name: "Finance",
    risk: 58,
    text: "Banks and financial firms react to interest rates, credit losses, loan demand, deposits, and economic confidence.",
  },
  {
    name: "Energy",
    risk: 72,
    text: "Moves with oil, gas, power demand, project financing, climate policy, and geopolitical events.",
  },
  {
    name: "Consumer",
    risk: 50,
    text: "Depends on household spending, brand strength, input costs, pricing power, and whether products are essential or discretionary.",
  },
  {
    name: "Industrials",
    risk: 62,
    text: "Sensitive to shipping, construction, automation demand, supply chains, labor costs, and business investment cycles.",
  },
];

const investorMistakes = [
  "Buying only because the price went up.",
  "Selling in panic without checking whether the original thesis changed.",
  "Putting too much money into one company or sector.",
  "Confusing a good company with a good stock price.",
  "Ignoring debt, profit margins, or cash flow.",
  "Trusting rumors without thinking about credibility.",
  "Trading too often without a plan.",
  "Refusing to admit when a trade thesis is wrong.",
];

const decisionFramework = [
  {
    title: "1. Business",
    text: "What does the company sell, who buys it, and why might demand grow or shrink?",
  },
  {
    title: "2. Financials",
    text: "Are revenue, earnings, margins, debt, and cash flow improving or weakening?",
  },
  {
    title: "3. Valuation",
    text: "Does the current price already assume great results, or is the market underestimating the company?",
  },
  {
    title: "4. Catalyst",
    text: "What could make investors change their opinion? Earnings, product news, contracts, policy changes, or macro data?",
  },
  {
    title: "5. Risk",
    text: "What could go wrong, how much could you lose, and what would make you sell?",
  },
];

export default function Guide() {
  return (
    <Box sx={{ bgcolor: BRAND.background, minHeight: "100vh" }}>
      <Box sx={{ bgcolor: BRAND.navy, color: "#fff", px: { xs: 3, md: 8 }, py: { xs: 5, md: 7 } }}>
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={7}>
            <Chip
              icon={<AutoStoriesIcon />}
              label="Real-World Market Guide"
              sx={{
                bgcolor: "rgba(154,216,114,0.18)",
                color: BRAND.green,
                fontWeight: 900,
                mb: 2,
              }}
            />

            <Typography
              variant="h2"
              sx={{
                fontWeight: 950,
                letterSpacing: -1,
                lineHeight: 1.05,
                mb: 2,
              }}
            >
              Learn how the stock market actually works.
            </Typography>

            <Typography sx={{ color: "rgba(255,255,255,0.72)", maxWidth: 760, fontSize: 18 }}>
              This guide turns the simulator into real market intuition: how
              stocks are valued, why prices move, how news changes expectations,
              and how investors manage risk before putting money to work.
            </Typography>
          </Grid>

          <Grid item xs={12} md={5}>
            <Card
              sx={{
                bgcolor: "rgba(255,255,255,0.08)",
                color: "#fff",
                borderRadius: 4,
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Typography sx={{ opacity: 0.65, fontWeight: 800 }}>
                  CORE IDEA
                </Typography>

                <Typography variant="h4" sx={{ fontWeight: 950, my: 1 }}>
                  Stocks move when expectations change.
                </Typography>

                <Typography sx={{ color: "rgba(255,255,255,0.7)", mb: 3 }}>
                  The market is constantly comparing new information against
                  what investors already believed. Your job is to decide whether
                  the new information truly changes the business.
                </Typography>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
                  <Button
                    variant="contained"
                    component={RouterLink}
                    to="/game"
                    sx={{
                      bgcolor: BRAND.red,
                      fontWeight: 950,
                      borderRadius: 2.2,
                      "&:hover": { bgcolor: "#E63131" },
                    }}
                  >
                    Practice
                  </Button>

                  <Button
                    variant="outlined"
                    component={RouterLink}
                    to="/dashboard"
                    sx={{
                      color: "#fff",
                      borderColor: "rgba(255,255,255,0.35)",
                      fontWeight: 950,
                      borderRadius: 2.2,
                    }}
                  >
                    Dashboard
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ px: { xs: 2, md: 8 }, py: 4 }}>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {quickLessons.map((item) => (
            <Grid item xs={12} sm={6} md={3} key={item.title}>
              <Card sx={panelStyle}>
                <CardContent sx={{ p: 3 }}>
                  <IconBox color={BRAND.green}>{item.icon}</IconBox>
                  <Typography variant="h6" sx={{ fontWeight: 950, mb: 1 }}>
                    {item.title}
                  </Typography>
                  <Typography color="text.secondary">{item.text}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <GuideSection
              icon={<CandlestickChartIcon />}
              title="Stock Market Basics"
              subtitle="The foundation every investor needs before reading charts or headlines."
            >
              <Grid container spacing={2}>
                {coreConcepts.map((concept) => (
                  <Grid item xs={12} md={6} key={concept.title}>
                    <InfoBlock title={concept.title} text={concept.text} />
                  </Grid>
                ))}
              </Grid>
            </GuideSection>

            <GuideSection
              icon={<SavingsIcon />}
              title="Trading Mechanics"
              subtitle="How orders, execution, and position sizing work in real markets."
              sx={{ mt: 3 }}
            >
              <Grid container spacing={2}>
                {orderTypes.map((item) => (
                  <Grid item xs={12} md={6} key={item.title}>
                    <InfoBlock title={item.title} text={item.text} />
                  </Grid>
                ))}
              </Grid>
            </GuideSection>

            <GuideSection
              icon={<QueryStatsIcon />}
              title="Why Prices Move"
              subtitle="Stocks react to business results, the economy, investor behavior, and surprise."
              sx={{ mt: 3 }}
            >
              <Stack spacing={1.2}>
                {marketForces.map((force, index) => (
                  <NumberedPoint key={force} number={index + 1} text={force} />
                ))}
              </Stack>
            </GuideSection>

            <GuideSection
              icon={<NewspaperIcon />}
              title="How to Read Market News"
              subtitle="Do not ask whether a headline sounds good. Ask whether it changes expected future cash flow."
              sx={{ mt: 3 }}
            >
              <Grid container spacing={2}>
                {newsChecklist.map((item) => (
                  <Grid item xs={12} sm={6} key={item}>
                    <ChecklistItem text={item} />
                  </Grid>
                ))}
              </Grid>
            </GuideSection>

            <GuideSection
              icon={<ShowChartIcon />}
              title="A Practical Research Framework"
              subtitle="Use this before buying a stock in the simulator or analyzing a real company."
              sx={{ mt: 3 }}
            >
              <Grid container spacing={2}>
                {decisionFramework.map((item) => (
                  <Grid item xs={12} key={item.title}>
                    <InfoBlock title={item.title} text={item.text} />
                  </Grid>
                ))}
              </Grid>
            </GuideSection>
          </Grid>

          <Grid item xs={12} lg={4}>
            <Card
              sx={{
                bgcolor: BRAND.navy,
                color: "#fff",
                borderRadius: 4,
                boxShadow: "0 18px 45px rgba(44,57,71,0.22)",
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <PsychologyIcon sx={{ color: BRAND.green }} />
                  <Typography variant="h5" sx={{ fontWeight: 950 }}>
                    Investor Mindset
                  </Typography>
                </Stack>

                <Typography sx={{ color: "rgba(255,255,255,0.65)", mb: 2 }}>
                  Great investing is less about predicting every move and more
                  about making decisions that survive uncertainty.
                </Typography>

                {[
                  "Write down why you bought before you buy.",
                  "Expect to be wrong sometimes.",
                  "Protect cash so one mistake does not end the game.",
                  "Judge decisions by process, not only outcome.",
                  "Let new evidence change your mind.",
                ].map((rule, index) => (
                  <Box
                    key={rule}
                    sx={{
                      p: 1.5,
                      mb: 1.1,
                      borderRadius: 2,
                      bgcolor: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.12)",
                    }}
                  >
                    <Typography sx={{ fontWeight: 800 }}>
                      {index + 1}. {rule}
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>

            <Card sx={{ ...panelStyle, mt: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <PieChartIcon sx={{ color: BRAND.green }} />
                  <Typography variant="h5" sx={{ fontWeight: 950 }}>
                    Sector Behavior
                  </Typography>
                </Stack>

                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  Industries react differently to the same economy.
                </Typography>

                {sectorGuide.map((sector) => (
                  <Box key={sector.name} sx={{ mb: 2.2 }}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.6 }}>
                      <Typography sx={{ fontWeight: 950 }}>{sector.name}</Typography>
                      <Typography sx={{ fontWeight: 900 }}>{sector.risk}/100</Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={sector.risk}
                      sx={{
                        height: 10,
                        borderRadius: 99,
                        bgcolor: "#E5E9EF",
                        "& .MuiLinearProgress-bar": {
                          bgcolor: sector.risk > 70 ? BRAND.red : BRAND.green,
                          borderRadius: 99,
                        },
                      }}
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.6 }}>
                      {sector.text}
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>

            <Card sx={{ ...panelStyle, mt: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <ShieldIcon sx={{ color: BRAND.red }} />
                  <Typography variant="h5" sx={{ fontWeight: 950 }}>
                    Common Mistakes
                  </Typography>
                </Stack>

                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  Most avoidable losses come from behavior, not math.
                </Typography>

                <Stack spacing={1}>
                  {investorMistakes.map((mistake) => (
                    <ChecklistItem key={mistake} text={mistake} warning />
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Card sx={{ ...panelStyle, mt: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Typography variant="h5" sx={{ fontWeight: 950 }}>
                  Simulator to Real Market
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  The simulator simplifies real investing, but the habits carry
                  over: read news carefully, size positions, compare fundamentals,
                  and keep a record of your thinking.
                </Typography>
              </Grid>

              <Grid item xs={12} md={8}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <InfoBlock
                      title="In the simulator"
                      text="Prices move through mock news, volatility, sector drift, and fundamentals. You can practice without risking real money."
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <InfoBlock
                      title="In real markets"
                      text="Prices also reflect liquidity, institutions, global events, regulations, taxes, fees, and unpredictable human behavior."
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <InfoBlock
                      title="Best habit"
                      text="Before every trade, write the reason, risk, time horizon, and what would prove the idea wrong."
                    />
                  </Grid>
                </Grid>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
              spacing={2}
            >
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 950 }}>
                  Ready to test the framework?
                </Typography>
                <Typography color="text.secondary">
                  Use the Game page to practice, then review the Dashboard to see
                  how your positions behave.
                </Typography>
              </Box>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
                <Button
                  variant="contained"
                  component={RouterLink}
                  to="/game"
                  sx={{
                    bgcolor: BRAND.red,
                    fontWeight: 950,
                    borderRadius: 2.2,
                    px: 3,
                    "&:hover": { bgcolor: "#E63131" },
                  }}
                >
                  Open Simulator
                </Button>
                <Button
                  variant="outlined"
                  component={RouterLink}
                  to="/inbox"
                  sx={{
                    borderColor: BRAND.navy,
                    color: BRAND.navy,
                    fontWeight: 950,
                    borderRadius: 2.2,
                    px: 3,
                  }}
                >
                  Read News
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

function GuideSection({
  icon,
  title,
  subtitle,
  children,
  sx,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  sx?: object;
}) {
  return (
    <Card sx={{ ...panelStyle, ...sx }}>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Box sx={{ color: BRAND.green, display: "grid", placeItems: "center" }}>
            {icon}
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 950 }}>
            {title}
          </Typography>
        </Stack>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {subtitle}
        </Typography>
        <Divider sx={{ mb: 2 }} />
        {children}
      </CardContent>
    </Card>
  );
}

function InfoBlock({ title, text }: { title: string; text: string }) {
  return (
    <Box
      sx={{
        p: 2,
        height: "100%",
        borderRadius: 2,
        bgcolor: "#F7F9FB",
        border: "1px solid #E5E9EF",
      }}
    >
      <Typography sx={{ fontWeight: 950, mb: 0.7, color: BRAND.navy }}>
        {title}
      </Typography>
      <Typography color="text.secondary">{text}</Typography>
    </Box>
  );
}

function NumberedPoint({ number, text }: { number: number; text: string }) {
  return (
    <Stack
      direction="row"
      spacing={1.4}
      sx={{
        p: 1.7,
        borderRadius: 2,
        bgcolor: "#F7F9FB",
        border: "1px solid #E5E9EF",
      }}
    >
      <Box
        sx={{
          width: 30,
          height: 30,
          borderRadius: 1.5,
          bgcolor: BRAND.green,
          color: BRAND.navy,
          display: "grid",
          placeItems: "center",
          fontWeight: 950,
          flexShrink: 0,
        }}
      >
        {number}
      </Box>
      <Typography color="text.secondary" sx={{ pt: 0.25 }}>
        {text}
      </Typography>
    </Stack>
  );
}

function ChecklistItem({ text, warning = false }: { text: string; warning?: boolean }) {
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2,
        bgcolor: warning ? "#FFF2F2" : "#F7F9FB",
        border: warning ? "1px solid rgba(255,55,55,0.25)" : "1px solid #E5E9EF",
      }}
    >
      <Typography sx={{ fontWeight: 850, color: warning ? BRAND.red : BRAND.navy }}>
        {text}
      </Typography>
    </Box>
  );
}

function IconBox({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <Box
      sx={{
        width: 44,
        height: 44,
        borderRadius: 2,
        bgcolor: `${color}33`,
        color,
        display: "grid",
        placeItems: "center",
        mb: 2,
      }}
    >
      {children}
    </Box>
  );
}

const panelStyle = {
  borderRadius: 4,
  boxShadow: "0 14px 35px rgba(44,57,71,0.08)",
  border: "1px solid #E5E9EF",
};
