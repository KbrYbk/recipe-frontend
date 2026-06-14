import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, request } = context;

  if (url.pathname.startsWith("/api-proxy")) {
    const rawUrls = import.meta.env.PUBLIC_BACKEND_URLS;
    const backendBaseUrls = rawUrls ? String(rawUrls).split(',').map(url => url.replace(/\/$/, "").trim()) : [
      String(import.meta.env.API_BASE_URL || "").replace(/\/$/, "")
    ];

    let finalResponse: Response | undefined;
    const cleanPath = url.pathname.replace(/^\/api-proxy/, "");

    for (const base of backendBaseUrls) {
      const apiPath = base.endsWith("/api") ? "" : "/api";
      const backendUrl = `${base}${apiPath}${cleanPath}${url.search}`;
      const headersToSend = new Headers();
      
      for (const [key, value] of request.headers.entries()) {
        const lowerKey = key.toLowerCase();
        if (!['connection', 'upgrade', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'host', 'cookie'].includes(lowerKey)) {
          headersToSend.set(key, value);
        }
      }

      try {
          const backendHost = new URL(backendUrl).host;
          headersToSend.set('Host', backendHost);
      } catch (e) {
          if (import.meta.env.DEV) console.warn(`Invalid backend URL ${backendUrl}. Trying next fallback.`, e);
          continue;
      }

      const xForwardedFor = request.headers.get('x-forwarded-for') || request.headers.get('remote_addr') || context.clientAddress;
      if (xForwardedFor) {
          headersToSend.set('X-Forwarded-For', xForwardedFor);
      }

      const projectKey = import.meta.env.PROJECT_KEY;
      if (projectKey) {
          headersToSend.set('X-Project-Key-ass', String(projectKey));
      }

      try {
        let bodyToSend = undefined;
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          const clonedRequest = request.clone();
          bodyToSend = await clonedRequest.text();
        }

        const response = await fetch(backendUrl, {
          method: request.method,
          headers: headersToSend,
          body: bodyToSend,
        });

        if (response.status < 500) {
          finalResponse = response;
          break;
        } else {
          if (import.meta.env.DEV) console.warn(`[API Proxy Error]: Attempt failed for ${backendUrl} with status ${response.status}. Trying next fallback.`);
        }
      } catch (error) {
        if (import.meta.env.DEV) console.error(`[API Proxy Error]: Fetch failed for ${backendUrl}. Trying next fallback:`, error);
      }
    }

    if (finalResponse) {
      return new Response(finalResponse.body, {
        status: finalResponse.status,
        statusText: finalResponse.statusText,
        headers: finalResponse.headers,
      });
    } else {
      return new Response("API Proxy Error: All backend URLs failed to respond successfully.", { status: 502 });
    }
  }

  if (url.pathname.startsWith("/sitemap")) {
    const rawUrls = import.meta.env.PUBLIC_BACKEND_URLS;
    const backendBaseUrls = rawUrls ? String(rawUrls).split(',').map(url => url.replace(/\/$/, "").trim()) : [
      String(import.meta.env.API_BASE_URL || "").replace(/\/$/, "")
    ];

    let finalResponse: Response | undefined;

    for (const base of backendBaseUrls) {
      const backendUrl = `${base}/api${url.pathname}${url.search}`;
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
          if (import.meta.env.DEV) console.warn(`Invalid backend URL ${backendUrl}. Trying next fallback.`, e);
          continue;
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

        if (response.ok) {
          finalResponse = response;
          break; // Success, break out of fallback loop
        } else {
          if (import.meta.env.DEV) console.warn(`[Sitemap Proxy Error]: Attempt failed for ${backendUrl} with status ${response.status}. Trying next fallback.`);
          try {
            const errorBody = await response.text();
            if (import.meta.env.DEV) console.warn("[Sitemap Proxy Error] Backend response body:", errorBody);
          } catch (e) {}
        }
      } catch (error) {
        if (import.meta.env.DEV) console.error(`[Sitemap Proxy Error]: Fetch failed for ${backendUrl}. Trying next fallback:`, error);
      }
    }

    if (finalResponse) {
      return new Response(finalResponse.body, {
        status: finalResponse.status,
        statusText: finalResponse.statusText,
        headers: finalResponse.headers,
      });
    } else {
      return new Response("Sitemap Proxy Error: All backend URLs failed to respond successfully.", { status: 502 });
    }
  }

  return next();
});
