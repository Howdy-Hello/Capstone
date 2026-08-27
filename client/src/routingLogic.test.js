import { resolveAuthMode, resolveComparisonSymbols } from "./lib/routing";

const stocks = [
  { symbol: "CAI" },
  { symbol: "GVE" },
  { symbol: "MCH" },
];

test("resolves authentication mode from the current URL", () => {
  expect(resolveAuthMode("signup")).toBe("signup");
  expect(resolveAuthMode("reset")).toBe("reset");
  expect(resolveAuthMode("login")).toBe("login");
  expect(resolveAuthMode("unexpected")).toBe("login");
  expect(resolveAuthMode(null)).toBe("login");
});

test("preserves valid comparison symbols", () => {
  expect(resolveComparisonSymbols(stocks, [], "GVE", "MCH")).toEqual({
    left: "GVE",
    right: "MCH",
  });
});

test("replaces invalid or duplicate comparison symbols", () => {
  expect(resolveComparisonSymbols(stocks, [], "INVALID", "INVALID")).toEqual({
    left: "CAI",
    right: "GVE",
  });
  expect(resolveComparisonSymbols(stocks, [], "CAI", "CAI")).toEqual({
    left: "CAI",
    right: "GVE",
  });
});

test("prefers valid watchlist stocks when comparison parameters are absent", () => {
  expect(resolveComparisonSymbols(stocks, [{ symbol: "MCH" }, { symbol: "GVE" }], null, null)).toEqual({
    left: "MCH",
    right: "GVE",
  });
});
