/** Список покупок: чистые операции над массивом позиций (хранение — localStorage на клиенте). */
import { formatNumber, parseNumber } from "./scaleAmount";

export const SHOPPING_LIST_KEY = "swageda:shopping-list";
const MAX_ITEMS = 500;

export interface ShoppingItem {
  id: string;
  name: string;
  amount?: string;
  recipeId?: number;
  recipeTitle?: string;
  recipeUrl?: string;
  done: boolean;
}

export interface NewShoppingItem {
  name: string;
  amount?: string;
  recipeId?: number;
  recipeTitle?: string;
  recipeUrl?: string;
}

function itemKey(i: { name: string; recipeId?: number }): string {
  return `${i.recipeId ?? ""}::${i.name.trim().toLocaleLowerCase("ru-RU")}`;
}

let counter = 0;
function newId(): string {
  counter = (counter + 1) % 1_000_000;
  return `${Date.now().toString(36)}-${counter.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Валидация данных из localStorage: всё, что не похоже на позицию, отбрасывается. */
export function sanitizeShoppingList(raw: unknown): ShoppingItem[] {
  if (!Array.isArray(raw)) return [];
  const out: ShoppingItem[] = [];
  for (const v of raw) {
    if (!v || typeof v !== "object") continue;
    const o = v as Record<string, unknown>;
    const name = typeof o.name === "string" ? o.name.trim().slice(0, 200) : "";
    if (!name) continue;
    const recipeId = Number(o.recipeId);
    out.push({
      id: typeof o.id === "string" && o.id ? o.id : newId(),
      name,
      ...(typeof o.amount === "string" && o.amount.trim() ? { amount: o.amount.trim().slice(0, 60) } : {}),
      ...(Number.isSafeInteger(recipeId) && recipeId > 0 ? { recipeId } : {}),
      ...(typeof o.recipeTitle === "string" && o.recipeTitle ? { recipeTitle: o.recipeTitle.slice(0, 200) } : {}),
      ...(typeof o.recipeUrl === "string" && o.recipeUrl.startsWith("/") ? { recipeUrl: o.recipeUrl } : {}),
      done: o.done === true,
    });
  }
  return out.slice(0, MAX_ITEMS);
}

/** Добавить позиции; дубликаты (то же название в том же рецепте) пропускаются. */
export function addItems(list: ShoppingItem[], items: NewShoppingItem[]): { list: ShoppingItem[]; added: number } {
  const keys = new Set(list.map(itemKey));
  const next = [...list];
  let added = 0;
  for (const it of items) {
    const name = it.name.trim();
    if (!name || next.length >= MAX_ITEMS) continue;
    const key = itemKey({ name, recipeId: it.recipeId });
    if (keys.has(key)) continue;
    keys.add(key);
    next.push({
      id: newId(),
      name,
      ...(it.amount?.trim() ? { amount: it.amount.trim() } : {}),
      ...(it.recipeId ? { recipeId: it.recipeId } : {}),
      ...(it.recipeTitle ? { recipeTitle: it.recipeTitle } : {}),
      ...(it.recipeUrl ? { recipeUrl: it.recipeUrl } : {}),
      done: false,
    });
    added++;
  }
  return { list: next, added };
}

export function toggleItem(list: ShoppingItem[], id: string): ShoppingItem[] {
  return list.map((i) => (i.id === id ? { ...i, done: !i.done } : i));
}

export function removeItem(list: ShoppingItem[], id: string): ShoppingItem[] {
  return list.filter((i) => i.id !== id);
}

export function removeDone(list: ShoppingItem[]): ShoppingItem[] {
  return list.filter((i) => !i.done);
}

export function removeRecipe(list: ShoppingItem[], recipeId: number): ShoppingItem[] {
  return list.filter((i) => i.recipeId !== recipeId);
}

export interface ShoppingGroup {
  recipeId?: number;
  title: string;
  url?: string;
  items: ShoppingItem[];
}

/** Группировка по рецептам (порядок первого появления); позиции без рецепта — «Мои покупки». */
export function groupByRecipe(list: ShoppingItem[]): ShoppingGroup[] {
  const groups = new Map<string, ShoppingGroup>();
  for (const item of list) {
    const key = item.recipeId ? `r${item.recipeId}` : "own";
    let g = groups.get(key);
    if (!g) {
      g = { ...(item.recipeId ? { recipeId: item.recipeId } : {}), title: item.recipeId ? item.recipeTitle || "Рецепт" : "Мои покупки", ...(item.recipeUrl ? { url: item.recipeUrl } : {}), items: [] };
      groups.set(key, g);
    }
    g.items.push(item);
  }
  return [...groups.values()];
}

/** Текст для копирования/«Поделиться»: только некупленные позиции, сгруппированные по рецептам. */
export function formatShoppingList(list: ShoppingItem[]): string {
  const lines: string[] = ["Список покупок:"];
  for (const g of groupByRecipe(list.filter((i) => !i.done))) {
    lines.push("", `${g.title}:`);
    for (const i of g.items) lines.push(`• ${i.name}${i.amount ? ` - ${i.amount}` : ""}`);
  }
  return lines.length > 1 ? lines.join("\n") : "Список покупок пуст";
}

/** Ключ для объединения одинаковых ингредиентов: регистр, «ё», лишние пробелы и знаки по краям. */
export function normalizeItemName(name: string): string {
  return name
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ")
    .replace(/^[\s\-–—•.,:;]+|[\s.,:;]+$/g, "")
    .trim();
}

/** «50 мл» → { value: 50, unit: "мл" }; «0,5 ст.» → { value: 0.5, unit: "ст" }; иначе null. */
export function parseAmount(amount: string): { value: number; unit: string; unitLabel: string } | null {
  const m = amount.trim().match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?|[½¼¾⅓⅔⅛])\s*(.*)$/u);
  if (!m) return null;
  const value = parseNumber(m[1]);
  if (value === null) return null;
  const unitLabel = m[2].trim();
  if (/\d/.test(unitLabel)) return null; // «1 стакан (200 мл)», «1-2 шт.» — не складываем
  return { value, unit: unitLabel.toLocaleLowerCase("ru-RU").replace(/\.$/, "").replace(/\s+/g, " "), unitLabel };
}

/** Сумма количеств, если все числовые и с одной единицей; иначе перечисление через « + ». */
export function combineAmounts(amounts: string[]): string {
  const list = amounts.map((a) => a.trim()).filter(Boolean);
  if (list.length <= 1) return list[0] ?? "";
  const parsed = list.map(parseAmount);
  if (parsed.every((p) => p !== null) && parsed.every((p) => p!.unit === parsed[0]!.unit)) {
    const total = parsed.reduce((sum, p) => sum + p!.value, 0);
    return [formatNumber(total), parsed[0]!.unitLabel].filter(Boolean).join(" ");
  }
  return list.join(" + ");
}

export interface MergedShoppingItem {
  key: string;
  name: string;
  amount: string;
  ids: string[];
  /** Рецепты, из которых пришёл ингредиент (без «Мои покупки»). */
  recipes: string[];
  done: boolean;
}

/** Общий список: одинаковые ингредиенты из разных рецептов — одна строка с суммой количеств. */
export function mergeShoppingItems(list: ShoppingItem[]): MergedShoppingItem[] {
  const map = new Map<string, { name: string; items: ShoppingItem[] }>();
  for (const item of list) {
    const key = normalizeItemName(item.name);
    if (!key) continue;
    const entry = map.get(key);
    if (entry) entry.items.push(item);
    else map.set(key, { name: item.name, items: [item] });
  }
  return [...map.entries()].map(([key, { name, items }]) => ({
    key,
    name,
    amount: combineAmounts(items.map((i) => i.amount ?? "")),
    ids: items.map((i) => i.id),
    recipes: [...new Set(items.map((i) => i.recipeTitle).filter((t): t is string => !!t))],
    done: items.every((i) => i.done),
  }));
}

/** Отметить/снять отметку сразу у нескольких позиций (строка общего списка). */
export function setItemsDone(list: ShoppingItem[], ids: string[], done: boolean): ShoppingItem[] {
  const set = new Set(ids);
  return list.map((i) => (set.has(i.id) ? { ...i, done } : i));
}

export function removeItems(list: ShoppingItem[], ids: string[]): ShoppingItem[] {
  const set = new Set(ids);
  return list.filter((i) => !set.has(i.id));
}

/** Текст общего списка (некупленное) для копирования/«Поделиться». */
export function formatMergedShoppingList(list: ShoppingItem[]): string {
  const rows = mergeShoppingItems(list.filter((i) => !i.done));
  if (rows.length === 0) return "Список покупок пуст";
  return ["Список покупок:", "", ...rows.map((r) => `• ${r.name}${r.amount ? ` - ${r.amount}` : ""}`)].join("\n");
}
