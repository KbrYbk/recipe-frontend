/**
 * SEO-правила страниц: индексация листингов, шаблоны title/description/H1. Чистые функции (покрыты юнит-тестами).
 */

/** Параметры, которые меняют состав/порядок выдачи: такие URL не индексируем (noindex,follow). */
export const INDEX_BLOCKING_PARAMS = ["sort", "difficulty", "minTime", "maxTime", "minRating", "maxRating"] as const;

/**
 * Тип листинга:
 * - category / landing — пагинация индексируется (своя выдача у каждой страницы);
 * - recipes / collection — страницы 2+ дублируют карточки категорий, поэтому только первая индексируется.
 */
export type ListingKind = "category" | "landing" | "recipes" | "collection";

/** true — страницу листинга нужно закрыть `noindex,follow` (ссылки при этом обходятся). */
export function listingNoindex(kind: ListingKind, params: URLSearchParams, page: number): boolean {
  if ((params.get("q") ?? "").trim()) return true;
  if (INDEX_BLOCKING_PARAMS.some((key) => (params.get(key) ?? "").trim() !== "")) return true;
  if ((kind === "recipes" || kind === "collection") && page > 1) return true;
  return false;
}
