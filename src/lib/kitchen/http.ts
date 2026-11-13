/** Last-Modified / 304 для страниц справочника — по образцу страницы рецепта (src/lib/httpCache.ts). */
import { BUILD_TIME_MS, isNotModified, lastModifiedOf, toHttpDate } from "../httpCache";

const CACHE_CONTROL = "public, s-maxage=60, stale-while-revalidate=600";

/**
 * Ставит Last-Modified (самая поздняя `updatedAt`, но не раньше времени сборки) и возвращает ответ 304,
 * если у клиента актуальная копия. null — отдавать страницу как обычно.
 */
export function conditionalResponse(request: Request, responseHeaders: Headers, dates: ReadonlyArray<string | null | undefined>, floorMs = BUILD_TIME_MS): Response | null {
  const lastModified = lastModifiedOf(dates, floorMs);
  if (!lastModified) return null;
  const value = toHttpDate(lastModified);
  responseHeaders.set("Last-Modified", value);
  if (!isNotModified(request.headers.get("if-modified-since"), lastModified)) return null;
  return new Response(null, { status: 304, headers: { "Last-Modified": value, "Cache-Control": CACHE_CONTROL } });
}
