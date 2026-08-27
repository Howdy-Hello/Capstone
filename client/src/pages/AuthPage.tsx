import React, { useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Container, Divider, Grid, IconButton,
  InputAdornment, Link, Stack, TextField, Typography,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import CandlestickChartIcon from "@mui/icons-material/CandlestickChart";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import GoogleIcon from "@mui/icons-material/Google";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useAuthThrottle } from "../lib/authThrottle";
import { AuthMode, resolveAuthMode } from "../lib/routing";
import { D, MONO } from "../theme/design";

const PERKS = [
  "Trade 21 fictional stocks in a realistic market",
  "Start with $2,000 in simulated capital",
  "Open-ended market simulation",
  "Compete on a global leaderboard",
  "In-depth market education built-in",
];

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const qs = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const { user } = useAuth();

  const requestedMode = qs.get("mode");
  const oauthError = qs.get("oauth_error");
  const mode = resolveAuthMode(requestedMode);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(oauthError);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const throttleKey = `${mode === "reset" ? "login" : mode}:${email.trim().toLowerCase() || "anon"}`;
  const throttle = useAuthThrottle(throttleKey);

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const setMode = (nextMode: AuthMode) => {
    const params = new URLSearchParams(location.search);
    params.set("mode", nextMode);
    const search = `?${params.toString()}`;
    navigate({ pathname: location.pathname, search }, { replace: true });
  };

  useEffect(() => {
    setError(oauthError);
  }, [mode, oauthError]);

  // Show the "password updated" message once on arrival, without clobbering a
  // success message set by a mode switch (e.g. the post-signup "Account created").
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("password") === "updated") {
      setSuccessMsg("Password updated successfully. Log in with your new password.");
    }
  }, []);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const validate = () => {
    if (!email || !emailRegex.test(email.trim())) return "Enter a valid email address.";
    if (mode === "reset") return null;
    if (mode === "signup" && name.trim().length < 2) return "Enter your full name (2+ characters).";
    if (password.length < 6) return "Password must be at least 6 characters.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    if ((mode === "login" || mode === "signup") && throttle.isLocked) {
      setError(`Too many attempts. Try again in ${throttle.remainingSeconds}s.`);
      return;
    }
    const err = validate();
    if (err) { setError(err); return; }
    setSubmitting(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          throttle.recordFailure();
          // Surface a resend option when the account exists but isn't confirmed.
          if (/confirm|verif/i.test(error.message)) setPendingEmail(email);
          throw error;
        }
        throttle.recordSuccess();
        navigate("/dashboard", { replace: true });
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
        if (error) {
          throttle.recordFailure();
          throw error;
        }
        throttle.recordSuccess();
        if (data.session) {
          navigate("/dashboard", { replace: true });
        } else {
          setSuccessMsg("Account created! Check your email to confirm your address, then log in.");
          setPendingEmail(email);
          setMode("login");
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/update-password`,
        });
        if (error) throw error;
        setSuccessMsg("Password reset email sent. Check your inbox.");
      }
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (error) throw error;
    } catch (err: any) {
      setError(err?.message ?? "Google sign-in failed. Try again.");
      setSubmitting(false);
    }
  };

  const handleResendConfirmation = async () => {
    const target = pendingEmail || email;
    if (!target) return;
    setResending(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email: target });
      if (error) throw error;
      setSuccessMsg(`Confirmation email re-sent to ${target}. Check your inbox and spam folder.`);
    } catch (err: any) {
      setError(err?.message ?? "Could not resend the confirmation email.");
    } finally {
      setResending(false);
    }
  };

  const headings: Record<AuthMode, { title: string; sub: string }> = {
    login:  { title: "Welcome back",          sub: "Log in to your trading desk." },
    signup: { title: "Create your account",   sub: "Set up your simulated portfolio in seconds." },
    reset:  { title: "Reset password",        sub: "We'll send a reset link to your inbox." },
  };

  const field = {
    "& .MuiOutlinedInput-root": {
      bgcolor: D.elevated,
      borderRadius: 1.5,
      "& fieldset": { borderColor: D.border },
      "&:hover fieldset": { borderColor: D.borderHi },
      "&.Mui-focused fieldset": { borderColor: D.brand },
      "& input": { color: D.t1, fontSize: 14 },
    },
    "& .MuiInputLabel-root": { color: D.t3, fontSize: 13.5, "&.Mui-focused": { color: D.brandText } },
  };

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: D.bg, display: "flex", alignItems: "center" }}>
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Grid container sx={{ maxWidth: 980, mx: "auto", minHeight: { md: 580 } }}>

          {/* LEFT — Branding panel */}
          <Grid item xs={12} md={5} sx={{ display: { xs: "none", md: "flex" }, flexDirection: "column" }}>
            <Box sx={{ height: "100%", p: 4.5, borderRadius: "16px 0 0 16px", bgcolor: D.elevated, border: `1px solid ${D.border}`, borderRight: "none", display: "flex", flexDirection: "column" }}>
              <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: "auto" }}>
                <Box sx={{ width: 34, height: 34, borderRadius: 2, bgcolor: D.brand, display: "grid", placeItems: "center" }}>
                  <CandlestickChartIcon sx={{ fontSize: 18, color: "#fff" }} />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 900, fontSize: 15, color: D.t1 }}>StockPilot</Typography>
                  <Typography sx={{ fontSize: 10, color: D.t3, fontFamily: MONO }}>SIMULATION TERMINAL</Typography>
                </Box>
              </Stack>

              <Box sx={{ my: 4 }}>
                <Typography sx={{ fontSize: 24, fontWeight: 950, color: D.t1, letterSpacing: -1, lineHeight: 1.2, mb: 1.5 }}>
                  Learn to trade.<br />
                  <Box component="span" sx={{ color: D.brandText }}>No risk required.</Box>
                </Typography>
                <Typography sx={{ fontSize: 13, color: D.t2, lineHeight: 1.8 }}>
                  Practice real market decisions in a safe simulation environment.
                </Typography>
              </Box>

              <Stack spacing={1.2}>
                {PERKS.map((p) => (
                  <Stack key={p} direction="row" spacing={1} alignItems="flex-start">
                    <CheckCircleOutlineIcon sx={{ fontSize: 15, color: D.greenText, mt: 0.25 }} />
                    <Typography sx={{ fontSize: 12.5, color: D.t2, lineHeight: 1.5 }}>{p}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          </Grid>

          {/* RIGHT — Form */}
          <Grid item xs={12} md={7} display="flex">
            <Box component="form" onSubmit={handleSubmit} noValidate
              sx={{ flex: 1, p: { xs: 3, sm: 4.5 }, bgcolor: D.surface, border: `1px solid ${D.border}`, borderRadius: { xs: 3, md: "0 16px 16px 0" }, display: "flex", flexDirection: "column" }}>

              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3.5 }}>
                <IconButton aria-label="Back to home" onClick={() => navigate("/")} size="small" sx={{ color: D.t3, p: 0.6, "&:hover": { color: D.t1, bgcolor: D.overlay } }}>
                  <ArrowBackIosNewIcon sx={{ fontSize: 14 }} />
                </IconButton>
                <Typography sx={{ fontSize: 12, color: D.t3 }}>Back to home</Typography>
              </Stack>

              <Typography sx={{ fontWeight: 950, fontSize: 22, color: D.t1, letterSpacing: -0.5, mb: 0.5 }}>
                {headings[mode].title}
              </Typography>
              <Typography sx={{ fontSize: 13.5, color: D.t2, mb: 3 }}>{headings[mode].sub}</Typography>

              {error && <Alert severity="error" sx={{ mb: 2, bgcolor: D.redBg, color: D.redText, border: `1px solid ${D.redBd}`, "& .MuiAlert-icon": { color: D.redText }, fontSize: 13 }}>{error}</Alert>}
              {!error && (mode === "login" || mode === "signup") && throttle.isLocked && (
                <Alert severity="warning" sx={{ mb: 2, bgcolor: D.amberBg, color: D.t1, border: `1px solid ${D.border}`, fontSize: 13 }}>
                  Too many attempts. Try again in {throttle.remainingSeconds}s.
                </Alert>
              )}
              {!error && (mode === "login" || mode === "signup") && !throttle.isLocked && throttle.attemptsLeft <= 2 && throttle.attemptsLeft > 0 && (
                <Alert severity="warning" sx={{ mb: 2, bgcolor: D.amberBg, color: D.t1, border: `1px solid ${D.border}`, fontSize: 13 }}>
                  {throttle.attemptsLeft} attempt{throttle.attemptsLeft === 1 ? "" : "s"} left before a short cooldown.
                </Alert>
              )}
              {successMsg && <Alert severity="success" sx={{ mb: 2, bgcolor: D.greenBg, color: D.greenText, border: `1px solid ${D.greenBd}`, "& .MuiAlert-icon": { color: D.greenText }, fontSize: 13 }}>{successMsg}</Alert>}
              {pendingEmail && (
                <Button type="button" variant="text" size="small" disabled={resending} onClick={handleResendConfirmation}
                  sx={{ mb: 2, alignSelf: "flex-start", color: D.brandText, textTransform: "none", fontWeight: 700, fontSize: 12.5, px: 0, "&:hover": { bgcolor: "transparent", color: D.t1 } }}>
                  {resending ? "Sending…" : `Resend confirmation email to ${pendingEmail}`}
                </Button>
              )}

              <Stack spacing={2} sx={{ flex: 1 }}>
                <Button type="button" variant="outlined" size="large" disabled={submitting} onClick={handleGoogleSignIn} startIcon={<GoogleIcon />}
                  sx={{ color: D.t1, borderColor: D.border, bgcolor: D.elevated, py: 1.35, borderRadius: 2, fontWeight: 900, fontSize: 14, textTransform: "none", "&:hover": { borderColor: D.borderHi, bgcolor: D.overlay } }}>
                  Continue with Google
                </Button>

                <Divider sx={{ borderColor: D.border, my: 0.5 }}>
                  <Typography component="span" sx={{ px: 1.2, fontSize: 11, color: D.t3, fontFamily: MONO }}>OR</Typography>
                </Divider>

                {mode === "signup" && (
                  <TextField label="Full name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required sx={field} />
                )}
                <TextField label="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required sx={field} />
                {mode !== "reset" && (
                  <TextField label="Password" type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === "login" ? "current-password" : "new-password"} required sx={field}
                    InputProps={{ endAdornment: (
                      <InputAdornment position="end">
                        <IconButton aria-label={showPw ? "Hide password" : "Show password"} onClick={() => setShowPw((s) => !s)} edge="end" sx={{ color: D.t3 }}>
                          {showPw ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                        </IconButton>
                      </InputAdornment>
                    )}}
                  />
                )}

                {mode === "login" && (
                  <Box sx={{ textAlign: "right", mt: -1 }}>
                    <Link component="button" type="button" underline="hover" onClick={() => setMode("reset")}
                      sx={{ fontSize: 12.5, color: D.t3, "&:hover": { color: D.brandText } }}>
                      Forgot password?
                    </Link>
                  </Box>
                )}

                <Button type="submit" variant="contained" size="large"
                  disabled={submitting || ((mode === "login" || mode === "signup") && throttle.isLocked)}
                  sx={{ bgcolor: D.brand, py: 1.4, borderRadius: 2, fontWeight: 900, fontSize: 14, textTransform: "none", boxShadow: "none", "&:hover": { bgcolor: D.brandMid, boxShadow: "none" }, mt: 0.5 }}>
                  {submitting
                    ? "Please wait…"
                    : (mode === "login" || mode === "signup") && throttle.isLocked
                      ? `Locked (${throttle.remainingSeconds}s)`
                      : mode === "login" ? "Log in" : mode === "signup" ? "Create account" : "Send reset link"}
                </Button>

                <Divider sx={{ borderColor: D.border, my: 0.5 }} />

                <Typography textAlign="center" sx={{ fontSize: 13, color: D.t3 }}>
                  {mode === "reset" ? (
                    <>Remember it?{" "}
                      <Link component="button" type="button" onClick={() => setMode("login")} sx={{ color: D.brandText, fontWeight: 800, "&:hover": { color: D.t1 } }}>
                        Back to login
                      </Link>
                    </>
                  ) : mode === "login" ? (
                    <>Don&apos;t have an account?{" "}
                      <Link component="button" type="button" onClick={() => setMode("signup")} sx={{ color: D.brandText, fontWeight: 800, "&:hover": { color: D.t1 } }}>
                        Sign up free
                      </Link>
                    </>
                  ) : (
                    <>Already have an account?{" "}
                      <Link component="button" type="button" onClick={() => setMode("login")} sx={{ color: D.brandText, fontWeight: 800, "&:hover": { color: D.t1 } }}>
                        Log in
                      </Link>
                    </>
                  )}
                </Typography>
              </Stack>
            </Box>
          </Grid>

        </Grid>
      </Container>
    </Box>
  );
};

export default AuthPage;
