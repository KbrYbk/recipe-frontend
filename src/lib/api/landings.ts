/** Загрузка лендинга на SSR (браузеру не нужен — в /api-proxy не открывается). */
import { toApiSearchParams, type CatalogQuery } from "../catalog";
import { parseLandingResponse } from "../landings";
import { apiGet } from "./client";
import type { LoadResult } from "./recipes";

export function landingPath(slug: string, query: CatalogQuery): string {
  const qs = toApiSearchParams({ ...query, q: "" }).toString();
  return `/getLanding/${encodeURIComponent(slug)}/${query.page}${qs ? `?${qs}` : ""}`;
}

/**
 * Лендинг с карточками. status 404 — нет такого (или старый API без лендингов);
 * 0/5xx — бэкенд недоступен; прочие ошибки (403/405/422…) тоже считаем «не найдено», чтобы не отдавать 503 на любой адрес.
 */
export async function fetchLanding(slug: string, query: CatalogQuery): Promise<LoadResult<NonNullable<ReturnType<typeof parseLandingResponse>>>> {
  const res = await apiGet(landingPath(slug, query));
  if (!res.ok) return { ok: false, status: res.status === 0 || res.status >= 500 ? res.status || 503 : 404 };
  const parsed = parseLandingResponse(res.data, query.page);
  return parsed ? { ok: true, data: parsed } : { ok: false, status: 404 };
}
