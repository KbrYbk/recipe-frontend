import { describe, expect, it } from "vitest";
import {
  addItems,
  combineAmounts,
  formatMergedShoppingList,
  formatShoppingList,
  groupByRecipe,
  mergeShoppingItems,
  normalizeItemName,
  removeDone,
  removeItem,
  removeItems,
  removeRecipe,
  sanitizeShoppingList,
  setItemsDone,
  toggleItem,
} from "../src/lib/shoppingList";

describe("shoppingList", () => {
  const base = addItems(
    [],
    [
      { name: "Мука", amount: "200 г", recipeId: 1, recipeTitle: "Блины", recipeUrl: "/recipe/1-bliny" },
      { name: "Молоко", amount: "0.5 л", recipeId: 1, recipeTitle: "Блины", recipeUrl: "/recipe/1-bliny" },
      { name: "Хлеб" },
    ],
  ).list;

  it("добавляет без дублей", () => {
    expect(base).toHaveLength(3);
    const again = addItems(base, [
      { name: " мука ", recipeId: 1 },
      { name: "Мука", recipeId: 2, recipeTitle: "Пирог" },
    ]);
    expect(again.added).toBe(1);
  });
  it("отметка, удаление, очистка купленного", () => {
    const toggled = toggleItem(base, base[0].id);
    expect(toggled[0].done).toBe(true);
    expect(removeDone(toggled)).toHaveLength(2);
    expect(removeItem(base, base[2].id)).toHaveLength(2);
    expect(removeRecipe(base, 1)).toHaveLength(1);
  });
  it("группировка и текст для «Поделиться»", () => {
    const groups = groupByRecipe(base);
    expect(groups.map((g) => g.title)).toEqual(["Блины", "Мои покупки"]);
    const text = formatShoppingList(toggleItem(base, base[1].id));
    expect(text).toBe("Список покупок:\n\nБлины:\n• Мука — 200 г\n\nМои покупки:\n• Хлеб");
    expect(formatShoppingList([])).toBe("Список покупок пуст");
  });
  it("санитизация данных из localStorage", () => {
    const list = sanitizeShoppingList([{ name: "Соль", done: true, recipeUrl: "javascript:alert(1)", recipeId: "x" }, { name: "" }, 5, null]);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ name: "Соль", done: true });
    expect(list[0].recipeUrl).toBeUndefined();
    expect(list[0].recipeId).toBeUndefined();
    expect(sanitizeShoppingList("nope")).toEqual([]);
  });
});

describe("общий список (объединение одинаковых ингредиентов)", () => {
  const list = addItems(
    [],
    [
      { name: "Молоко", amount: "50 мл", recipeId: 1, recipeTitle: "Блины" },
      { name: "молоко ", amount: "200 мл", recipeId: 2, recipeTitle: "Каша" },
      { name: "Сахар", amount: "0,5 ст.", recipeId: 1, recipeTitle: "Блины" },
      { name: "Сахар", amount: "1 ст", recipeId: 2, recipeTitle: "Каша" },
      { name: "Мука", amount: "50 мл", recipeId: 1, recipeTitle: "Блины" },
      { name: "Мука", amount: "1 ст.", recipeId: 2, recipeTitle: "Каша" },
      { name: "Соль", amount: "по вкусу", recipeId: 1, recipeTitle: "Блины" },
      { name: "Ёжики", recipeId: 2, recipeTitle: "Каша" },
    ],
  ).list;

  it("суммирует одинаковые единицы (в т.ч. «0,5»)", () => {
    const merged = mergeShoppingItems(list);
    expect(merged.find((m) => m.key === "молоко")).toMatchObject({ name: "Молоко", amount: "250 мл", recipes: ["Блины", "Каша"] });
    expect(merged.find((m) => m.key === "сахар")?.amount).toBe("1,5 ст.");
  });
  it("разные единицы — перечисление", () => {
    expect(mergeShoppingItems(list).find((m) => m.key === "мука")?.amount).toBe("50 мл + 1 ст.");
    expect(combineAmounts(["2 шт.", "по вкусу"])).toBe("2 шт. + по вкусу");
    expect(combineAmounts(["1-2 шт.", "1 шт."])).toBe("1-2 шт. + 1 шт.");
    expect(combineAmounts(["1/2 стакана", "1 стакана"])).toBe("1,5 стакана");
    expect(combineAmounts(["2", "3"])).toBe("5");
    expect(combineAmounts(["", "100 г"])).toBe("100 г");
  });
  it("одиночные позиции без изменений, ё = е", () => {
    const merged = mergeShoppingItems(list);
    expect(merged.find((m) => m.key === "соль")?.amount).toBe("по вкусу");
    expect(normalizeItemName(" Ёжики. ")).toBe("ежики");
    expect(merged).toHaveLength(5);
  });
  it("отметка и удаление строки общего списка", () => {
    const row = mergeShoppingItems(list).find((m) => m.key === "молоко")!;
    const done = setItemsDone(list, row.ids, true);
    expect(mergeShoppingItems(done).find((m) => m.key === "молоко")?.done).toBe(true);
    expect(removeItems(list, row.ids)).toHaveLength(list.length - 2);
    expect(formatMergedShoppingList(done)).not.toContain("Молоко");
    expect(formatMergedShoppingList(list)).toContain("• Молоко — 250 мл");
  });
});
