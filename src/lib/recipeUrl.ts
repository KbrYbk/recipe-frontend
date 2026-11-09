import { slugify } from "./slugify";

/**
 * URL рецепта: канонический вид `/{категория}/{slug}` (без категории — `/recipes/{slug}`); путь отдаёт API в поле `path`.
 * Старые адреса `/recipe/{id}-{slug}`, `/recipe/{id}`, `/recipe/db-{id}`, `/{кат}/{автор}/{id}/{slug}`,
 * неверная категория и прежний slug редиректятся (301) на канонический.
 */

export interface RecipeUrlSource {
  id: number | string;
  title?: string | null;
  slug?: string | null;
  /** Путь страницы рецепта из API: `/{категория}/{slug}`. */
  path?: string | null;
}

/** Формат slug рецепта (совпадает с бэкендом `Slug::isValidRecipeSlug`). */
export const RECIPE_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidRecipeSlug(value: string): boolean {
  return value.length <= 120 && RECIPE_SLUG_RE.test(value);
}

/** Канонический путь рецепта: ровно два сегмента `/{категория}/{slug}` (не `/recipe/...`). */
export function isCanonicalRecipePath(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const m = /^\/([a-z0-9]+(?:-[a-z0-9]+)*)\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(value);
  return !!m && m[1] !== "recipe" && isValidRecipeSlug(m[2]);
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

/**
 * URL страницы рецепта: `path` из API. Если API его не отдал (старый бэкенд) — прежний вид `/recipe/{id}-{slug}`:
 * маршрут `/recipe/[id]` в этом случае отдаёт 503, а не редирект, чтобы не было петли.
 */
export function getRecipeUrl(r: RecipeUrlSource): string {
  if (isCanonicalRecipePath(r.path)) return r.path;
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
 * Разбор сегмента `[id]` устаревшего маршрута `/recipe/[id]`:
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
