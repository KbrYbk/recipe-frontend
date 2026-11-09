import { defineMiddleware } from "astro:middleware";
import { getBackendBaseUrl, PROJECT_HEADER } from "./lib/api/config";

const BACKEND_BASE = getBackendBaseUrl();
const API_PREFIX = BACKEND_BASE.endsWith("/api") ? "" : "/api";

/**
 * Белый список маршрутов, которые браузер может вызывать через /api-proxy.
 * Всё остальное (создание/изменение/удаление рецептов и т.п.) снаружи недоступно:
 * прокси подписывает запросы секретным ключом, поэтому открывать его целиком нельзя.
 */
const PROXY_ALLOWLIST: ReadonlyArray<{ method: string; pattern: RegExp }> = [
  { method: "PATCH", pattern: /^\/incrementLike\/\d+$/ },
  { method: "POST", pattern: /^\/setRating\/\d+$/ },
  { method: "GET", pattern: /^\/getRecipes\/(\d+|suggest\/[^/]+)$/ },
  { method: "GET", pattern: /^\/getCategories$/ },
];

const SITEMAP_PATTERN = /^\/sitemap(_static|_recipes_\d+)?\.xml$/;

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

function notFound(): Response {
  return new Response(JSON.stringify({ success: false, message: "Not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
}

async function proxyRequest(request: Request, clientIp: string, targetUrl: string): Promise<Response> {
  const headers = new Headers({
    Accept: "application/json",
    [PROJECT_HEADER]: String(import.meta.env.PROJECT_KEY ?? ""),
  });
  if (clientIp) headers.set("X-Forwarded-For", clientIp);

  const init: RequestInit = { method: request.method, headers };

  if (request.method !== "GET" && request.method !== "HEAD") {
    const body = await request.text();
    if (body.length > MAX_BODY_BYTES) {
      return new Response(JSON.stringify({ success: false, message: "Payload too large" }), { status: 413 });
    }
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
    console.error("[api-proxy] backend unreachable", request.method, new URL(targetUrl).pathname, error);
    return new Response(JSON.stringify({ success: false, message: "Service unavailable" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/** Заголовки безопасности для всех ответов Astro. */
function applySecurityHeaders(response: Response): Response {
  const h = response.headers;
  try {
    if (!h.has("X-Content-Type-Options")) h.set("X-Content-Type-Options", "nosniff");
    if (!h.has("Referrer-Policy")) h.set("Referrer-Policy", "strict-origin-when-cross-origin");
    if (!h.has("X-Frame-Options")) h.set("X-Frame-Options", "SAMEORIGIN");
    if (!h.has("Permissions-Policy")) h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");
  } catch {
    // Иммутабельные заголовки (например, у Response.redirect) — пропускаем.
  }
  return response;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, request } = context;

  if (url.pathname.startsWith("/api-proxy/") || url.pathname === "/api-proxy") {
    const path = url.pathname.slice("/api-proxy".length);
    const allowed = PROXY_ALLOWLIST.some((r) => r.method === request.method && r.pattern.test(path));
    if (!allowed) return applySecurityHeaders(notFound());

    const clientIp = getClientIp(request, context.clientAddress);
    return applySecurityHeaders(await proxyRequest(request, clientIp, `${BACKEND_BASE}${API_PREFIX}${path}`));
  }

  if (SITEMAP_PATTERN.test(url.pathname)) {
    if (request.method !== "GET" && request.method !== "HEAD") return notFound();
    const res = await proxyRequest(request, "", `${BACKEND_BASE}/api${url.pathname}`);
    if (res.ok) res.headers.set("Cache-Control", "public, max-age=3600");
    return applySecurityHeaders(res);
  }

  return applySecurityHeaders(await next());
});
