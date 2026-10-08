import { useSyncExternalStore } from "react";

// A persistent, in-character inbox mirroring the toast notification system:
// mission/bill/rival/achievement/level events also land here as "emails"
// from in-game senders, so a player can catch up on what happened without
// having watched every toast. Stored per-user in localStorage — same
// durability tier as streaks/bills, since none of this is competitive or
// cross-device critical.
export type InboxCategory = "mission" | "advisor" | "bill" | "rival" | "achievement" | "level" | "system";

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
// Market news is generated from the game seed rather than stored, so it cannot
// carry a `read` flag of its own. Read state lives here instead, keyed by the
// story's stable newsId, so the inbox can show news beside real messages.
let readNews: ReadonlySet<string> = new Set();
const listeners = new Set<() => void>();

function storageKey(userId: string) {
  return `stockpilot-inbox-${userId}`;
}

function readNewsKey(userId: string) {
  return `stockpilot-inbox-read-news-${userId}`;
}

function loadReadNews(userId: string): ReadonlySet<string> {
  try {
    const raw = localStorage.getItem(readNewsKey(userId));
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {
    /* ignore malformed local state */
  }
  return new Set();
}

function persistReadNews() {
  if (!currentUserId) return;
  try {
    localStorage.setItem(readNewsKey(currentUserId), JSON.stringify([...readNews]));
  } catch {
    /* ignore storage quota errors */
  }
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
  readNews = userId ? loadReadNews(userId) : new Set();
  emit();
}

/** Mark one generated news story as read. */
export function markNewsRead(newsId: string) {
  if (readNews.has(newsId)) return;
  const next = new Set(readNews);
  next.add(newsId);
  readNews = next;
  persistReadNews();
  emit();
}

/** Mark a batch of news stories as read (used by "mark all read"). */
export function markNewsReadBatch(newsIds: string[]) {
  const missing = newsIds.filter((id) => !readNews.has(id));
  if (missing.length === 0) return;
  const next = new Set(readNews);
  missing.forEach((id) => next.add(id));
  readNews = next;
  persistReadNews();
  emit();
}

function getReadNewsSnapshot() {
  return readNews;
}

/**
 * Referentially stable between changes, which useSyncExternalStore requires --
 * returning a fresh Set each call would loop forever.
 */
export function useReadNewsIds() {
  return useSyncExternalStore(subscribe, getReadNewsSnapshot, getReadNewsSnapshot);
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

export function useUnreadInboxCount(news: { newsId: string }[] = []) {
  const list = useInboxMessages();
  const read = useReadNewsIds();
  return list.filter((message) => !message.read).length + news.filter((item) => !read.has(item.newsId)).length;
}
