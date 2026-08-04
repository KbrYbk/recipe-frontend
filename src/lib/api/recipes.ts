import https from "node:https";
import { PROJECT_HEADER, getBackendBaseUrl } from "./config";

// Игнорируем ошибки SSL-сертификатов при разработке (на локалке)
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

// Получаем настройки один раз
const BACKEND_BASE = getBackendBaseUrl();
const PROJECT_KEY = import.meta.env.PROJECT_KEY ? String(import.meta.env.PROJECT_KEY) : "";

/**
 * Универсальная функция запроса к API.
 * Автоматически маршрутизирует запрос: с сервера (SSR) напрямую в Laravel, из браузера (Client) через Astro Proxy.
 *
 * @param {string} path - Относительный путь API (например, /getRecipes)
 * @param {RequestInit} [options={}] - Дополнительные параметры fetch (method, body, headers)
 * @returns {Promise<Response>} HTTP ответ от сервера
 */
async function fetchApi(path: string, options: RequestInit = {}): Promise<Response> {
  const isServer = import.meta.env.SSR || typeof window === "undefined";

  // СЦЕНАРИЙ 1: Запрос из БРАУЗЕРА (клиентский JS)
  if (!isServer) {
    // Мы отправляем запрос на наш Astro-прокси, а он уже сам пойдет на бэкенд
    const url = `/api-proxy${path}`;
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };
    return fetch(url, { ...options, headers });
  }

  // СЦЕНАРИЙ 2: Запрос с СЕРВЕРА Astro (SSR)
  // Мы стучимся в Laravel напрямую, минуя прокси
  const apiPath = BACKEND_BASE.endsWith("/api") ? "" : "/api";
  const url = `${BACKEND_BASE}${apiPath}${path}`;

  const headers = {
    [PROJECT_HEADER]: PROJECT_KEY,
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    // В DEV-режиме пропускаем ошибки SSL (самоподписанные сертификаты)
    // @ts-ignore
    agent: import.meta.env.DEV ? httpsAgent : undefined,
  };

  try {
    const response = await fetch(url, fetchOptions);
    if (!response.ok && import.meta.env.DEV) {
      console.error(
        `\n [ОШИБКА БЭКЕНДА: HTTP ${response.status} ${response.statusText}]\n` +
          `Узел: Бэкенд (${url})\n` +
          `Сценарий: ${isServer ? "Серверный рендеринг (SSR)" : "Браузерный запрос (Client)"}\n` +
          `Что сказать бэкендеру: "Твой сервер вернул статус ${response.status} при обращении к ${url}. Ищи ошибку в своих контроллерах!"\n`,
      );
    }
    return response;
  } catch (e) {
    if (import.meta.env.DEV) {
      console.error(
        `\n [СЕТЕВАЯ ОШИБКА БЭКЕНДА]\n` +
          `Узел: Бэкенд (${url})\n` +
          `Ошибка: Бэкенд вообще не ответил или упал.\n` +
          `Что сказать бэкендеру: "Твой API недоступен или падает соединение на ${url}. Подними сервер!"\n`,
        e,
      );
    }
    throw new Error("Backend is unreachable.");
  }
}

/** Прячет внешний origin картинок за /api-images/* (наш домен). */
export function toImageProxyUrl(path: string | undefined | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("/api-images/")) return path;
  if (path.startsWith("/")) return `/api-images${path}`;
  if (!path.startsWith("http")) return `/api-images/${path}`;
  return path;
}

/**
 * Получение коллекции рецептов (завтрак, обед, выпечка и т.д.)
 *
 * @param {string} type - Тип коллекции (например, 'breakfast', 'lunch')
 * @param {number} [page=1] - Номер страницы для пагинации
 * @returns {Promise<{list: any[], total: number, totalPages: number, ok: boolean}>} Объект с массивом рецептов и метаданными
 */
export async function fetchCollectionFromApi(type: string, page: number = 1) {
  try {
    const response = await fetchApi(`/getRecipes/collection/${type}/${page}`);
    if (!response.ok) return { list: [], ok: false };

    const result = await response.json();
    const list = Array.isArray(result.data?.data) ? result.data.data : Array.isArray(result.data) ? result.data : Array.isArray(result) ? result : [];
    const total = result.data?.total || list.length || 0;
    const perPage = result.data?.per_page || 20;
    const totalPages = result.data?.last_page || Math.ceil(total / perPage) || 1;

    return { list, total, totalPages, ok: true };
  } catch (e) {
    if (import.meta.env.DEV) {
      console.error(
        `\n❌ [КРИТИЧЕСКАЯ ОШИБКА ДАННЫХ: КОЛЛЕКЦИИ (${type})]\n` +
          `Причина: Невалидный JSON от бэкенда или сбой сети.\n` +
          `Что сказать бэкендеру: "Твой эндпоинт /getRecipes/collection/${type} возвращает невалидный JSON или вообще не отвечает!"\n`,
        e,
      );
    }
    return { list: [], ok: false };
  }
}

