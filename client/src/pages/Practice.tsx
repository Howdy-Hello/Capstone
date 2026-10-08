import { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, Chip, Container, LinearProgress, Stack, TextField, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { updateTutorialProgress } from "../lib/tutorial";
import { CARD, D, money } from "../theme/design";

const scenarios = [
  { title: "Good news can already be priced in", facts: "Northstar Software is a fictional business selling subscriptions. Revenue grew 12%, but its share price already rose 25% before today's earnings announcement. P/E is 42. You have $2,000, including $100 needed for a bill.", news: "Earnings match the market's expectations. Tomorrow's scripted price falls from $100 to $96.", lesson: "A positive headline does not promise a price rise. Expectations and valuation matter; waiting for more evidence was reasonable." },
  { title: "A careful decision can lose money", facts: "Harbour Tools is a fictional manufacturer. Revenue grew 6%, debt is falling, and profit margins are steady. You have a five-year goal and are considering one $100 share. Your rule is to reconsider if new evidence weakens demand.", news: "A sudden supply disruption sends the scripted price from $100 to $90. One bad day alone does not tell you whether the long-term business case has failed.", lesson: "The loss is real within this example, but it cannot grade your reasoning. Investigate whether the disruption changes long-term earnings, and follow the rule you wrote." },
  { title: "A reckless trade can make money", facts: "Rocket Labs is a fictional speculative company with no profits. An anonymous post predicts a takeover. The rumour is unverified. Investing all $2,000 would put your bills and your entire account at risk.", news: "The scripted price rises from $100 to $110 despite no takeover confirmation. Someone who put everything in would profit this time.", lesson: "A lucky gain does not validate an unverified rumour or an oversized position. The same exposure could produce a large loss on another day." },
];

export default function Practice() {
  const { user } = useAuth();
  const lessonHeading = useRef<HTMLHeadingElement>(null);
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState("");
  const [reason, setReason] = useState("");
  const [sold, setSold] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [reflection, setReflection] = useState("");
  const [finished, setFinished] = useState(false);
  const scenario = scenarios[index];
  const nextPrice = index === 0 ? 96 : index === 1 ? 90 : 110;
  const bought = choice === "Buy 1 practice share" && revealed;
  const cash = bought ? 1900 + (sold ? nextPrice : 0) : 2000;
  const shares = bought && !sold ? 1 : 0;
  const finish = () => {
    if (user) updateTutorialProgress(user.id, { prompted: true, gameComplete: true });
    setFinished(true);
  };
  useEffect(() => { if (index === 0 && !finished) return; lessonHeading.current?.focus(); lessonHeading.current?.scrollIntoView({ block: "start", behavior: "auto" }); }, [index, finished]);
  const next = () => {
    if (index === scenarios.length - 1) finish();
    else { setIndex(i => i + 1); setChoice(""); setReason(""); setReflection(""); setRevealed(false); setSold(false); }
  };
  return <Container className="learning" maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
    <Chip label="GUEST PRACTICE · START WITH ONE DECISION" sx={{ color: D.brandText, bgcolor: D.brandBg, mb: 2 }} />
    <Typography component="h1" variant="h4" sx={{ color: D.t1, fontWeight: 950, mb: 1 }}>Make one decision. Learn from it.</Typography>
    <Typography sx={{ color: D.t2, mb: 3 }}>Try researching, choosing, and reviewing with virtual money. This disposable lesson never changes your saved game. Refreshing starts it over.</Typography>
    <Alert severity="info" sx={{ mb: 3 }}>Companies, prices, and outcomes here are fictional and scripted. Real markets can react to news immediately; this pause is a teaching tool.</Alert>
    {finished ? <Box sx={{ ...CARD, p: 3 }}>
      <Typography component="h2" variant="h5" tabIndex={-1} ref={lessonHeading} sx={{ color: D.t1, fontWeight: 900 }}>Practice complete</Typography>
      <Typography sx={{ color: D.t2, my: 2 }}>You researched {index + 1} situation{index === 0 ? "" : "s"}, recorded decisions, and reflected on uncertainty. Choosing to wait is a useful outcome. Learning progress depends on explaining your plan, even when a price moves against you.</Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <Button component={RouterLink} to={user ? "/game" : "/auth?mode=signup"} variant="contained" sx={{ textTransform: "none" }}>{user ? "Return to my market" : "Create an account & keep learning"}</Button>
        <Button component={RouterLink} to="/learn?tab=investing" sx={{ textTransform: "none" }}>Explore long-term investing</Button>
        <Button onClick={() => { setIndex(0); setChoice(""); setReason(""); setReflection(""); setRevealed(false); setSold(false); setFinished(false); }} sx={{ textTransform: "none" }}>Try again</Button>
      </Stack>
    </Box> : <Box sx={{ ...CARD, p: { xs: 2, sm: 4 } }}>
      <Typography sx={{ color: D.t3, mb: 1 }}>Scenario {index + 1} of {scenarios.length} · Extra scenarios are optional · Research → Decide → Review</Typography>
      <LinearProgress variant="determinate" value={index / scenarios.length * 100} sx={{ mb: 3 }} />
      <Typography component="h2" variant="h5" tabIndex={-1} ref={lessonHeading} sx={{ color: D.t1, fontWeight: 900, mb: 2 }}>{scenario.title}</Typography>
      <Typography sx={{ color: D.t2, lineHeight: 1.8, mb: 2 }}>{scenario.facts}</Typography>
      <Typography sx={{ color: D.t2, fontSize: 13, mb: 2 }}>P/E compares share price to annual earnings per share. A high P/E can mean high growth expectations; a low P/E can reflect lower expectations or a troubled business.</Typography>
      <Stack spacing={2}>
        <Typography role="status" sx={{ color: D.t1, fontWeight: 800 }}>Practice cash: {money(cash)} · Shares: {shares} · Account value: {money(cash + shares * nextPrice)}</Typography>
        <Typography sx={{ color: D.t2, fontSize: 13 }}>A practice share costs $100 at the decision point: 5% of $2,000. Each scenario has its own disposable account. Choosing to wait leaves it in cash.</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          {["Buy 1 practice share", "Wait / research further", "Avoid this stock"].map(label => <Button key={label} aria-pressed={choice === label} disabled={revealed} variant={choice === label ? "contained" : "outlined"} onClick={() => setChoice(label)} sx={{ textTransform: "none" }}>{label}</Button>)}
        </Stack>
        <TextField label="Why does this decision fit my goal?" helperText="Name evidence, a risk, and what would change your mind. More than one choice can be reasonable. Write at least 20 characters." multiline minRows={3} value={reason} onChange={e => setReason(e.target.value)} disabled={revealed} inputProps={{ maxLength: 1000 }} />
        {!revealed && <Button variant="contained" disabled={!choice || reason.trim().length < 20} onClick={() => setRevealed(true)} sx={{ alignSelf: "flex-start", textTransform: "none" }}>Save my decision & reveal the outcome</Button>}
        {revealed && <>
          <Alert severity="info">{scenario.news}</Alert>
          <Typography sx={{ color: D.t1, lineHeight: 1.7 }}>{scenario.lesson}</Typography>
          <Typography sx={{ color: D.t2 }}>For one share, the price change would be {money(index === 0 ? -4 : index === 1 ? -10 : 10)}. Waiting keeps your cash unchanged. This is price movement, not a score for decision quality.</Typography>
          {bought && <Box>
            <Button variant="outlined" disabled={sold} onClick={() => setSold(true)} sx={{ textTransform: "none" }}>{sold ? "Practice share sold" : `Sell 1 practice share at ${money(nextPrice)}`}</Button>
            <Typography sx={{ color: D.t2, fontSize: 13, mt: 1 }}>{sold ? `Sale complete. Realized gain / loss: ${money(nextPrice - 100)}. Your cash and account value now match.` : "You can sell to practise an exit, or keep the share and explain why. An unrealized gain/loss is a change in the value of shares you still own."}</Typography>
          </Box>}
          <TextField label="What did I learn? What would I check next?" helperText="Consider new evidence, your exit rule, position size, and luck. Write at least 20 characters." multiline minRows={3} value={reflection} onChange={e => setReflection(e.target.value)} inputProps={{ maxLength: 1000 }} />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}><Button variant="contained" disabled={reflection.trim().length < 20} onClick={finish} sx={{ textTransform: "none" }}>Finish practice</Button>{index < 2 && <Button variant="outlined" disabled={reflection.trim().length < 20} onClick={next} sx={{ textTransform: "none" }}>Try another scenario (optional)</Button>}</Stack>
        </>}
      </Stack>
    </Box>}
  </Container>;
}
