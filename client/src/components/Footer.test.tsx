import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Footer from "./Footer";

let mockUser: { id: string } | null = null;
let mockPath = "/";
jest.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock("react-router-dom", () => {
  const React = require("react");
  return {
    useLocation: () => ({ pathname: mockPath }),
    Link: React.forwardRef(({ to, ...props }: any, ref: any) => <a ref={ref} href={to} {...props} />),
  };
}, { virtual: true }); // v7's "main" points at a file it no longer ships

function footerAt(path: string, signedIn: boolean) {
  mockPath = path;
  mockUser = signedIn ? { id: "layout-test" } : null;
  const container = document.createElement("div");
  container.innerHTML = renderToStaticMarkup(<Footer />);
  return container;
}

test("the signed-out homepage keeps its footer and drops links that need an account", () => {
  const page = footerAt("/", false);
  expect(page.textContent).not.toContain("PRODUCT");
  expect(page.querySelector('a[href="/dashboard"]')).toBeNull();
  expect(page.querySelector('a[href="/practice"]')).not.toBeNull();
  expect(page.querySelector('a[href="/learn?tab=investing"]')).not.toBeNull();
  expect(page.querySelector('a[href="/privacy"]')).not.toBeNull();
});

test("guest practice keeps the existing compact footer", () => {
  const page = footerAt("/practice", false);
  expect(page.textContent).not.toContain("PRODUCT");
  expect(page.textContent).toContain("Simulation only");
  expect(page.querySelectorAll("a")).toHaveLength(2);
});

test("signed-in screens restore the original full footer without losing new pages", () => {
  const page = footerAt("/game", true);
  expect(page.textContent).toContain("PRODUCT");
  for (const route of ["/game", "/dashboard", "/learn?tab=investing", "/privacy"]) {
    expect(page.querySelector(`a[href="${route}"]`)).not.toBeNull();
  }
});

test("signed-in footer drops the guest-only links", () => {
  const page = footerAt("/game", true);
  for (const route of ["/practice", "/auth?mode=login", "/auth?mode=signup"]) {
    expect(page.querySelector(`a[href="${route}"]`)).toBeNull();
  }
});
