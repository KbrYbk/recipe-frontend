import { describe, expect, it } from "vitest";
import { levelOptions, paginationItems, responsivePaginationItems, visibilityClass } from "../src/lib/pagination";

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

describe("responsivePaginationItems", () => {
  const at = (level: "base" | "md" | "lg", current: number, total: number) =>
    responsivePaginationItems(current, total)
      .filter((i) => i.levels.includes(level))
      .map((i) => i.page ?? "...");
  it("на каждом уровне — то же, что paginationItems с опциями уровня", () => {
    for (const [c, t] of [
      [11, 1962],
      [1, 1962],
      [1000, 1962],
      [83, 137],
      [3, 5],
      [137, 137],
    ]) {
      for (const l of ["base", "md", "lg"] as const) expect(at(l, c, t)).toEqual(paginationItems(c, t, levelOptions(l, t)));
    }
  });
  it("телефон: 4-значные — только 1 … текущая … последняя", () => {
    expect(at("base", 11, 1962)).toEqual([1, "...", 11, "...", 1962]);
    expect(at("base", 50, 137)).toEqual([1, "...", 49, 50, 51, "...", 137]);
  });
  it("классы видимости", () => {
    expect(visibilityClass(["base", "md", "lg"])).toBe("inline-flex");
    expect(visibilityClass(["lg"])).toBe("hidden lg:inline-flex");
    expect(visibilityClass(["md"])).toBe("hidden md:inline-flex lg:hidden");
  });
});
