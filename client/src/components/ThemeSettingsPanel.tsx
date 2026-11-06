import React from "react";
import { Box, Button, Divider, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import { useThemeSettings } from "../context/ThemeContext";
import { D, MONO } from "../theme/design";

const customFields = [
  ["bg", "Background"],
  ["surface", "Surface"],
  ["elevated", "Panels"],
  ["brand", "Accent"],
] as const;

export default function ThemeSettingsPanel() {
  const {
    presets,
    selectedThemeId,
    customInput,
    applyPreset,
    updateCustomInput,
    applyCustomTheme,
    resetTheme,
  } = useThemeSettings();

  return (
    <Box sx={{ bgcolor: D.surface, border: `1px solid ${D.border}`, borderRadius: 2, p: 0, overflow: "hidden" }}>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${D.border}` }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <PaletteOutlinedIcon sx={{ color: D.brandText, fontSize: 18 }} />
          <Typography component="h2" sx={{ fontWeight: 900, fontSize: 16, color: D.t1 }}>Appearance Settings</Typography>
        </Stack>
        <Tooltip title="Reset theme">
          <IconButton aria-label="Reset theme" onClick={resetTheme} sx={{ color: D.t3, p: 0.7, "&:hover": { color: D.t1, bgcolor: D.overlay } }}>
            <RestartAltIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Stack>

      <Box sx={{ p: 3 }}>
        <Typography sx={{ fontSize: 14, color: D.t3, mb: 2.2 }}>
          The default follows your device automatically. You can also choose a fixed palette or create your own.
        </Typography>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.2 }}>
          {presets.map((preset) => {
            const active = selectedThemeId === preset.id;
            return (
              <Button
                key={preset.id}
                onClick={() => applyPreset(preset.id)}
                sx={{
                  minHeight: 64,
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 1.5,
                  color: active ? D.t1 : D.t2,
                  bgcolor: active ? D.overlay : D.elevated,
                  border: `1px solid ${active ? D.brandBd : D.border}`,
                  borderRadius: 1.5,
                  textTransform: "none",
                  px: 1.4,
                  position: "relative",
                  "&:hover": { bgcolor: D.overlay, borderColor: D.borderHi },
                }}
              >
                <Stack direction="row" spacing={0.6} alignItems="center">
                  {[preset.colors.bg, preset.colors.surface, preset.colors.elevated, preset.colors.brand].map((color, swatch) => (
                    <Box key={`${preset.id}-${swatch}`} sx={{ width: 16, height: 16, borderRadius: 99, bgcolor: color, border: `1px solid ${D.borderHi}` }} />
                  ))}
                </Stack>
                <Typography sx={{ fontSize: 12, fontWeight: 850, lineHeight: 1.2, textAlign: "right" }}>
                  {preset.name}
                </Typography>
                {active && <CheckIcon sx={{ position: "absolute", top: 6, right: 6, fontSize: 14, color: D.brandText }} />}
              </Button>
            );
          })}
        </Box>

        <Divider sx={{ borderColor: D.border, my: 2.5 }} />

        <Typography sx={{ fontSize: 12, fontWeight: 900, color: D.t3, mb: 1.4, fontFamily: MONO, letterSpacing: 1 }}>
          CUSTOM COLORS
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.2 }}>
          {customFields.map(([key, label]) => (
            <Box key={key} sx={{ p: 1.2, border: `1px solid ${D.border}`, borderRadius: 1.5, bgcolor: D.elevated }}>
              <Typography sx={{ fontSize: 12, color: D.t3, fontWeight: 800, mb: 0.8 }}>{label}</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Box
                  component="input"
                  type="color"
                  aria-label={label}
                  value={customInput[key]}
                  onChange={(event) => updateCustomInput({ [key]: event.target.value })}
                  sx={{ width: 38, height: 30, p: 0, border: 0, bgcolor: "transparent", cursor: "pointer" }}
                />
                <Typography sx={{ fontSize: 12, color: D.t2, fontFamily: MONO }}>
                  {customInput[key].toUpperCase()}
                </Typography>
              </Stack>
            </Box>
          ))}
        </Box>

        <Button
          onClick={applyCustomTheme}
          variant="contained"
          sx={{ mt: 2, bgcolor: D.brand, fontWeight: 800, textTransform: "none", borderRadius: 1.5, boxShadow: "none", "&:hover": { bgcolor: D.brandMid, boxShadow: "none" } }}
        >
          Apply custom theme
        </Button>
      </Box>
    </Box>
  );
}
