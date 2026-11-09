import type { APIRoute } from "astro";
import { getImageBaseUrl } from "../../lib/server/env";

const DEFAULT_CACHE = "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800";

function plain(status: number, body: string): Response {
  return new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}

/** Прокси картинок: `/api-images/<path>` → `${IMAGE_BASE_URL}/<path>`. Адрес апстрима наружу не раскрывается. */
export const GET: APIRoute = async ({ params }) => {
  const slug = Array.isArray(params.slug) ? params.slug.join("/") : params.slug;
  const safeSlug = String(slug ?? "").replace(/^\/+/, "");
  if (!safeSlug || safeSlug.split("/").some((part) => part === ".." || part === ".")) return plain(404, "Not found");

  const target = `${getImageBaseUrl()}/${safeSlug}`;

  try {
    const upstream = await fetch(target, { headers: { Accept: "image/*" }, signal: AbortSignal.timeout(15_000) });
    if (!upstream.ok) {
      await upstream.body?.cancel().catch(() => {});
      return plain(upstream.status === 404 ? 404 : 502, upstream.status === 404 ? "Not found" : "Bad gateway");
    }

    const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
    if (contentType.includes("text/html")) {
      await upstream.body?.cancel().catch(() => {});
      return plain(404, "Not found");
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": upstream.headers.get("cache-control") ?? DEFAULT_CACHE,
      },
    });
  } catch (error) {
    const reason = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    console.error(`[api-images] /${safeSlug} failed: ${reason}`);
    return plain(502, "Bad gateway");
  }
};
