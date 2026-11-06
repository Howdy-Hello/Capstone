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
import SchoolIcon from "@mui/icons-material/School";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import ThemeSettingsPanel from "../components/ThemeSettingsPanel";
import { D, MONO, readableOn } from "../theme/design";
import { getTutorialProgress } from "../lib/tutorial";
import { usePageTitle } from "../lib/usePageTitle";

// Framer Motion 11 predates React 19's stricter JSX return type.
const MotionPresence = AnimatePresence as React.FC<React.PropsWithChildren<{
  initial?: boolean;
  mode?: "sync" | "popLayout" | "wait";
}>>;

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const AVATAR_BUCKET = "avatars";
const API_BASE_URL = process.env.REACT_APP_API_URL ?? "http://localhost:5000";

function getAvatarPath(userId: string) { return `${userId}/avatar`; }

// A function, not a module-scope object. `applyDesignColors` mutates the shared
// `D` singleton when the theme changes, so an object built at import time froze
// these inputs at the dark palette: on any light theme the fields rendered as
// near-black boxes with labels that all but disappeared against them.
const fieldSx = () => ({
  "& .MuiOutlinedInput-root": {
    bgcolor: D.elevated,
    borderRadius: 2,
    transition: "border-color .15s ease, background-color .15s ease",
    "& fieldset": { borderColor: D.border },
    "&:hover fieldset": { borderColor: D.borderHi },
    "&.Mui-focused fieldset": { borderColor: D.brand, borderWidth: 2 },
    "& input, & textarea": { color: D.t1, fontSize: 14 },
    "&.Mui-disabled": {
      bgcolor: D.overlay,
      "& input, & textarea": { color: D.t3, WebkitTextFillColor: D.t3 },
      "& fieldset": { borderColor: D.border },
    },
  },
  "& .MuiInputLabel-root": { color: D.t3, fontSize: 14, "&.Mui-focused": { color: D.brandText } },
  "& .MuiFormHelperText-root": { color: D.t3, marginLeft: 0, marginTop: 0.75, fontSize: 12 },
});

// Shared shell for the page's cards.
const sectionSx = (accent?: string) => ({
  bgcolor: D.surface,
  border: `1px solid ${accent ?? D.border}`,
  borderRadius: 3,
  overflow: "hidden" as const,
});

