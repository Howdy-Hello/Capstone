import { useEffect, useRef, useState } from "react";

// Supabase Auth applies its own server-side rate limits, but those are opaque
// and not configurable from this repo. This is a client-side UX layer on top
// of that — it slows down rapid repeated login/signup attempts from a single
// browser and gives the user clear feedback, rather than a real security
// boundary (localStorage is trivially clearable). Keyed per mode+email so one
// slow account doesn't lock out attempts against a different address.

const STORAGE_PREFIX = "stockpilot-auth-throttle";
const MAX_ATTEMPTS = 5;
const BASE_COOLDOWN_MS = 30_000;
const MAX_COOLDOWN_MS = 5 * 60_000;

type ThrottleState = {
  failCount: number;
  lockCount: number;
  lockedUntil: number | null;
};

const EMPTY_STATE: ThrottleState = { failCount: 0, lockCount: 0, lockedUntil: null };

function loadState(key: string): ThrottleState {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}:${key}`);
    if (!raw) return EMPTY_STATE;
    return { ...EMPTY_STATE, ...JSON.parse(raw) };
  } catch {
    return EMPTY_STATE;
  }
}

function saveState(key: string, state: ThrottleState) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}:${key}`, JSON.stringify(state));
  } catch {
    /* storage unavailable (private browsing, quota) — throttle degrades to no-op */
  }
}

export function useAuthThrottle(key: string) {
  const stateRef = useRef<ThrottleState>(loadState(key));
  const [, tick] = useState(0);
  const forceUpdate = () => tick((n) => n + 1);

  useEffect(() => {
    stateRef.current = loadState(key);
    forceUpdate();
  }, [key]);

  const lockedUntil = stateRef.current.lockedUntil;
  useEffect(() => {
    if (!lockedUntil || lockedUntil <= Date.now()) return;
    const id = window.setInterval(forceUpdate, 1000);
    return () => window.clearInterval(id);
  }, [lockedUntil]);

  const remainingMs = lockedUntil ? Math.max(0, lockedUntil - Date.now()) : 0;

  const recordFailure = () => {
    const s = stateRef.current;
    const failCount = s.failCount + 1;
    let lockCount = s.lockCount;
    let nextLockedUntil = s.lockedUntil;
    if (failCount >= MAX_ATTEMPTS) {
      lockCount += 1;
      const cooldown = Math.min(BASE_COOLDOWN_MS * 2 ** (lockCount - 1), MAX_COOLDOWN_MS);
      nextLockedUntil = Date.now() + cooldown;
    }
    const next: ThrottleState = {
      failCount: failCount >= MAX_ATTEMPTS ? 0 : failCount,
      lockCount,
      lockedUntil: nextLockedUntil,
    };
    stateRef.current = next;
    saveState(key, next);
    forceUpdate();
  };

  const recordSuccess = () => {
    stateRef.current = EMPTY_STATE;
    saveState(key, EMPTY_STATE);
    forceUpdate();
  };

  return {
    isLocked: remainingMs > 0,
    remainingSeconds: Math.ceil(remainingMs / 1000),
    attemptsLeft: Math.max(0, MAX_ATTEMPTS - stateRef.current.failCount),
    recordFailure,
    recordSuccess,
  };
}
