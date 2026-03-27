import type { APIRoute } from "astro";
import localRecipes from "../data/recipes.json";
import { fetchRecipesFromApi } from "../lib/api/recipes";

function entry(loc: string, lastmod?: string) {
  return `<url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</url>`;
}

export const GET: APIRoute = async ({ url }) => {
  const origin = `${url.protocol}//${url.host}`;
  const now = new Date().toISOString();
  const urls: string[] = ["/", "/recipes"].map((p) => `${origin}${p}`);

  for (const r of localRecipes) {
    urls.push(`${origin}/recipe/local-${r.id}`);
  }

  const { list, ok } = await fetchRecipesFromApi();
  if (ok) {
    for (const row of list) {
      const id = (row as Record<string, unknown>).id;
      if (id !== undefined && id !== null && id !== "") {
        urls.push(`${origin}/recipe/db-${id}`);
      }
    }
  }

  const unique = Array.from(new Set(urls));
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${unique
    .map((u) => entry(u, now))
    .join("\n")}\n</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};

