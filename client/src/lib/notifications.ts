import { useSyncExternalStore } from "react";
import { trackEvent } from "./analytics";

// Lightweight global pub-sub for cross-feature toast notifications (stock
// alerts, missions, bills, rival trader). Achievements keep their own
// dedicated queue/toast (Game.tsx) since that flow already carries extra
// unlock-specific data (reward, rarity) — this store is for the newer,
// simpler "heads up" style notifications so each feature hook doesn't have
// to reimplement its own fixed-position toast + queue.

export type NotificationKind = "alert" | "mission" | "bill" | "rival" | "advisor" | "info";

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  description?: string;
  durationMs?: number;
  createdAt?: string;
};

// Scoped per user, like lib/inbox.ts. A single global key meant the next
// account signed in on the same browser opened /notifications and read the
// previous account's activity -- and it was never cleared on sign-out. The
// legacy unscoped key is still read once for the first signed-in user so an
// existing player does not lose their history on upgrade.
const HISTORY_KEY = "stockpilot-notification-history";
const SEEN_KEY = "stockpilot-notification-seen-at";
const MAX_HISTORY = 80;

function historyKey(userId: string | null) {
  return userId ? `${HISTORY_KEY}-${userId}` : HISTORY_KEY;
}

function seenKey(userId: string | null) {
  return userId ? `${SEEN_KEY}-${userId}` : SEEN_KEY;
}

let currentUserId: string | null = null;
let queue: AppNotification[] = [];
let history = loadHistory(null);
// Notifications have no per-item read flag, so "unread" is everything pushed
// since the last time the list was opened. A timestamp is enough and stays
// correct no matter how many arrive while the page is closed.
let seenAt = loadSeenAt(null);
const listeners = new Set<() => void>();

function loadSeenAt(userId: string | null): string {
  try {
    return localStorage.getItem(seenKey(userId)) ?? "";
  } catch {
    return "";
  }
}

function readKey(key: string): AppNotification[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as AppNotification[] : [];
  } catch {
    return [];
  }
}

function loadHistory(userId: string | null): AppNotification[] {
  if (!userId) return readKey(HISTORY_KEY);
  const scoped = readKey(historyKey(userId));
  if (scoped.length > 0) return scoped;
  // One-time migration off the shared key.
  const legacy = readKey(HISTORY_KEY);
  if (legacy.length > 0) {
    try {
      localStorage.setItem(historyKey(userId), JSON.stringify(legacy));
      localStorage.removeItem(HISTORY_KEY);
    } catch { /* ignore storage quota errors */ }
  }
  return legacy;
}

/** Point the store at a user (or null on sign-out). Mirrors setInboxUser. */
/** Called when the notifications list is opened. */
export function markNotificationsSeen() {
  const newest = history[0]?.createdAt;
  // Stamp from the newest item rather than "now", so a notification pushed in
  // the same tick as the visit is not silently swallowed.
  const next = newest ?? new Date().toISOString();
  if (next === seenAt) return;
  seenAt = next;
  try {
    localStorage.setItem(seenKey(currentUserId), seenAt);
  } catch {
    /* the badge is a convenience, not critical state */
  }
  emit();
}

function getUnseenCount() {
  if (!seenAt) return history.length;
  return history.filter((n) => (n.createdAt ?? "") > seenAt).length;
}

let unseenSnapshot = 0;
function getUnseenSnapshot() {
  // useSyncExternalStore compares snapshots by identity, and a number is a
  // primitive, so recomputing per call is safe as long as it is stable.
  unseenSnapshot = getUnseenCount();
  return unseenSnapshot;
}

/** Count of notifications pushed since the list was last opened. */
export function useUnseenNotificationCount() {
  return useSyncExternalStore(getUnseenSubscribe, getUnseenSnapshot, getUnseenSnapshot);
}

function getUnseenSubscribe(listener: () => void) {
  return subscribe(listener);
}

export function setNotificationUser(userId: string | null) {
  if (userId === currentUserId) return;
  currentUserId = userId;
  queue = [];
  history = loadHistory(userId);
  seenAt = loadSeenAt(userId);
  emit();
}

function persistHistory() {
  try {
    localStorage.setItem(historyKey(currentUserId), JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch {
    /* notification history is helpful, not critical */
  }
}

function emit() {
  listeners.forEach((listener) => listener());
}

export function pushNotification(notification: Omit<AppNotification, "id"> & { id?: string }) {
  const id = notification.id ?? `${notification.kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  if (queue.some((n) => n.id === id)) return; // de-dupe re-fires of the same event
  const createdAt = notification.createdAt ?? new Date().toISOString();
  const next = { ...notification, id, createdAt };
  queue = [...queue, next];
  history = [next, ...history.filter((n) => n.id !== id)].slice(0, MAX_HISTORY);
  persistHistory();
  trackEvent("notification_pushed", { kind: next.kind, title: next.title });
  emit();
}

export function dismissNotification(id: string) {
  queue = queue.filter((n) => n.id !== id);
  emit();
}

export function clearNotificationHistory() {
  history = [];
  persistHistory();
  // Nothing left to be unread about.
  seenAt = new Date().toISOString();
  try { localStorage.setItem(seenKey(currentUserId), seenAt); } catch { /* ignore */ }
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return queue;
}

function getHistorySnapshot() {
  return history;
}

export function useNotificationQueue() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useNotificationHistory() {
  return useSyncExternalStore(subscribe, getHistorySnapshot, getHistorySnapshot);
}
