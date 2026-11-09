import { describe, expect, it } from "vitest";
import { paginationItems } from "../src/lib/pagination";

describe("paginationItems", () => {
  it("мало страниц — все подряд", () => {
    expect(paginationItems(1, 1)).toEqual([1]);
    expect(paginationItems(2, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(paginationItems(1, 0)).toEqual([]);
  });
  it("скачковые ссылки ±10/±50/±100", () => {
    expect(paginationItems(1, 1962)).toEqual([1, 2, 3, "...", 11, "...", 51, "...", 101, "...", 1962]);
    expect(paginationItems(83, 137)).toEqual([1, "...", 33, "...", 73, "...", 81, 82, 83, 84, 85, "...", 93, "...", 133, "...", 137]);
  });
  it("без дублей и выхода за границы", () => {
    const items = paginationItems(137, 137);
    expect(items[items.length - 1]).toBe(137);
    const nums = items.filter((x): x is number => x !== "...");
    expect(new Set(nums).size).toBe(nums.length);
    expect(Math.min(...nums)).toBe(1);
  });
});
