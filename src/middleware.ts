import { defineMiddleware } from "astro:middleware";
import { getApiRoot, getProjectKey, PROJECT_HEADER } from "./lib/server/env";

/**
 * Белый список маршрутов, которые браузер может вызывать через /api-proxy.
 * Всё остальное (создание/изменение/удаление рецептов и т.п.) снаружи недоступно:
 * прокси подписывает запросы секретным ключом, поэтому открывать его целиком нельзя.
 * query — проверка query-строки; если не задана, query-строка к бэкенду не передаётся.
 */
const PROXY_ALLOWLIST: ReadonlyArray<{ method: string; pattern: RegExp; query?: (params: URLSearchParams) => boolean }> = [
  { method: "PATCH", pattern: /^\/incrementLike\/\d+$/ },
  { method: "POST", pattern: /^\/setRating\/\d+$/ },
  { method: "GET", pattern: /^\/getRecipes\/(\d+|suggest\/[^/]+)$/ },
  { method: "GET", pattern: /^\/getRecipes\/batch$/, query: isValidBatchQuery },
  { method: "GET", pattern: /^\/getCategories$/ },
];

/** `?ids=1,2,3` — только этот параметр, до 50 числовых id. */
function isValidBatchQuery(params: URLSearchParams): boolean {
  const keys = [...params.keys()];
  if (keys.length !== 1 || keys[0] !== "ids") return false;
  const ids = params.get("ids") ?? "";
  return /^\d{1,12}(,\d{1,12}){0,49}$/.test(ids);
}

const SITEMAP_PATTERN = /^\/sitemap(_static|_categories|_recipes_\d+)?\.xml$/;

/** Страницы с персональным/случайным содержимым — не кэшировать публично. */
const PRIVATE_PAGES = new Set(["/favorites", "/shopping-list"]);
const NO_STORE_PAGES = new Set(["/random"]);
const PUBLIC_PAGE_CACHE = "public, s-maxage=60, stale-while-revalidate=600";

/** Заголовки ответа бэкенда, которые не пробрасываем клиенту. */
const HOP_BY_HOP = ["connection", "keep-alive", "transfer-encoding", "content-encoding", "content-length", "set-cookie", "server", "x-powered-by"];

const MAX_BODY_BYTES = 4 * 1024;

/**
 * Реальный IP посетителя. Astro слушает только 127.0.0.1 за nginx,
 * а nginx перезаписывает X-Real-IP значением $remote_addr — клиент его подделать не может.
 * X-Forwarded-For от клиента НЕ используется.
 */
function getClientIp(request: Request, clientAddress: string | undefined): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp && /^[0-9a-fA-F.:]+$/.test(realIp)) return realIp;
  return clientAddress ?? "";
}

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ success: false, message }), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function proxyRequest(request: Request, clientIp: string, targetUrl: string): Promise<Response> {
  const headers = new Headers({
    Accept: "application/json",
    [PROJECT_HEADER]: getProjectKey(),
  });
  if (clientIp) headers.set("X-Forwarded-For", clientIp);

  const init: RequestInit = { method: request.method, headers };

  if (request.method !== "GET" && request.method !== "HEAD") {
    const body = await request.text();
    if (body.length > MAX_BODY_BYTES) return jsonError(413, "Payload too large");
    if (body) {
      init.body = body;
      headers.set("Content-Type", "application/json");
    }
  }

  try {
    const upstream = await fetch(targetUrl, { ...init, signal: AbortSignal.timeout(10_000) });
    const responseHeaders = new Headers();
    upstream.headers.forEach((value, key) => {
      if (!HOP_BY_HOP.includes(key.toLowerCase())) responseHeaders.set(key, value);
    });
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch (error) {
    const reason = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    console.error(`[api-proxy] ${request.method} ${new URL(targetUrl).pathname} failed: ${reason}`);
    return jsonError(502, "Service unavailable");
  }
}

/** Заголовки безопасности для всех ответов Astro. */
function applySecurityHeaders(response: Response): Response {
  const h = response.headers;
  try {
    if (!h.has("X-Content-Type-Options")) h.set("X-Content-Type-Options", "nosniff");
    if (!h.has("Referrer-Policy")) h.set("Referrer-Policy", "strict-origin-when-cross-origin");
    if (!h.has("X-Frame-Options")) h.set("X-Frame-Options", "SAMEORIGIN");
    // screen-wake-lock разрешён для «Режима готовки».
    if (!h.has("Permissions-Policy")) h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=(), screen-wake-lock=(self)");
  } catch {
    // Иммутабельные заголовки (например, у Response.redirect) — пропускаем.
  }
  return response;
}

/** Cache-Control для HTML-страниц: публичный микрокэш для успешных ответов, кроме персональных страниц. */
function applyPageCache(pathname: string, response: Response): Response {
  const h = response.headers;
  try {
    const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
    if (NO_STORE_PAGES.has(path)) {
      h.set("Cache-Control", "no-store");
      return response;
    }
    if (h.has("Cache-Control")) return response;
    const isRedirect = response.status === 301 || response.status === 308;
    if (isRedirect) {
      h.set("Cache-Control", "public, max-age=3600");
      return response;
    }
    if (!(h.get("Content-Type") ?? "").includes("text/html")) return response;
    if (response.status >= 300) h.set("Cache-Control", "no-store");
    else if (PRIVATE_PAGES.has(path)) h.set("Cache-Control", "private, no-cache");
    else if (response.status === 200) h.set("Cache-Control", PUBLIC_PAGE_CACHE);
  } catch {
    // иммутабельные заголовки
  }
  return response;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, request } = context;

  if (url.pathname.startsWith("/api-proxy/") || url.pathname === "/api-proxy") {
    const path = url.pathname.slice("/api-proxy".length);
    const rule = PROXY_ALLOWLIST.find((r) => r.method === request.method && r.pattern.test(path));
    if (!rule) return applySecurityHeaders(jsonError(404, "Not found"));

    let search = "";
    if (rule.query) {
      if (!rule.query(url.searchParams)) return applySecurityHeaders(jsonError(404, "Not found"));
      search = url.search;
    }

    const clientIp = getClientIp(request, context.clientAddress);
    return applySecurityHeaders(await proxyRequest(request, clientIp, `${getApiRoot()}${path}${search}`));
  }

  if (SITEMAP_PATTERN.test(url.pathname)) {
    if (request.method !== "GET" && request.method !== "HEAD") return applySecurityHeaders(jsonError(404, "Not found"));
    const res = await proxyRequest(request, "", `${getApiRoot()}${url.pathname}`);
    if (res.ok) res.headers.set("Cache-Control", "public, max-age=3600");
    return applySecurityHeaders(res);
  }

  const response = await next();
  return applySecurityHeaders(applyPageCache(url.pathname, response));
});
