import {
  clearNotificationHistory, markNotificationsSeen, pushNotification,
  setNotificationUser,
} from "./notifications";

// Notifications carry no per-item read flag, so the header badge counts
// everything pushed since the list was last opened. These pin that rule,
// including the case that made it worth doing carefully: a notification landing
// in the same tick as the visit must not be swallowed.

const USER = "cccccccc-0000-0000-0000-000000000000";

function unseen(): number {
  // The store's own key, read the way the hook's snapshot computes it.
  const history = JSON.parse(localStorage.getItem(`stockpilot-notification-history-${USER}`) || "[]");
  const seenAt = localStorage.getItem(`stockpilot-notification-seen-at-${USER}`) ?? "";
  if (!seenAt) return history.length;
  return history.filter((n: { createdAt?: string }) => (n.createdAt ?? "") > seenAt).length;
}

function push(id: string, createdAt: string) {
  pushNotification({ id, kind: "alert", title: id, createdAt });
}

beforeEach(() => {
  localStorage.clear();
  setNotificationUser(null);
  setNotificationUser(USER);
});

test("everything counts as unseen before the list is ever opened", () => {
  push("a", "2026-08-27T10:00:00.000Z");
  push("b", "2026-08-27T11:00:00.000Z");
  expect(unseen()).toBe(2);
});

test("opening the list clears the badge", () => {
  push("a", "2026-08-27T10:00:00.000Z");
  push("b", "2026-08-27T11:00:00.000Z");
  markNotificationsSeen();
  expect(unseen()).toBe(0);
});

test("only notifications newer than the visit count afterwards", () => {
  push("a", "2026-08-27T10:00:00.000Z");
  markNotificationsSeen();
  expect(unseen()).toBe(0);

  push("b", "2026-08-27T11:00:00.000Z");
  push("c", "2026-08-27T12:00:00.000Z");
  expect(unseen()).toBe(2);

  markNotificationsSeen();
  expect(unseen()).toBe(0);
});

test("the marker is stamped from the newest item, not wall-clock now", () => {
  // If it stamped "now", an item created moments earlier but pushed in the same
  // tick would be marked seen without ever being displayed.
  push("a", "2026-08-27T10:00:00.000Z");
  markNotificationsSeen();
  const seenAt = localStorage.getItem(`stockpilot-notification-seen-at-${USER}`);
  expect(seenAt).toBe("2026-08-27T10:00:00.000Z");
});

test("clearing the history also clears the badge", () => {
  push("a", "2026-08-27T10:00:00.000Z");
  expect(unseen()).toBe(1);
  clearNotificationHistory();
  expect(unseen()).toBe(0);
});

test("the badge is per user and does not leak across sign-ins", () => {
  push("a", "2026-08-27T10:00:00.000Z");
  markNotificationsSeen();
  expect(unseen()).toBe(0);

  const OTHER = "dddddddd-0000-0000-0000-000000000000";
  setNotificationUser(OTHER);
  push("b", "2026-08-27T11:00:00.000Z");
  const otherHistory = JSON.parse(localStorage.getItem(`stockpilot-notification-history-${OTHER}`) || "[]");
  expect(otherHistory).toHaveLength(1);

  // Back to the first user: their own seen marker still stands.
  setNotificationUser(USER);
  expect(unseen()).toBe(0);
});

test("marking seen twice in a row is a no-op", () => {
  push("a", "2026-08-27T10:00:00.000Z");
  markNotificationsSeen();
  const first = localStorage.getItem(`stockpilot-notification-seen-at-${USER}`);
  markNotificationsSeen();
  expect(localStorage.getItem(`stockpilot-notification-seen-at-${USER}`)).toBe(first);
});
