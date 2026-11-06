import { useMemo, useState } from "react";
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Checkbox, FormControlLabel, Grid, MenuItem, Stack, TextField, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { practiceOrder, projectInvestment } from "../../lib/investingLessons";
import { CARD, D, money } from "../../theme/design";

const checkpoints = [
  { question: "Prices are flat. You pay a $100 bill. Why did net worth fall?", options: ["The stocks lost $100", "Cash was spent; investment gains are unchanged", "The market benchmark fell"], correct: 1, why: "Account spending reduces cash. It is separate from gains or losses caused by investments." },
  { question: "Two businesses have P/E ratios of 12 and 30. What should you do?", options: ["Automatically buy the lower P/E", "Investigate growth, earnings quality, and whether the businesses are comparable", "Automatically buy the higher P/E"], correct: 1, why: "A ratio is a starting point. Both valuation and growth expectations affect it." },
  { question: "Three stocks are all banks. What risk remains?", options: ["None: three stocks are diversified", "Only the share prices matter", "The same sector can affect all three"], correct: 2, why: "Counting companies is not enough. Shared sector and economic exposure can create concentration." },
  { question: "You need the money for rent next month. What is a defensible choice?", options: ["Keep it available rather than taking stock-market risk", "Buy the stock with the biggest daily gain", "Put it all in one promising business"], correct: 0, why: "A near-term cash need changes what risk you can accept. A decision to wait can be well reasoned." },
];

