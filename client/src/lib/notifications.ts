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

const HISTORY_KEY = "stockpilot-notification-history";
const MAX_HISTORY = 80;
let queue: AppNotification[] = [];
let history = loadHistory();
const listeners = new Set<() => void>();

function loadHistory(): AppNotification[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) as AppNotification[] : [];
  } catch {
    return [];
  }
}

function persistHistory() {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
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
