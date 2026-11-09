/**
 * Условные GET (Last-Modified / If-Modified-Since → 304) для страниц с известной датой изменения.
 * Экономит краулинговый бюджет: робот не скачивает заново неизменённый HTML. Чистые функции.
 */

/** Дата из строки API (ISO, в т.ч. с микросекундами) или HTTP-даты. null — невалидная. */
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const ms = Date.parse(String(value).trim());
  return Number.isFinite(ms) ? new Date(ms) : null;
}

/**
 * Last-Modified страницы: самая поздняя из дат данных и `floorMs` (время сборки фронта — после выкатки
 * шаблона страница считается изменённой). Округляется вниз до секунды (точность HTTP-даты). null — дат нет.
 */
export function lastModifiedOf(dates: ReadonlyArray<string | null | undefined>, floorMs = 0): Date | null {
  const times = dates.map((d) => parseDate(d)?.getTime() ?? NaN).filter((t) => Number.isFinite(t));
  if (times.length === 0) return null;
  let max = Math.max(...times);
  if (floorMs > max) max = floorMs;
  const now = Date.now();
  if (max > now) max = now; // дата из будущего не должна навсегда отключать 304
  return new Date(Math.floor(max / 1000) * 1000);
}

/** true — у клиента актуальная копия: ответить 304. */
export function isNotModified(ifModifiedSince: string | null | undefined, lastModified: Date): boolean {
  const since = parseDate(ifModifiedSince);
  if (!since) return false;
  return Math.floor(lastModified.getTime() / 1000) <= Math.floor(since.getTime() / 1000);
}

export function toHttpDate(date: Date): string {
  return date.toUTCString();
}

/** Время сборки фронта (мс), подставляется Vite (`define` в astro.config.mjs); 0 — вне сборки (тесты). */
export const BUILD_TIME_MS: number = typeof __BUILD_TIME__ === "string" ? Date.parse(__BUILD_TIME__) || 0 : 0;
