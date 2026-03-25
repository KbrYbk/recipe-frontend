import type { APIRoute } from "astro";

function originBase(): string {
  const raw = import.meta.env.IMAGE_ORIGIN ?? import.meta.env.IMAGE_BASE_URL;
  return raw ? String(raw).replace(/\/$/, "") : "";
}

export const GET: APIRoute = async ({ params }) => {
  const base = originBase();
  if (!base) {
    return new Response("Image proxy is not configured: set IMAGE_ORIGIN or IMAGE_BASE_URL", { status: 500 });
  }

  const slug = Array.isArray(params.slug) ? params.slug.join("/") : params.slug;
  const safeSlug = String(slug ?? "").replace(/^\/+/, "");
  if (!safeSlug) return new Response("Not found", { status: 404 });

  const target = `${base}/${safeSlug}`;

  try {
    const upstream = await fetch(target, {
      // SSR fetch: пусть платформа сама переиспользует keep-alive, где возможно
      headers: { Accept: "image/*" },
    });

    if (!upstream.ok) {
      return new Response("Not found", { status: upstream.status });
    }

    const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
    const cache = upstream.headers.get("cache-control") ?? "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800";

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": cache,
      },
    });
  } catch {
    return new Response(`Upstream image fetch failed: ${target}`, { status: 502 });
  }
};

