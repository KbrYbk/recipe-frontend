import { describe, expect, it } from "vitest";
import { formatTime } from "../src/lib/formatTime";

describe("formatTime", () => {
  it("минуты и часы", () => {
    expect(formatTime(45)).toBe("45м");
    expect(formatTime(60)).toBe("1ч");
    expect(formatTime(95)).toBe("1ч 35м");
    expect(formatTime("30")).toBe("30м");
  });
  it("пустые и невалидные", () => {
    expect(formatTime(undefined)).toBe("");
    expect(formatTime(null)).toBe("");
    expect(formatTime("abc")).toBe("");
  });
});