/**
 * Получение списка рецептов (Поиск, Фильтрация по Категориям, Пагинация, Сложность)
 *
 * @param {Object} [opts={}] - Опции фильтрации и поиска
 * @param {string} [opts.search] - Поисковой запрос
 * @param {number|string} [opts.categoryId] - ID категории для фильтрации
 * @param {number} [opts.page=1] - Номер страницы
 * @param {string} [opts.difficulty] - Сложность рецепта (например, 'easy', 'hard')
 * @param {number} [opts.limit] - Ограничение количества возвращаемых рецептов
 * @returns {Promise<{list: any[], total: number, totalPages: number, ok: boolean, status: number}>}
 */
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
    const response = await fetchApi(fullPath);
    if (!response.ok) return { list: [], total: 0, totalPages: 1, ok: false, status: response.status };

    const result = await response.json();
    const dataObj = result.data || result;
    const list = Array.isArray(dataObj.data) ? dataObj.data : Array.isArray(dataObj) ? dataObj : [];
    const total = dataObj.total || list.length || 0;
    const perPage = dataObj.per_page || 20;
    const totalPages = dataObj.last_page || Math.ceil(total / perPage) || 1;

    return { list, total, totalPages, ok: true, status: response.status };
  } catch (e) {
    if (import.meta.env.DEV) {
      console.error(
        `\n❌ [КРИТИЧЕСКАЯ ОШИБКА ДАННЫХ: ПОЛУЧЕНИЕ РЕЦЕПТОВ]\n` +
          `Запрос: ${fullPath}\n` +
          `Причина: Бэкенд вернул невалидный JSON, который невозможно распарсить, либо сеть упала.\n` +
          `Что сказать бэкендеру: "Твой эндпоинт ${apiBaseUrl} возвращает мусор вместо нормального JSON, либо вообще недоступен."\n`,
        e,
      );
    }
    return { list: [], total: 0, totalPages: 1, ok: false, status: 0 };
  }
}

/** Динамические категории */
export async function fetchCategoriesFromApi() {
  try {
    const response = await fetchApi(`/getCategories`);
    const result = await response.json();
    return Array.isArray(result.data) ? result.data : Array.isArray(result) ? result : [];
  } catch (e) {
    if (import.meta.env.DEV) {
      console.error(`\n❌ [КРИТИЧЕСКАЯ ОШИБКА ДАННЫХ: КАТЕГОРИИ]\n` + `Что сказать бэкендеру: "Твой эндпоинт /getCategories возвращает невалидный JSON!"\n`, e);
    }
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
    const response = await fetchApi(`/getRecipes/${encodeURIComponent(cleanId)}`);
    if (!response.ok) return { item: null, ok: false, status: response.status };
    const result = await response.json();
    const item = result.data || result;

    // Бэкенд может вернуть 200 с пустым телом — считаем это как "не найдено"
    if (!item || (typeof item === "object" && !Object.keys(item).length) || (typeof item === "object" && item.id == null)) {
      if (import.meta.env.DEV) {
        console.error(
          `\n❌ [ЛОГИЧЕСКАЯ ОШИБКА БЭКЕНДА: GET_RECIPE_BY_ID]\n` +
            `Запрос: /getRecipes/${cleanId}\n` +
            `Бэкенд вернул статус 200, но тело ответа пустое или не содержит данных рецепта.\n` +
            `Что сказать бэкендеру: "Если рецепт не найден, ты ДОЛЖЕН возвращать статус 404, а не 200 с пустым массивом или null. Исправь!"\n`,
        );
      }
      return { item: null, ok: false, status: 404 };
    }
    return { item, ok: true, status: response.status };
  } catch (e) {
    if (import.meta.env.DEV) {
      console.error(
        `\n❌ [КРИТИЧЕСКАЯ ОШИБКА ДАННЫХ: GET_RECIPE_BY_ID]\n` + `Запрос: /getRecipes/${cleanId}\n` + `Что сказать бэкендеру: "Твой эндпоинт для одиночного рецепта возвращает невалидный JSON!"\n`,
        e,
      );
    }
    return { item: null, ok: false, status: 0 };
  }
}

/** Лайк рецепта */
export async function incrementLike(id: string | number) {
  const cleanId = String(id).replace(/^(db-|local-)/, "");
  return fetchApi(`/incrementLike/${encodeURIComponent(cleanId)}`, { method: "PATCH" });
}

/** Установка рейтинга */
export async function setRating(id: string | number, rating: number, ip: string) {
  const cleanId = String(id).replace(/^(db-|local-)/, "");
  return fetchApi(`/setRating/${encodeURIComponent(cleanId)}`, {
    method: "POST",
    body: JSON.stringify({ rating, ip }),
  });
}

/** Получение списка ID для sitemap через роут /value/{val} */
export async function fetchSitemapIds(limit: number = 15000) {
  const path = `/getRecipes/value/${limit}`;

  try {
    if (import.meta.env.DEV) console.log(`[API] Requesting API: ${path}`);
    const response = await fetchApi(path);

    if (!response.ok) return { list: [], total: 0 };

    const result = await response.json();
    const list = Array.isArray(result) ? result : result.data || [];

    return {
      list: list.map((r: any) => ({ id: r.id, updated_at: r.updated_at })),
      total: list.length,
    };
  } catch (e) {
    if (import.meta.env.DEV) {
      console.error(
        `\n❌ [КРИТИЧЕСКАЯ ОШИБКА БЭКЕНДА: SITEMAP]\n` + `Запрос: ${path}\n` + `Что сказать бэкендеру: "Эндпоинт для генерации sitemap сломался. Он либо падает, либо возвращает плохой JSON."\n`,
        e,
      );
    }
    return { list: [], total: 0 };
  }
}
