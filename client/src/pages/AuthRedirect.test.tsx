/* eslint-disable testing-library/no-unnecessary-act */
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import AuthPage from "./AuthPage";
import AuthCallback from "./AuthCallback";
import { supabase } from "../lib/supabase";

// V4-06: after logging in, a player lands on the page they asked for.
// CRA's Jest resolver predates React Router 7's subpath exports (see Practice.test.tsx).
const mockNavigate = jest.fn();
let mockLocation = { pathname: "/auth", search: "", hash: "" };
jest.mock("react-router-dom", () => {
  const React = require("react");
  return {
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
    Link: React.forwardRef(({ to, ...props }: any, ref: any) => <a ref={ref} href={to} {...props} />),
  };
}, { virtual: true });
jest.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
jest.mock("../lib/authThrottle", () => ({
  useAuthThrottle: () => ({ isLocked: false, attemptsLeft: 5, recordFailure: jest.fn(), recordSuccess: jest.fn() }),
}));
jest.mock("../lib/supabase", () => ({
  supabase: {
    auth: { signInWithPassword: jest.fn(), signInWithOAuth: jest.fn(), exchangeCodeForSession: jest.fn(), getSession: jest.fn() },
  },
  isRememberMeEnabled: () => false,
  setRememberMe: jest.fn(),
}));

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  // CRA's Jest config resets mock implementations before every test.
  (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({ error: null });
  (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({ error: null });
  (supabase.auth.exchangeCodeForSession as jest.Mock).mockResolvedValue({ error: null });
  (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: { access_token: "test" } }, error: null });
  sessionStorage.clear();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

async function render(element: React.ReactElement) {
  await act(async () => { root.render(element); });
}
async function fill(input: HTMLInputElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function logIn() {
  await fill(container.querySelector("input[type=email]") as HTMLInputElement, "player@example.com");
  await fill(container.querySelector("input[type=password]") as HTMLInputElement, "secret-pass");
  await act(async () => { container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
}
const button = (text: string) => Array.from(container.querySelectorAll("button")).find((b) => b.textContent?.includes(text))!;

test("email login returns to the requested page", async () => {
  mockLocation = { pathname: "/auth", search: "?mode=login&next=%2Fleaderboard", hash: "" };
  await render(<AuthPage />);
  await logIn();
  expect(supabase.auth.signInWithPassword).toHaveBeenCalled();
  expect(mockNavigate).toHaveBeenLastCalledWith("/leaderboard", { replace: true });
});

test("a link to another site still lands on the dashboard", async () => {
  mockLocation = { pathname: "/auth", search: "?mode=login&next=%2F%2Fevil.example", hash: "" };
  await render(<AuthPage />);
  await logIn();
  expect(mockNavigate).toHaveBeenLastCalledWith("/dashboard", { replace: true });
});

test("Google sign-in keeps the callback address and remembers the page", async () => {
  mockLocation = { pathname: "/auth", search: "?mode=login&next=%2Fstocks%2FCAI", hash: "" };
  await render(<AuthPage />);
  await act(async () => { button("Continue with Google").click(); });
  expect(sessionStorage.getItem("stockpilot-post-login-path")).toBe("/stocks/CAI");
  const options = (supabase.auth.signInWithOAuth as jest.Mock).mock.calls[0][0].options;
  expect(options.redirectTo).toBe(`${window.location.origin}/auth/callback`);
});

test("the Google callback sends the player to the remembered page once", async () => {
  sessionStorage.setItem("stockpilot-post-login-path", "/stocks/CAI");
  mockLocation = { pathname: "/auth/callback", search: "?code=test-code", hash: "" };
  await render(<AuthCallback />);
  expect(mockNavigate).toHaveBeenLastCalledWith("/stocks/CAI", { replace: true });
  expect(sessionStorage.getItem("stockpilot-post-login-path")).toBeNull();
});

test("a failed Google sign-in goes back to login and keeps the page", async () => {
  sessionStorage.setItem("stockpilot-post-login-path", "/stocks/CAI");
  mockLocation = { pathname: "/auth/callback", search: "?error_description=Access+denied", hash: "" };
  await render(<AuthCallback />);
  expect(mockNavigate).toHaveBeenLastCalledWith("/auth?mode=login&oauth_error=Access+denied&next=%2Fstocks%2FCAI", { replace: true });
});

test("the Google callback ignores a remembered address on another site", async () => {
  sessionStorage.setItem("stockpilot-post-login-path", "https://evil.example/");
  mockLocation = { pathname: "/auth/callback", search: "?code=test-code", hash: "" };
  await render(<AuthCallback />);
  expect(mockNavigate).toHaveBeenLastCalledWith("/dashboard", { replace: true });
});
