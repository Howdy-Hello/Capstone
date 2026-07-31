import { useSyncExternalStore } from "react";

const STORAGE_KEY = "stockpilot-analytics-events";
const MAX_EVENTS = 250;

export type AnalyticsEvent = {
  id: string;
  name: string;
  createdAt: string;
  details?: Record<string, string | number | boolean | null>;
};

let events = loadEvents();
const listeners = new Set<() => void>();

function loadEvents(): AnalyticsEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as AnalyticsEvent[] : [];
  } catch {
    return [];
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(0, MAX_EVENTS)));
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
