/**
 * Лендинги — страницы-подборки под точные запросы («блины на молоке»): `/{slug}`, тот же корневой маршрут,
 * что у категорий (сначала категория, затем лендинг, иначе 404). Чистые функции.
 */
import type { ApiSeoFields, RecipeList } from "../types/recipe";
import { parseSectionContent, type SectionContent } from "./categories";
import { parseRecipeList } from "./api/map";

export interface Landing extends SectionContent {
  slug: string;
  /** Название лендинга (для крошек, H1/title по умолчанию). */
  title: string;
}

/** slug лендинга: латиница, цифры, дефисы. Остальное сразу 404 без запроса к API. */
const LANDING_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Корневые адреса фронта, которые не могут быть лендингом. */
const RESERVED = new Set(["recipes", "recipe", "categories", "collection", "favorites", "shopping-list", "random", "about", "contacts", "privacy", "partials", "api-proxy", "api-images", "404"]);

export function isLandingSlugCandidate(segment: string): boolean {
  return segment.length <= 100 && LANDING_SLUG_RE.test(segment) && !RESERVED.has(segment);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/**
 * Тело `GET /getLanding/{slug}/{page}`: `{landing: {...}, data: [карточки], meta: {current_page, last_page, total, per_page}}`.
 * null — ответ не похож на лендинг.
 */
export function parseLandingResponse(body: unknown, requestedPage: number): { landing: Landing; result: RecipeList } | null {
  if (!isRecord(body)) return null;
  const raw = isRecord(body.landing) ? body.landing : null;
  if (!raw) return null;
  const slug = typeof raw.slug === "string" ? raw.slug.trim().toLowerCase() : "";
  const title = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!slug || !title) return null;

  const meta = isRecord(body.meta) ? body.meta : {};
  const items = Array.isArray(body.data) ? body.data : isRecord(body.data) && Array.isArray(body.data.data) ? body.data.data : [];
  const paginator = isRecord(body.data) && !Array.isArray(body.data) ? { ...body.data, data: items } : { ...meta, data: items };
  const result = parseRecipeList({ data: paginator }, requestedPage);

  return { landing: { slug, title, ...parseSectionContent(raw as ApiSeoFields) }, result };
}
