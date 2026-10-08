/* eslint-disable testing-library/no-unnecessary-act, testing-library/no-render-in-setup */
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import Practice from "./Practice";

// CRA's Jest resolver predates React Router 7's subpath exports. Navigation is
// irrelevant to these lesson checks, so render links as anchors in this test.
// `virtual` because the package's "main" points at a file v7 no longer ships.
jest.mock("react-router-dom", () => {
  const React = require("react");
  return { MemoryRouter: ({ children }: any) => children, Link: React.forwardRef(({ to, ...props }: any, ref: any) => <a ref={ref} href={to} {...props} />) };
}, { virtual: true });
const mockReset = jest.fn();
jest.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
jest.mock("../context/GameContext", () => ({ useGame: () => ({ resetAccount: mockReset }) }));
let root: Root;
let container: HTMLDivElement;
beforeEach(async () => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  HTMLElement.prototype.scrollIntoView = jest.fn();
  mockReset.mockClear();
  container = document.createElement("div"); document.body.append(container);
  root = createRoot(container);
  await act(async () => { root.render(<MemoryRouter><Practice /></MemoryRouter>); });
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
const button = (text: string) => Array.from(container.querySelectorAll("button")).find(b => b.textContent?.includes(text))!;
async function click(text: string) { await act(async () => button(text).click()); }
async function fill(text: string) {
  const field = Array.from(container.querySelectorAll("textarea")).find(t => !t.disabled && !t.hasAttribute("aria-hidden"))!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(field, text);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
test("one reasoned wait completes a guest lesson without an account or a game reset", async () => {
  expect(button("reveal").disabled).toBe(true);
  await click("Wait / research");
  await fill("I need cash for bills and will check whether the earnings support the high valuation.");
  expect(button("reveal").disabled).toBe(false);
  await click("reveal");
  expect(container.textContent).toContain("Practice cash: $2,000.00");
  expect(container.textContent).toContain("positive headline does not promise");
  await fill("I should investigate expectations instead of assuming that a positive headline means profit.");
  await click("Finish practice");
  expect(container.textContent).toContain("Practice complete");
  expect(container.textContent).toContain("You researched 1 situation");
  expect(mockReset).not.toHaveBeenCalled();
});
test("practice buy and sell reconcile cash, shares, and losses within the disposable lesson", async () => {
  await click("Buy 1 practice");
  await fill("I will use a small position and preserve cash, then investigate the business if demand weakens.");
  await click("reveal");
  expect(container.textContent).toContain("Practice cash: $1,900.00 · Shares: 1 · Account value: $1,996.00");
  await click("Sell 1 practice");
  expect(container.textContent).toContain("Practice cash: $1,996.00 · Shares: 0 · Account value: $1,996.00");
  expect(container.textContent).toContain("Realized gain / loss: -$4.00");
  expect(mockReset).not.toHaveBeenCalled();
});
