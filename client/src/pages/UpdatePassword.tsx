import React, { useState } from "react";
import {
  Alert, Box, Button, CircularProgress, Container, IconButton,
  InputAdornment, Stack, TextField, Typography,
} from "@mui/material";
import LockResetIcon from "@mui/icons-material/LockReset";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { Link as RouterLink, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { CARD, D } from "../theme/design";
import { usePageTitle } from "../lib/usePageTitle";

export default function UpdatePassword() {
  usePageTitle("Update password");
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fieldSx = {
    "& .MuiOutlinedInput-root": {
      bgcolor: D.elevated,
      borderRadius: 1.5,
      "& fieldset": { borderColor: D.border },
      "&:hover fieldset": { borderColor: D.borderHi },
      "&.Mui-focused fieldset": { borderColor: D.brand },
      "& input": { color: D.t1, fontSize: 16 },
    },
    "& .MuiInputLabel-root": {
      color: D.t3,
      fontSize: 13.5,
      "&.Mui-focused": { color: D.brandText },
    },
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }

    await supabase.auth.signOut();
    navigate("/auth?mode=login&password=updated", { replace: true });
  };

  if (loading) {
    return (
      <Box sx={{ bgcolor: D.bg, minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <CircularProgress sx={{ color: D.brandText }} />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ bgcolor: D.bg, minHeight: "100vh", display: "grid", placeItems: "center", px: 2 }}>
        <Box sx={{ ...CARD, p: 4, width: "100%", maxWidth: 460, textAlign: "center" }}>
          <Typography component="h1" sx={{ fontSize: 22, fontWeight: 950, color: D.t1, mb: 1 }}>
            Reset link unavailable
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: D.t2, lineHeight: 1.7, mb: 3 }}>
            This password reset link is invalid or has expired. Request a new link from the login page.
          </Typography>
          <Button component={RouterLink} to="/auth?mode=reset" variant="contained"
            sx={{ bgcolor: D.brand, fontWeight: 900, textTransform: "none", boxShadow: "none", "&:hover": { bgcolor: D.brandMid, boxShadow: "none" } }}>
            Request another link
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: D.bg, minHeight: "100vh", display: "grid", placeItems: "center", px: 2, py: 5 }}>
      <Container maxWidth="sm">
        <Box component="form" onSubmit={handleSubmit} sx={{ ...CARD, p: { xs: 3, sm: 4 } }}>
          <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: D.brandBg, border: `1px solid ${D.brandBd}`, color: D.brandText, display: "grid", placeItems: "center", mb: 2 }}>
            <LockResetIcon />
          </Box>

          <Typography component="h1" sx={{ fontSize: 24, fontWeight: 950, color: D.t1, mb: 0.5 }}>
            Choose a new password
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: D.t2, mb: 3 }}>
            Enter a new password for {user.email}.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2, bgcolor: D.redBg, color: D.redText, border: `1px solid ${D.redBd}`, "& .MuiAlert-icon": { color: D.redText } }}>
              {error}
            </Alert>
          )}

          <Stack spacing={2}>
            <TextField
              label="New password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              required
              sx={fieldSx}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((shown) => !shown)} edge="end" sx={{ color: D.t3 }}>
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="Confirm new password"
              type={showPassword ? "text" : "password"}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="new-password"
              required
              sx={fieldSx}
            />
            <Button type="submit" variant="contained" size="large" disabled={submitting}
              sx={{ bgcolor: D.brand, py: 1.35, fontWeight: 900, textTransform: "none", boxShadow: "none", "&:hover": { bgcolor: D.brandMid, boxShadow: "none" } }}>
              {submitting ? "Updating password..." : "Update password"}
            </Button>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
