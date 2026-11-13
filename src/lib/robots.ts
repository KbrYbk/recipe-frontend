/**
 * robots.txt. Clean-param (Яндекс) склеивает URL с метками трафика с чистым адресом.
 * `page` НЕ добавлять: пагинация категорий индексируется. Фильтры/сортировки закрыты noindex,follow (src/lib/seo.ts).
 */
export const CLEAN_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "yclid", "ysclid", "gclid", "fbclid", "from", "action"] as const;

export function buildRobotsTxt(origin: string): string {
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /random",
    "Disallow: /favorites",
    "Disallow: /shopping-list",
    "Disallow: /api-proxy/",
    "Disallow: /partials/",
    `Clean-param: ${CLEAN_PARAMS.join("&")} /`,
    "",
    `Sitemap: ${origin.replace(/\/+$/, "")}/sitemap.xml`,
    // «Кухонный справочник»: отдельный файл, его отдаёт фронт (src/pages/sitemap_kitchen.xml.ts).
    `Sitemap: ${origin.replace(/\/+$/, "")}/sitemap_kitchen.xml`,
    "",
  ].join("\n");
}
