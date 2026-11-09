import { describe, expect, it } from "vitest";
import { addItems, formatShoppingList, groupByRecipe, removeDone, removeItem, removeRecipe, sanitizeShoppingList, toggleItem } from "../src/lib/shoppingList";

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
