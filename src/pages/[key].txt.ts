import type { APIRoute } from "astro";
import { indexNowKeyFile } from "../lib/indexnow";
import { getIndexNowKey } from "../lib/server/env";

/** `/{INDEXNOW_KEY}.txt` — подтверждение владения сайтом для IndexNow (Яндекс). */
export const GET: APIRoute = ({ params }) => {
  const body = indexNowKeyFile(params.key, getIndexNowKey());
  if (body === null) {
    return new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  }
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
};
