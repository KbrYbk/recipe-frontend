import type { APIRoute } from "astro";
import { fetchRecipeBySlug } from "../lib/api/recipes";
import { RECIPE_GAMES, gameSitemapEntries } from "../lib/games";
import { buildSitemapXml } from "../lib/kitchen/sitemap";
import { isCanonicalRecipePath } from "../lib/recipeUrl";

/**
 * Sitemap страниц игр (/{категория}/{slug}/igra). Основной sitemap генерирует бэкенд и про игры не знает,
 * поэтому этот файл отдаёт фронт; адрес рецепта (с категорией) берётся из API. Файл не попадает под SITEMAP_PATTERN.
 */
export const GET: APIRoute = async ({ site }) => {
  const results = await Promise.all(Object.keys(RECIPE_GAMES).map((slug) => fetchRecipeBySlug(slug)));
  // Бэкенд недоступен: пустой файл поисковик может принять за «игр больше нет», поэтому честно отвечаем 503.
  if (results.some((r) => !r.ok && r.status !== 404)) {
    return new Response("Service unavailable", { status: 503, headers: { "Retry-After": "60", "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" } });
  }
  const recipes = results.flatMap((r) => (r.ok && isCanonicalRecipePath(r.data.url) ? [{ slug: r.data.slug, url: r.data.url }] : []));
  return new Response(buildSitemapXml(site?.origin ?? "https://swageda.ru", gameSitemapEntries(recipes)), {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
};