export default function InvestingPath() {
  const [years, setYears] = useState(10);
  const [monthly, setMonthly] = useState(50);
  const [fee, setFee] = useState(1);
  const [shock, setShock] = useState(false);
  const [goal, setGoal] = useState("long");
  const [type, setType] = useState<"market" | "limit" | "stop">("market");
  const [price, setPrice] = useState(95);
  const [threshold, setThreshold] = useState(98);
  const [submittedOrder, setSubmittedOrder] = useState<ReturnType<typeof practiceOrder> | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [checks, setChecks] = useState<number[]>([]);
  const projection = useMemo(() => {
    const broad = projectInvestment(2000, monthly, years, 5, .2);
    const single = projectInvestment(2000, monthly, years, 5, fee);
    return broad.map((p, i) => ({ year: p.year, contributions: p.contributed, diversified: p.balance * (shock && i === years ? .85 : 1), single: single[i].balance * (shock && i === years ? .6 : 1) }));
  }, [monthly, years, fee, shock]);
  const last = projection[projection.length - 1];
  const completed = checkpoints.filter((c, i) => answers[i] === c.correct).length;
  return <Stack className="learning" spacing={3}>
    <Box sx={{ ...CARD, p: { xs: 2, sm: 3 } }}>
      <Typography variant="h5" sx={{ color: D.t1, fontWeight: 900, mb: 1 }}>Start with the goal, then choose the risk</Typography>
      <Typography sx={{ color: D.t2, mb: 2 }}>An ETF holds a basket of investments and trades on an exchange. An index fund follows an index; it can be an ETF or a mutual fund. Check the actual holdings: a narrow fund can still be concentrated. Diversification spreads company risk, but market-wide losses remain possible.</Typography>
      <TextField select label="When will I need this money?" value={goal} onChange={e => setGoal(e.target.value)} fullWidth>
        <MenuItem value="soon">In the next few months</MenuItem><MenuItem value="long">Many years from now</MenuItem>
      </TextField>
      <Alert severity="info" sx={{ mt: 2 }}>{goal === "soon" ? "For upcoming bills or emergencies, prioritize access and stability. A stock or stock fund can fall before you need to withdraw." : "A longer horizon allows more time to recover, but does not guarantee recovery. Consider your ability to absorb losses, diversified exposure, fees, and regular contributions."}</Alert>
    </Box>
    <Box sx={{ ...CARD, p: { xs: 2, sm: 3 } }}>
      <Typography variant="h5" sx={{ color: D.t1, fontWeight: 900, mb: 1 }}>Explore contributions, compounding, and fees</Typography>
      <Typography sx={{ color: D.t2, mb: 2 }}>This illustration starts with $2,000 and assumes 5% annual growth before fees for both strategies. Contributions are added at each month-end. The basket costs 0.2% yearly; change the stock-picking strategy's assumed annual costs below. These are invented examples, with no taxes, inflation, or dividends modeled separately.</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}><TextField select fullWidth label="Time horizon" value={years} onChange={e => setYears(Number(e.target.value))}>{[1, 5, 10, 20, 30].map(n => <MenuItem key={n} value={n}>{n} years</MenuItem>)}</TextField></Grid>
        <Grid item xs={12} sm={4}><TextField select fullWidth label="Monthly contribution" value={monthly} onChange={e => setMonthly(Number(e.target.value))}>{[0, 25, 50, 100, 250].map(n => <MenuItem key={n} value={n}>{money(n)}</MenuItem>)}</TextField></Grid>
        <Grid item xs={12} sm={4}><TextField select fullWidth label="Stock-picking costs / year" value={fee} onChange={e => setFee(Number(e.target.value))}>{[0, .2, 1, 2, 3].map(n => <MenuItem key={n} value={n}>{n}%</MenuItem>)}</TextField></Grid>
      </Grid>
      <FormControlLabel sx={{ color: D.t1, my: 1 }} control={<Checkbox checked={shock} onChange={e => setShock(e.target.checked)} />} label="Try an invented last-year shock: basket −15%, single stock −40%" />
      <Box sx={{ height: 300 }}><ResponsiveContainer><LineChart data={projection}><CartesianGrid stroke={D.border} /><XAxis dataKey="year" tick={{ fill: D.t2 }} /><YAxis tickFormatter={v => `$${Number(v).toLocaleString()}`} width={85} tick={{ fill: D.t2 }} /><Tooltip formatter={v => money(Number(v))} labelFormatter={v => `Year ${v}`} /><Legend /><Line isAnimationActive={false} dataKey="diversified" name="Broad basket illustration" stroke={D.brand} dot={false} /><Line isAnimationActive={false} dataKey="single" name="Stock-picking illustration" stroke={D.amber} strokeDasharray="6 3" dot={false} /><Line isAnimationActive={false} dataKey="contributions" name="Total contributed" stroke={D.t3} strokeDasharray="2 4" dot={false} /></LineChart></ResponsiveContainer></Box>
      <Typography sx={{ color: D.t1, mt: 2 }}>Contributed: {money(last.contributions)} · Basket: {money(last.diversified)} · Stock-picking: {money(last.single)}</Typography>
      <Alert severity="info" sx={{ mt: 2 }}>The shock is a scenario, not a forecast or a typical loss. Real returns fluctuate and either strategy can outperform. Compounding magnifies losses and costs as well as gains.</Alert>
    </Box>
    <Box sx={{ ...CARD, p: { xs: 2, sm: 3 } }}>
      <Typography variant="h5" sx={{ color: D.t1, fontWeight: 900, mb: 1 }}>Try an order before using one</Typography>
      <Typography sx={{ color: D.t2, mb: 2 }}>The simulator's trade buttons execute immediately. This separate exercise shows other order types. Start with a displayed quote of $100, then choose the next available price.</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}><TextField select fullWidth label="Order" value={type} onChange={e => { setType(e.target.value as typeof type); setSubmittedOrder(null); }}><MenuItem value="market">Market buy</MenuItem><MenuItem value="limit">Limit buy</MenuItem><MenuItem value="stop">Stop sell</MenuItem></TextField></Grid>
        <Grid item xs={12} sm={4}><TextField select fullWidth label="Next available price" value={price} onChange={e => { setPrice(Number(e.target.value)); setSubmittedOrder(null); }}>{[85, 95, 100, 105].map(n => <MenuItem value={n} key={n}>{money(n)}</MenuItem>)}</TextField></Grid>
        <Grid item xs={12} sm={4}><TextField select fullWidth disabled={type === "market"} label={type === "stop" ? "Sell stop trigger" : "Buy price limit"} value={threshold} onChange={e => { setThreshold(Number(e.target.value)); setSubmittedOrder(null); }}>{[90, 98, 100, 102].map(n => <MenuItem key={n} value={n}>{money(n)}</MenuItem>)}</TextField></Grid>
      </Grid>
      <Button variant="contained" onClick={() => setSubmittedOrder(practiceOrder(type, price, threshold))} sx={{ mt: 2, textTransform: "none" }}>Try this order</Button>
      {submittedOrder && <Alert severity="info" sx={{ mt: 2 }}>{submittedOrder.text}{submittedOrder.price !== null ? ` Fill: ${money(submittedOrder.price)}.` : " No shares traded."}</Alert>}
      <Typography sx={{ color: D.t2, fontSize: 14, mt: 2 }}>A limit controls the price but may never fill. A stop becomes a market order when triggered and does not guarantee the stop price. This exercise assumes one available price and sufficient liquidity. <a href="https://www.investor.gov/introduction-investing/investing-basics/how-stock-markets-work/types-orders" target="_blank" rel="noreferrer">Read Investor.gov's order guide</a>.</Typography>
    </Box>
    <Box sx={{ ...CARD, p: { xs: 2, sm: 3 } }}>
      <Typography variant="h5" sx={{ color: D.t1, fontWeight: 900, mb: 1 }}>Check your understanding · {completed}/4</Typography>
      <Stack spacing={3}>{checkpoints.map((c, i) => <Box key={c.question}>
        <Typography sx={{ color: D.t1, fontWeight: 800, mb: 1 }}>{c.question}</Typography>
        <Stack spacing={1}>{c.options.map((option, j) => <Button key={option} aria-pressed={answers[i] === j} variant={answers[i] === j ? "contained" : "outlined"} onClick={() => setAnswers(a => ({ ...a, [i]: j }))} sx={{ textTransform: "none", justifyContent: "flex-start", textAlign: "left" }}>{option}</Button>)}</Stack>
        {answers[i] !== undefined && <Alert severity={answers[i] === c.correct ? "success" : "info"} sx={{ mt: 1 }}>{answers[i] === c.correct ? "That's right. " : "Reconsider this choice. "}{c.why}</Alert>}
      </Box>)}</Stack>
    </Box>
    <Accordion sx={{ ...CARD, color: D.t1 }}><AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: D.t2 }} />}><Typography sx={{ fontWeight: 900 }}>Before real money · {checks.length}/5 topics explored</Typography></AccordionSummary><AccordionDetails>
      <Typography sx={{ color: D.t2, mb: 2 }}>Finishing a game is educational progress, not certification that you are ready to invest. Explore these topics for your circumstances and country.</Typography>
      {[
        ["Cash needs", "Keep an accessible emergency fund and consider expensive debt before investing money you may need soon."],
        ["Verify the firm", "Check the broker or adviser's registration with your local securities regulator. Registration is not a promise of returns."],
        ["Recognize scams", "Guaranteed high returns, urgent pressure, and unsolicited offers deserve scrutiny. Verify identities independently."],
        ["Understand costs", "Read trading commissions, spreads, currency-conversion costs, fund management fees, and withdrawal or account fees."],
        ["Account types and taxes", "An account is a container; its investments determine risk. In Canada, compare TFSA, RRSP, FHSA, and non-registered accounts using current eligibility, contribution, withdrawal, and tax rules. Other countries have different rules."],
      ].map(([title, text], i) => <Box key={title} sx={{ mb: 2 }}><FormControlLabel control={<Checkbox checked={checks.includes(i)} onChange={e => setChecks(c => e.target.checked ? [...c, i] : c.filter(n => n !== i))} />} label={`I explored: ${title}`} /><Typography sx={{ color: D.t2, fontSize: 14, ml: 4 }}>{text}</Typography></Box>)}
      <Stack spacing={1}>
        <a href="https://www.getsmarteraboutmoney.ca/learning-path/getting-started/getting-started-with-investing/" target="_blank" rel="noreferrer">Ontario Securities Commission: getting started</a>
        <a href="https://www.securities-administrators.ca/registration/" target="_blank" rel="noreferrer">Canadian Securities Administrators: check registration</a>
        <a href="https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/registered-savings-plans.html" target="_blank" rel="noreferrer">Canada Revenue Agency: registered savings plans</a>
        <a href="https://www.investor.gov/introduction-investing" target="_blank" rel="noreferrer">Investor.gov: U.S. investing resources</a>
      </Stack>
      <Typography sx={{ color: D.t3, fontSize: 12, mt: 2 }}>Exercise answers and these checkboxes last for this visit only.</Typography>
    </AccordionDetails></Accordion>
  </Stack>;
}
