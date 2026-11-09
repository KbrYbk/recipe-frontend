/** Список покупок: чистые операции над массивом позиций (хранение — localStorage на клиенте). */

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
    for (const i of g.items) lines.push(`• ${i.name}${i.amount ? ` — ${i.amount}` : ""}`);
  }
  return lines.length > 1 ? lines.join("\n") : "Список покупок пуст";
}
