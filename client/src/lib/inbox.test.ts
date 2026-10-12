/* eslint-disable testing-library/no-unnecessary-act */
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import {
  markNewsReadBatch, newsReadKey, setInboxUser, useUnreadInboxCount,
} from "./inbox";

function UnreadCount({ sessionId }: { sessionId: string }) {
  return React.createElement("span", null, useUnreadInboxCount([{ newsId: "n1" }], sessionId));
}

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  window.localStorage.clear();
  setInboxUser(null);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  setInboxUser(null);
});

test("newsReadKey includes the session and falls back to none", () => {
  expect(newsReadKey("s1", "n1")).toBe("s1:n1");
  expect(newsReadKey(null, "n1")).toBe("none:n1");
  expect(newsReadKey(undefined, "n1")).toBe("none:n1");
});

test("unread news count follows its session-specific read key", async () => {
  setInboxUser("u1");
  markNewsReadBatch([newsReadKey("s1", "n1")]);

  await act(async () => root.render(React.createElement(UnreadCount, { sessionId: "s1" })));
  expect(container.textContent).toBe("0");

  await act(async () => root.render(React.createElement(UnreadCount, { sessionId: "s2" })));
  expect(container.textContent).toBe("1");
});
