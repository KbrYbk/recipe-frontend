import { slugify } from "./slugify";

/**
 * URL рецепта: канонический вид `/recipe/{id}-{slug}`.
 * Старые адреса `/recipe/db-{id}` и `/recipe/{id}` (и неверный slug) редиректятся (301) на канонический.
 */

export interface RecipeUrlSource {
  id: number | string;
  title?: string | null;
  slug?: string | null;
}

/** Числовой id из любых исторических форм: 123, "123", "db-123". Невалидное → null. */
export function parseRecipeId(value: unknown): number | null {
  if (typeof value === "number") return Number.isSafeInteger(value) && value > 0 ? value : null;
  const m = /^(?:db-)?(\d{1,12})$/.exec(String(value ?? "").trim());
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** slug рецепта: поле `slug` из API, а если его нет (старый API) — slugify(title). */
export function recipeSlug(r: RecipeUrlSource): string {
  const fromApi = typeof r.slug === "string" ? r.slug.trim() : "";
  return fromApi || slugify(String(r.title ?? ""));
}

export function getRecipeUrl(r: RecipeUrlSource): string {
  const id = parseRecipeId(r.id);
  if (id === null) return "/recipes";
  return `/recipe/${id}-${recipeSlug(r)}`;
}

export interface ParsedRecipeParam {
  id: number;
  /** slug из URL (null для `/recipe/123` и `/recipe/db-123`). */
  slug: string | null;
}

/**
 * Разбор сегмента `[id]` маршрута `/recipe/[id]`:
 * `123-borsch` → {id:123, slug:"borsch"}, `123` / `db-123` → {id:123, slug:null}. Остальное → null.
 */
export function parseRecipeParam(param: string | undefined | null): ParsedRecipeParam | null {
  const raw = String(param ?? "").trim();
  const legacy = /^db-(\d{1,12})$/.exec(raw);
  if (legacy) {
    const id = parseRecipeId(legacy[1]);
    return id === null ? null : { id, slug: null };
  }
  const m = /^(\d{1,12})(?:-(.+))?$/.exec(raw);
  if (!m) return null;
  const id = parseRecipeId(m[1]);
  if (id === null) return null;
  return { id, slug: m[2] ?? null };
}

/**
 * Нормализация id, сохранённого в localStorage (избранное, лайки, оценки):
 * исторически хранились значения вида "db-123", теперь — "123".
 */
export function normalizeStoredId(value: unknown): string | null {
  const id = parseRecipeId(value);
  return id === null ? null : String(id);
}

/** Список id из localStorage → уникальные нормализованные id (порядок сохраняется). */
export function normalizeStoredIdList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const out: string[] = [];
  for (const v of values) {
    const id = normalizeStoredId(v);
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}
