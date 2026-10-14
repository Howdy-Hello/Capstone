import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import RunProgressBar from "./RunProgressBar";

function render(maxDay: number | null, day = 15) {
  const container = document.createElement("div");
  container.innerHTML = renderToStaticMarkup(<RunProgressBar day={day} maxDay={maxDay} height={5} color="#7C3AED" />);
  return container;
}

test("an endless run shows a still bar, not a looping loading bar", () => {
  const page = render(null);
  expect(page.querySelector('[role="progressbar"]')).toBeNull();
  expect(page.innerHTML).not.toContain("MuiLinearProgress-indeterminate");
  expect(page.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
});

test("a 30-day run reports how far through it the player is", () => {
  const bar = render(30).querySelector('[role="progressbar"]');
  expect(bar?.getAttribute("aria-valuenow")).toBe("50");
  expect(bar?.getAttribute("aria-label")).toBe("Run progress");
  expect(render(30, 31).querySelector('[role="progressbar"]')?.getAttribute("aria-valuenow")).toBe("100");
});
