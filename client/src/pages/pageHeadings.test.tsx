/* eslint-disable testing-library/no-unnecessary-act */
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import Practice from "./Practice";
import Tutorial from "./Tutorial";
import Watchlist from "./Watchlist";

// BUG-029: every route renders exactly one <h1> and sets its own tab title.

// CRA's Jest resolver predates React Router 7's subpath exports (see Practice.test.tsx).
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => {
  const React = require("react");
  return {
    MemoryRouter: ({ children }: any) => children,
    Link: React.forwardRef(({ to, ...props }: any, ref: any) => <a ref={ref} href={to} {...props} />),
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(), jest.fn()],
  };
}, { virtual: true });
jest.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
jest.mock("../context/GameContext", () => ({
  useGame: () => ({ resetAccount: jest.fn(), watchlistStocks: [], stocks: [], account: { cash: 0, holdings: [] } }),
}));
jest.mock("../lib/tutorial", () => ({ requestTutorial: jest.fn() }));

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  HTMLElement.prototype.scrollIntoView = jest.fn();
  document.title = "StockPilot";
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

test.each([
  ["Practice", Practice, "Practice · StockPilot"],
  ["Tutorial", Tutorial, "Tutorial · StockPilot"],
  ["Watchlist", Watchlist, "Watchlist · StockPilot"],
])("%s renders one h1 and sets its document title", async (_name, Page, title) => {
  await act(async () => { root.render(<MemoryRouter><Page /></MemoryRouter>); });
  expect(container.querySelectorAll("h1").length).toBe(1);
  expect(document.title).toBe(title);
});
