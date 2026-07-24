import { useSyncExternalStore } from "react";

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
};

let queue: AppNotification[] = [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function pushNotification(notification: Omit<AppNotification, "id"> & { id?: string }) {
  const id = notification.id ?? `${notification.kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  if (queue.some((n) => n.id === id)) return; // de-dupe re-fires of the same event
  queue = [...queue, { ...notification, id }];
  emit();
}

export function dismissNotification(id: string) {
  queue = queue.filter((n) => n.id !== id);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return queue;
}

export function useNotificationQueue() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
