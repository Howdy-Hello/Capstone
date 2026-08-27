import { clearAnalyticsEvents, setAnalyticsUser, trackEvent } from "./analytics";
import { addInboxMessage, setInboxUser } from "./inbox";
import { pushNotification, setNotificationUser } from "./notifications";

// Notification history and the analytics log used one global localStorage key
// and were never cleared on sign-out, so the next account signed in on the same
// browser opened /notifications and read the previous account's activity. These
// pin the per-user scoping that lib/inbox.ts already had.

const A = "aaaaaaaa-0000-0000-0000-000000000000";
const B = "bbbbbbbb-0000-0000-0000-000000000000";

function signIn(userId: string | null) {
  setInboxUser(userId);
  setNotificationUser(userId);
  setAnalyticsUser(userId);
}

beforeEach(() => {
  localStorage.clear();
  signIn(null);
  clearAnalyticsEvents();
});

test("notification history does not leak between accounts", () => {
  signIn(A);
  pushNotification({ id: "alert-a", kind: "alert", title: "A's alert" });
  expect(JSON.parse(localStorage.getItem(`stockpilot-notification-history-${A}`) || "[]"))
    .toHaveLength(1);

  signIn(B);
  const bHistory = JSON.parse(
    localStorage.getItem(`stockpilot-notification-history-${B}`) || "[]"
  );
  expect(bHistory).toHaveLength(0);

  pushNotification({ id: "alert-b", kind: "alert", title: "B's alert" });
  const bAfter = JSON.parse(localStorage.getItem(`stockpilot-notification-history-${B}`) || "[]");
  expect(bAfter).toHaveLength(1);
  expect(bAfter[0].title).toBe("B's alert");

  // A's history survives untouched.
  const aAfter = JSON.parse(localStorage.getItem(`stockpilot-notification-history-${A}`) || "[]");
  expect(aAfter).toHaveLength(1);
  expect(aAfter[0].title).toBe("A's alert");
});

test("analytics events do not leak between accounts", () => {
  signIn(A);
  trackEvent("dashboard_filter_changed", { filter: "buy" });
  expect(JSON.parse(localStorage.getItem(`stockpilot-analytics-events-${A}`) || "[]"))
    .toHaveLength(1);

  signIn(B);
  expect(JSON.parse(localStorage.getItem(`stockpilot-analytics-events-${B}`) || "[]"))
    .toHaveLength(0);
});

test("inbox messages do not leak between accounts", () => {
  signIn(A);
  addInboxMessage(A, { id: "m1", from: "X", subject: "s", body: "b", category: "system" });
  signIn(B);
  expect(JSON.parse(localStorage.getItem(`stockpilot-inbox-${B}`) || "[]")).toHaveLength(0);
});

test("an existing player's unscoped history migrates to their own key once", () => {
  const legacy = [{ id: "old", kind: "alert", title: "Legacy", createdAt: "2026-01-01T00:00:00Z" }];
  localStorage.setItem("stockpilot-notification-history", JSON.stringify(legacy));

  signIn(A);
  const migrated = JSON.parse(
    localStorage.getItem(`stockpilot-notification-history-${A}`) || "[]"
  );
  expect(migrated).toHaveLength(1);
  expect(migrated[0].id).toBe("old");
  // The shared key is gone, so the next account cannot inherit it.
  expect(localStorage.getItem("stockpilot-notification-history")).toBeNull();

  signIn(B);
  expect(JSON.parse(localStorage.getItem(`stockpilot-notification-history-${B}`) || "[]"))
    .toHaveLength(0);
});

test("signing out clears the live queue", () => {
  signIn(A);
  pushNotification({ id: "alert-a", kind: "alert", title: "A's alert" });
  signIn(null);
  pushNotification({ id: "alert-a", kind: "alert", title: "Signed out" });
  // Re-using the id must not be swallowed by A's queue lingering after sign-out.
  const out = JSON.parse(localStorage.getItem("stockpilot-notification-history") || "[]");
  expect(out).toHaveLength(1);
  expect(out[0].title).toBe("Signed out");
});
