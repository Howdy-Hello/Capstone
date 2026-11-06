import React from "react";
import { Box, Container, Link, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { D } from "../theme/design";
import { usePageTitle } from "../lib/usePageTitle";

// Who players can write to about their data. Set before launch (BUG-013);
// while empty the page points to in-app account deletion only.
const PRIVACY_CONTACT = "";
const UPDATED = "8 October 2026";

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: "What StockPilot is",
    body: "StockPilot is a stock market simulator for learning. All money, stocks and prices in the game are fictional. Nothing you do here buys or sells real investments.",
  },
  {
    title: "What we store",
    body: (
      <Box component="ul" sx={{ m: 0, pl: 2.5, "& li": { mb: 0.75 } }}>
        <li>Your account: email address, display name, username, and a profile picture if you upload one or sign in with Google.</li>
        <li>Your game: runs, simulated trades and holdings, save slots, watchlist, learning notes, decision journal, goals, achievements and level.</li>
        <li>Leaderboards show your display name, username, picture, level and simulated results to other players.</li>
      </Box>
    ),
  },
  {
    title: "What stays in your browser",
    body: "Some settings and history (theme, notifications, inbox messages, tutorial progress and a local activity log) are kept in your browser's storage on this device. They are not sent to us, and clearing your browser data removes them.",
  },
  {
    title: "Who processes it",
    body: "Accounts and game data are stored with Supabase, our database and sign-in provider. The website and game server are hosted by our hosting providers. If you choose \"Continue with Google\", Google shares your name, email and picture with us. We do not sell your data, show ads, or use tracking cookies.",
  },
  {
    title: "Your choices",
    body: (
      <>
        You can change your profile at any time in{" "}
        <Link component={RouterLink} to="/settings" sx={{ display: "inline-block", minHeight: 24, color: D.brandText }}>Settings</Link>.
        {" "}Delete account, also in Settings, permanently removes your account and all game data stored with us.
      </>
    ),
  },
];

const Privacy: React.FC = () => {
  usePageTitle("Privacy");
  return (
    <Box sx={{ bgcolor: D.bg, minHeight: "100vh", py: { xs: 4, md: 7 } }}>
      <Container maxWidth="md">
        <Typography component="h1" sx={{ fontSize: { xs: 26, md: 32 }, fontWeight: 900, color: D.t1, letterSpacing: "-0.02em", mb: 1 }}>
          Privacy
        </Typography>
        <Typography sx={{ color: D.t3, fontSize: 14, mb: 4 }}>Last updated {UPDATED}</Typography>
        <Stack spacing={3.5}>
          {SECTIONS.map((section) => (
            <Box key={section.title}>
              <Typography component="h2" sx={{ fontSize: 18, fontWeight: 900, color: D.t1, mb: 1 }}>
                {section.title}
              </Typography>
              <Typography component="div" sx={{ color: D.t2, fontSize: 16, lineHeight: 1.7 }}>
                {section.body}
              </Typography>
            </Box>
          ))}
          {PRIVACY_CONTACT && (
            <Box>
              <Typography component="h2" sx={{ fontSize: 18, fontWeight: 900, color: D.t1, mb: 1 }}>Contact</Typography>
              <Typography sx={{ color: D.t2, fontSize: 16, lineHeight: 1.7 }}>
                Questions about your data:{" "}
                <Link href={`mailto:${PRIVACY_CONTACT}`} sx={{ color: D.brandText }}>{PRIVACY_CONTACT}</Link>
              </Typography>
            </Box>
          )}
        </Stack>
      </Container>
    </Box>
  );
};

export default Privacy;
