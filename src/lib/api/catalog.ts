/** Загрузка данных каталога (`/recipes` и `/{категория}`) на SSR. */
import type { RecipeList } from "../../types/recipe";
import { parseCatalogQuery, type CatalogQuery } from "../catalog";
import { resolveCategory, type Category } from "../categories";
import { getCategories } from "./categories";
import { fetchRecipeList } from "./recipes";

export type CatalogState =
  | { kind: "ok"; basePath: string; query: CatalogQuery; result: RecipeList; categories: Category[]; category: Category | null }
  | { kind: "redirect"; location: string }
  | { kind: "not_found" }
  | { kind: "unavailable" };

const LEGACY_PARAMS = ["categoryId", "category", "action"];

function withSearch(path: string, params: URLSearchParams, drop: string[]): string {
  const p = new URLSearchParams(params);
  drop.forEach((k) => p.delete(k));
  const qs = p.toString();
  return qs ? `${path}?${qs}` : path;
}

/**
 * @param categorySegment — сегмент URL категории (`/[category]`) или undefined для `/recipes`.
 */
export async function loadCatalog(url: URL, categorySegment?: string): Promise<CatalogState> {
  const categories = await getCategories();
  if (!categories) return { kind: "unavailable" };

  let category: Category | null = null;

  if (categorySegment !== undefined) {
    const resolved = resolveCategory(categorySegment, categories);
    if (!resolved) return { kind: "not_found" };
    if (resolved.redirect) return { kind: "redirect", location: withSearch(`/${resolved.category.path}`, url.searchParams, []) };
    category = resolved.category;
  } else {
    // Старые адреса /recipes?categoryId=5 и /recipes?category=Название → 301 на страницу категории.
    const legacyId = Number(url.searchParams.get("categoryId"));
    const legacyName = url.searchParams.get("category")?.trim().toLocaleLowerCase("ru-RU");
    const legacy =
      (Number.isSafeInteger(legacyId) && legacyId > 0 ? categories.find((c) => c.id === legacyId) : undefined) ??
      (legacyName ? categories.find((c) => c.title.toLocaleLowerCase("ru-RU") === legacyName || c.path === legacyName) : undefined);
    if (legacy) return { kind: "redirect", location: withSearch(`/${legacy.path}`, url.searchParams, LEGACY_PARAMS) };
  }

  const query = parseCatalogQuery(url.searchParams);
  const res = await fetchRecipeList(query, category?.id);
  if (!res.ok) return res.status === 404 ? { kind: "not_found" } : { kind: "unavailable" };

  // Страница за пределами диапазона — 404 (а не пустая индексируемая страница).
  if (query.page > 1 && res.data.list.length === 0) return { kind: "not_found" };

  return { kind: "ok", basePath: category ? `/${category.path}` : "/recipes", query, result: res.data, categories, category };
}
