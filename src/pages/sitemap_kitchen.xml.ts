import type { APIRoute } from "astro";
import { updatedDates } from "../lib/kitchen/data";
import { conditionalResponse } from "../lib/kitchen/http";
import { buildSitemapXml, kitchenSitemapUrls } from "../lib/kitchen/sitemap";

/** Sitemap «Кухонного справочника» (хабы и страницы продуктов) с Last-Modified / 304. */
export const GET: APIRoute = ({ site, request }) => {
  const headers = new Headers({ "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" });
  const notModified = conditionalResponse(request, headers, updatedDates());
  if (notModified) {
    notModified.headers.set("Cache-Control", "public, max-age=3600");
    return notModified;
  }
  return new Response(buildSitemapXml(site?.origin ?? "https://swageda.ru", kitchenSitemapUrls()), { headers });
};
