import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
  Grid,
  Chip,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import CandlestickChartIcon from "@mui/icons-material/CandlestickChart";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

const BRAND = {
  navy: "#2C3947",
  red: "#FF3737",
  green: "#9AD872",
  paper: "#F6F8FA",
};

type Mode = "login" | "signup" | "reset";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const qs = useQuery();
  const { user } = useAuth();

  const initialMode = (qs.get("mode") === "signup" ? "signup" : "login") as Mode;
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("mode", mode);
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
  }, [mode]);

  const title =
    mode === "login"
      ? "Welcome back, trader"
      : mode === "signup"
      ? "Create your trading desk"
      : "Reset your password";

  const subtitle =
    mode === "login"
      ? "Log in to continue your portfolio simulation."
      : mode === "signup"
      ? "Start tracking simulated trades, watchlists, and risk metrics."
      : "Enter your email and we'll send you a reset link.";

  const validate = () => {
    if (!email || !email.includes("@")) return "Please enter a valid email.";
    if (mode === "reset") return null;
    if (mode === "signup" && name.trim().length < 2) return "Please enter your full name.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/dashboard", { replace: true });
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        setSuccessMsg("Account created! Check your email to confirm your account, then log in.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth?mode=login`,
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

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "grid",
        alignContent: "center",
        background: `radial-gradient(900px 460px at 15% 10%, rgba(154,216,114,0.24), transparent 58%), linear-gradient(135deg, ${BRAND.navy} 0%, #1C2631 100%)`,
      }}
    >
      <Container sx={{ py: { xs: 4, md: 8 } }}>
        <Grid container spacing={3} alignItems="stretch" sx={{ maxWidth: 1180, mx: "auto" }}>
          {/* LEFT PANEL */}
          <Grid item xs={12} md={6} sx={{ display: { xs: "none", md: "block" } }}>
            <Paper
              elevation={0}
              sx={{
                height: "100%",
                p: 4,
                borderRadius: 5,
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "linear-gradient(145deg, rgba(255,255,255,0.11), rgba(255,255,255,0.04))",
                backdropFilter: "blur(18px)",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <Box sx={{ position: "absolute", right: -80, bottom: -80, width: 260, height: 260, borderRadius: "50%", bgcolor: "rgba(255,55,55,0.22)" }} />
              <Stack sx={{ position: "relative", height: "100%" }}>
                <Stack direction="row" spacing={1.3} alignItems="center">
                  <Box sx={{ width: 46, height: 46, borderRadius: 3, bgcolor: BRAND.red, display: "grid", placeItems: "center" }}>
                    <CandlestickChartIcon />
                  </Box>
                  <Box>
                    <Typography variant="h5" fontWeight={950}>StockPilot</Typography>
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.62)" }}>Simulation Terminal</Typography>
                  </Box>
                </Stack>

                <Box sx={{ flex: 1, display: "grid", alignContent: "center" }}>
                  <Chip icon={<TrendingUpIcon />} label="Portfolio discipline starts here" sx={{ alignSelf: "start", mb: 2, bgcolor: BRAND.green, color: BRAND.navy, fontWeight: 950 }} />
                  <Typography variant="h2" fontWeight={950} sx={{ lineHeight: 1, letterSpacing: -1.5 }}>
                    Secure access for serious market practice.
                  </Typography>
                  <Typography variant="h6" sx={{ mt: 2, color: "rgba(255,255,255,0.72)", lineHeight: 1.6 }}>
                    Save simulations, compare strategies, track risk, and build better trading habits without risking real capital.
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1.2} alignItems="center">
                  <LockOutlinedIcon sx={{ color: BRAND.green }} />
                  <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.74)" }}>
                    Powered by Supabase Auth.
                  </Typography>
                </Stack>
              </Stack>
            </Paper>
          </Grid>

          {/* RIGHT FORM */}
          <Grid item xs={12} md={6} display="flex">
            <Paper
              component="form"
              onSubmit={handleSubmit}
              noValidate
              elevation={0}
              sx={{
                width: "100%",
                maxWidth: 530,
                mx: "auto",
                p: { xs: 3, sm: 4 },
                borderRadius: 5,
                bgcolor: "#fff",
                border: "1px solid rgba(44,57,71,0.12)",
                boxShadow: "0 30px 80px rgba(0,0,0,0.22)",
                alignSelf: "center",
              }}
            >
              <Stack spacing={2.4}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <IconButton onClick={() => navigate("/")} size="small" aria-label="Back to home">
                    <ArrowBackIosNewIcon fontSize="small" />
                  </IconButton>
                  <Typography variant="overline" color="text.secondary" fontWeight={900}>Back to home</Typography>
                </Stack>

                <Box>
                  <Typography variant="h4" fontWeight={950} color={BRAND.navy}>{title}</Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mt: 0.7 }}>{subtitle}</Typography>
                </Box>

                {error && <Alert severity="error">{error}</Alert>}
                {successMsg && <Alert severity="success">{successMsg}</Alert>}

                {mode === "signup" && (
                  <TextField label="Full name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
                )}

                <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />

                {mode !== "reset" && (
                  <TextField
                    label="Password"
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    required
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton aria-label={showPw ? "Hide password" : "Show password"} onClick={() => setShowPw((s) => !s)} edge="end">
                            {showPw ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                )}

                {mode === "login" && (
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <FormControlLabel
                      control={<Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} sx={{ color: BRAND.navy, "&.Mui-checked": { color: BRAND.red } }} />}
                      label="Remember me"
                    />
                    <Link
                      component="button"
                      type="button"
                      underline="hover"
                      onClick={() => setMode("reset")}
                      sx={{ color: BRAND.red, fontWeight: 800 }}
                    >
                      Forgot password?
                    </Link>
                  </Stack>
                )}

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={submitting}
                  sx={{ bgcolor: BRAND.red, py: 1.25, borderRadius: 2.5, fontWeight: 950, "&:hover": { bgcolor: "#E63131" } }}
                >
                  {submitting
                    ? "Please wait..."
                    : mode === "login"
                    ? "Enter simulator"
                    : mode === "signup"
                    ? "Create account"
                    : "Send reset link"}
                </Button>

                {mode === "reset" ? (
                  <Typography textAlign="center" color="text.secondary">
                    Remember it?{" "}
                    <Link component="button" type="button" onClick={() => setMode("login")} sx={{ color: BRAND.red, fontWeight: 900 }}>
                      Back to login
                    </Link>
                  </Typography>
                ) : mode === "login" ? (
                  <Typography textAlign="center" color="text.secondary">
                    Don&apos;t have an account?{" "}
                    <Link component="button" type="button" onClick={() => setMode("signup")} sx={{ color: BRAND.red, fontWeight: 900 }}>
                      Sign up
                    </Link>
                  </Typography>
                ) : (
                  <Typography textAlign="center" color="text.secondary">
                    Already have an account?{" "}
                    <Link component="button" type="button" onClick={() => setMode("login")} sx={{ color: BRAND.red, fontWeight: 900 }}>
                      Log in
                    </Link>
                  </Typography>
                )}
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default AuthPage;
