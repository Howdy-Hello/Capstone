// Several components call the same hook at once (useAchievements runs in the
// Header, the page and useLevel), and each instance used to send its own copy of
// every read. Calls with the same key while one is in flight now share it. The
// key should name the state that asked for the read, so a read made after a
// write never joins one that was sent before it.
const inflight = new Map<string, Promise<unknown>>();

export function sharedRead<T>(key: string, read: () => PromiseLike<T>): Promise<T> {
  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) return pending;
  const request = Promise.resolve(read()).finally(() => inflight.delete(key));
  inflight.set(key, request);
  return request;
}
