import { afterEach, describe, expect, it, vi } from "vitest";
import { incrementLike, setRating } from "../src/lib/client/api";

afterEach(() => vi.unstubAllGlobals());

describe("запросы лайка и оценки из браузера", () => {
  it("лайк идёт PATCH-запросом с Content-Type: без него Astro отвечает 403 до бэкенда", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    await incrementLike(5814);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api-proxy/incrementLike/5814");
    expect(init.method).toBe("PATCH");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect(init.body).toBe("{}");
  });

  it("оценка отправляет JSON с Content-Type", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    await setRating(7, 4);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body as string)).toEqual({ rating: 4 });
  });
});
