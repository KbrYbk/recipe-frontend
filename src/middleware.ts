import { defineMiddleware } from "astro:middleware";
import { getBackendBaseUrl, EXCLUDED_HEADERS, PROJECT_HEADER } from "./lib/api/config";

// Получаем базовый URL один раз при старте сервера
const BACKEND_BASE = getBackendBaseUrl();

/**
 * Хелпер для сборки заголовков.
 * Он берет заголовки от клиента (браузера) и готовит их для отправки на Laravel-бэкенд.
 */
function buildProxyHeaders(request: Request, clientAddress: string, backendHost: string): Headers {
  const headers = new Headers();

  // 1. Копируем все безопасные заголовки от браузера (например, Accept, User-Agent)
  for (const [key, value] of request.headers.entries()) {
    if (!EXCLUDED_HEADERS.includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  }

  // 2. Говорим бэкенду, к какому домену мы реально обращаемся
  headers.set('Host', backendHost);

  // 3. Передаем реальный IP-адрес пользователя (иначе Laravel будет думать, что все запросы идут от Astro)
  const xForwardedFor = request.headers.get('x-forwarded-for') || request.headers.get('remote_addr') || clientAddress;
  if (xForwardedFor) {
    headers.set('X-Forwarded-For', xForwardedFor);
  }

  // 4. Подшиваем секретный ключ проекта из .env
  const projectKey = import.meta.env.PROJECT_KEY;
  if (projectKey) {
    headers.set(PROJECT_HEADER, String(projectKey));
  }

  return headers;
}

/**
 * Главная функция проксирования. Отправляет запрос на бэкенд и возвращает ответ.
 */
async function proxyRequest(context: any, request: Request, targetUrl: string): Promise<Response> {
  // Вытаскиваем хост (домен + порт) из целевого URL
  const backendHost = new URL(targetUrl).host;
  const headersToSend = buildProxyHeaders(request, context.clientAddress, backendHost);

  // Настраиваем параметры для fetch-запроса на бэкенд
  const fetchOptions: RequestInit = {
    method: request.method,
    headers: headersToSend,
    // Флаг duplex: 'half' обязателен в Node.js 18+ для передачи потоков (Streams)
    // @ts-ignore
    duplex: 'half', 
  };

  // ПЕРФОРМАНС-ОПТИМИЗАЦИЯ:
  // Если это POST/PUT запрос, мы не скачиваем тело в память (как было раньше с .text()),
  // а пробрасываем request.body (Stream) напрямую на бэкенд. Это экономит RAM и ускоряет работу.
  if (request.method !== 'GET' && request.method !== 'HEAD' && request.body) {
    fetchOptions.body = request.body;
  }

  try {
    // Стучимся на Laravel
    const response = await fetch(targetUrl, fetchOptions);
    
    if (!response.ok && import.meta.env.DEV) {
      console.error(
        `\n [ОШИБКА БЭКЕНДА В ПРОКСИ: ${response.status} ${response.statusText}]\n` +
        `Узел: Astro Middleware (Прокси)\n` +
        `Запрос: ${request.method} ${targetUrl}\n` +
        `Причина: Бэкенд (Laravel) ответил ошибкой HTTP ${response.status}.\n` +
        `Что сказать бэкендеру: "Астро-прокси успешно достучался до твоего сервера, но твой сервер вернул статус ${response.status} на запрос ${request.method} ${targetUrl}. Проверь свои логи (storage/logs/laravel.log)!"\n`
      );
    }

    // Возвращаем ответ обратно браузеру в виде такого же потока (Stream)
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    // Сюда мы попадем, только если Laravel вообще лежит (сервер выключен)
    if (import.meta.env.DEV) {
      console.error(
        `\n [КРИТИЧЕСКАЯ ОШИБКА СЕТИ БЭКЕНДА (ПРОКСИ)]\n` +
        `Узел: Astro Middleware (Прокси)\n` +
        `Запрос: ${request.method} ${targetUrl}\n` +
        `Причина: Бэкенд вообще не ответил. Вероятно, сервер выключен, упал процесс PHP/Nginx, закрыт порт или невалидный SSL.\n` +
        `Что сказать бэкендеру: "Твой сервер полностью недоступен на адресе ${targetUrl}. Бэкенд упал или порт закрыт! Подними сервер!"\n`,
        error
      );
    }
    return new Response("Bad Gateway: Backend is unreachable", { status: 502 });
  }
}

/**
 * Точка входа в Middleware. Astro пропускает через нее КАЖДЫЙ запрос.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { url, request } = context;

  // Сценарий 1: Запрос к API
  // Если браузер просит /api-proxy/users, мы отправляем его на BACKEND_BASE/api/users
  if (url.pathname.startsWith("/api-proxy")) {
    const cleanPath = url.pathname.replace(/^\/api-proxy/, "");
    // Проверяем, есть ли уже /api в базовом URL, чтобы не было дублей (/api/api/...)
    const apiPath = BACKEND_BASE.endsWith("/api") ? "" : "/api";
    
    return proxyRequest(context, request, `${BACKEND_BASE}${apiPath}${cleanPath}${url.search}`);
  }

  // Сценарий 2: Запрос Sitemap
  // Если браузер просит /sitemap.xml, мы отправляем его на BACKEND_BASE/api/sitemap.xml
  if (url.pathname.startsWith("/sitemap")) {
    return proxyRequest(context, request, `${BACKEND_BASE}/api${url.pathname}${url.search}`);
  }

  // Сценарий 3: Обычные страницы (Главная, О нас и т.д.)
  // Пропускаем запрос дальше, пусть Astro сам рендерит HTML
  return next();
});