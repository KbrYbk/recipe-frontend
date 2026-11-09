/**
 * Канонический вид пути страницы: без завершающего слэша, без повторных слэшей, в нижнем регистре.
 * Дубли `/borsch/`, `/Borsch`, `//recipes` получают один 301 на канонический адрес (query сохраняется).
 */

/** Служебные префиксы и файлы — не нормализуем (имена картинок/ассетов могут быть чувствительны к регистру). */
const SKIP_PREFIXES = ["/api-proxy", "/api-images/", "/_astro/", "/_image", "/_server-islands/"];

/** Путь, на который нужен 301, или null, если путь уже канонический. */
export function canonicalPathRedirect(pathname: string): string | null {
  if (!pathname || pathname === "/") return null;
  if (SKIP_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  let path = pathname.replace(/\/{2,}/g, "/");
  if (path.length > 1) path = path.replace(/\/+$/, "") || "/";

  // Файлы (robots.txt, sitemap.xml, ключ IndexNow, иконки) — только схлопывание слэшей.
  const last = path.slice(path.lastIndexOf("/") + 1);
  const isFile = last.includes(".");

  // Регистр меняем только у чисто ASCII-путей: в %-кодировке регистр hex-цифр значим для сравнения строк.
  if (!isFile && /^[A-Za-z0-9/_-]+$/.test(path)) path = path.toLowerCase();

  if (isFile && pathname.endsWith("/")) return null;
  return path !== pathname ? path : null;
}
