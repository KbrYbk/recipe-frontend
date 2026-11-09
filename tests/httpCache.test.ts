import { describe, expect, it } from "vitest";
import { isNotModified, lastModifiedOf, parseDate, toHttpDate } from "../src/lib/httpCache";

describe("httpCache", () => {
  it("parseDate понимает ISO с микросекундами и HTTP-дату", () => {
    expect(parseDate("2026-03-30T14:46:44.000000Z")?.toISOString()).toBe("2026-03-30T14:46:44.000Z");
    expect(parseDate("Mon, 30 Mar 2026 14:46:44 GMT")?.toISOString()).toBe("2026-03-30T14:46:44.000Z");
    expect(parseDate("мусор")).toBeNull();
    expect(parseDate(null)).toBeNull();
  });

  it("lastModifiedOf: максимум дат, округление до секунды, нижняя граница — время сборки", () => {
    expect(lastModifiedOf(["2026-03-30T14:46:44.789Z", "2026-03-01T00:00:00Z"])?.toISOString()).toBe("2026-03-30T14:46:44.000Z");
    expect(lastModifiedOf(["2026-03-30T14:46:44Z"], Date.parse("2026-11-01T00:00:00Z"))?.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(lastModifiedOf([undefined, null, "bad"])).toBeNull();
  });

  it("дата из будущего ограничивается текущим временем", () => {
    const lm = lastModifiedOf(["2999-01-01T00:00:00Z"])!;
    expect(lm.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("isNotModified: 304, если копия клиента не старше Last-Modified", () => {
    const lm = new Date("2026-03-30T14:46:44.000Z");
    expect(isNotModified(toHttpDate(lm), lm)).toBe(true);
    expect(isNotModified("Tue, 31 Mar 2026 00:00:00 GMT", lm)).toBe(true);
    expect(isNotModified("Sun, 29 Mar 2026 00:00:00 GMT", lm)).toBe(false);
    expect(isNotModified(null, lm)).toBe(false);
    expect(isNotModified("not a date", lm)).toBe(false);
  });

  it("toHttpDate — формат IMF-fixdate", () => {
    expect(toHttpDate(new Date("2026-03-30T14:46:44Z"))).toBe("Mon, 30 Mar 2026 14:46:44 GMT");
  });
});
