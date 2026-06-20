import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import LogoutIcon from "@mui/icons-material/Logout";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

const BRAND = { navy: "#0F1923", navyMid: "#1A2A3A", red: "#E84040", green: "#5CC87A", muted: "#7A8FA6", paper: "#F4F6F9", border: "#DDE3EB" };

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const AVATAR_BUCKET = "avatars";

interface Profile {
  id: string;
  display_name: string;
  username: string;
  bio: string;
  avatar_url: string | null;
  updated_at: string;
}

function getAvatarPath(userId: string) {
  return `${userId}/avatar`;
}

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [deletingAvatar, setDeletingAvatar] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [avatarErr, setAvatarErr] = useState<string | null>(null);

  /* ── Load profile ── */
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        setSaveErr("Could not load profile.");
      } else if (data) {
        setProfile(data);
        setDisplayName(data.display_name ?? "");
        setUsername(data.username ?? "");
        setBio(data.bio ?? "");
        if (data.avatar_url) setAvatarUrl(data.avatar_url);
      }
      setLoading(false);
    })();
  }, [user]);

  /* ── Validate fields ── */
  function validateProfile() {
    if (displayName.trim().length < 2) return "Display name must be at least 2 characters.";
    if (username.trim().length > 0 && !/^[a-zA-Z0-9_]{3,24}$/.test(username.trim()))
      return "Username must be 3–24 characters: letters, numbers, underscores only.";
    if (bio.length > 280) return "Bio must be under 280 characters.";
    return null;
  }

  /* ── Save profile ── */
  async function handleSave() {
    if (!user) return;
    const err = validateProfile();
    if (err) { setSaveErr(err); return; }

    setSaving(true);
    setSaveMsg(null);
    setSaveErr(null);

    const payload = {
      id: user.id,
      display_name: displayName.trim(),
      username: username.trim() || null,
      bio: bio.trim(),
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("profiles").upsert(payload);
    setSaving(false);

    if (error) {
      if (error.message.includes("profiles_username_key"))
        setSaveErr("That username is already taken. Try another.");
      else
        setSaveErr(error.message);
    } else {
      setSaveMsg("Profile saved successfully.");
      setTimeout(() => setSaveMsg(null), 3500);
    }
  }

  /* ── Upload avatar ── */
  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setAvatarErr(null);

    if (!file.type.startsWith("image/")) {
      setAvatarErr("Please upload an image file (JPEG, PNG, WebP).");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setAvatarErr("Image must be under 2 MB.");
      return;
    }

    setUploadingAvatar(true);
    const path = getAvatarPath(user.id);

    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setAvatarErr("Upload failed: " + uploadError.message);
      setUploadingAvatar(false);
      return;
    }

    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    // bust cache with a timestamp query param
    const url = `${data.publicUrl}?t=${Date.now()}`;
    setAvatarUrl(url);

    // persist immediately
    await supabase.from("profiles").upsert({ id: user.id, avatar_url: url, updated_at: new Date().toISOString() });
    setUploadingAvatar(false);
    // reset input so the same file can be re-selected
    e.target.value = "";
  }

  /* ── Delete avatar ── */
  async function handleAvatarDelete() {
    if (!user || !avatarUrl) return;
    setDeletingAvatar(true);
    setAvatarErr(null);

    const path = getAvatarPath(user.id);
    await supabase.storage.from(AVATAR_BUCKET).remove([path]);
    await supabase.from("profiles").upsert({ id: user.id, avatar_url: null, updated_at: new Date().toISOString() });

    setAvatarUrl(null);
    setDeletingAvatar(false);
  }

  /* ── Delete account ── */
  async function handleDeleteAccount() {
    if (!user) return;
    setDeletingAccount(true);

    // Delete avatar from storage if present
    if (avatarUrl) {
      await supabase.storage.from(AVATAR_BUCKET).remove([getAvatarPath(user.id)]);
    }
    // Delete profile row
    await supabase.from("profiles").delete().eq("id", user.id);
    // Sign out (actual user deletion requires service-role key — sign out is safest from client)
    await signOut();
    navigate("/", { replace: true });
  }

  /* ── Render ── */
  if (!user) return null;

  if (loading) {
    return (
      <Box sx={{ bgcolor: BRAND.paper, minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <CircularProgress sx={{ color: BRAND.green }} />
      </Box>
    );
  }

  const initials = (displayName || user.email || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Box sx={{ bgcolor: BRAND.paper, minHeight: "100vh" }}>
      {/* Hero */}
      <Box sx={{ bgcolor: BRAND.navy, color: "#fff", px: { xs: 3, md: 8 }, py: { xs: 4, md: 6 }, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={3} alignItems={{ sm: "center" }}>
          {/* Avatar area */}
          <Box sx={{ position: "relative", flexShrink: 0 }}>
            <Avatar
              src={avatarUrl ?? undefined}
              sx={{ width: 90, height: 90, bgcolor: BRAND.navyMid, border: "3px solid rgba(255,255,255,0.14)", fontSize: 28, fontWeight: 950, color: BRAND.green }}
            >
              {!avatarUrl && initials}
            </Avatar>

            {/* Camera overlay */}
            <Tooltip title="Change photo">
              <IconButton
                onClick={() => fileRef.current?.click()}
                disabled={uploadingAvatar}
                sx={{ position: "absolute", bottom: -4, right: -4, width: 30, height: 30, bgcolor: BRAND.green, color: BRAND.navy, "&:hover": { bgcolor: "#4AB86A" }, boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}
              >
                {uploadingAvatar ? <CircularProgress size={14} sx={{ color: BRAND.navy }} /> : <CameraAltIcon sx={{ fontSize: 15 }} />}
              </IconButton>
            </Tooltip>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarUpload} />
          </Box>

          <Box sx={{ flex: 1 }}>
            <Chip label="PROFILE" sx={{ bgcolor: "rgba(92,200,122,0.12)", color: BRAND.green, fontWeight: 900, fontSize: 10.5, fontFamily: "monospace", border: "1px solid rgba(92,200,122,0.22)", mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: 950, lineHeight: 1.1, fontSize: { xs: "1.7rem", md: "2.2rem" } }}>
              {displayName || user.email?.split("@")[0] || "Your Profile"}
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 14, mt: 0.4 }}>{user.email}</Typography>
          </Box>

          <Button
            onClick={() => { signOut(); navigate("/"); }}
            startIcon={<LogoutIcon />}
            sx={{ color: "rgba(255,255,255,0.55)", fontWeight: 800, textTransform: "none", borderRadius: 2, border: "1px solid rgba(255,255,255,0.12)", px: 2, flexShrink: 0, "&:hover": { color: "#fff", borderColor: "rgba(255,255,255,0.3)" } }}
          >
            Log out
          </Button>
        </Stack>
      </Box>

      <Container sx={{ py: { xs: 3, md: 5 }, maxWidth: "md" }}>
        <Grid container spacing={3}>
          {/* ── Profile Form ── */}
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 3, border: `1px solid ${BRAND.border}`, boxShadow: "0 4px 20px rgba(15,25,35,0.06)" }}>
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 0.5 }}>
                  <EditIcon sx={{ color: BRAND.green, fontSize: 20 }} />
                  <Typography variant="h6" sx={{ fontWeight: 950, color: BRAND.navy }}>Profile Details</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Your name and bio are visible on the leaderboard and achievements pages.
                </Typography>

                {saveErr && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSaveErr(null)}>{saveErr}</Alert>}
                {saveMsg && <Alert severity="success" sx={{ mb: 2 }}>{saveMsg}</Alert>}
                {avatarErr && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setAvatarErr(null)}>{avatarErr}</Alert>}

                <Grid container spacing={2.5}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Display Name"
                      fullWidth
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      inputProps={{ maxLength: 50 }}
                      helperText={`${displayName.length}/50`}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Username"
                      fullWidth
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      inputProps={{ maxLength: 24 }}
                      helperText="Letters, numbers, underscores. Optional."
                      InputProps={{ startAdornment: <Typography sx={{ mr: 0.5, color: BRAND.muted }}>@</Typography> }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Email"
                      fullWidth
                      value={user.email ?? ""}
                      disabled
                      helperText="Email is managed through your account credentials."
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Bio"
                      fullWidth
                      multiline
                      minRows={3}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      inputProps={{ maxLength: 280 }}
                      helperText={`${bio.length}/280 · Share your trading style or strategy.`}
                    />
                  </Grid>
                </Grid>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 3 }}>
                  <Button
                    variant="contained"
                    startIcon={saving ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : <SaveIcon />}
                    onClick={handleSave}
                    disabled={saving}
                    sx={{ bgcolor: BRAND.navy, fontWeight: 900, textTransform: "none", borderRadius: 2, px: 3, "&:hover": { bgcolor: BRAND.navyMid } }}
                  >
                    {saving ? "Saving..." : "Save Profile"}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* ── Avatar Management ── */}
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 3, border: `1px solid ${BRAND.border}`, boxShadow: "0 4px 20px rgba(15,25,35,0.06)" }}>
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 0.5 }}>
                  <CameraAltIcon sx={{ color: BRAND.green, fontSize: 20 }} />
                  <Typography variant="h6" sx={{ fontWeight: 950, color: BRAND.navy }}>Profile Picture</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>JPEG, PNG, or WebP · Max 2 MB</Typography>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
                  <Avatar
                    src={avatarUrl ?? undefined}
                    sx={{ width: 72, height: 72, bgcolor: BRAND.navyMid, fontSize: 22, fontWeight: 950, color: BRAND.green, border: `2px solid ${BRAND.border}` }}
                  >
                    {!avatarUrl && <AccountCircleIcon sx={{ fontSize: 40, color: BRAND.muted }} />}
                  </Avatar>

                  <Stack direction="row" spacing={1.2} flexWrap="wrap" useFlexGap>
                    <Button
                      variant="outlined"
                      startIcon={uploadingAvatar ? <CircularProgress size={14} /> : <CameraAltIcon />}
                      onClick={() => fileRef.current?.click()}
                      disabled={uploadingAvatar}
                      sx={{ borderColor: BRAND.border, color: BRAND.navy, fontWeight: 800, textTransform: "none", borderRadius: 2, "&:hover": { borderColor: BRAND.navy } }}
                    >
                      {uploadingAvatar ? "Uploading..." : avatarUrl ? "Change Photo" : "Upload Photo"}
                    </Button>

                    {avatarUrl && (
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={deletingAvatar ? <CircularProgress size={14} color="error" /> : <DeleteOutlineIcon />}
                        onClick={handleAvatarDelete}
                        disabled={deletingAvatar}
                        sx={{ fontWeight: 800, textTransform: "none", borderRadius: 2 }}
                      >
                        {deletingAvatar ? "Removing..." : "Remove Photo"}
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* ── Danger Zone ── */}
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 3, border: "1px solid rgba(232,64,64,0.28)", boxShadow: "0 4px 20px rgba(232,64,64,0.05)" }}>
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 0.5 }}>
                  <WarningAmberIcon sx={{ color: BRAND.red, fontSize: 20 }} />
                  <Typography variant="h6" sx={{ fontWeight: 950, color: BRAND.red }}>Danger Zone</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Deleting your account removes your profile and avatar permanently. Your game progress stored locally will remain on this device.
                </Typography>

                <Divider sx={{ mb: 2.5, borderColor: "rgba(232,64,64,0.15)" }} />

                {!confirmDelete ? (
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteOutlineIcon />}
                    onClick={() => setConfirmDelete(true)}
                    sx={{ fontWeight: 900, textTransform: "none", borderRadius: 2 }}
                  >
                    Delete Account
                  </Button>
                ) : (
                  <Box sx={{ p: 2.5, borderRadius: 2.5, bgcolor: "#FFF2F2", border: "1px solid rgba(232,64,64,0.22)" }}>
                    <Typography sx={{ fontWeight: 900, color: BRAND.red, mb: 0.5 }}>Are you absolutely sure?</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      This cannot be undone. Your profile and avatar will be deleted immediately.
                    </Typography>
                    <Stack direction="row" spacing={1.2}>
                      <Button
                        variant="contained"
                        color="error"
                        onClick={handleDeleteAccount}
                        disabled={deletingAccount}
                        startIcon={deletingAccount ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : <DeleteOutlineIcon />}
                        sx={{ fontWeight: 900, textTransform: "none", borderRadius: 2 }}
                      >
                        {deletingAccount ? "Deleting..." : "Yes, delete my account"}
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => setConfirmDelete(false)}
                        sx={{ fontWeight: 800, textTransform: "none", borderRadius: 2, borderColor: BRAND.border, color: BRAND.navy }}
                      >
                        Cancel
                      </Button>
                    </Stack>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
