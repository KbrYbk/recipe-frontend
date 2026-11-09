import { describe, expect, it } from "vitest";
import { cleanIngredientAmount, formatIngredientAmount, formatIngredientLine, normalizeIngredients, normalizeSteps } from "../src/lib/normalizeIngredients";

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

describe("formatIngredientAmount (отображение битых данных)", () => {
  it("«вкусу» → «по вкусу»", () => {
    expect(formatIngredientAmount({ name: "Соль", unit: "вкусу" })).toBe("по вкусу");
    expect(formatIngredientAmount({ name: "Соль", amount: "вкусу" })).toBe("по вкусу");
    expect(formatIngredientAmount({ name: "Соль", amount: "по", unit: "вкусу" })).toBe("по вкусу");
    expect(formatIngredientAmount({ name: "Соль", unit: "по вкусу" })).toBe("по вкусу");
    expect(formatIngredientLine({ name: "Соль и перец", unit: "вкусу" })).toBe("Соль и перец — по вкусу");
  });
  it("убирает ведущие тире и дефисы", () => {
    expect(formatIngredientAmount({ name: "Хмели-сунели", amount: "- 0,5", unit: "ч.л." })).toBe("0,5 ч.л.");
    expect(formatIngredientAmount({ name: "x", amount: "—", unit: "– 2 шт." })).toBe("2 шт.");
    expect(formatIngredientAmount({ name: "x", amount: " -", unit: "" })).toBe("");
    expect(cleanIngredientAmount("-  1 ст.")).toBe("1 ст.");
  });
  it("не трогает нормальные значения", () => {
    expect(formatIngredientAmount({ name: "Мука", amount: 200, unit: "г" })).toBe("200 г");
    expect(cleanIngredientAmount("1-2 шт.")).toBe("1-2 шт.");
  });
});
