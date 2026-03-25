const PROJECT_HEADER = "X-Project-Key-ass";

function apiBase(): string {
  const base = import.meta.env.API_BASE_URL;
  return base ? String(base).replace(/\/$/, "") : "";
}

function apiKey(): string {
  return import.meta.env.PROJECT_KEY ? String(import.meta.env.PROJECT_KEY) : "";
}

/** Прячет внешний origin картинок за /api-images/* (наш домен). */
export function toImageProxyUrl(path: string | undefined | null): string | undefined {
  if (!path || path === "") return undefined;
  if (path.startsWith("/api-images/")) return path;
  if (path.startsWith("/")) return `/api-images${path}`;
  // На всякий случай: относительный путь без слэша
  if (!path.startsWith("http")) return `/api-images/${path}`;
  // Абсолютные URL не трогаем (можно расширить позже при необходимости)
  return path;
}

type ListResult = { list: Record<string, unknown>[]; ok: boolean; status: number };
type OneResult = { item: Record<string, unknown> | null; ok: boolean; status: number };

/** Короткий кэш в памяти процесса: меньше запросов к Laravel при листании рецептов. */
let recipesCache: { expires: number; value: ListResult } | null = null;
const CACHE_TTL_MS = 60_000;

/** Единая точка запроса списка рецептов с бэкенда (Laravel). */
export async function fetchRecipesFromApi(
  opts: { limit?: number; search?: string; categoryId?: number | string } = {},
  timeoutMs = 12_000,
): Promise<ListResult> {
  const now = Date.now();
  const canUseCache = !opts.limit && !opts.search && !opts.categoryId;
  if (canUseCache && recipesCache && recipesCache.expires > now) {
    return recipesCache.value;
  }

  const base = apiBase();
  if (!base) {
    return { list: [], ok: false, status: 0 };
  }

  const url = (() => {
    if (opts.search) {
      const s = encodeURIComponent(String(opts.search).trim());
      if (opts.categoryId != null && String(opts.categoryId) !== "") {
        return `${base}/api/getRecipes/search/${s}/${encodeURIComponent(String(opts.categoryId))}`;
      }
      return `${base}/api/getRecipes/search/${s}`;
    }
    if (opts.categoryId != null && String(opts.categoryId) !== "") {
      return `${base}/api/getRecipes/category/${encodeURIComponent(String(opts.categoryId))}`;
    }
    if (opts.limit != null && Number.isFinite(Number(opts.limit))) {
      return `${base}/api/getRecipes/value/${encodeURIComponent(String(opts.limit))}`;
    }
    return `${base}/api/getRecipes`;
  })();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        [PROJECT_HEADER]: apiKey(),
      },
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      return { list: [], ok: false, status: response.status };
    }

    const result = (await response.json()) as { data?: Record<string, unknown>[] } | Record<string, unknown>[];
    const list = Array.isArray(result) ? result : (result.data ?? []);
    const value: ListResult = { list, ok: true, status: response.status };
    if (canUseCache) recipesCache = { expires: Date.now() + CACHE_TTL_MS, value };
    return value;
  } catch {
    clearTimeout(timer);
    return { list: [], ok: false, status: 0 };
  }
}

/** Деталка: получить один рецепт по id. */
export async function fetchRecipeById(id: number | string, timeoutMs = 12_000): Promise<OneResult> {
  const base = apiBase();
  if (!base) return { item: null, ok: false, status: 0 };

  const cleanId = String(id).replace(/^db-/, "");
  const url = `${base}/api/getRecipes/${encodeURIComponent(cleanId)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        [PROJECT_HEADER]: apiKey(),
      },
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) return { item: null, ok: false, status: response.status };
    const result = (await response.json()) as { data?: Record<string, unknown> } | Record<string, unknown>;
    const item = "data" in result ? (result as any).data ?? null : result;
    return { item, ok: true, status: response.status };
  } catch {
    clearTimeout(timer);
    return { item: null, ok: false, status: 0 };
  }
}

/** Поля бэкенда → формат карточек и страницы рецепта (префикс db-). */
export function mapBackendRecipe(r: Record<string, unknown>): Record<string, unknown> {
  const rawId = r.id;
  const id = typeof rawId === "number" || typeof rawId === "string" ? rawId : "";
  const main = toImageProxyUrl((r.main_image as string) ?? "") ?? "";
  const stepsRaw = r.steps;
  const steps = Array.isArray(stepsRaw)
    ? stepsRaw.map((s) => {
        if (s && typeof s === "object" && "image" in s) {
          const row = s as Record<string, unknown>;
          const img = row.image;
          if (typeof img === "string" && img !== "") {
            return { ...row, image: toImageProxyUrl(img) };
          }
        }
        return s;
      })
    : stepsRaw;

  return {
    ...r,
    id: `db-${id}`,
    main_image: main,
    steps,
  };
}
