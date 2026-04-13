import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, request } = context;

  if (url.pathname.startsWith("/sitemap")) {
    const backendUrl = `/api${url.pathname}${url.search}`;

    const headersToSend = new Headers();
    
    // 1. Копируем заголовки от клиента, исключая служебные
    for (const [key, value] of request.headers.entries()) {
      const lowerKey = key.toLowerCase();
      if (!['connection', 'upgrade', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'host', 'cookie'].includes(lowerKey)) {
        headersToSend.set(key, value);
      }
    }

    // 2. Устанавливаем Host бэкенда
    try {
        const backendHost = new URL(backendUrl).host;
        headersToSend.set('Host', backendHost);
    } catch (e) {
        return new Response("Invalid backend URL", { status: 500 });
    }

    // 3. Добавляем X-Forwarded-For
    const xForwardedFor = request.headers.get('x-forwarded-for') || request.headers.get('remote_addr');
    if (xForwardedFor) {
        headersToSend.set('X-Forwarded-For', xForwardedFor);
    }

    // 4. ГЛАВНОЕ: Добавляем ваш секретный ключ проекта, который используется в приложении
    // Имя заголовка из src/lib/api/recipes.ts: X-Project-Key-ass
    // Ключ из переменной окружения PROJECT_KEY
    const projectKey = import.meta.env.PROJECT_KEY;
    if (projectKey) {
        headersToSend.set('X-Project-Key-ass', String(projectKey));
    }

    try {
      const response = await fetch(backendUrl, {
        method: request.method,
        headers: headersToSend,
      });

      if (!response.ok) {
        console.error(`[Sitemap Proxy Error]: Backend responded with status ${response.status}`);
        try {
          const errorBody = await response.text();
          console.error("[Sitemap Proxy Error] Backend response body:", errorBody);
        } catch (e) {}
        return new Response(`Sitemap Proxy Error: ${response.status}`, { status: response.status });
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } catch (error) {
      console.error("[Sitemap Proxy Error]: Fetch failed:", error);
      return new Response("Sitemap Proxy Error: Could not reach backend.", { status: 502 });
    }
  }

  return next();
});
