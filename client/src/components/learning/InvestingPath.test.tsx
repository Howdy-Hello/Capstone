/* eslint-disable testing-library/no-unnecessary-act */
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import InvestingPath from "./InvestingPath";

// V4-07: the Investing path sits under the Learn page's h1, so its section
// headings are h2 (they were h5, a jump screen-reader users notice).
let root: Root;
let container: HTMLDivElement;
beforeEach(async () => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  // recharts' ResponsiveContainer needs ResizeObserver, which jsdom lacks.
  (globalThis as any).ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => { root.render(<InvestingPath />); });
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

test("section headings follow the page's h1 without skipping levels", () => {
  const headings = Array.from(container.querySelectorAll("h1, h2, h3, h4, h5, h6"));
  const levels = headings.map((h) => Number(h.tagName.slice(1)));
  // axe heading-order: under the page's h1, start at h2 and never go more than one level deeper.
  let previous = 1;
  for (const level of levels) {
    expect(level - previous).toBeLessThanOrEqual(1);
    previous = level;
  }
  expect(levels.slice(0, 4)).toEqual([2, 2, 2, 2]);
  expect(headings[0].textContent).toBe("Start with the goal, then choose the risk");
  expect(headings[3].textContent).toMatch(/^Check your understanding/);
});