export default function ProfilePage() {
  const reduceMotion = useReducedMotion();
  const { user, profile, profileLoading, profileError, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  usePageTitle(pathname === "/settings" ? "Settings" : "Profile");
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
      const owned = await supabase.from("game_sessions").select("id").eq("user_id", user!.id);
      if (owned.error) throw owned.error;
      const ownedIds = [user!.id, ...(owned.data ?? []).map((s) => s.id)];
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

      // Keys carry a "-<userId>" or ":<sessionId>" part; sweep only this
      // player's, since other accounts may share the browser.
      Object.keys(localStorage)
        .filter((key) => key.startsWith("stockpilot-") && ownedIds.some((id) => key.includes(id)))
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
  if (profileError) return <Box sx={{ p: 4 }}><Typography>{profileError}</Typography><Button onClick={() => void refreshProfile()}>Retry</Button></Box>;
  if (profileLoading) {
    return (
      <Box sx={{ bgcolor: D.bg, minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <CircularProgress sx={{ color: D.brandText }} />
      </Box>
    );
  }

  // Save is pointless until something actually changed, and an always-enabled
  // button gives no signal about unsaved work.
  const isDirty =
    displayName !== (profile?.display_name ?? "")
    || username !== (profile?.username ?? "")
    || bio !== (profile?.bio ?? "");

  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : null;

  const initials = (displayName || user.email || "?").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const isSettings = pathname === "/settings";

  return (
    <Box sx={{ bgcolor: D.bg, minHeight: "100vh" }}>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarUpload} />

      {/* Page heading */}
      <Box sx={{ bgcolor: D.surface, borderBottom: `1px solid ${D.border}` }}>
        <Container maxWidth="lg" sx={{ py: { xs: 2.5, md: 3 } }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
            <Box>
              <Typography component="h1" sx={{ fontWeight: 900, fontSize: { xs: 26, md: 32 }, color: D.t1, lineHeight: 1.1 , letterSpacing: "-0.02em" }}>
                {isSettings ? "Account Settings" : "Your Profile"}
              </Typography>
            </Box>
            <Button onClick={async () => { await signOut(); navigate("/"); }} startIcon={<LogoutIcon />}
              sx={{ color: D.t3, fontWeight: 700, textTransform: "none", borderRadius: 2, border: `1px solid ${D.border}`, px: 2, flexShrink: 0, fontSize: 14, "&:hover": { color: D.t1, borderColor: D.borderHi, bgcolor: D.overlay } }}>
              Log out
            </Button>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
        <MotionPresence initial={false}>
          {saveErr && (
            <motion.div key="saveErr" initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
              <Alert severity="error" onClose={() => setSaveErr(null)} sx={{ mb: 2.5, bgcolor: D.redBg, color: D.redText, border: `1px solid ${D.redBd}`, "& .MuiAlert-icon": { color: D.redText }, fontSize: 14 }}>{saveErr}</Alert>
            </motion.div>
          )}
          {saveMsg && (
            <motion.div key="saveMsg" initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
              <Alert severity="success" sx={{ mb: 2.5, bgcolor: D.greenBg, color: D.greenText, border: `1px solid ${D.greenBd}`, "& .MuiAlert-icon": { color: D.greenText }, fontSize: 14 }}>{saveMsg}</Alert>
            </motion.div>
          )}
          {avatarErr && (
            <motion.div key="avatarErr" initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
              <Alert severity="error" onClose={() => setAvatarErr(null)} sx={{ mb: 2.5, bgcolor: D.redBg, color: D.redText, border: `1px solid ${D.redBd}`, "& .MuiAlert-icon": { color: D.redText }, fontSize: 14 }}>{avatarErr}</Alert>
            </motion.div>
          )}
        </MotionPresence>

        <Grid container spacing={3} alignItems="flex-start">
          {/* Identity rail */}
          <Grid item xs={12} md={4}>
            <Box component={motion.div}
              sx={{ ...sectionSx(), position: { md: "sticky" }, top: { md: 88 } }}>
              <Box sx={{ p: 3, textAlign: "center" }}>
                <Box sx={{ position: "relative", width: 104, mx: "auto", mb: 2 }}>
                  <Avatar src={avatarUrl ?? undefined}
                    sx={{ width: 104, height: 104, bgcolor: D.elevated, border: `3px solid ${D.brandBd}`, fontSize: 34, fontWeight: 900, color: D.brandText }}>
                    {!avatarUrl && (initials || <AccountCircleIcon sx={{ fontSize: 52, color: D.t3 }} />)}
                  </Avatar>
                  <Tooltip title={avatarUrl ? "Change photo" : "Upload photo"}>
                    <IconButton aria-label="Change profile photo" onClick={() => fileRef.current?.click()} disabled={uploadingAvatar}
                      sx={{ position: "absolute", bottom: 0, right: 0, width: 32, height: 32, bgcolor: D.brand, color: readableOn(D.brand), border: `2px solid ${D.surface}`, "&:hover": { bgcolor: D.brandMid } }}>
                      {uploadingAvatar ? <CircularProgress size={13} sx={{ color: "#fff" }} /> : <CameraAltIcon sx={{ fontSize: 16 }} />}
                    </IconButton>
                  </Tooltip>
                </Box>

                <Typography sx={{ fontWeight: 900, fontSize: 18, color: D.t1, lineHeight: 1.2 }} noWrap>
                  {displayName || user.email?.split("@")[0] || "Trader"}
                </Typography>
                {username && (
                  <Typography sx={{ fontSize: 14, color: D.brandText, fontFamily: MONO, mt: 0.25 }} noWrap>@{username}</Typography>
                )}
                <Typography sx={{ fontSize: 14, color: D.t3, mt: 0.75, wordBreak: "break-all" }}>{user.email}</Typography>

                {memberSince && (
                  <Typography sx={{ fontSize: 12, color: D.t4, mt: 1.5, }}>
                    MEMBER SINCE {memberSince.toUpperCase()}
                  </Typography>
                )}
              </Box>

              <Divider sx={{ borderColor: D.border }} />

              <Box sx={{ p: 2.5 }}>
                <Typography sx={{ fontSize: 12, color: D.t3, mb: 1.5, fontFamily: MONO, letterSpacing: 0.5 }}>
                  PHOTO · JPEG, PNG, WEBP · MAX 2 MB
                </Typography>
                <Stack spacing={1}>
                  <Button fullWidth variant="outlined" startIcon={uploadingAvatar ? <CircularProgress size={13} /> : <CameraAltIcon />}
                    onClick={() => fileRef.current?.click()} disabled={uploadingAvatar}
                    sx={{ color: D.t2, borderColor: D.border, fontWeight: 700, textTransform: "none", borderRadius: 2, fontSize: 14, "&:hover": { color: D.t1, borderColor: D.borderHi, bgcolor: D.overlay } }}>
                    {uploadingAvatar ? "Uploading…" : avatarUrl ? "Change photo" : "Upload photo"}
                  </Button>
                  {avatarUrl && (
                    <Button fullWidth startIcon={deletingAvatar ? <CircularProgress size={13} /> : <DeleteOutlineIcon />}
                      onClick={handleAvatarDelete} disabled={deletingAvatar}
                      sx={{ color: D.redText, border: `1px solid ${D.redBd}`, fontWeight: 700, textTransform: "none", borderRadius: 2, fontSize: 14, "&:hover": { bgcolor: D.redBg } }}>
                      {deletingAvatar ? "Removing…" : "Remove photo"}
                    </Button>
                  )}
                </Stack>
              </Box>
            </Box>
          </Grid>

          {/* Content column */}
          <Grid item xs={12} md={8}>
            <Stack spacing={3}>
              {/* Profile details */}
              <Box component={motion.div}
                sx={sectionSx()}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 3, py: 2.25, borderBottom: `1px solid ${D.border}` }}>
                  <EditIcon sx={{ color: D.brandText, fontSize: 18 }} />
                  <Typography component="h2" sx={{ fontWeight: 900, fontSize: 16, color: D.t1, flex: 1 }}>Profile details</Typography>
                  <MotionPresence initial={false}>
                    {isDirty && (
                      <motion.div key="dirty" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                        <Chip label="UNSAVED" size="small"
                          sx={{ bgcolor: D.amberBg, color: D.amber, fontWeight: 900, fontSize: 12, fontFamily: MONO, letterSpacing: 0.5, height: 20 }} />
                      </motion.div>
                    )}
                  </MotionPresence>
                </Stack>

                <Box sx={{ p: 3 }}>
                  <Typography sx={{ fontSize: 14, color: D.t3, mb: 3 }}>
                    Your name and bio are visible on the leaderboard and achievements pages.
                  </Typography>

                  <Grid container spacing={2.5}>
                    <Grid item xs={12} sm={6}>
                      <TextField label="Display name" fullWidth value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                        inputProps={{ maxLength: 50 }} helperText={`${displayName.length}/50`} required sx={fieldSx()} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField label="Username" fullWidth value={username} onChange={(e) => setUsername(e.target.value)}
                        inputProps={{ maxLength: 24 }} helperText="Letters, numbers, underscores. Optional." sx={fieldSx()}
                        InputProps={{ startAdornment: <Typography sx={{ mr: 0.5, color: D.t3, fontSize: 14 }}>@</Typography> }} />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField label="Email" fullWidth value={user.email ?? ""} disabled
                        helperText="Email is managed through your account credentials." sx={fieldSx()} />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField label="Bio" fullWidth multiline minRows={3} value={bio} onChange={(e) => setBio(e.target.value)}
                        inputProps={{ maxLength: 280 }} helperText={`${bio.length}/280 · Share your trading style.`} sx={fieldSx()} />
                    </Grid>
                  </Grid>

                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 3 }}>
                    <motion.div whileTap={reduceMotion || saving || !isDirty ? undefined : { scale: 0.98 }} style={{ display: "inline-block" }}>
                      <Button onClick={handleSave} disabled={saving || !isDirty} variant="contained"
                        startIcon={saving ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : <SaveIcon />}
                        sx={{ bgcolor: D.brand, fontWeight: 800, textTransform: "none", borderRadius: 2, boxShadow: "none", px: 2.5, "&:hover": { bgcolor: D.brandMid, boxShadow: "none" }, "&.Mui-disabled": { bgcolor: D.overlay, color: D.t4 } }}>
                        {saving ? "Saving…" : "Save changes"}
                      </Button>
                    </motion.div>
                    {isDirty && !saving && (
                      <Typography sx={{ fontSize: 14, color: D.t3 }}>You have unsaved changes.</Typography>
                    )}
                  </Stack>
                </Box>
              </Box>

              {isSettings && (() => {
                const progress = getTutorialProgress(user.id);
                return (
                  <Box data-tour="tutorial-settings" component={motion.div} sx={sectionSx()}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 3, py: 2.25, borderBottom: `1px solid ${D.border}` }}>
                      <SchoolIcon sx={{ color: D.brandText, fontSize: 18 }} />
                      <Typography component="h2" sx={{ fontWeight: 900, fontSize: 16, color: D.t1 }}>Interactive tutorials</Typography>
                    </Stack>
                    <Box sx={{ p: 3 }}>
                      <Typography sx={{ color: D.t3, fontSize: 14, mb: 2 }}>Replay the interface, gameplay, or advanced-tools tour at any time.</Typography>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} flexWrap="wrap" useFlexGap>
                        <Button onClick={() => navigate("/tutorial")} variant="contained" sx={{ bgcolor: D.brand, textTransform: "none", fontWeight: 900, boxShadow: "none" }}>Website tour {progress.uiComplete ? "✓" : ""}</Button>
                        <Button onClick={() => navigate("/tutorial?course=game")} sx={{ color: D.t1, border: `1px solid ${D.border}`, textTransform: "none", fontWeight: 800 }}>Gameplay tutorial {progress.gameComplete ? "✓" : ""}</Button>
                        <Button onClick={() => navigate("/tutorial?course=advanced")} sx={{ color: D.t1, border: `1px solid ${D.border}`, textTransform: "none", fontWeight: 800 }}>Advanced tools {progress.advancedComplete ? "✓" : ""}</Button>
                      </Stack>
                    </Box>
                  </Box>
                );
              })()}

              {/* Appearance */}
              <Box component={motion.div}>
                <ThemeSettingsPanel />
              </Box>

              {/* Danger zone */}
              <Box component={motion.div}
                sx={sectionSx(D.redBd)}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 3, py: 2.25, borderBottom: `1px solid ${D.redBd}`, bgcolor: D.redBg }}>
                  <WarningAmberIcon sx={{ color: D.redText, fontSize: 18 }} />
                  <Typography component="h2" sx={{ fontWeight: 900, fontSize: 16, color: D.redText }}>Danger zone</Typography>
                </Stack>
                <Box sx={{ p: 3 }}>
                  <Typography sx={{ fontSize: 14, color: D.t3, mb: 2.5 }}>
                    Deleting your account permanently removes your login, profile,
                    avatar, game sessions, holdings, and trade history.
                  </Typography>
                  {!confirmDelete ? (
                    <Button startIcon={<DeleteOutlineIcon />} onClick={() => setConfirmDelete(true)}
                      sx={{ color: D.redText, border: `1px solid ${D.redBd}`, fontWeight: 800, textTransform: "none", borderRadius: 2, "&:hover": { bgcolor: D.redBg } }}>
                      Delete account
                    </Button>
                  ) : (
                    <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: D.redBg, border: `1px solid ${D.redBd}` }}>
                      <Typography sx={{ fontWeight: 900, fontSize: 14, color: D.redText, mb: 0.5 }}>Are you absolutely sure?</Typography>
                      <Typography sx={{ fontSize: 14, color: D.t2, mb: 2 }}>
                        This cannot be undone. All account and simulator data will
                        be deleted immediately.
                      </Typography>
                      <Stack direction="row" spacing={1.2} flexWrap="wrap" useFlexGap>
                        <Button variant="contained" onClick={handleDeleteAccount} disabled={deletingAccount}
                          startIcon={deletingAccount ? <CircularProgress size={13} sx={{ color: "#fff" }} /> : <DeleteOutlineIcon />}
                          sx={{ bgcolor: D.red, fontWeight: 800, textTransform: "none", borderRadius: 2, boxShadow: "none", "&:hover": { bgcolor: D.red, filter: "brightness(0.9)", boxShadow: "none" } }}>
                          {deletingAccount ? "Deleting…" : "Yes, delete my account"}
                        </Button>
                        <Button onClick={() => setConfirmDelete(false)}
                          sx={{ color: D.t2, border: `1px solid ${D.border}`, fontWeight: 700, textTransform: "none", borderRadius: 2, "&:hover": { color: D.t1, borderColor: D.borderHi } }}>
                          Cancel
                        </Button>
                      </Stack>
                    </Box>
                  )}
                </Box>
              </Box>
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
