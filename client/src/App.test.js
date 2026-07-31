import { clearAnalyticsEvents, trackEvent } from "./lib/analytics";
import { clearNotificationHistory, pushNotification } from "./lib/notifications";

test("records local analytics events", () => {
  clearAnalyticsEvents();
  trackEvent("dashboard_filter_changed", { filter: "buy" });

  const stored = JSON.parse(localStorage.getItem("stockpilot-analytics-events") || "[]");
  expect(stored).toHaveLength(1);
  expect(stored[0].name).toBe("dashboard_filter_changed");
  expect(stored[0].details.filter).toBe("buy");
});

test("records notification history", () => {
  clearNotificationHistory();
  pushNotification({
    id: "unit-alert",
    kind: "alert",
    title: "Alert triggered",
    description: "CAI crossed your threshold.",
  });

  const stored = JSON.parse(localStorage.getItem("stockpilot-notification-history") || "[]");
  expect(stored).toHaveLength(1);
  expect(stored[0].id).toBe("unit-alert");
  expect(stored[0].kind).toBe("alert");
});
