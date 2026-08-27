import { useSyncExternalStore } from "react";

// Scoped per user: a single global key let the next account signed in on this
// browser read the previous account's event log.
const STORAGE_KEY = "stockpilot-analytics-events";
const MAX_EVENTS = 250;

function storageKey(userId: string | null) {
  return userId ? `${STORAGE_KEY}-${userId}` : STORAGE_KEY;
}

let currentUserId: string | null = null;

export type AnalyticsEvent = {
  id: string;
  name: string;
  createdAt: string;
  details?: Record<string, string | number | boolean | null>;
};

let events = loadEvents(null);
const listeners = new Set<() => void>();

function loadEvents(userId: string | null): AnalyticsEvent[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? JSON.parse(raw) as AnalyticsEvent[] : [];
  } catch {
    return [];
  }
}

/** Point the store at a user (or null on sign-out). Mirrors setInboxUser. */
export function setAnalyticsUser(userId: string | null) {
  if (userId === currentUserId) return;
  currentUserId = userId;
  events = loadEvents(userId);
  emit();
}

function persist() {
  try {
    localStorage.setItem(storageKey(currentUserId), JSON.stringify(events.slice(0, MAX_EVENTS)));
  } catch {
    /* analytics degrades silently when storage is unavailable */
  }
}

function emit() {
  listeners.forEach((listener) => listener());
}

export function trackEvent(name: string, details?: AnalyticsEvent["details"]) {
  events = [{
    id: `analytics-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    details,
    createdAt: new Date().toISOString(),
  }, ...events].slice(0, MAX_EVENTS);
  persist();
  emit();
}

export function clearAnalyticsEvents() {
  events = [];
  persist();
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return events;
}

export function useAnalyticsEvents() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
