import { addInboxMessage, setInboxUser, useInboxMessages } from "./inbox";
import { clearNotificationHistory, dismissNotification, pushNotification } from "./notifications";

// <Header /> renders on every route and Game.tsx calls useLevel() alongside the
// same hooks useLevel calls internally, so /game mounts three live
// useAchievements instances and two useMissions instances. Each runs the same
// "did this just complete?" effect, so each fires the same inbox/toast write.
// Both sinks dedupe on id, but only when the caller supplies one -- the
// fallback id ends in Date.now() + Math.random(), which is unique per instance.
// These tests pin the stable ids that make the sinks idempotent.

const USER = "11111111-1111-1111-1111-111111111111";

function inboxSnapshot() {
  // useInboxMessages is a useSyncExternalStore hook; read the same store the
  // way the store itself exposes it rather than mounting a component.
  return JSON.parse(localStorage.getItem(`stockpilot-inbox-${USER}`) || "[]");
}

beforeEach(() => {
  localStorage.clear();
  setInboxUser(null);
  setInboxUser(USER);
  clearNotificationHistory();
});

test("three concurrent hook instances unlock one achievement once", () => {
  for (let instance = 0; instance < 3; instance += 1) {
    addInboxMessage(USER, {
      id: "achievement-first_trade",
      from: "Achievements Desk",
      subject: "Achievement unlocked: First Trade",
      body: "Place your first trade. Reward: 50 XP.",
      category: "achievement",
    });
  }

  const messages = inboxSnapshot();
  expect(messages).toHaveLength(1);
  expect(messages[0].id).toBe("achievement-first_trade");
});

test("two concurrent hook instances complete one mission once", () => {
  for (let instance = 0; instance < 2; instance += 1) {
    pushNotification({
      id: "mission-make_a_trade",
      kind: "mission",
      title: "Mission complete: Make a trade",
      description: "+25 XP",
    });
    addInboxMessage(USER, {
      id: "mission-make_a_trade",
      from: "Onboarding Coach",
      subject: "Mission complete: Make a trade",
      body: "You earned +25 XP.",
      category: "mission",
    });
  }

  expect(inboxSnapshot()).toHaveLength(1);
  const history = JSON.parse(localStorage.getItem("stockpilot-notification-history") || "[]");
  expect(history.filter((n: { id: string }) => n.id === "mission-make_a_trade")).toHaveLength(1);
});

test("distinct events still land separately", () => {
  addInboxMessage(USER, {
    id: "achievement-first_trade", from: "Achievements Desk",
    subject: "a", body: "a", category: "achievement",
  });
  addInboxMessage(USER, {
    id: "achievement-diversified", from: "Achievements Desk",
    subject: "b", body: "b", category: "achievement",
  });
  expect(inboxSnapshot()).toHaveLength(2);
});

test("an omitted id still yields unique messages (legacy callers)", () => {
  addInboxMessage(USER, { from: "X", subject: "s", body: "b", category: "system" });
  addInboxMessage(USER, { from: "X", subject: "s", body: "b", category: "system" });
  expect(inboxSnapshot().length).toBeGreaterThan(1);
});

test("dismissing a toast does not resurrect it in history", () => {
  pushNotification({ id: "rival-7", kind: "rival", title: "Vexa Quant", description: "..." });
  dismissNotification("rival-7");
  pushNotification({ id: "rival-7", kind: "rival", title: "Vexa Quant", description: "..." });
  const history = JSON.parse(localStorage.getItem("stockpilot-notification-history") || "[]");
  expect(history.filter((n: { id: string }) => n.id === "rival-7")).toHaveLength(1);
});

// Keep the unused-import lint quiet: the hook is part of the module's contract.
void useInboxMessages;
