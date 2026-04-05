const PROJECT_HEADER = "X-Project-Key-ass";

function getApiConfig() {
  const base = import.meta.env.API_BASE_URL;
  return {
    base: base ? String(base).replace(/\/$/, "") : "",
    key: import.meta.env.PROJECT_KEY ? String(import.meta.env.PROJECT_KEY) : "",
  };
}

function getHeaders() {
  return {
    [PROJECT_HEADER]: getApiConfig().key,
    "Content-Type": "application/json",
  };
}

/** Прячет внешний origin картинок за /api-images/* (наш домен). */
export function toImageProxyUrl(path: string | undefined | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("/api-images/")) return path;
  if (path.startsWith("/")) return `/api-images${path}`;
  if (!path.startsWith("http")) return `/api-images/${path}`;
  return path;
}

/** Получение списка рецептов (Поиск, Категории, Пагинация, Сложность) */
export async function fetchRecipesFromApi(opts: { search?: string; categoryId?: number | string; page?: number; difficulty?: string; limit?: number } = {}) {
  const { base } = getApiConfig();
  const page = opts.page || 1;
  const apiPath = base.endsWith("/api") ? "" : "/api";
  let url = `${base}${apiPath}/getRecipes`;

  if (opts.limit) {
    url += `/value/${opts.limit}`;
  } else if (opts.search) {
    url += `/search/${encodeURIComponent(String(opts.search).trim())}/${page}`;
    if (opts.categoryId) url += `/${opts.categoryId}`;
  } else if (opts.categoryId) {
    url += `/category/${opts.categoryId}/${page}`;
  } else {
    url += `/page/${page}`;
  }

  const queryParams = new URLSearchParams();
  if (opts.difficulty && opts.difficulty !== "all") {
    queryParams.set("difficulty", opts.difficulty);
  }

  const queryString = queryParams.toString();
  if (queryString) url += `?${queryString}`;

  try {
    const response = await fetch(url, { headers: { [PROJECT_HEADER]: getApiConfig().key } });
    if (!response.ok) return { list: [], total: 0, totalPages: 1, ok: false, status: response.status };

    const result = await response.json();
    const dataObj = result.data || result;
    const list = Array.isArray(dataObj.data) ? dataObj.data : Array.isArray(dataObj) ? dataObj : [];
    const total = dataObj.total || list.length || 0;
    const perPage = dataObj.per_page || 20;
    const totalPages = dataObj.last_page || Math.ceil(total / perPage) || 1;

    return { list, total, totalPages, ok: true, status: response.status };
  } catch (e) {
    console.error("❌ API Error:", e);
    return { list: [], total: 0, totalPages: 1, ok: false, status: 0 };
  }
}

/** Динамические категории */
export async function fetchCategoriesFromApi() {
  const { base } = getApiConfig();
  const url = base.endsWith("/api") ? `${base}/getCategories` : `${base}/api/getCategories`;
  try {
    const response = await fetch(url, { headers: { [PROJECT_HEADER]: getApiConfig().key } });
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
  const { base } = getApiConfig();
  const cleanId = String(id).replace(/^db-/, "");
  const url = `${base}${base.endsWith("/api") ? "" : "/api"}/getRecipes/${encodeURIComponent(cleanId)}`;

  try {
    const response = await fetch(url, { headers: getHeaders() });
    if (!response.ok) return { item: null, ok: false };
    const result = await response.json();
    return { item: result.data || result, ok: true };
  } catch (e) {
    console.error(`❌ Ошибка загрузки рецепта ${id}:`, e);
    return { item: null, ok: false };
  }
}

/** Лайк рецепта */
export async function incrementLike(id: string | number) {
  const { base } = getApiConfig();
  const cleanId = String(id).replace(/^(db-|local-)/, "");
  const url = `${base}${base.endsWith("/api") ? "" : "/api"}/incrementLike/${encodeURIComponent(cleanId)}`;
  return fetch(url, { method: "PATCH", headers: { [PROJECT_HEADER]: getApiConfig().key } });
}

/** Установка рейтинга */
export async function setRating(id: string | number, rating: number, ip: string) {
  const { base } = getApiConfig();
  const cleanId = String(id).replace(/^(db-|local-)/, "");
  const url = `${base}${base.endsWith("/api") ? "" : "/api"}/setRating/${encodeURIComponent(cleanId)}`;
  return fetch(url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ rating, ip }),
  });
}
/** Получение списка ID для sitemap через роут /value/{val} */
export async function fetchSitemapIds(limit: number = 15000) {
  const { base } = getApiConfig();
  const apiPath = base.endsWith("/api") ? "" : "/api";
  
  // Юзаем твой роут: GET /getRecipes/value/{val}
  // Забираем сразу большую пачку, чтобы не мучить сервер лишними запросами
  const url = `${base}${apiPath}/getRecipes/value/${limit}`;

  try {
    console.log(`🔗 Requesting API: ${url}`);
    const response = await fetch(url, { 
      headers: { [PROJECT_HEADER]: getApiConfig().key } 
    });
    
    if (!response.ok) return { list: [], total: 0 };
    
    const result = await response.json();
    
    // Твой роут /value/{val} возвращает массив рецептов напрямую
    const list = Array.isArray(result) ? result : (result.data || []);
    
    return { 
      list: list.map((r: any) => ({ id: r.id, updated_at: r.updated_at })), 
      total: list.length 
    };
  } catch (e) {
    console.error("Sitemap API Error:", e);
    return { list: [], total: 0 };
  }
}