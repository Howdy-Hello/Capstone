import React, { useEffect, useRef, useState } from "react";
import {
  Alert, Avatar, Box, Button, Chip, CircularProgress, Container, Divider,
  Grid, IconButton, Stack, TextField, Tooltip, Typography,
} from "@mui/material";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import LogoutIcon from "@mui/icons-material/Logout";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import ThemeSettingsPanel from "../components/ThemeSettingsPanel";
import { D, CARD, MONO } from "../theme/design";

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const AVATAR_BUCKET = "avatars";
const API_BASE_URL = process.env.REACT_APP_API_URL ?? "http://localhost:5000";

function getAvatarPath(userId: string) { return `${userId}/avatar`; }

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    bgcolor: D.elevated,
    borderRadius: 1.5,
    "& fieldset": { borderColor: D.border },
    "&:hover fieldset": { borderColor: D.borderHi },
    "&.Mui-focused fieldset": { borderColor: D.brand },
    "& input, & textarea": { color: D.t1, fontSize: 14 },
    "&.Mui-disabled": { "& input, & textarea": { color: D.t3, WebkitTextFillColor: D.t3 } },
  },
  "& .MuiInputLabel-root": { color: D.t3, fontSize: 13.5, "&.Mui-focused": { color: D.brandText } },
  "& .MuiFormHelperText-root": { color: D.t3 },
};

