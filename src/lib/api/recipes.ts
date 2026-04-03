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

/** Получение списка рецептов (Поиск, Категории, Пагинация, Сложность) */
export async function fetchRecipesFromApi(opts: { search?: string; categoryId?: number | string; page?: number; difficulty?: string; limit?: number } = {}) {
  const base = apiBase();
  const page = opts.page || 1;
  const apiPath = base.endsWith("/api") ? "/getRecipes" : "/api/getRecipes";

  // Базовая логика формирования URL (совместимость с текущими роутами)
  let url = `${base}${apiPath}`;

  if (opts.limit) {
    url += `/value/${opts.limit}`;
  } else if (opts.search) {
    const s = encodeURIComponent(String(opts.search).trim());
    url += `/search/${s}/${page}`; // page теперь в пути для поиска
    if (opts.categoryId) url += `/${opts.categoryId}`; // categoryId остается в пути для поиска
  } else if (opts.categoryId) {
    url += `/category/${opts.categoryId}/${page}`; // categoryId и page теперь в пути для категории
  } else {
    url += `/page/${page}`;
  }

  // Добавляем остальные параметры через Query String
  const queryParams = new URLSearchParams();

  // Параметр "page" теперь всегда в пути, поэтому убираем его из queryParams
  // if (page > 1 && !url.includes(`/page/${page}`)) {
  //   queryParams.set("page", String(page));
  // }

  if (opts.difficulty && opts.difficulty !== "all") {
    queryParams.set("difficulty", opts.difficulty);
  }

  const queryString = queryParams.toString();
  if (queryString) {
    url += (url.includes("?") ? "&" : "?") + queryString;
  }

  try {
    const response = await fetch(url, {
      headers: { [PROJECT_HEADER]: apiKey() },
    });
    const status = response.status;
    if (!response.ok) return { list: [], total: 0, totalPages: 1, ok: false, status };

    const result = await response.json();
    const dataObj = result.data || result;

    // Laravel pagination: data.data или просто data
    const list = Array.isArray(dataObj.data) ? dataObj.data : Array.isArray(dataObj) ? dataObj : [];
    const total = dataObj.total || list.length || 0;
    
    // Пытаемся взять размер страницы из ответа или используем 20 по умолчанию
    const perPage = dataObj.per_page || 20;
    const totalPages = dataObj.last_page || Math.ceil(total / perPage) || 1;

    return { list, total, totalPages, ok: true, status };
  } catch (e) {
    console.error("❌ API Error:", e);
    return { list: [], total: 0, totalPages: 1, ok: false, status: 0 };
  }
}

/** Динамические категории */
export async function fetchCategoriesFromApi() {
  const base = apiBase();
  const url = base.endsWith("/api") ? `${base}/getCategories` : `${base}/api/getCategories`;
  try {
    const response = await fetch(url, { headers: { [PROJECT_HEADER]: apiKey() } });
    const result = await response.json();
    return Array.isArray(result.data) ? result.data : Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}

export function mapBackendRecipe(r: any) {
  return {
    ...r,
    id: `db-${r.id}`,
    main_image: toImageProxyUrl(r.main_image),
    steps: Array.isArray(r.steps) ? r.steps.map((s: any) => ({ ...s, image: toImageProxyUrl(s.image) })) : [],
  };
}
/** Получение одного рецепта по ID */
export async function fetchRecipeById(id: string | number) {
  const base = apiBase();
  // Вырезаем префикс db-, если он пришел с фронта
  const cleanId = String(id).replace(/^db-/, "");

  const hasApiInBase = base.endsWith("/api");
  const url = `${base}${hasApiInBase ? "" : "/api"}/getRecipes/${encodeURIComponent(cleanId)}`;

  try {
    const response = await fetch(url, {
      headers: {
        [PROJECT_HEADER]: apiKey(),
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) return { item: null, ok: false };

    const result = await response.json();
    // Laravel обычно кладет объект в поле data
    const item = result && result.data ? result.data : result;

    return { item, ok: true };
  } catch (e) {
    console.error(`❌ Ошибка загрузки рецепта ${id}:`, e);
    return { item: null, ok: false };
  }
}

/** Лайк рецепта */
export async function incrementLike(id: string | number) {
  const base = apiBase();
  const cleanId = String(id).replace(/^(db-|local-)/, "");
  const hasApiInBase = base.endsWith("/api");
  const url = `${base}${hasApiInBase ? "" : "/api"}/incrementLike/${encodeURIComponent(cleanId)}`;

  return fetch(url, {
    method: "PATCH",
    headers: {
      [PROJECT_HEADER]: apiKey(),
    },
  });
}

/** Установка рейтинга */
export async function setRating(id: string | number, rating: number, ip: string) {
  const base = apiBase();
  const cleanId = String(id).replace(/^(db-|local-)/, "");
  const hasApiInBase = base.endsWith("/api");
  const url = `${base}${hasApiInBase ? "" : "/api"}/setRating/${encodeURIComponent(cleanId)}`;

  return fetch(url, {
    method: "POST",
    headers: {
      [PROJECT_HEADER]: apiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ rating, ip }),
  });
}
