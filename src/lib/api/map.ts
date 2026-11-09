/**
 * Чистые функции преобразования ответов API в модели фронтенда.
 * Без сетевых вызовов и зависимостей от окружения — используются и на сервере, и в браузере, и в тестах.
 */
import type { ApiPaginator, ApiRecipe, Difficulty, Recipe, RecipeCard, RecipeCategoryRef, RecipeList } from "../../types/recipe";
import { normalizeIngredients, normalizeSteps } from "../normalizeIngredients";
import { getRecipeUrl, parseRecipeId, recipeSlug } from "../recipeUrl";
import { slugify } from "../slugify";

export const PER_PAGE = 20;

/** Прячет origin картинок за `/api-images/*` (наш домен). Абсолютные внешние URL не трогаем. */
export function toImageProxyUrl(path: string | undefined | null): string | undefined {
  if (!path) return undefined;
  const p = String(path).trim();
  if (!p) return undefined;
  if (p.startsWith("/api-images/")) return p;
  if (/^https?:\/\//i.test(p)) return p;
  if (p.startsWith("/")) return `/api-images${p}`;
  return `/api-images/${p}`;
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function text(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

export function normalizeDifficulty(v: unknown): Difficulty | undefined {
  return v === "easy" || v === "medium" || v === "hard" ? v : undefined;
}

export function mapCategoryRef(raw: ApiRecipe["category"]): RecipeCategoryRef | undefined {
  if (!raw) return undefined;
  if (typeof raw === "string") {
    const title = raw.trim();
    return title ? { title, href: `/${slugify(title)}` } : undefined;
  }
  const title = text(raw.title);
  if (!title) return undefined;
  return { ...(raw.id != null ? { id: Number(raw.id) } : {}), title, href: `/${slugify(title)}` };
}

/** Карточка рецепта (списки, избранное, похожие). null — если нет валидного id. */
export function mapRecipeCard(raw: ApiRecipe): RecipeCard | null {
  const id = parseRecipeId(raw?.id);
  if (id === null) return null;
  const title = text(raw.title);
  const slug = recipeSlug({ id, title, slug: raw.slug });
  const category = mapCategoryRef(raw.category);
  const author = text(raw.user?.name);
  const difficulty = normalizeDifficulty(raw.difficulty);
  const main_image = toImageProxyUrl(raw.main_image);
  return {
    id,
    slug,
    url: getRecipeUrl({ id, title, slug, path: raw.path }),
    title,
    description: text(raw.description),
    ...(main_image ? { main_image } : {}),
    cooking_time: Math.max(0, num(raw.cooking_time)),
    ...(difficulty ? { difficulty } : {}),
    likes_count: Math.max(0, num(raw.likes_count)),
    average_rating: Math.round(Math.max(0, num(raw.average_rating)) * 100) / 100,
    ...(category ? { category } : {}),
    ...(author ? { author } : {}),
    ...(raw.created_at ? { created_at: String(raw.created_at) } : {}),
  };
}

/** Полный рецепт. Порции (`servings`) — только если бэкенд их реально отдаёт. */
export function mapRecipe(raw: ApiRecipe): Recipe | null {
  const card = mapRecipeCard(raw);
  if (!card) return null;
  const servings = num(raw.servings, 0);
  const video = text(raw.video_url);
  return {
    ...card,
    ingredients: normalizeIngredients(raw.ingredients),
    steps: normalizeSteps(raw.steps, toImageProxyUrl),
    ...(video ? { video_url: video } : {}),
    ...(raw.updated_at ? { updated_at: String(raw.updated_at) } : {}),
    ...(raw.ratings_count != null ? { ratings_count: num(raw.ratings_count) } : {}),
    ...(servings > 0 ? { servings } : {}),
  };
}

export function mapRecipeCards(list: unknown): RecipeCard[] {
  if (!Array.isArray(list)) return [];
  return list.map((r) => mapRecipeCard(r as ApiRecipe)).filter((r): r is RecipeCard => r !== null);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/**
 * Достаёт список рецептов из любого из форматов ответа:
 * `{data: Paginator}`, `{data: [...]}`, `[...]`, `Paginator`.
 */
export function parseRecipeList(body: unknown, requestedPage = 1): RecipeList {
  let container: unknown = body;
  if (isRecord(body) && "data" in body) container = body.data;

  let items: unknown[] = [];
  let pag: Partial<ApiPaginator<unknown>> = {};
  if (Array.isArray(container)) {
    items = container;
  } else if (isRecord(container) && Array.isArray(container.data)) {
    items = container.data;
    pag = container as Partial<ApiPaginator<unknown>>;
  }

  const list = mapRecipeCards(items);
  const perPage = num(pag.per_page, PER_PAGE) || PER_PAGE;
  const total = Math.max(num(pag.total, list.length), list.length);
  const totalPages = Math.max(1, num(pag.last_page, 0) || Math.ceil(total / perPage) || 1);
  const currentPage = Math.max(1, num(pag.current_page, requestedPage) || requestedPage);
  return { list, total, totalPages, currentPage };
}

/** Тело `GET /getRecipes/{id}`: `{success:true, data:{...}}`; старый API на «не найдено» отдаёт 200 + `success:false`. */
export function parseRecipeBody(body: unknown): Recipe | null {
  if (!isRecord(body)) return null;
  if (body.success === false) return null;
  const data = isRecord(body.data) ? body.data : body;
  if (data.id == null) return null;
  return mapRecipe(data as unknown as ApiRecipe);
}

/** Тело списка без пагинации (`batch`, `similar`, `value/{n}`). */
export function parseRecipeArray(body: unknown): RecipeCard[] {
  if (Array.isArray(body)) return mapRecipeCards(body);
  if (isRecord(body)) {
    if (Array.isArray(body.data)) return mapRecipeCards(body.data);
    if (isRecord(body.data) && Array.isArray(body.data.data)) return mapRecipeCards(body.data.data);
  }
  return [];
}