export default function ProfilePage() {
  const { user, profile, profileLoading, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const fileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [deletingAvatar, setDeletingAvatar] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [avatarErr, setAvatarErr] = useState<string | null>(null);

  // Seed the form from the profile only once per user (after the initial fetch).
  // A later refreshProfile() — e.g. after an avatar upload — must not overwrite
  // edits the user has typed but not yet saved.
  const seededUserRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user) { seededUserRef.current = null; return; }
    if (profileLoading) return;
    if (seededUserRef.current === user.id) return;
    seededUserRef.current = user.id;
    setDisplayName(profile?.display_name ?? "");
    setUsername(profile?.username ?? "");
    setBio(profile?.bio ?? "");
    setAvatarUrl(profile?.avatar_url ?? null);
  }, [profile, user, profileLoading]);

  function validateProfile() {
    if (displayName.trim().length < 2) return "Display name must be at least 2 characters.";
    if (username.trim().length > 0 && !/^[a-zA-Z0-9_]{3,24}$/.test(username.trim()))
      return "Username must be 3–24 characters: letters, numbers, underscores only.";
    if (bio.length > 280) return "Bio must be under 280 characters.";
    return null;
  }

  async function handleSave() {
    if (!user) return;
    const err = validateProfile();
    if (err) { setSaveErr(err); return; }
    setSaving(true); setSaveMsg(null); setSaveErr(null);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id, display_name: displayName.trim(), username: username.trim() || null,
      bio: bio.trim(), avatar_url: avatarUrl, updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) {
      setSaveErr(error.message.includes("profiles_username_key") ? "That username is already taken." : error.message);
    } else {
      await refreshProfile();
      setSaveMsg("Profile saved successfully.");
      setTimeout(() => setSaveMsg(null), 3500);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAvatarErr(null);
    if (!file.type.startsWith("image/")) { setAvatarErr("Please upload an image file (JPEG, PNG, WebP)."); return; }
    if (file.size > MAX_FILE_SIZE) { setAvatarErr("Image must be under 2 MB."); return; }
    setUploadingAvatar(true);
    const path = getAvatarPath(user.id);
    const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) { setAvatarErr("Upload failed: " + uploadError.message); setUploadingAvatar(false); return; }
    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    const url = `${data.publicUrl}?t=${Date.now()}`;
    setAvatarUrl(url);
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: user.id,
      avatar_url: url,
      updated_at: new Date().toISOString(),
    });
    if (profileError) {
      setAvatarErr("Could not save profile photo: " + profileError.message);
      setUploadingAvatar(false);
      return;
    }
    await refreshProfile();
    setUploadingAvatar(false);
    e.target.value = "";
  }

  async function handleAvatarDelete() {
    if (!user || !avatarUrl) return;
    setDeletingAvatar(true); setAvatarErr(null);
    await supabase.storage.from(AVATAR_BUCKET).remove([getAvatarPath(user.id)]);
    await supabase.from("profiles").upsert({ id: user.id, avatar_url: null, updated_at: new Date().toISOString() });
    setAvatarUrl(null); setDeletingAvatar(false);
    await refreshProfile();
  }

  async function handleDeleteAccount() {
    if (!user) return;
    setDeletingAccount(true); setSaveErr(null);

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (sessionError || !accessToken) {
      setSaveErr("Your session expired. Log in again before deleting your account.");
      setDeletingAccount(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/account`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message ?? "Account deletion failed.");
      }

      // Session-scoped keys carry dynamic ":<sessionId>" / "-<userId>" suffixes,
      // so sweep every StockPilot game/session key by prefix.
      Object.keys(localStorage)
        .filter((key) => key.startsWith("stockpilot-"))
        .forEach((key) => localStorage.removeItem(key));
      await signOut();
      navigate("/", { replace: true });
    } catch (deleteError: any) {
      const message =
        deleteError instanceof TypeError
          ? "Could not reach the account service. Make sure the backend server is running."
          : deleteError?.message ?? "Account deletion failed.";
      setSaveErr(message);
      setDeletingAccount(false);
      setConfirmDelete(false);
    }
  }

  if (!user) return null;
  if (profileLoading) {
    return (
      <Box sx={{ bgcolor: D.bg, minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <CircularProgress sx={{ color: D.brandText }} />
      </Box>
    );
  }

  const initials = (displayName || user.email || "?").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const isSettings = pathname === "/settings";

  return (
    <Box sx={{ bgcolor: D.bg, minHeight: "100vh" }}>
      {/* Hero */}
      <Box sx={{ bgcolor: D.surface, borderBottom: `1px solid ${D.border}` }}>
        <Container maxWidth="md" sx={{ py: { xs: 3, md: 4 } }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={3} alignItems={{ sm: "center" }}>
            {/* Avatar */}
            <Box sx={{ position: "relative", flexShrink: 0 }}>
              <Avatar src={avatarUrl ?? undefined}
                sx={{ width: 80, height: 80, bgcolor: D.elevated, border: `2px solid ${D.border}`, fontSize: 26, fontWeight: 950, color: D.brandText }}>
                {!avatarUrl && initials}
              </Avatar>
              <Tooltip title="Change photo">
                <IconButton onClick={() => fileRef.current?.click()} disabled={uploadingAvatar}
                  sx={{ position: "absolute", bottom: -4, right: -4, width: 28, height: 28, bgcolor: D.brand, color: "#fff", "&:hover": { bgcolor: D.brandMid }, boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}>
                  {uploadingAvatar ? <CircularProgress size={12} sx={{ color: "#fff" }} /> : <CameraAltIcon sx={{ fontSize: 14 }} />}
                </IconButton>
              </Tooltip>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarUpload} />
            </Box>

            <Box sx={{ flex: 1 }}>
              <Chip label={isSettings ? "SETTINGS" : "PROFILE"} size="small" sx={{ bgcolor: D.brandBg, color: D.brandText, border: `1px solid ${D.brandBd}`, fontWeight: 900, fontSize: 10, fontFamily: MONO, letterSpacing: 1, mb: 1 }} />
              <Typography sx={{ fontWeight: 950, fontSize: { xs: 22, md: 26 }, color: D.t1, lineHeight: 1.1 }}>
                {isSettings ? "Account Settings" : displayName || user.email?.split("@")[0] || "Your Profile"}
              </Typography>
              <Typography sx={{ fontSize: 13, color: D.t3, mt: 0.5 }}>{user.email}</Typography>
            </Box>

            <Button onClick={async () => { await signOut(); navigate("/"); }} startIcon={<LogoutIcon />}
              sx={{ color: D.t3, fontWeight: 700, textTransform: "none", borderRadius: 2, border: `1px solid ${D.border}`, px: 2, flexShrink: 0, fontSize: 13, "&:hover": { color: D.t1, borderColor: D.borderHi } }}>
              Log out
            </Button>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: { xs: 3, md: 4 } }}>
        <Stack spacing={3}>
          {/* Profile form */}
          <Box sx={{ ...CARD, p: 0, overflow: "hidden" }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${D.border}` }}>
              <EditIcon sx={{ color: D.brandText, fontSize: 18 }} />
              <Typography sx={{ fontWeight: 900, fontSize: 16, color: D.t1 }}>Profile Details</Typography>
            </Stack>
            <Box sx={{ p: 3 }}>
              <Typography sx={{ fontSize: 13, color: D.t3, mb: 3 }}>Your name and bio are visible on the leaderboard and achievements pages.</Typography>

              {saveErr && <Alert severity="error" onClose={() => setSaveErr(null)} sx={{ mb: 2, bgcolor: D.redBg, color: D.redText, border: `1px solid ${D.redBd}`, "& .MuiAlert-icon": { color: D.redText }, fontSize: 13 }}>{saveErr}</Alert>}
              {saveMsg && <Alert severity="success" sx={{ mb: 2, bgcolor: D.greenBg, color: D.greenText, border: `1px solid ${D.greenBd}`, "& .MuiAlert-icon": { color: D.greenText }, fontSize: 13 }}>{saveMsg}</Alert>}
              {avatarErr && <Alert severity="error" onClose={() => setAvatarErr(null)} sx={{ mb: 2, bgcolor: D.redBg, color: D.redText, border: `1px solid ${D.redBd}`, "& .MuiAlert-icon": { color: D.redText }, fontSize: 13 }}>{avatarErr}</Alert>}

              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={6}>
                  <TextField label="Display Name" fullWidth value={displayName} onChange={(e) => setDisplayName(e.target.value)} inputProps={{ maxLength: 50 }} helperText={`${displayName.length}/50`} required sx={fieldSx} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Username" fullWidth value={username} onChange={(e) => setUsername(e.target.value)} inputProps={{ maxLength: 24 }} helperText="Letters, numbers, underscores. Optional." sx={fieldSx}
                    InputProps={{ startAdornment: <Typography sx={{ mr: 0.5, color: D.t3, fontSize: 14 }}>@</Typography> }} />
                </Grid>
                <Grid item xs={12}>
                  <TextField label="Email" fullWidth value={user.email ?? ""} disabled helperText="Email is managed through your account credentials." sx={fieldSx} />
                </Grid>
                <Grid item xs={12}>
                  <TextField label="Bio" fullWidth multiline minRows={3} value={bio} onChange={(e) => setBio(e.target.value)} inputProps={{ maxLength: 280 }} helperText={`${bio.length}/280 · Share your trading style.`} sx={fieldSx} />
                </Grid>
              </Grid>

              <Button onClick={handleSave} disabled={saving} variant="contained"
                startIcon={saving ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : <SaveIcon />}
                sx={{ mt: 3, bgcolor: D.brand, fontWeight: 800, textTransform: "none", borderRadius: 1.5, boxShadow: "none", "&:hover": { bgcolor: D.brandMid, boxShadow: "none" } }}>
                {saving ? "Saving…" : "Save Profile"}
              </Button>
            </Box>
          </Box>

          <ThemeSettingsPanel />

          {/* Avatar management */}
          <Box sx={{ ...CARD, p: 0, overflow: "hidden" }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${D.border}` }}>
              <CameraAltIcon sx={{ color: D.brandText, fontSize: 18 }} />
              <Typography sx={{ fontWeight: 900, fontSize: 16, color: D.t1 }}>Profile Picture</Typography>
            </Stack>
            <Box sx={{ p: 3 }}>
              <Typography sx={{ fontSize: 13, color: D.t3, mb: 2.5 }}>JPEG, PNG, or WebP · Max 2 MB</Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
                <Avatar src={avatarUrl ?? undefined} sx={{ width: 68, height: 68, bgcolor: D.elevated, border: `1px solid ${D.border}`, fontSize: 20, fontWeight: 900, color: D.brandText }}>
                  {!avatarUrl && <AccountCircleIcon sx={{ fontSize: 36, color: D.t3 }} />}
                </Avatar>
                <Stack direction="row" spacing={1.2} flexWrap="wrap" useFlexGap>
                  <Button variant="outlined" startIcon={uploadingAvatar ? <CircularProgress size={13} /> : <CameraAltIcon />}
                    onClick={() => fileRef.current?.click()} disabled={uploadingAvatar}
                    sx={{ color: D.t2, borderColor: D.border, fontWeight: 700, textTransform: "none", borderRadius: 1.5, fontSize: 13, "&:hover": { color: D.t1, borderColor: D.borderHi } }}>
                    {uploadingAvatar ? "Uploading…" : avatarUrl ? "Change Photo" : "Upload Photo"}
                  </Button>
                  {avatarUrl && (
                    <Button startIcon={deletingAvatar ? <CircularProgress size={13} /> : <DeleteOutlineIcon />}
                      onClick={handleAvatarDelete} disabled={deletingAvatar}
                      sx={{ color: D.redText, border: `1px solid ${D.redBd}`, fontWeight: 700, textTransform: "none", borderRadius: 1.5, fontSize: 13, "&:hover": { bgcolor: D.redBg } }}>
                      {deletingAvatar ? "Removing…" : "Remove Photo"}
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Box>
          </Box>

          {/* Danger zone */}
          <Box sx={{ bgcolor: D.surface, border: `1px solid ${D.redBd}`, borderRadius: 2, p: 0, overflow: "hidden" }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${D.redBd}` }}>
              <WarningAmberIcon sx={{ color: D.redText, fontSize: 18 }} />
              <Typography sx={{ fontWeight: 900, fontSize: 16, color: D.redText }}>Danger Zone</Typography>
            </Stack>
            <Box sx={{ p: 3 }}>
              <Typography sx={{ fontSize: 13, color: D.t3, mb: 2.5 }}>
                Deleting your account permanently removes your login, profile,
                avatar, game sessions, holdings, and trade history.
              </Typography>
              <Divider sx={{ borderColor: D.redBd, mb: 2.5 }} />
              {!confirmDelete ? (
                <Button startIcon={<DeleteOutlineIcon />} onClick={() => setConfirmDelete(true)}
                  sx={{ color: D.redText, border: `1px solid ${D.redBd}`, fontWeight: 800, textTransform: "none", borderRadius: 1.5, "&:hover": { bgcolor: D.redBg } }}>
                  Delete Account
                </Button>
              ) : (
                <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: D.redBg, border: `1px solid ${D.redBd}` }}>
                  <Typography sx={{ fontWeight: 900, fontSize: 14, color: D.redText, mb: 0.5 }}>Are you absolutely sure?</Typography>
                  <Typography sx={{ fontSize: 13, color: D.t2, mb: 2 }}>
                    This cannot be undone. All account and simulator data will
                    be deleted immediately.
                  </Typography>
                  <Stack direction="row" spacing={1.2}>
                    <Button variant="contained" onClick={handleDeleteAccount} disabled={deletingAccount}
                      startIcon={deletingAccount ? <CircularProgress size={13} sx={{ color: "#fff" }} /> : <DeleteOutlineIcon />}
                      sx={{ bgcolor: D.red, fontWeight: 800, textTransform: "none", borderRadius: 1.5, boxShadow: "none", "&:hover": { bgcolor: "#DC2626", boxShadow: "none" } }}>
                      {deletingAccount ? "Deleting…" : "Yes, delete my account"}
                    </Button>
                    <Button onClick={() => setConfirmDelete(false)}
                      sx={{ color: D.t2, border: `1px solid ${D.border}`, fontWeight: 700, textTransform: "none", borderRadius: 1.5, "&:hover": { color: D.t1, borderColor: D.borderHi } }}>
                      Cancel
                    </Button>
                  </Stack>
                </Box>
              )}
            </Box>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
