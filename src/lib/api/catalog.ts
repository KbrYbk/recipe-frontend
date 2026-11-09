/** Загрузка данных каталога (`/recipes` и `/{категория}`) на SSR. */
import type { RecipeList } from "../../types/recipe";
import { isPristineFirstPage, mergeFeatured, parseCatalogQuery, type CatalogQuery } from "../catalog";
import { resolveCategory, type Category } from "../categories";
import { getCategories } from "./categories";
import { fetchRecipeCardsByIds, fetchRecipeList } from "./recipes";
import { fetchLanding } from "./landings";
import { isLandingSlugCandidate, type Landing } from "../landings";

export type CatalogState =
  | { kind: "ok"; basePath: string; query: CatalogQuery; result: RecipeList; categories: Category[]; category: Category | null; landing?: Landing | null }
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

/** Закреплённые рецепты раздела — первыми на чистой 1-й странице (при сбое API — просто без них). */
async function withFeatured(result: RecipeList, ids: number[] | undefined, query: CatalogQuery): Promise<RecipeList> {
  if (!ids?.length || !isPristineFirstPage(query)) return result;
  const featured = await fetchRecipeCardsByIds(ids);
  return featured?.length ? { ...result, list: mergeFeatured(featured, result.list) } : result;
}

/** Лендинг `/{slug}`: только если сегмент не категория. Поиск на лендинге не поддерживается (q игнорируется). */
async function loadLanding(url: URL, segment: string, categories: Category[]): Promise<CatalogState> {
  const slug = decodeURIComponentSafe(segment).trim();
  if (!isLandingSlugCandidate(slug)) return { kind: "not_found" };
  const query = { ...parseCatalogQuery(url.searchParams), q: "" };
  const res = await fetchLanding(slug, query);
  if (!res.ok) return res.status === 404 ? { kind: "not_found" } : { kind: "unavailable" };
  const { landing } = res.data;
  if (landing.slug !== slug) return { kind: "redirect", location: withSearch(`/${landing.slug}`, url.searchParams, []) };
  if (query.page > 1 && res.data.result.list.length === 0) return { kind: "not_found" };
  const result = await withFeatured(res.data.result, landing.featuredRecipeIds, query);
  return { kind: "ok", basePath: `/${landing.slug}`, query, result, categories, category: null, landing };
}

function decodeURIComponentSafe(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/**
 * @param categorySegment — сегмент URL категории (`/[category]`) или undefined для `/recipes`.
 * Если сегмент не категория — пробуется лендинг (`GET /getLanding/{slug}`), иначе 404.
 */
export async function loadCatalog(url: URL, categorySegment?: string): Promise<CatalogState> {
  const categories = await getCategories();
  if (!categories) return { kind: "unavailable" };

  let category: Category | null = null;

  if (categorySegment !== undefined) {
    const resolved = resolveCategory(categorySegment, categories);
    if (!resolved) return loadLanding(url, categorySegment, categories);
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

  const result = await withFeatured(res.data, category?.featuredRecipeIds, query);

  return { kind: "ok", basePath: category ? `/${category.path}` : "/recipes", query, result, categories, category };
}
