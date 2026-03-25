import { IMAGE_BASE } from "../constants";

const PROJECT_HEADER = "X-Project-Key-ass";

export function withImageBase(path: string | undefined | null): string | undefined {
  if (!path || path === "") return undefined;
  if (path.startsWith("http")) return path;
  return `${IMAGE_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

type FetchResult = { list: Record<string, unknown>[]; ok: boolean; status: number };

/** Короткий кэш в памяти процесса: меньше запросов к Laravel при листании рецептов. */
let recipesCache: { expires: number; value: FetchResult } | null = null;
const CACHE_TTL_MS = 60_000;

/** Единая точка запроса списка рецептов с бэкенда (Laravel). */
export async function fetchRecipesFromApi(timeoutMs = 12_000): Promise<FetchResult> {
  const now = Date.now();
  if (recipesCache && recipesCache.expires > now) {
    return recipesCache.value;
  }

  const base = import.meta.env.API_BASE_URL;
  const key = import.meta.env.PROJECT_KEY;

  if (!base) {
    return { list: [], ok: false, status: 0 };
  }

  const url = `${String(base).replace(/\/$/, "")}/api/getRecipes`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        [PROJECT_HEADER]: key ?? "",
      },
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const err: FetchResult = { list: [], ok: false, status: response.status };
      return err;
    }

    const result = (await response.json()) as { data?: Record<string, unknown>[] };
    const value: FetchResult = { list: result.data ?? [], ok: true, status: response.status };
    recipesCache = { expires: Date.now() + CACHE_TTL_MS, value };
    return value;
  } catch {
    clearTimeout(timer);
    return { list: [], ok: false, status: 0 };
  }
}

/** Поля бэкенда → формат карточек и страницы рецепта (префикс db-). */
export function mapBackendRecipe(r: Record<string, unknown>): Record<string, unknown> {
  const rawId = r.id;
  const id = typeof rawId === "number" || typeof rawId === "string" ? rawId : "";
  const main = withImageBase((r.main_image as string) ?? "") ?? "";
  const stepsRaw = r.steps;
  const steps = Array.isArray(stepsRaw)
    ? stepsRaw.map((s) => {
        if (s && typeof s === "object" && "image" in s) {
          const row = s as Record<string, unknown>;
          const img = row.image;
          if (typeof img === "string" && img !== "") {
            return { ...row, image: withImageBase(img) };
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
