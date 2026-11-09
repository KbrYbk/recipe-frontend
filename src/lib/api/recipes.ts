/**
 * Серверные функции получения рецептов (SSR). Клиентский код ходит через /api-proxy (см. src/lib/client/api.ts).
 */
import type { Recipe, RecipeCard, RecipeList } from "../../types/recipe";
import { toApiSearchParams, type CatalogQuery } from "../catalog";
import { apiGet } from "./client";
import { parseRecipeArray, parseRecipeBody, parseRecipeList } from "./map";

export type LoadResult<T> = { ok: true; data: T } | { ok: false; status: number };

function withQuery(path: string, params: URLSearchParams): string {
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

/** Путь API для списка рецептов: поиск / категория / все, с фильтрами и сортировкой. */
export function recipeListPath(query: CatalogQuery, categoryId?: number): string {
  const page = query.page;
  let path: string;
  if (query.q) {
    path = `/getRecipes/search/${encodeURIComponent(query.q)}/${page}${categoryId ? `/${categoryId}` : ""}`;
  } else if (categoryId) {
    path = `/getRecipes/category/${categoryId}/${page}`;
  } else {
    path = `/getRecipes/page/${page}`;
  }
  return withQuery(path, toApiSearchParams(query));
}

export async function fetchRecipeList(query: CatalogQuery, categoryId?: number): Promise<LoadResult<RecipeList>> {
  const res = await apiGet(recipeListPath(query, categoryId));
  if (!res.ok) return { ok: false, status: res.status };
  return { ok: true, data: parseRecipeList(res.data, query.page) };
}

export const COLLECTION_TYPES = {
  breakfast: "Завтраки",
  lunch: "Обеды",
  dinner: "Ужины",
  bakery: "Выпечка",
  hd: "Здоровое питание",
} as const;
export type CollectionType = keyof typeof COLLECTION_TYPES;

export function isCollectionType(v: unknown): v is CollectionType {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(COLLECTION_TYPES, v);
}

export async function fetchCollection(type: CollectionType, page = 1): Promise<LoadResult<RecipeList>> {
  const res = await apiGet(`/getRecipes/collection/${type}/${page}`);
  if (!res.ok) return { ok: false, status: res.status };
  return { ok: true, data: parseRecipeList(res.data, page) };
}

/** Последние рецепты (n ≤ 50 по контракту). */
export async function fetchLatest(limit: number): Promise<LoadResult<RecipeCard[]>> {
  const n = Math.min(50, Math.max(1, Math.floor(limit)));
  const res = await apiGet(`/getRecipes/value/${n}`);
  if (!res.ok) return { ok: false, status: res.status };
  return { ok: true, data: parseRecipeArray(res.data) };
}

/** Рецепт по id. status 404 — не найден (в т.ч. старый API: 200 + success:false). */
export async function fetchRecipe(id: number): Promise<LoadResult<Recipe>> {
  const res = await apiGet(`/getRecipes/${id}`);
  if (!res.ok) return { ok: false, status: res.status };
  const recipe = parseRecipeBody(res.data);
  return recipe ? { ok: true, data: recipe } : { ok: false, status: 404 };
}

/** Похожие рецепты. null — эндпоинт недоступен (старый API → 404): блок нужно скрыть. */
export async function fetchSimilar(id: number, limit = 6): Promise<RecipeCard[] | null> {
  const res = await apiGet(`/getRecipes/${id}/similar?limit=${limit}`);
  if (!res.ok) return null;
  return parseRecipeArray(res.data)
    .filter((r) => r.id !== id)
    .slice(0, limit);
}

/** Общее число рецептов (из пагинатора первой страницы). 0 — неизвестно. */
export async function fetchRecipesTotal(): Promise<number> {
  const res = await apiGet("/getRecipes/page/1");
  if (!res.ok) return 0;
  return parseRecipeList(res.data, 1).total;
}

/** До 50 id из строки «1,2,3» (порядок сохраняется, дубли и мусор отбрасываются). */
export function parseIdList(raw: string | null, max = 50): number[] {
  if (!raw) return [];
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^\d{1,12}$/.test(s))
    .map(Number)
    .filter((n) => Number.isSafeInteger(n) && n > 0);
  return [...new Set(ids)].slice(0, max);
}

/**
 * Карточки по id (`/getRecipes/batch`; на старом API без batch — поштучно), порядок как в ids.
 * null — API недоступен.
 */
export async function fetchRecipeCardsByIds(ids: number[]): Promise<RecipeCard[] | null> {
  if (ids.length === 0) return [];
  const res = await apiGet(`/getRecipes/batch?ids=${ids.join(",")}`);
  let cards: RecipeCard[];
  if (res.ok) {
    cards = parseRecipeArray(res.data);
  } else if (res.status !== 404) {
    return null;
  } else {
    const single = await Promise.all(ids.map((id) => fetchRecipe(id)));
    cards = single.flatMap((r) => (r.ok ? [r.data] : []));
  }
  const order = new Map(ids.map((id, i) => [id, i]));
  return cards.filter((c) => order.has(c.id)).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}
