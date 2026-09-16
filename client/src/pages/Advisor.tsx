import { useState } from "react";
import { Alert, Box, Button, Chip, Container, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Stack, Typography } from "@mui/material";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { ADVISORS, AdvisorDefinition, useAdvisor } from "../hooks/useAdvisor";
import { useGame } from "../context/GameContext";
import { CARD, D, MONO, money } from "../theme/design";

export default function Advisor() {
  const trading = useGame();
  const advisorState = useAdvisor();
  const [selected, setSelected] = useState<AdvisorDefinition | null>(null);
  const [message, setMessage] = useState("");

  const confirmHire = async () => {
    if (!selected) return;
    const hired = await advisorState.hire(selected);
    setMessage(hired ? `${selected.name} is now available throughout this game run.` : "The advisor could not be hired.");
    setSelected(null);
  };

  return (
    <Box sx={{ bgcolor: D.bg, minHeight: "100vh", py: { xs: 3, md: 5 } }}>
      <Container data-tour="advisor-page" maxWidth="lg">
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2} sx={{ mb: 1 }}>
          <Box><Stack direction="row" spacing={1.2} alignItems="center"><SmartToyIcon sx={{ color: D.brandText }} /><Typography sx={{ color: D.t1, fontSize: { xs: 26, md: 32 }, fontWeight: 950 }}>Advisor Marketplace</Typography></Stack><Typography sx={{ color: D.t3, mt: 1 }}>Hire specialists with game cash. Advisors remain available for the current run.</Typography></Box>
          <Chip icon={<AccountBalanceWalletIcon />} label={`${money(trading.account.cash)} available`} sx={{ alignSelf: { sm: "flex-start" }, bgcolor: D.greenBg, color: D.greenText, fontFamily: MONO, fontWeight: 900 }} />
        </Stack>

        {message && <Alert severity="success" onClose={() => setMessage("")} sx={{ my: 3, bgcolor: D.greenBg, color: D.greenText, border: `1px solid ${D.greenBd}` }}>{message}</Alert>}

        {advisorState.ownedAdvisors.length > 0 && <Box sx={{ ...CARD, p: 2.5, my: 3 }}><Typography sx={{ color: D.t1, fontWeight: 900, mb: 1.5 }}>My Advisors</Typography><Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>{advisorState.ownedAdvisors.map((advisor) => <Chip key={advisor.id} icon={<CheckCircleIcon />} label={`${advisor.name} · ${advisor.role}`} sx={{ bgcolor: D.brandBg, color: D.brandText, fontWeight: 800 }} />)}</Stack></Box>}

        <Grid container spacing={2.5} sx={{ mt: 1 }}>
          {ADVISORS.map((advisor) => {
            const owned = advisorState.ownedIds.includes(advisor.id);
            const affordable = trading.account.cash >= advisor.cost;
            const available = advisor.id === "riley";
            return (
              <Grid item xs={12} sm={6} key={advisor.id}>
                <Box sx={{ ...CARD, p: 3, height: "100%", borderColor: owned ? D.greenBd : D.border }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
                    <Box><Typography sx={{ color: D.t1, fontSize: 20, fontWeight: 950 }}>{advisor.name}</Typography><Typography sx={{ color: D.brandText, fontSize: 12, fontWeight: 900 }}>{advisor.role}</Typography></Box>
                    <Chip label={owned ? "HIRED" : available ? money(advisor.cost) : "COMING SOON"} size="small" sx={{ bgcolor: owned ? D.greenBg : D.overlay, color: owned ? D.greenText : D.t1, fontFamily: MONO, fontWeight: 900 }} />
                  </Stack>
                  <Typography sx={{ color: D.t3, fontSize: 13, lineHeight: 1.6, mb: 2 }}>{advisor.description}</Typography>
                  <Stack spacing={1} sx={{ mb: 2.5 }}>{advisor.features.map((feature) => <Stack key={feature} direction="row" spacing={1} alignItems="center"><CheckCircleIcon sx={{ color: D.greenText, fontSize: 15 }} /><Typography sx={{ color: D.t2, fontSize: 12.5 }}>{feature}</Typography></Stack>)}</Stack>
                  <Button fullWidth variant={owned ? "outlined" : "contained"} disabled={owned || !available || !affordable} onClick={() => setSelected(advisor)} sx={{ bgcolor: owned ? "transparent" : D.brand, color: owned ? D.greenText : "#fff", borderColor: owned ? D.greenBd : D.brand, textTransform: "none", fontWeight: 900, boxShadow: "none" }}>{owned ? "Already hired" : !available ? "Coming soon" : affordable ? `Hire ${advisor.name}` : "Not enough cash"}</Button>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Container>

      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} PaperProps={{ sx: { bgcolor: D.surface, color: D.t1, border: `1px solid ${D.border}`, borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 900 }}>Hire {selected?.name}?</DialogTitle>
        <DialogContent><Typography sx={{ color: D.t2, mb: 2 }}>{selected?.role} will be available for the rest of this run.</Typography><Box sx={{ p: 2, bgcolor: D.elevated, borderRadius: 2 }}><Stack direction="row" justifyContent="space-between"><Typography sx={{ color: D.t3 }}>Hiring cost</Typography><Typography sx={{ fontFamily: MONO, fontWeight: 900 }}>{money(selected?.cost ?? 0)}</Typography></Stack><Stack direction="row" justifyContent="space-between"><Typography sx={{ color: D.t3 }}>Cash after hiring</Typography><Typography sx={{ fontFamily: MONO, fontWeight: 900 }}>{money(trading.account.cash - (selected?.cost ?? 0))}</Typography></Stack></Box></DialogContent>
        <DialogActions sx={{ p: 2 }}><Button onClick={() => setSelected(null)} sx={{ color: D.t3, textTransform: "none" }}>Cancel</Button><Button onClick={confirmHire} variant="contained" sx={{ bgcolor: D.brand, textTransform: "none", fontWeight: 900 }}>Confirm hire</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
