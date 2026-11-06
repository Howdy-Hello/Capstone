import React from "react";
import { createTheme, CssBaseline, GlobalStyles, outlinedInputClasses, ThemeProvider as MuiThemeProvider } from "@mui/material";
import { applyDesignColors, DEFAULT_COLORS, DesignColors, readableOn } from "../theme/design";

type CustomThemeInput = {
  bg: string;
  surface: string;
  elevated: string;
  brand: string;
};

export type ThemePreset = {
  id: string;
  name: string;
  colors: DesignColors;
};

type ThemeContextValue = {
  palette: DesignColors;
  presets: ThemePreset[];
  selectedThemeId: string;
  customInput: CustomThemeInput;
  applyPreset: (id: string) => void;
  updateCustomInput: (next: Partial<CustomThemeInput>) => void;
  applyCustomTheme: () => void;
  resetTheme: () => void;
};

const STORAGE_KEY = "stockpilot.theme.v4";

const hexToRgb = (hex: string) => {
  const clean = hex.replace("#", "");
  const full = clean.length === 3
    ? clean.split("").map((char) => char + char).join("")
    : clean;
  const value = Number.parseInt(full, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
};

const rgba = (hex: string, alpha: number) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
};

const paletteMode = (colors: { bg: string }) => {
  const { r, g, b } = hexToRgb(colors.bg);
  return (r * 0.299 + g * 0.587 + b * 0.114) > 150 ? "light" : "dark";
};

