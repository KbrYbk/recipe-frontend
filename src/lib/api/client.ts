/**
 * HTTP-клиент SSR → Laravel API. Только для сервера.
 * - адрес и ключ читаются в рантайме (src/lib/server/env.ts);
 * - проверка TLS НЕ отключается;
 * - GET-ответы кэшируются в памяти процесса (LRU, TTL 60 c), одинаковые параллельные запросы объединяются.
 */
import type { ApiResult } from "../../types/recipe";
import { LruCache } from "../lruCache";
import { getApiRoot, getProjectKey, PROJECT_HEADER } from "../server/env";

const REQUEST_TIMEOUT_MS = 8_000;

type Cached = { ok: true; status: number; data: unknown } | { ok: false; status: number };

const responseCache = new LruCache<Cached>({ maxEntries: 500, ttlMs: 60_000 });

export interface ApiGetOptions {
  /** false — не использовать кэш (например, для случайных выборок). */
  cache?: boolean;
}

async function fetchJson(path: string): Promise<Cached> {
  const url = `${getApiRoot()}${path}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", [PROJECT_HEADER]: getProjectKey() },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      if (res.status >= 500 || res.status === 401 || res.status === 403) {
        console.error(`[api] GET ${path} -> HTTP ${res.status}`);
      }
      await res.body?.cancel().catch(() => {});
      return { ok: false, status: res.status };
    }
    const data: unknown = await res.json();
    return { ok: true, status: res.status, data };
  } catch (error) {
    const reason = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    console.error(`[api] GET ${path} failed: ${reason}`);
    return { ok: false, status: 0 };
  }
}

/** GET к API. Кэшируются успешные ответы и 404 (на 60 c); ошибки сети/5xx — нет. */
export async function apiGet<T = unknown>(path: string, opts: ApiGetOptions = {}): Promise<ApiResult<T>> {
  const result =
    opts.cache === false
      ? await fetchJson(path)
      : await responseCache.getOrLoad(
          path,
          () => fetchJson(path),
          (r) => r.ok || r.status === 404,
        );
  return result.ok ? { ok: true, status: result.status, data: result.data as T } : { ok: false, status: result.status };
}

/** Сброс кэша (для тестов/диагностики). */
export function clearApiCache(): void {
  responseCache.clear();
}
