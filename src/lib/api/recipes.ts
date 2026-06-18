import https from 'node:https';
const PROJECT_HEADER = "X-Project-Key-ass";
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});
function getApiConfig() {
  const rawUrls = import.meta.env.PUBLIC_BACKEND_URLS;
  const baseUrls = rawUrls ? String(rawUrls).split(',').map(url => url.replace(/\/$/, "").trim()) : [
    String(import.meta.env.API_BASE_URL || "").replace(/\/$/, "")
  ];
  return {
    bases: baseUrls,
    key: import.meta.env.PROJECT_KEY ? String(import.meta.env.PROJECT_KEY) : "",
  };
}
async function fetchWithFallback(path: string, options: RequestInit = {}): Promise<Response> {
  const isServer = import.meta.env.SSR || typeof window === "undefined";
  
  if (!isServer) {
    const url = `/api-proxy${path}`;
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };
    return fetch(url, { ...options, headers });
  }

  const { bases, key } = getApiConfig();
  const headers = {
    [PROJECT_HEADER]: key,
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  // --- ДОБАВЛЯЕМ ВЫБОР АГЕНТА ---
  const fetchOptions: RequestInit = { 
    ...options, 
    headers,
    // Используем агент только в DEV, чтобы игнорировать TLS ошибки
    agent: import.meta.env.DEV ? httpsAgent : undefined 
  };

  for (const base of bases) {
    const apiPath = base.endsWith("/api") ? "" : "/api";
    const url = `${base}${apiPath}${path}`;
    try {
      // Используем fetchOptions вместо старого options
      const response = await fetch(url, fetchOptions);
      if (response.status < 500) {
        return response;
      } else {
        if (import.meta.env.DEV) console.warn(`Attempt failed for ${url} with status ${response.status}.`);
      }
    } catch (e) {
      if (import.meta.env.DEV) console.error(`Network error for ${url}:`, e);
    }
  }
  throw new Error("All backend URLs failed to respond successfully.");
}
/** Прячет внешний origin картинок за /api-images/* (наш домен). */
export function toImageProxyUrl(path: string | undefined | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("/api-images/")) return path;
  if (path.startsWith("/")) return `/api-images${path}`;
  if (!path.startsWith("http")) return `/api-images/${path}`;
  return path;
}

/** Получение коллекции рецептов (breakfast, lunch, dinner, bakery) */
export async function fetchCollectionFromApi(type: string, page: number = 1) {
  try {
    const response = await fetchWithFallback(`/getRecipes/collection/${type}/${page}`);
    if (!response.ok) return { list: [], ok: false };
    const result = await response.json();
    const list = Array.isArray(result.data?.data) ? result.data.data : Array.isArray(result.data) ? result.data : Array.isArray(result) ? result : [];
    const total = result.data?.total || list.length || 0;
    const perPage = result.data?.per_page || 20;
    const totalPages = result.data?.last_page || Math.ceil(total / perPage) || 1;
    return { list, total, totalPages, ok: true };
  } catch (e) {
    if (import.meta.env.DEV) console.error(`❌ Collection API Error (${type}):`, e);
    return { list: [], ok: false };
  }
}

/** Получение списка рецептов (Поиск, Категории, Пагинация, Сложность) */
export async function fetchRecipesFromApi(opts: { search?: string; categoryId?: number | string; page?: number; difficulty?: string; limit?: number } = {}) {
  const page = opts.page || 1;
  let apiBaseUrl = `/getRecipes`;

  if (opts.limit) {
    apiBaseUrl += `/value/${opts.limit}`;
  } else if (opts.search) {
    apiBaseUrl += `/search/${encodeURIComponent(String(opts.search).trim())}/${page}`;
    if (opts.categoryId) apiBaseUrl += `/${opts.categoryId}`;
  } else if (opts.categoryId) {
    apiBaseUrl += `/category/${opts.categoryId}/${page}`;
  } else {
    apiBaseUrl += `/page/${page}`;
  }

  const queryParams = new URLSearchParams();
  if (opts.difficulty && opts.difficulty !== "all") {
    queryParams.set("difficulty", opts.difficulty);
  }

  const queryString = queryParams.toString();
  const fullPath = queryString ? `${apiBaseUrl}?${queryString}` : apiBaseUrl;

  try {
    const response = await fetchWithFallback(fullPath, { headers: { [PROJECT_HEADER]: getApiConfig().key } });
    if (!response.ok) return { list: [], total: 0, totalPages: 1, ok: false, status: response.status };

    const result = await response.json();
    const dataObj = result.data || result;
    const list = Array.isArray(dataObj.data) ? dataObj.data : Array.isArray(dataObj) ? dataObj : [];
    const total = dataObj.total || list.length || 0;
    const perPage = dataObj.per_page || 20;
    const totalPages = dataObj.last_page || Math.ceil(total / perPage) || 1;

    return { list, total, totalPages, ok: true, status: response.status };
  } catch (e) {
    if (import.meta.env.DEV) console.error("❌ API Error:", e);
    return { list: [], total: 0, totalPages: 1, ok: false, status: 0 };
  }
}

/** Динамические категории */
export async function fetchCategoriesFromApi() {
  try {
    const response = await fetchWithFallback(`/getCategories`);
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
  const cleanId = String(id).replace(/^db-/, "");
  try {
    const response = await fetchWithFallback(`/getRecipes/${encodeURIComponent(cleanId)}`);
    if (!response.ok) return { item: null, ok: false, status: response.status };
    const result = await response.json();
    const item = result.data || result;
    // Бэкенд может вернуть 200 с пустым телом — считаем это как "не найдено"
    if (!item || (typeof item === "object" && !Object.keys(item).length) || (typeof item === "object" && item.id == null)) {
      return { item: null, ok: false, status: 404 };
    }
    return { item, ok: true, status: response.status };
  } catch (e) {
    if (import.meta.env.DEV) console.error(`❌ Ошибка загрузки рецепта ${id}:`, e);
    return { item: null, ok: false, status: 0 };
  }
}

/** Лайк рецепта */
export async function incrementLike(id: string | number) {
  const cleanId = String(id).replace(/^(db-|local-)/, "");
  return fetchWithFallback(`/incrementLike/${encodeURIComponent(cleanId)}`, { method: "PATCH" });
}

/** Установка рейтинга */
export async function setRating(id: string | number, rating: number, ip: string) {
  const cleanId = String(id).replace(/^(db-|local-)/, "");
  return fetchWithFallback(`/setRating/${encodeURIComponent(cleanId)}`, {
    method: "POST",
    body: JSON.stringify({ rating, ip }),
  });
}
/** Получение списка ID для sitemap через роут /value/{val} */
export async function fetchSitemapIds(limit: number = 15000) {
  const path = `/getRecipes/value/${limit}`;

  try {
    if (import.meta.env.DEV) console.log(`🔗 Requesting API: ${path}`);
    const response = await fetchWithFallback(path);
    
    if (!response.ok) return { list: [], total: 0 };
    
    const result = await response.json();
    
    // Твой роут /value/{val} возвращает массив рецептов напрямую
    const list = Array.isArray(result) ? result : (result.data || []);
    
    return { 
      list: list.map((r: any) => ({ id: r.id, updated_at: r.updated_at })), 
      total: list.length 
    };
  } catch (e) {
    if (import.meta.env.DEV) console.error("Sitemap API Error:", e);
    return { list: [], total: 0 };
  }
}