import { describe, expect, it, vi } from "vitest";
import { LruCache } from "../src/lib/lruCache";

function clock(start = 0) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

describe("LruCache", () => {
  it("TTL и устаревшие значения", () => {
    const c = clock();
    const cache = new LruCache<number>({ maxEntries: 10, ttlMs: 1000, now: c.now });
    cache.set("a", 1);
    expect(cache.get("a")).toBe(1);
    c.advance(1000);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.peekStale("a")).toBe(1);
  });

  it("вытесняет давно не использованные записи", () => {
    const cache = new LruCache<number>({ maxEntries: 2, ttlMs: 1000 });
    cache.set("a", 1);
    cache.set("b", 2);
    cache.get("a"); // a — свежее использование
    cache.set("c", 3);
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBe(1);
    expect(cache.get("c")).toBe(3);
    expect(cache.size).toBe(2);
  });

  it("getOrLoad объединяет параллельные запросы (single-flight)", async () => {
    const cache = new LruCache<string>({ maxEntries: 5, ttlMs: 1000 });
    const loader = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return "v";
    });
    const results = await Promise.all([cache.getOrLoad("k", loader), cache.getOrLoad("k", loader), cache.getOrLoad("k", loader)]);
    expect(results).toEqual(["v", "v", "v"]);
    expect(loader).toHaveBeenCalledTimes(1);
    await cache.getOrLoad("k", loader);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("не кэширует, если shouldCache=false, и не залипает на ошибке", async () => {
    const cache = new LruCache<number>({ maxEntries: 5, ttlMs: 1000 });
    let n = 0;
    await cache.getOrLoad(
      "k",
      async () => ++n,
      () => false,
    );
    expect(
      await cache.getOrLoad(
        "k",
        async () => ++n,
        () => false,
      ),
    ).toBe(2);
    await expect(cache.getOrLoad("e", async () => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
    expect(await cache.getOrLoad("e", async () => 7)).toBe(7);
  });
});
