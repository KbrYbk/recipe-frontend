import { describe, expect, it } from "vitest";
import { formatIngredientLine, normalizeIngredients, normalizeSteps } from "../src/lib/normalizeIngredients";

describe("normalizeIngredients", () => {
  it("строки и объекты", () => {
    expect(normalizeIngredients(["Соль", { name: "Мука", amount: "200", unit: "г" }, { name: "Яйца", amount: 2 }])).toEqual([
      { name: "Соль" },
      { name: "Мука", amount: "200", unit: "г" },
      { name: "Яйца", amount: 2 },
    ]);
  });
  it("отбрасывает пустое и не-массивы", () => {
    expect(normalizeIngredients([" ", { name: "" }, null, { foo: 1 }])).toEqual([]);
    expect(normalizeIngredients(null)).toEqual([]);
    expect(normalizeIngredients({ name: "x" })).toEqual([]);
  });
  it("форматирует строку", () => {
    expect(formatIngredientLine({ name: "Мука", amount: "200", unit: "г" })).toBe("Мука — 200 г");
    expect(formatIngredientLine({ name: "Соль" })).toBe("Соль");
  });
});

describe("normalizeSteps", () => {
  it("строки, объекты, картинки", () => {
    const steps = normalizeSteps(["Нарезать", { order: 2, text: "Жарить", image: "/storage/a.jpg" }, { text: "" }], (s) => (s ? `/api-images${s}` : s));
    expect(steps).toEqual([
      { order: 1, text: "Нарезать" },
      { order: 2, text: "Жарить", image: "/api-images/storage/a.jpg" },
    ]);
  });
});
