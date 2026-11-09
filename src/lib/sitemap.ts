/** Файлы sitemap, которые фронт проксирует с бэкенда (индекс, статика, категории, лендинги, рецепты по частям). */
export const SITEMAP_PATTERN = /^\/sitemap(_static|_categories|_landings|_recipes_\d+)?\.xml$/;

/** Заголовки условного запроса, которые пробрасываются бэкенду (он отвечает 304 по Last-Modified). */
export const CONDITIONAL_REQUEST_HEADERS = ["if-modified-since", "if-none-match"] as const;
