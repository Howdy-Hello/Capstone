import { useSyncExternalStore } from "react";

// A persistent, in-character inbox mirroring the toast notification system:
// mission/bill/rival/achievement/level events also land here as "emails"
// from in-game senders, so a player can catch up on what happened without
// having watched every toast. Stored per-user in localStorage — same
// durability tier as streaks/bills, since none of this is competitive or
// cross-device critical.
export type InboxCategory = "mission" | "bill" | "rival" | "achievement" | "level" | "system";

export type InboxMessage = {
  id: string;
  from: string;
  subject: string;
  body: string;
  category: InboxCategory;
  createdAt: string;
  read: boolean;
};

const MAX_MESSAGES = 200;

let currentUserId: string | null = null;
let messages: InboxMessage[] = [];
const listeners = new Set<() => void>();

function storageKey(userId: string) {
  return `stockpilot-inbox-${userId}`;
}

function load(userId: string): InboxMessage[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (raw) return JSON.parse(raw) as InboxMessage[];
  } catch {
    /* ignore malformed local state */
  }
  return [];
}

function persist() {
  if (!currentUserId) return;
  try {
    localStorage.setItem(storageKey(currentUserId), JSON.stringify(messages));
  } catch {
    /* ignore storage quota errors */
  }
}

function emit() {
  listeners.forEach((listener) => listener());
}

export function setInboxUser(userId: string | null) {
  if (userId === currentUserId) return;
  currentUserId = userId;
  messages = userId ? load(userId) : [];
  emit();
}

export function addInboxMessage(
  userId: string,
  message: Omit<InboxMessage, "id" | "createdAt" | "read"> & { id?: string }
) {
  if (userId !== currentUserId) setInboxUser(userId);

  const id = message.id
    ?? `${message.category}-${message.subject}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  if (messages.some((existing) => existing.id === id)) return;

  messages = [
    { ...message, id, createdAt: new Date().toISOString(), read: false },
    ...messages,
  ].slice(0, MAX_MESSAGES);
  persist();
  emit();
}

export function markMessageRead(id: string) {
  messages = messages.map((message) => (message.id === id ? { ...message, read: true } : message));
  persist();
  emit();
}

export function markAllRead() {
  if (!messages.some((message) => !message.read)) return;
  messages = messages.map((message) => (message.read ? message : { ...message, read: true }));
  persist();
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return messages;
}

export function useInboxMessages() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useUnreadInboxCount() {
  const list = useInboxMessages();
  return list.filter((message) => !message.read).length;
}
