import React, { useEffect, useState } from "react";
import { Box, Button, CircularProgress, Container, Typography } from "@mui/material";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";

import { supabase } from "../lib/supabase";
import { CARD, D } from "../theme/design";
import { usePageTitle } from "../lib/usePageTitle";

function readOAuthError(search: string, hash: string) {
  const query = new URLSearchParams(search);
  const fragment = new URLSearchParams(hash.replace(/^#/, ""));
  return query.get("error_description")
    ?? fragment.get("error_description")
    ?? query.get("error")
    ?? fragment.get("error");
}

export default function AuthCallback() {
  usePageTitle("Signing in");
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const finishSignIn = async () => {
      const oauthError = readOAuthError(location.search, location.hash);
      if (oauthError) {
        navigate(`/auth?mode=login&oauth_error=${encodeURIComponent(oauthError)}`, { replace: true });
        return;
      }

      const code = new URLSearchParams(location.search).get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          if (active) setError(exchangeError.message);
          return;
        }
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!active) return;
      if (sessionError) {
        setError(sessionError.message);
        return;
      }
      if (!data.session) {
        setError("Google sign-in completed without creating a session. Check the Supabase and Google redirect configuration.");
        return;
      }

      navigate("/dashboard", { replace: true });
    };

    void finishSignIn();
    return () => { active = false; };
  }, [location.hash, location.search, navigate]);

  return (
    <Box sx={{ bgcolor: D.bg, minHeight: "100vh", display: "grid", placeItems: "center", px: 2 }}>
      <Container maxWidth="xs">
        <Box sx={{ ...CARD, p: 4, textAlign: "center" }}>
          {error ? (
            <>
              <Typography component="h1" sx={{ fontSize: 20, fontWeight: 900, color: D.t1, mb: 1 }}>Google sign-in failed</Typography>
              <Typography role="alert" sx={{ fontSize: 14, color: D.redText, lineHeight: 1.7, mb: 3 }}>{error}</Typography>
              <Button component={RouterLink} to="/auth?mode=login" variant="contained"
                sx={{ bgcolor: D.brand, fontWeight: 800, textTransform: "none", boxShadow: "none" }}>
                Back to login
              </Button>
            </>
          ) : (
            <>
              <CircularProgress aria-label="Completing Google sign-in" sx={{ color: D.brandText, mb: 2 }} />
              <Typography component="h1" sx={{ fontSize: 16, fontWeight: 900, color: D.t1 }}>Completing Google sign-in…</Typography>
            </>
          )}
        </Box>
      </Container>
    </Box>
  );
}
