import { DesignColors, readableOn } from "./design";
import { themePresets } from "../context/ThemeContext";

// Readability audit across every theme preset.
//
// The palettes are hand-authored per theme, so a token that is readable in the
// dark default can quietly fail in a light one -- and a "high contrast" theme is
// only worth the name if it is measured. These tests compute real WCAG 2.1
// contrast ratios so a future palette edit cannot silently ship unreadable text.

// --- WCAG 2.1 relative luminance / contrast ratio -------------------------

function parseColor(value: string): { r: number; g: number; b: number; a: number } | null {
  const hex = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const raw = hex[1].length === 3
      ? hex[1].split("").map((c) => c + c).join("")
      : hex[1];
    const n = Number.parseInt(raw, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const rgb = value.trim().match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const parts = rgb[1].split(",").map((p) => Number(p.trim()));
    if (parts.length < 3 || parts.some((p) => Number.isNaN(p))) return null;
    return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] === undefined ? 1 : parts[3] };
  }
  return null;
}

/** Flatten a translucent colour over an opaque backdrop. */
function over(fg: string, bg: string): string {
  const f = parseColor(fg);
  const b = parseColor(bg);
  if (!f || !b) return fg;
  if (f.a >= 1) return fg;
  const mix = (x: number, y: number) => Math.round(x * f.a + y * (1 - f.a));
  return `rgb(${mix(f.r, b.r)},${mix(f.g, b.g)},${mix(f.b, b.b)})`;
}

function luminance(value: string): number {
  const c = parseColor(value);
  if (!c) return 0;
  const ch = [c.r, c.g, c.b].map((x) => {
    const s = x / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

export function contrast(fg: string, bg: string): number {
  const l1 = luminance(over(fg, bg));
  const l2 = luminance(bg);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

// --- What gets checked ----------------------------------------------------

// Surfaces text is actually painted on.
const SURFACES: (keyof DesignColors)[] = ["bg", "surface", "elevated", "overlay"];

// Text tokens and the minimum each must clear on every surface above.
// AA for normal-size text is 4.5:1. t4 is reserved for de-emphasised micro
// labels, so it is held to the 3:1 large-text/non-text bar rather than 4.5.
const TEXT_RULES: { token: keyof DesignColors; min: number }[] = [
  { token: "t1", min: 4.5 },
  { token: "t2", min: 4.5 },
  { token: "t3", min: 4.5 },
  { token: "t4", min: 3 },
  { token: "greenText", min: 4.5 },
  { token: "redText", min: 4.5 },
  { token: "brandText", min: 4.5 },
];

type Failure = { theme: string; token: string; surface: string; ratio: number; min: number };

function auditTheme(name: string, colors: DesignColors): Failure[] {
  const failures: Failure[] = [];
  for (const { token, min } of TEXT_RULES) {
    for (const surface of SURFACES) {
      const ratio = contrast(colors[token], colors[surface]);
      if (ratio < min) {
        failures.push({ theme: name, token: String(token), surface: String(surface), ratio, min });
      }
    }
  }
  return failures;
}

function report(failures: Failure[]): string {
  return failures
    .map((f) => `  ${f.theme.padEnd(14)} ${f.token.padEnd(10)} on ${f.surface.padEnd(9)} ${f.ratio.toFixed(2)}:1  (needs ${f.min}:1)`)
    .join("\n");
}

// --- Tests ----------------------------------------------------------------

describe("theme readability", () => {
  it.each(themePresets.map((p) => [p.name, p.id] as const))(
    "%s keeps every text token readable on every surface",
    (_name, id) => {
      const preset = themePresets.find((p) => p.id === id)!;
      const failures = auditTheme(preset.name, preset.colors);
      expect(failures.length === 0 ? "" : `\n${report(failures)}\n`).toBe("");
    }
  );

  it("the High Contrast theme clears AAA (7:1) for body text, not merely AA", () => {
    const hc = themePresets.find((p) => p.id === "contrast")!;
    const failures: string[] = [];
    for (const token of ["t1", "t2", "t3", "t4"] as (keyof DesignColors)[]) {
      for (const surface of ["bg", "surface", "elevated"] as (keyof DesignColors)[]) {
        const ratio = contrast(hc.colors[token], hc.colors[surface]);
        if (ratio < 7) failures.push(`${token} on ${surface}: ${ratio.toFixed(2)}:1`);
      }
    }
    expect(failures).toEqual([]);
  });

  it("borders are actually visible against the surfaces they divide", () => {
    const failures: string[] = [];
    for (const preset of themePresets) {
      for (const surface of ["surface", "elevated"] as (keyof DesignColors)[]) {
        const ratio = contrast(preset.colors.border, preset.colors[surface]);
        // Separators are decorative, so this is a visibility floor rather than
        // the 3:1 bar WCAG sets for meaningful UI components.
        if (ratio < 1.25) failures.push(`${preset.name}: border on ${surface} = ${ratio.toFixed(2)}:1`);
      }
    }
    expect(failures).toEqual([]);
  });

  it("buttons on solid green, red and brand fills have readable text", () => {
    const failures: string[] = [];
    for (const preset of themePresets) {
      for (const fill of ["green", "red", "brand"] as (keyof DesignColors)[]) {
        const ratio = contrast(readableOn(preset.colors[fill]), preset.colors[fill]);
        if (ratio < 4.5) failures.push(`${preset.name}: text on ${fill} = ${ratio.toFixed(2)}:1`);
      }
    }
    expect(failures).toEqual([]);
  });

  it("every palette token parses as a real colour", () => {
    const bad: string[] = [];
    for (const preset of themePresets) {
      for (const [token, value] of Object.entries(preset.colors)) {
        if (parseColor(String(value)) === null) bad.push(`${preset.name}.${token} = ${value}`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe("contrast helper", () => {
  it("matches known WCAG reference values", () => {
    expect(contrast("#000000", "#FFFFFF")).toBeCloseTo(21, 1);
    expect(contrast("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
    expect(contrast("#777777", "#FFFFFF")).toBeCloseTo(4.48, 1);
  });

  it("flattens translucent foregrounds over the backdrop", () => {
    // Fully transparent over white is white: no contrast at all.
    expect(contrast("rgba(0,0,0,0)", "#FFFFFF")).toBeCloseTo(1, 5);
    // Half-opacity black over white lands between the two extremes.
    const half = contrast("rgba(0,0,0,0.5)", "#FFFFFF");
    expect(half).toBeGreaterThan(1);
    expect(half).toBeLessThan(21);
  });
});
