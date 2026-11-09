/**
 * Фильтры и сортировка каталога: разбор query-параметров страницы, построение query для API
 * и ссылок фильтров/пагинации. Чистые функции (тестируются юнит-тестами).
 */

export const SORT_VALUES = ["popular", "newest", "name", "rating", "rating_asc", "time_asc", "time_desc", "likes"] as const;
export type SortValue = (typeof SORT_VALUES)[number];

/**
 * Сортировка по умолчанию (без `sort` в URL): популярные (`likes_count desc, average_rating desc, id desc` на бэкенде).
 * Старый бэкенд не знает `popular` и молча сортирует по новизне (RecipeFilters: неизвестное значение → default).
 */
export const DEFAULT_SORT: SortValue = "popular";

export const DIFFICULTY_VALUES = ["easy", "medium", "hard"] as const;
export type DifficultyValue = (typeof DIFFICULTY_VALUES)[number];

/** Варианты сортировки, показываемые в UI. */
export const SORT_OPTIONS: ReadonlyArray<{ label: string; value: SortValue }> = [
  { label: "Популярные", value: "popular" },
  { label: "Новые", value: "newest" },
  { label: "По названию", value: "name" },
  { label: "По рейтингу", value: "rating" },
  { label: "Быстрые", value: "time_asc" },
  { label: "По лайкам", value: "likes" },
];

export const DIFFICULTY_OPTIONS: ReadonlyArray<{ label: string; value: DifficultyValue | "" }> = [
  { label: "Все", value: "" },
  { label: "Легко", value: "easy" },
  { label: "Средне", value: "medium" },
  { label: "Сложно", value: "hard" },
];

/** 9999 — «больше часа» по контракту API. */
export const TIME_OPTIONS: ReadonlyArray<{ label: string; value: string }> = [
  { label: "до 15 мин", value: "15" },
  { label: "до 30 мин", value: "30" },
  { label: "до 1 часа", value: "60" },
  { label: "больше часа", value: "9999" },
];

export const RATING_OPTIONS: ReadonlyArray<{ label: string; value: string }> = [
  { label: "4+ звезды", value: "4" },
  { label: "3+ звезды", value: "3" },
  { label: "любой", value: "" },
];

export interface CatalogQuery {
  q: string;
  page: number;
  sort: SortValue;
  difficulty: DifficultyValue | "";
  minTime: number | null;
  maxTime: number | null;
  minRating: number | null;
}

export const DEFAULT_QUERY: CatalogQuery = {
  q: "",
  page: 1,
  sort: DEFAULT_SORT,
  difficulty: "",
  minTime: null,
  maxTime: null,
  minRating: null,
};

const MAX_PAGE = 10_000;
const MAX_QUERY_LENGTH = 100;

function intInRange(raw: string | null, min: number, max: number): number | null {
  if (raw == null || !/^\d{1,5}$/.test(raw.trim())) return null;
  const n = Number(raw.trim());
  return n >= min && n <= max ? n : null;
}

/** Разбор query-параметров страницы каталога. Невалидные значения игнорируются. */
export function parseCatalogQuery(params: URLSearchParams): CatalogQuery {
  const sortRaw = params.get("sort")?.trim() ?? "";
  const diffRaw = params.get("difficulty")?.trim() ?? "";
  const minRating = intInRange(params.get("minRating"), 1, 5);
  return {
    q: (params.get("q") ?? "").trim().replace(/\s+/g, " ").slice(0, MAX_QUERY_LENGTH),
    page: intInRange(params.get("page"), 1, MAX_PAGE) ?? 1,
    sort: (SORT_VALUES as readonly string[]).includes(sortRaw) ? (sortRaw as SortValue) : DEFAULT_SORT,
    difficulty: (DIFFICULTY_VALUES as readonly string[]).includes(diffRaw) ? (diffRaw as DifficultyValue) : "",
    minTime: intInRange(params.get("minTime"), 0, 9999),
    maxTime: intInRange(params.get("maxTime"), 1, 9999),
    minRating,
  };
}

