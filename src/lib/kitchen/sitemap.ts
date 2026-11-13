/**
 * sitemap_kitchen.xml — хабы и страницы продуктов справочника. Отдаётся фронтом: основной sitemap генерирует
 * бэкенд, а этот файл под шаблон прокси (SITEMAP_PATTERN) не попадает намеренно.
 */
import { KITCHEN_ROOT, entryHref, filledSections, getAll, sectionHref } from "./data";

export interface SitemapUrl {
  /** Путь от корня сайта. */
  path: string;
  /** ISO-дата последнего изменения. */
  lastmod?: string;
}

const latest = (dates: string[]): string | undefined => (dates.length > 0 ? dates.reduce((a, b) => (Date.parse(b) > Date.parse(a) ? b : a)) : undefined);

/** Хаб раздела, хабы непустых подразделов и все страницы продуктов. lastmod хаба — самая поздняя дата его записей. */
export function kitchenSitemapUrls(): SitemapUrl[] {
  const sections = filledSections();
  if (sections.length === 0) return [];
  const urls: SitemapUrl[] = [];
  const all: string[] = [];
  for (const section of sections) {
    const entries = getAll(section.key);
    const dates = entries.map((e) => e.updatedAt);
    all.push(...dates);
    urls.push({ path: sectionHref(section.key), lastmod: latest(dates) });
    for (const entry of entries) urls.push({ path: entryHref(section.key, entry.slug), lastmod: entry.updatedAt });
  }
  return [{ path: KITCHEN_ROOT, lastmod: latest(all) }, ...urls];
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/** Дата в формате W3C (YYYY-MM-DD); невалидная — без lastmod. */
function w3cDate(value: string | undefined): string | undefined {
  const ms = value ? Date.parse(value) : NaN;
  return Number.isFinite(ms) ? new Date(ms).toISOString().slice(0, 10) : undefined;
}

export function buildSitemapXml(origin: string, urls: readonly SitemapUrl[]): string {
  const base = origin.replace(/\/+$/, "");
  const items = urls.map((u) => {
    const lastmod = w3cDate(u.lastmod);
    return `  <url>\n    <loc>${escapeXml(`${base}${u.path}`)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}\n  </url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.join("\n")}\n</urlset>\n`;
}
