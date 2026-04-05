import type { APIRoute } from "astro";
import { fetchSitemapIds } from "../lib/api/recipes";

export const GET: APIRoute = async ({ params, url }) => {
  const page = parseInt(params.page || "1");
  const CHUNK_SIZE = 10000;
  const origin = `${url.protocol}//${url.host}`;

  const { list } = await fetchSitemapIds(page, CHUNK_SIZE);

  if (!list.length && page > 1) {
    return new Response(null, { status: 404 });
  }

  const encoder = new TextEncoder();
  const now = new Date().toISOString();

  // Используем стриминг для минимального потребления памяти
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'));
      
      for (const r of list) {
        const lastmod = r.updated_at ? new Date(r.updated_at).toISOString() : now;
        const entry = `  <url>\n    <loc>${origin}/recipe/db-${r.id}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
        controller.enqueue(encoder.encode(entry));
      }
      
      controller.enqueue(encoder.encode('</urlset>'));
      controller.close();
    }
  });

  return new Response(stream, {
    headers: { 
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
      "X-Content-Type-Options": "nosniff"
    }
  });
};

export function getStaticPaths() {
  return [];
}
