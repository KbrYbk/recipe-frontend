import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site }) => {
  const origin = site?.origin ?? "https://swageda.ru";
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /random",
    "Disallow: /favorites",
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n");
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};