/**
 * Query-строка для API (`sort`, `difficulty`, `minTime`, `maxTime`, `minRating`).
 * `sort` отправляется всегда (по умолчанию — popular), кроме поиска без явной сортировки: там своя релевантность.
 */
export function toApiSearchParams(query: CatalogQuery): URLSearchParams {
  const p = new URLSearchParams();
  if (!(query.q && query.sort === DEFAULT_SORT)) p.set("sort", query.sort);
  if (query.difficulty) p.set("difficulty", query.difficulty);
  if (query.minTime !== null) p.set("minTime", String(query.minTime));
  if (query.maxTime !== null) p.set("maxTime", String(query.maxTime));
  if (query.minRating !== null) p.set("minRating", String(query.minRating));
  return p;
}

export function hasActiveFilters(query: CatalogQuery): boolean {
  return !!query.difficulty || query.minTime !== null || query.maxTime !== null || query.minRating !== null;
}

export function activeFilterCount(query: CatalogQuery): number {
  return [query.difficulty, query.minTime ?? query.maxTime, query.minRating, query.sort !== DEFAULT_SORT ? query.sort : null].filter((v) => v !== null && v !== "").length;
}

export type CatalogOverrides = Partial<{ [K in keyof CatalogQuery]: CatalogQuery[K] | null | "" }>;

/**
 * Ссылка на страницу каталога с изменёнными параметрами. Любое изменение, кроме page, сбрасывает страницу на 1.
 * Значения по умолчанию в URL не пишутся (page=1, sort=popular).
 */
export function buildCatalogHref(basePath: string, current: CatalogQuery, overrides: CatalogOverrides = {}): string {
  const next: CatalogQuery = { ...current, page: "page" in overrides ? current.page : 1 };
  for (const [key, value] of Object.entries(overrides) as [keyof CatalogQuery, unknown][]) {
    const fallback = DEFAULT_QUERY[key];
    (next as unknown as Record<string, unknown>)[key] = value === null || value === "" || value === undefined ? fallback : value;
  }

  const p = new URLSearchParams();
  if (next.q) p.set("q", next.q);
  if (next.sort !== DEFAULT_SORT) p.set("sort", next.sort);
  if (next.difficulty) p.set("difficulty", next.difficulty);
  if (next.minTime !== null) p.set("minTime", String(next.minTime));
  if (next.maxTime !== null) p.set("maxTime", String(next.maxTime));
  if (next.minRating !== null) p.set("minRating", String(next.minRating));
  if (next.page > 1) p.set("page", String(next.page));
  const qs = p.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/** Канонический URL страницы каталога: путь + только номер страницы (фильтры и сортировка не индексируются отдельно). */
export function catalogCanonical(basePath: string, page: number): string {
  return page > 1 ? `${basePath}?page=${page}` : basePath;
}

/** «1 рецепт», «2 рецепта», «5 рецептов». */
export function pluralRecipes(n: number): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return "рецептов";
  if (last === 1) return "рецепт";
  if (last >= 2 && last <= 4) return "рецепта";
  return "рецептов";
}

export function formatCount(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(n);
}

/** Закреплённые рецепты первыми, без повторов в основной выдаче. */
export function mergeFeatured<T extends { id: number }>(featured: readonly T[], list: readonly T[]): T[] {
  const ids = new Set(featured.map((r) => r.id));
  return [...featured, ...list.filter((r) => !ids.has(r.id))];
}

/** Чистая первая страница раздела (без поиска, фильтров и смены сортировки) — здесь показываются интро, FAQ и закреплённые рецепты. */
export function isPristineFirstPage(query: CatalogQuery): boolean {
  return query.page === 1 && !query.q && !hasActiveFilters(query) && query.sort === DEFAULT_SORT;
}
