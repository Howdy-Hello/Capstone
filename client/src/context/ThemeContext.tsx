import React from "react";
import { applyDesignColors, DEFAULT_COLORS, DesignColors } from "../theme/design";

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

const STORAGE_KEY = "stockpilot.theme.v1";

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

const mix = (hex: string, target: string, weight: number) => {
  const a = hexToRgb(hex);
  const b = hexToRgb(target);
  const blend = (start: number, end: number) => Math.round(start * (1 - weight) + end * weight);
  return `#${[blend(a.r, b.r), blend(a.g, b.g), blend(a.b, b.b)]
    .map((part) => part.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
};

const makePalette = (
  { bg, surface, elevated, brand }: CustomThemeInput,
  mode: "dark" | "light" = "dark"
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
    brandText: light ? mix(brand, "#000000", 0.18) : mix(brand, "#FFFFFF", 0.38),
    t1: light ? "#0F172A" : DEFAULT_COLORS.t1,
    t2: light ? "#334155" : DEFAULT_COLORS.t2,
    t3: light ? "#64748B" : DEFAULT_COLORS.t3,
    t4: light ? "#94A3B8" : DEFAULT_COLORS.t4,
  };
};

const themePresets: ThemePreset[] = [
  {
    id: "apex",
    name: "Apex Violet",
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
];

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
    selectedThemeId: themePresets[0].id,
    customInput: defaultCustomInput,
    palette: DEFAULT_COLORS,
  };

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;

    const saved = JSON.parse(raw) as { selectedThemeId?: string; customInput?: CustomThemeInput };
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
    setPalette(colors);
  }, []);

  // Push the hydrated palette into the shared `D` singleton. Idempotent, so a
  // StrictMode double-invoke is harmless.
  React.useEffect(() => {
    applyDesignColors(stored.palette);
  }, [stored.palette]);

  React.useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ selectedThemeId, customInput }));
  }, [customInput, selectedThemeId]);

  const applyPreset = React.useCallback((id: string) => {
    const preset = themePresets.find((item) => item.id === id);
    if (!preset) return;
    setSelectedThemeId(preset.id);
    setActivePalette(preset.colors);
  }, [setActivePalette]);

  const updateCustomInput = React.useCallback((next: Partial<CustomThemeInput>) => {
    setCustomInput((current) => ({ ...current, ...next }));
  }, []);

  const applyCustomTheme = React.useCallback(() => {
    setSelectedThemeId("custom");
    setActivePalette(makePalette(customInput));
  }, [customInput, setActivePalette]);

  const resetTheme = React.useCallback(() => {
    setSelectedThemeId(themePresets[0].id);
    setCustomInput(defaultCustomInput);
    setActivePalette(DEFAULT_COLORS);
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

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeSettings() {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeSettings must be used within ThemeProvider");
  }
  return context;
}
