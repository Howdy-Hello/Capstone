import { Box, Chip, Container, Divider, Grid, LinearProgress, Stack, Typography } from "@mui/material";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useGame, WEEKLY_BILL_TOTAL } from "../context/GameContext";
import { CARD, D, MONO, money } from "../theme/design";

export default function LivingCosts() {
  const trading = useGame();
  const nextBillDay = (Math.floor(trading.gameDay / 7) + 1) * 7;
  const daysRemaining = nextBillDay - trading.gameDay;
  const cashAfterBill = Math.max(0, trading.account.cash - WEEKLY_BILL_TOTAL);
  const shortfall = Math.max(0, WEEKLY_BILL_TOTAL - trading.account.cash);
  const coverage = Math.min(100, (trading.account.cash / WEEKLY_BILL_TOTAL) * 100);
  const expenses = [
    { label: "Rent", amount: 200, detail: "Housing for one weekly cycle" },
    { label: "Food", amount: 100, detail: "Groceries and everyday meals" },
    { label: "Utilities", amount: 50, detail: "Power, water, and connectivity" },
  ];

  return (
    <Box sx={{ bgcolor: D.bg, minHeight: "100vh", py: { xs: 3, md: 5 } }}>
      <Container maxWidth="lg">
        <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 1 }}>
          <ReceiptLongIcon sx={{ color: D.redText }} />
          <Typography sx={{ color: D.t1, fontSize: { xs: 26, md: 32 }, fontWeight: 950 }}>Living Costs</Typography>
        </Stack>
        <Typography sx={{ color: D.t3, mb: 3 }}>Plan ahead for the fixed expenses deducted from your cash every seven game days.</Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Box sx={{ ...CARD, p: { xs: 2.5, md: 3.5 }, mb: 3 }}>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
                <Box>
                  <Typography sx={{ color: D.t3, fontSize: 11, fontWeight: 900, letterSpacing: 1 }}>NEXT BILL</Typography>
                  <Typography sx={{ color: D.t1, fontSize: 26, fontWeight: 950 }}>Day {nextBillDay}</Typography>
                  <Typography sx={{ color: D.t3, fontSize: 12 }}>{daysRemaining} game day{daysRemaining === 1 ? "" : "s"} remaining</Typography>
                </Box>
                <Box sx={{ textAlign: { sm: "right" } }}>
                  <Typography sx={{ color: D.t3, fontSize: 11, fontWeight: 900, letterSpacing: 1 }}>TOTAL DUE</Typography>
                  <Typography sx={{ color: D.redText, fontFamily: MONO, fontSize: 26, fontWeight: 950 }}>{money(WEEKLY_BILL_TOTAL)}</Typography>
                  <Chip label={shortfall === 0 ? "Fully covered" : `${money(shortfall)} short`} size="small" sx={{ mt: 0.5, bgcolor: shortfall === 0 ? D.greenBg : D.redBg, color: shortfall === 0 ? D.greenText : D.redText, fontWeight: 900 }} />
                </Box>
              </Stack>

              <Typography sx={{ color: D.t2, fontWeight: 800, fontSize: 13, mb: 1 }}>Cash coverage</Typography>
              <LinearProgress variant="determinate" value={coverage} sx={{ height: 8, borderRadius: 99, bgcolor: D.overlay, mb: 1, "& .MuiLinearProgress-bar": { bgcolor: shortfall === 0 ? D.green : D.redText, borderRadius: 99 } }} />
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 3 }}>
                <Typography sx={{ color: D.t3, fontSize: 11 }}>{money(trading.account.cash)} available</Typography>
                <Typography sx={{ color: D.t3, fontSize: 11 }}>{Math.round(coverage)}% covered</Typography>
              </Stack>

              <Divider sx={{ borderColor: D.border, mb: 3 }} />
              <Typography sx={{ color: D.t1, fontWeight: 900, mb: 1.5 }}>Expense breakdown</Typography>
              <Grid container spacing={2}>
                {expenses.map((expense) => (
                  <Grid item xs={12} sm={4} key={expense.label}>
                    <Box sx={{ p: 2, height: "100%", bgcolor: D.elevated, border: `1px solid ${D.border}`, borderRadius: 2 }}>
                      <Typography sx={{ color: D.t3, fontSize: 12 }}>{expense.label}</Typography>
                      <Typography sx={{ color: D.t1, fontFamily: MONO, fontWeight: 900, fontSize: 18, my: 0.4 }}>{money(expense.amount)}</Typography>
                      <Typography sx={{ color: D.t3, fontSize: 11, lineHeight: 1.5 }}>{expense.detail}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>

            <Box sx={{ ...CARD, p: 3 }}>
              <Typography sx={{ color: D.t1, fontWeight: 900, mb: 2 }}>Upcoming schedule</Typography>
              {[nextBillDay, nextBillDay + 7, nextBillDay + 14].map((day, index) => (
                <Stack key={day} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 1.4, borderTop: index ? `1px solid ${D.border}` : "none" }}>
                  <Stack direction="row" spacing={1.2} alignItems="center"><CalendarMonthIcon sx={{ color: index ? D.t3 : D.brandText, fontSize: 19 }} /><Box><Typography sx={{ color: D.t1, fontWeight: 800, fontSize: 13 }}>Day {day}</Typography><Typography sx={{ color: D.t3, fontSize: 11 }}>{index ? "Future cycle" : "Next payment"}</Typography></Box></Stack>
                  <Typography sx={{ color: D.t2, fontFamily: MONO, fontWeight: 900 }}>{money(WEEKLY_BILL_TOTAL)}</Typography>
                </Stack>
              ))}
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Stack spacing={3}>
              <Box sx={{ ...CARD, p: 3 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}><AccountBalanceWalletIcon sx={{ color: D.brandText }} /><Typography sx={{ color: D.t1, fontWeight: 900 }}>After the next bill</Typography></Stack>
                <Typography sx={{ color: D.t3, fontSize: 11, fontWeight: 900, letterSpacing: 1 }}>PROJECTED CASH</Typography>
                <Typography sx={{ color: shortfall ? D.redText : D.t1, fontFamily: MONO, fontSize: 25, fontWeight: 950, mb: 1 }}>{money(cashAfterBill)}</Typography>
                <Typography sx={{ color: D.t3, fontSize: 12, lineHeight: 1.6 }}>{shortfall ? "Your available cash will be used, but it will not cover the full bill." : `${money(WEEKLY_BILL_TOTAL)} will be deducted when you reach Day ${nextBillDay}.`}</Typography>
              </Box>

              <Box sx={{ p: 2.5, bgcolor: D.brandBg, border: `1px solid ${D.brandBd}`, borderRadius: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}><InfoOutlinedIcon sx={{ color: D.brandText, fontSize: 19 }} /><Typography sx={{ color: D.brandText, fontWeight: 900 }}>How billing works</Typography></Stack>
                <Typography sx={{ color: D.t2, fontSize: 12, lineHeight: 1.7 }}>Bills are charged automatically as you advance across a 7-day boundary. If you skip across multiple billing days, all missed cycles are collected together. Charges use cash only; your stocks are never sold automatically.</Typography>
              </Box>

              {trading.latestBill && <Box sx={{ p: 2.5, bgcolor: D.redBg, border: `1px solid ${D.redBd}`, borderRadius: 2 }}><Typography sx={{ color: D.redText, fontWeight: 900, mb: 0.5 }}>Latest payment · Day {trading.latestBill.day}</Typography><Typography sx={{ color: D.t2, fontSize: 13 }}>{trading.latestBill.cycles > 1 ? `${trading.latestBill.cycles} cycles were collected. ` : ""}{money(trading.latestBill.paid)} paid{trading.latestBill.shortfall > 0 ? `, with ${money(trading.latestBill.shortfall)} left uncovered.` : " in full."}</Typography></Box>}
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
