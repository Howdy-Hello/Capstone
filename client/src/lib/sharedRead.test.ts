import { sharedRead } from "./sharedRead";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

test("concurrent reads with the same key send one request", async () => {
  const response = deferred<number>();
  const read = jest.fn(() => response.promise);

  const first = sharedRead("unlocks:user-1:hydrate", read);
  const second = sharedRead("unlocks:user-1:hydrate", read);
  response.resolve(3);

  await expect(first).resolves.toBe(3);
  await expect(second).resolves.toBe(3);
  expect(read).toHaveBeenCalledTimes(1);
});

test("different keys and later reads each send their own request", async () => {
  const read = jest.fn(async () => "rows");

  await Promise.all([sharedRead("trades:run-1:2000|", read), sharedRead("trades:run-1:1800|CAI:2", read)]);
  expect(read).toHaveBeenCalledTimes(2);

  // The first read finished, so the same key reads again instead of reusing it.
  await sharedRead("trades:run-1:2000|", read);
  expect(read).toHaveBeenCalledTimes(3);
});

test("a failed read is not kept", async () => {
  const read = jest.fn()
    .mockImplementationOnce(() => Promise.reject(new Error("offline")))
    .mockImplementationOnce(() => Promise.resolve("ok"));

  await expect(sharedRead("rates:user-1:hydrate", read)).rejects.toThrow("offline");
  await expect(sharedRead("rates:user-1:hydrate", read)).resolves.toBe("ok");
});
