import type { APIRoute } from "astro";
import localRecipes from "../data/recipes.json";
import { fetchSitemapIds } from "../lib/api/recipes";

export const GET: APIRoute = async ({ site }) => {
  const origin = site ? site.toString().replace(/\/$/, '') : 'https://swageda.ru';
  const encoder = new TextEncoder();
  const now = new Date().toISOString();

  const staticPages = [
    { loc: "/", priority: "1.0", freq: "daily" },
    { loc: "/recipes", priority: "0.9", freq: "daily" },
    { loc: "/about", priority: "0.5", freq: "monthly" },
    { loc: "/privacy", priority: "0.3", freq: "monthly" },
    { loc: "/contacts", priority: "0.5", freq: "monthly" },
  ];

  const stream = new ReadableStream({
    async start(controller) {
      // 1. Заголовок
      controller.enqueue(encoder.encode('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'));

      // 2. Статика
      for (const p of staticPages) {
        controller.enqueue(
          encoder.encode(`  <url>\n    <loc>${origin}${p.loc}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>${p.freq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>\n`),
        );
      }

      // 3. Локальные рецепты
      for (const r of localRecipes) {
        controller.enqueue(
          encoder.encode(`  <url>\n    <loc>${origin}/recipe/local-${r.id}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`),
        );
      }

      // 4. Рецепты из БД (Laravel)
      /* try {
        // Просим у Laravel сразу 40 000, чтобы покрыть все твои 31к+ рецептов за один раз
        const { list } = await fetchSitemapIds(40000);

        console.log(`✅ Получено из БД: ${list.length} рецептов`);

        if (list && list.length > 0) {
          for (const r of list) {
            const lastmod = r.updated_at ? new Date(r.updated_at).toISOString() : now;
            const entry = `<url><loc>${origin}/recipe/db-${r.id}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>\n`;
            controller.enqueue(encoder.encode(entry));
          }
        } else {
          console.log("⚠️ Список из БД пуст. Проверь роут /getRecipes/value/40000");
        }
      } catch (e) {
        console.error("Sitemap DB Stream Error:", e);
      }
*/
      // 4. Рецепты из БД (БЕЗОПАСНЫЙ ЦИКЛ, пока бэкендер ебланит)
      let currentPage = 1;
      let hasMore = true;
      const CHUNK_SIZE = 50; // Тянем по 50, чтобы не вешать его дохлый ORM

      console.log("--- Starting safe fetch (paging by 50) ---");

      while (hasMore) {
        try {
          // Вызываем твою функцию, которая стучится в /page/{currentPage}
          const { list } = await fetchSitemapIds(currentPage, CHUNK_SIZE);

          if (!list || list.length === 0) {
            console.log("No more recipes found, finishing...");
            hasMore = false;
            break;
          }

          console.log(`Processing page ${currentPage}, found ${list.length} items...`);

          for (const r of list) {
            const lastmod = r.updated_at ? new Date(r.updated_at).toISOString() : now;
            const entry = `<url><loc>${origin}/recipe/db-${r.id}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>\n`;
            controller.enqueue(encoder.encode(entry));
          }

          // Если пришло меньше CHUNK_SIZE — значит, это была последняя страница
          if (list.length < CHUNK_SIZE) {
            hasMore = false;
          } else {
            currentPage++;
          }

          // Даем микро-паузу серверу (чтобы PHP-FPM не захлебнулся)
          await new Promise((res) => setTimeout(res, 30));
        } catch (e) {
          console.error("Critical loop error:", e);
          hasMore = false;
        }
      }
      console.log("--- Safe fetch finished! ---");
      controller.enqueue(encoder.encode("</urlset>"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
};