const mix = (hex: string, target: string, weight: number) => {
  const a = hexToRgb(hex);
  const b = hexToRgb(target);
  const blend = (start: number, end: number) => Math.round(start * (1 - weight) + end * weight);
  return `#${[blend(a.r, b.r), blend(a.g, b.g), blend(a.b, b.b)]
    .map((part) => part.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
};

export const makePalette = (
  { bg, surface, elevated, brand }: CustomThemeInput,
  mode: "dark" | "light" = paletteMode({ bg })
): DesignColors => {
  const light = mode === "light";

  return {
    ...DEFAULT_COLORS,
    bg,
    surface,
    elevated,
    overlay: light ? mix(elevated, "#000000", 0.05) : mix(elevated, "#FFFFFF", 0.07),
    border: light ? "rgba(15,23,42,0.12)" : rgba(brand, 0.18),
    borderHi: light ? "rgba(15,23,42,0.22)" : rgba(brand, 0.32),
    brand,
    brandMid: mix(brand, "#000000", light ? 0.08 : 0.16),
    brandBg: rgba(brand, light ? 0.1 : 0.12),
    brandBd: rgba(brand, light ? 0.28 : 0.34),
    brandText: light ? mix(brand, "#000000", 0.28) : mix(brand, "#FFFFFF", 0.38),
    t1: light ? "#0F172A" : DEFAULT_COLORS.t1,
    t2: light ? "#334155" : DEFAULT_COLORS.t2,
    t3: light ? "#475569" : DEFAULT_COLORS.t3,
    t4: light ? "#64748B" : DEFAULT_COLORS.t4,

    // Semantic colours have to be re-derived for light mode. Spreading
    // DEFAULT_COLORS above carries the dark-theme values through, and those are
    // tuned for near-black backgrounds: on the light presets greenText (#4ADE80)
    // measured 1.67:1 and redText (#F87171) 2.64:1 against the page -- i.e. the
    // profit and loss figures, the single most important numbers in the app,
    // were all but invisible. The values below clear AA 4.5:1 for text and the
    // 3:1 non-text bar for the solid bar/dot fills, on every light surface.
    ...(light ? {
      green:     "#047857",
      greenBd:   "rgba(5,150,105,0.32)",
      greenText: "#065F46",
      red:       "#DC2626",
      redBd:     "rgba(220,38,38,0.32)",
      redText:   "#B91C1C",
      amber:     "#92400E",
      amberBg:   "rgba(146,64,14,0.12)",
    } : {}),
  };
};

const HIGH_CONTRAST_WHITE: DesignColors = {
  bg: "#FFFFFF",
  surface: "#FFFFFF",
  elevated: "#F3F4F6",
  overlay: "#E5E7EB",
  border: "#374151",
  borderHi: "#111827",
  green: "#047857",
  greenBg: "#ECFDF5",
  greenBd: "#047857",
  greenText: "#065F46",
  red: "#B91C1C",
  redBg: "#FEF2F2",
  redBd: "#B91C1C",
  redText: "#991B1B",
  amber: "#92400E",
  amberBg: "#FFFBEB",
  brand: "#1D4ED8",
  brandMid: "#1E40AF",
  brandBg: "#DBEAFE",
  brandBd: "#1D4ED8",
  brandText: "#1E40AF",
  t1: "#000000",
  t2: "#1F2937",
  t3: "#374151",
  t4: "#4B5563",
};

// Every token here clears WCAG AAA (>= 7:1) against the white background,
// including the faintest tier: t4 measures 7.73:1, where the ordinary light
// presets put t4 at 2.56:1 (an outright failure) and t3 at 4.76:1. The
// semantic colours are darkened well past their dark-theme values for the same
// reason -- #22C55E green is unreadable on white.
const HIGH_CONTRAST_LIGHT: DesignColors = {
  bg:        "#FFFFFF",
  surface:   "#FFFFFF",
  elevated:  "#F4F4F5",
  overlay:   "#E4E4E7",

  border:    "#3F3F46",
  borderHi:  "#18181B",

  green:     "#046C3B",
  greenBg:   "rgba(4,108,59,0.12)",
  greenBd:   "rgba(4,108,59,0.50)",
  greenText: "#04562F",

  red:       "#B3261E",
  redBg:     "rgba(179,38,30,0.12)",
  redBd:     "rgba(179,38,30,0.50)",
  redText:   "#8C1D18",

  amber:     "#8A5300",
  amberBg:   "rgba(138,83,0,0.14)",

  brand:     "#4C1D95",
  brandMid:  "#3B1478",
  brandBg:   "rgba(76,29,149,0.12)",
  brandBd:   "rgba(76,29,149,0.50)",
  brandText: "#3B1478",

  t1:        "#000000",
  t2:        "#1F1F23",
  t3:        "#3F3F46",
  t4:        "#52525B",
};

export const SYSTEM_THEME_ID = "system";
const DARK_QUERY = "(prefers-color-scheme: dark)";

const SYSTEM_LIGHT: DesignColors = {
  bg: "#FFFFFF", surface: "#FFFFFF", elevated: "#F7F7F7", overlay: "#EFEFEF",
  border: "#DEDEDE", borderHi: "#BFBFBF",
  green: "#047857", greenBg: "rgba(7,148,85,0.10)", greenBd: "rgba(7,148,85,0.30)", greenText: "#06713F",
  red: "#D92D3A", redBg: "rgba(217,45,58,0.09)", redBd: "rgba(217,45,58,0.28)", redText: "#A51F2B",
  amber: "#8A5A00", amberBg: "rgba(155,103,0,0.10)",
  brand: "#7C3AED", brandMid: "#6D28D9", brandBg: "rgba(124,58,237,0.10)", brandBd: "rgba(124,58,237,0.30)", brandText: "#5B21B6",
  t1: "#111111", t2: "#333333", t3: "#555555", t4: "#6B6B6B",
};

function prefersDark() {
  try {
    return typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(DARK_QUERY).matches
      // No matchMedia (old browser, jsdom): fall back to the dark-first design.
      : true;
  } catch {
    return true;
  }
}

export const themePresets: ThemePreset[] = [
  {
    id: "apex",
    name: "Midnight Violet",
    colors: DEFAULT_COLORS,
  },
  {
    id: "market",
    name: "Market Green",
    colors: makePalette({
      bg: "#07110C",
      surface: "#0B1711",
      elevated: "#112018",
      brand: "#16A34A",
    }),
  },
  {
    id: "signal",
    name: "Signal Cyan",
    colors: makePalette({
      bg: "#061013",
      surface: "#0A171B",
      elevated: "#102329",
      brand: "#0891B2",
    }),
  },
  {
    id: "sunset",
    name: "Sunset Coral",
    colors: makePalette({
      bg: "#140C0D",
      surface: "#1E1214",
      elevated: "#2A191C",
      brand: "#F97316",
    }),
  },
  {
    id: "terminal",
    name: "Terminal Gold",
    colors: makePalette({
      bg: "#0E0D08",
      surface: "#17150D",
      elevated: "#211F14",
      brand: "#EAB308",
    }),
  },
  {
    id: "daybreak",
    name: "Daybreak Blue",
    colors: makePalette({
      bg: "#F8FAFC",
      surface: "#FFFFFF",
      elevated: "#F1F5F9",
      brand: "#2563EB",
    }, "light"),
  },
  {
    id: "contrast-white",
    name: "High Contrast White",
    colors: HIGH_CONTRAST_WHITE,
  },
  {
    id: "mint",
    name: "Mint Ledger",
    colors: makePalette({
      bg: "#F7FCF9",
      surface: "#FFFFFF",
      elevated: "#EEF8F1",
      brand: "#059669",
    }, "light"),
  },
  {
    id: "rose",
    name: "Rose Desk",
    colors: makePalette({
      bg: "#FFF8F8",
      surface: "#FFFFFF",
      elevated: "#FDF0F1",
      brand: "#E11D48",
    }, "light"),
  },
  {
    id: "contrast",
    name: "High Contrast",
    colors: HIGH_CONTRAST_LIGHT,
  },
  {
    // Not a palette of its own: it tracks the OS light/dark setting and follows
    // it live. `colors` is only the swatch shown in the picker.
    id: SYSTEM_THEME_ID,
    name: "Match System",
    colors: prefersDark() ? DEFAULT_COLORS : SYSTEM_LIGHT,
  },
];

function systemPalette(): DesignColors {
  return prefersDark() ? DEFAULT_COLORS : SYSTEM_LIGHT;
}

const defaultCustomInput: CustomThemeInput = {
  bg: DEFAULT_COLORS.bg,
  surface: DEFAULT_COLORS.surface,
  elevated: DEFAULT_COLORS.elevated,
  brand: DEFAULT_COLORS.brand,
};

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

type StoredTheme = {
  selectedThemeId: string;
  customInput: CustomThemeInput;
  palette: DesignColors;
};

// Read synchronously so the stored theme IS the initial state.
//
// This used to be a load effect paired with a persist effect. Both run on mount
// in declaration order, so persist wrote the initial "apex" state back to
// localStorage before load's setState had rendered. In production the next
// render re-persisted the real value and it self-healed; under StrictMode React
// runs load, persist, cleanup, load again with no render in between, so the
// second load read back the "apex" persist had just written and the player's
// saved theme was reset on every reload. Gating persist behind a "hydrated" ref
// does not fix it -- persist still runs after load in the same flush, while the
// loaded state is still uncommitted. Hydrating in the initializer removes the
// window entirely: there is nothing to race.
function readStoredTheme(): StoredTheme {
  const fallback: StoredTheme = {
    selectedThemeId: SYSTEM_THEME_ID,
    customInput: defaultCustomInput,
    palette: systemPalette(),
  };

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;

    const saved = JSON.parse(raw) as { selectedThemeId?: string; customInput?: CustomThemeInput };

    // Resolved from the OS at read time, never from whatever was stored: the
    // user may have flipped their system setting since the last visit.
    if (saved.selectedThemeId === SYSTEM_THEME_ID) {
      return {
        selectedThemeId: SYSTEM_THEME_ID,
        customInput: defaultCustomInput,
        palette: systemPalette(),
      };
    }

    const preset = themePresets.find((item) => item.id === saved.selectedThemeId);
    if (preset) {
      return { selectedThemeId: preset.id, customInput: defaultCustomInput, palette: preset.colors };
    }

    if (saved.selectedThemeId === "custom" && saved.customInput) {
      return {
        selectedThemeId: "custom",
        customInput: saved.customInput,
        palette: makePalette(saved.customInput),
      };
    }
  } catch {
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }

  return fallback;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [stored] = React.useState(readStoredTheme);
  const [selectedThemeId, setSelectedThemeId] = React.useState(stored.selectedThemeId);
  const [customInput, setCustomInput] = React.useState(stored.customInput);
  const [palette, setPalette] = React.useState<DesignColors>(stored.palette);

  const setActivePalette = React.useCallback((colors: DesignColors) => {
    applyDesignColors(colors);
    document.documentElement.style.colorScheme = paletteMode(colors);
    setPalette(colors);
  }, []);

  // Push the hydrated palette into the shared `D` singleton. Idempotent, so a
  // StrictMode double-invoke is harmless.
  React.useEffect(() => {
    applyDesignColors(stored.palette);
    document.documentElement.style.colorScheme = paletteMode(stored.palette);
  }, [stored.palette]);

  React.useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ selectedThemeId, customInput }));
  }, [customInput, selectedThemeId]);

  const applyPreset = React.useCallback((id: string) => {
    if (id === SYSTEM_THEME_ID) {
      setSelectedThemeId(SYSTEM_THEME_ID);
      setActivePalette(systemPalette());
      return;
    }
    const preset = themePresets.find((item) => item.id === id);
    if (!preset) return;
    setSelectedThemeId(preset.id);
    setActivePalette(preset.colors);
  }, [setActivePalette]);

  // Follow the OS setting live while "Match System" is selected, so flipping
  // the system theme repaints the app without a reload.
  React.useEffect(() => {
    if (selectedThemeId !== SYSTEM_THEME_ID) return;
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    const query = window.matchMedia(DARK_QUERY);
    const onChange = () => setActivePalette(systemPalette());
    onChange();

    // addEventListener on MediaQueryList is unsupported on older Safari, which
    // only has the deprecated addListener.
    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    }
    query.addListener(onChange);
    return () => query.removeListener(onChange);
  }, [selectedThemeId, setActivePalette]);

  const updateCustomInput = React.useCallback((next: Partial<CustomThemeInput>) => {
    setCustomInput((current) => ({ ...current, ...next }));
  }, []);

  const applyCustomTheme = React.useCallback(() => {
    setSelectedThemeId("custom");
    setActivePalette(makePalette(customInput));
  }, [customInput, setActivePalette]);

  const resetTheme = React.useCallback(() => {
    setSelectedThemeId(SYSTEM_THEME_ID);
    setCustomInput(defaultCustomInput);
    setActivePalette(systemPalette());
  }, [setActivePalette]);

  const value = React.useMemo(
    () => ({
      palette,
      presets: themePresets,
      selectedThemeId,
      customInput,
      applyPreset,
      updateCustomInput,
      applyCustomTheme,
      resetTheme,
    }),
    [applyCustomTheme, applyPreset, customInput, palette, resetTheme, selectedThemeId, updateCustomInput]
  );

  const dark = paletteMode(palette) === "dark";

  // BUG-056: without a theme, MUI styles every component for its light
  // default, and those styles are injected after GlobalStyles at the same
  // specificity, so overriding labels, help text and outlines there never
  // took effect: on a dark palette the labels measured 1.04:1. styleOverrides
  // sit inside each component's own styles, so they win over MUI's defaults
  // while per-field `sx` still wins over them.
  const muiTheme = React.useMemo(() => createTheme({
    palette: {
      mode: dark ? "dark" : "light",
      background: { default: palette.bg, paper: palette.surface },
      primary: { main: palette.brand, contrastText: readableOn(palette.brand) },
    },
    components: {
      // Dark-mode Paper adds a lightening gradient per elevation; the app's
      // surfaces are flat colours from the palette.
      MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
      // MUI's dark palette gives contained buttons near-black text, which is
      // 3.69:1 on the brand fill. Per-button `sx` still wins over this.
      MuiButton: { styleOverrides: { contained: { color: readableOn(palette.brand) }, text: { color: palette.brandText }, outlined: { color: palette.brandText } } },
      MuiLink: { styleOverrides: { root: { color: palette.brandText, textDecorationColor: palette.brandBd } } },
      MuiTab: { styleOverrides: { root: { "&.Mui-selected": { color: palette.brandText } } } },
      // Pages name their bar when it means something specific.
      MuiLinearProgress: { defaultProps: { "aria-label": "Progress" } },
      // Counts are information, not losses: red is kept for money.
      MuiBadge: { styleOverrides: { colorError: { backgroundColor: palette.t1, color: palette.surface } } },
      // MUI fades placeholders to 0.42 from inside its own styles, which beats
      // the global placeholder rule below and left them under 3:1.
      MuiInputBase: { styleOverrides: { input: { "&::placeholder": { opacity: 1 } } } },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: palette.t2,
            "&.Mui-focused": { color: palette.brandText },
            "&.Mui-error": { color: palette.redText },
            "&.Mui-disabled": { color: palette.t4 },
          },
        },
      },
      MuiFormHelperText: {
        styleOverrides: {
          root: { color: palette.t2, "&.Mui-error": { color: palette.redText }, "&.Mui-disabled": { color: palette.t3 } },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          notchedOutline: { borderColor: palette.borderHi },
          root: {
            [`&:hover .${outlinedInputClasses.notchedOutline}`]: { borderColor: palette.t2 },
            [`&.${outlinedInputClasses.focused} .${outlinedInputClasses.notchedOutline}`]: { borderColor: palette.brand },
            [`&.${outlinedInputClasses.error} .${outlinedInputClasses.notchedOutline}`]: { borderColor: palette.red },
            [`&.${outlinedInputClasses.disabled} .${outlinedInputClasses.notchedOutline}`]: { borderColor: palette.border },
          },
        },
      },
    },
  }), [dark, palette]);

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={muiTheme}>
        {/* Inside the theme so the page background and text follow the palette. */}
        <CssBaseline />
        <GlobalStyles styles={{
          ".learning .MuiButton-contained:not(.Mui-disabled)": { backgroundColor: palette.brand, color: readableOn(palette.brand) },
          ".learning .MuiButton-outlined:not(.Mui-disabled)": { color: palette.brandText, borderColor: palette.brandBd },
          ".learning .MuiButton-text:not(.Mui-disabled)": { color: palette.brandText },
          ".learning .MuiSelect-icon": { color: palette.t2 },
          ".learning .MuiAlert-standardInfo": { color: palette.t1, backgroundColor: palette.brandBg, border: `1px solid ${palette.brandBd}` },
          ".learning .MuiAlert-standardInfo .MuiAlert-icon": { color: palette.brandText },
          "h1, h2, h3": { textWrap: "balance" },
          "p, li, .MuiAlert-message": { textWrap: "pretty" },
          ".MuiMenu-paper": { backgroundColor: palette.elevated, color: palette.t1 },
          ".MuiCheckbox-root": { color: palette.t2 },
          ".MuiCheckbox-root.Mui-checked": { color: palette.brandText },
          "main a": { color: palette.brandText },
          "input, textarea, .MuiInputBase-input, .MuiSelect-select": {
            color: dark ? "#FFFFFF" : palette.t1,
            WebkitTextFillColor: dark ? "#FFFFFF" : palette.t1,
          },
          // Under 16px, iOS zooms the page when a field is focused. Important
          // because many fields set a smaller size in their own `sx`.
          "@media (max-width: 899.95px)": {
            "input, textarea, .MuiInputBase-input, .MuiSelect-select": { fontSize: "16px !important" },
          },
          "input::placeholder, textarea::placeholder, .MuiInputBase-input::placeholder": {
            color: palette.t3,
            WebkitTextFillColor: palette.t3,
            opacity: 1,
          },
        }} />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useThemeSettings() {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeSettings must be used within ThemeProvider");
  }
  return context;
}
