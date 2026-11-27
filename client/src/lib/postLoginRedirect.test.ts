import { loginPathFor, rememberPostLoginPath, safeNextPath, takePostLoginPath } from "./routing";

// V4-06: a shared link to a protected page goes to login and comes back to that
// page, never to another site.
const ORIGIN = "https://stockpilot.example";

test("keeps a path on this site, with its query", () => {
  expect(safeNextPath("/leaderboard", ORIGIN)).toBe("/leaderboard");
  expect(safeNextPath("/stocks/CAI", ORIGIN)).toBe("/stocks/CAI");
  expect(safeNextPath("/learn?tab=guide", ORIGIN)).toBe("/learn?tab=guide");
});

test("falls back to the dashboard for anything that could leave the site", () => {
  for (const unsafe of [
    null, undefined, "", "leaderboard", "https://evil.example/", "//evil.example", "/\\evil.example",
    "\\\\evil.example", "/.//evil.example", "javascript:alert(1)", "/\n//evil.example", "/\t/evil.example",
    `/${"a".repeat(600)}`,
  ]) {
    expect(safeNextPath(unsafe as string | null | undefined, ORIGIN)).toBe("/dashboard");
  }
  // Encoded characters stay a path on this site (the 404 page at worst).
  expect(safeNextPath("/%2F%2Fevil.example", ORIGIN)).toBe("/%2F%2Fevil.example");
});

test("never sends a player back to the login or callback page", () => {
  expect(safeNextPath("/auth?mode=login", ORIGIN)).toBe("/dashboard");
  expect(safeNextPath("/auth/callback?code=x", ORIGIN)).toBe("/dashboard");
});

test("the login link carries the requested page", () => {
  expect(loginPathFor("/leaderboard", "")).toBe("/auth?mode=login&next=%2Fleaderboard");
  expect(loginPathFor("/stocks/CAI", "?range=5d")).toBe("/auth?mode=login&next=%2Fstocks%2FCAI%3Frange%3D5d");
  expect(loginPathFor("/dashboard", "")).toBe("/auth?mode=login");
});

test("the Google sign-in round trip remembers the page once", () => {
  rememberPostLoginPath("/leaderboard");
  expect(takePostLoginPath()).toBe("/leaderboard");
  expect(takePostLoginPath()).toBe("/dashboard");
  sessionStorage.setItem("stockpilot-post-login-path", "https://evil.example");
  expect(takePostLoginPath()).toBe("/dashboard");
  rememberPostLoginPath("/dashboard");
  expect(sessionStorage.getItem("stockpilot-post-login-path")).toBeNull();
});
