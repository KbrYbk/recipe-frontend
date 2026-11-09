/** Запросы из браузера — только через /api-proxy (allowlist в src/middleware.ts). */
import type { RecipeCard } from "../../types/recipe";
import { parseRecipeArray, parseRecipeBody } from "../api/map";

export async function incrementLike(id: number): Promise<Response> {
  return fetch(`/api-proxy/incrementLike/${id}`, { method: "PATCH", headers: { Accept: "application/json" } });
}

/** IP в теле не передаём: бэкенд берёт адрес из заголовка, который выставляет наш прокси. */
export async function setRating(id: number, rating: number): Promise<Response> {
  return fetch(`/api-proxy/setRating/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ rating }),
  });
}

const BATCH_LIMIT = 50;

/**
 * Карточки рецептов по id одним запросом (`GET /getRecipes/batch?ids=`), порядок — как в ids.
 * Если batch недоступен (старый API → 404), грузим поштучно.
 */
export async function fetchRecipeCards(ids: number[]): Promise<RecipeCard[]> {
  const unique = [...new Set(ids)].filter((id) => Number.isSafeInteger(id) && id > 0);
  if (unique.length === 0) return [];

  const chunks: number[][] = [];
  for (let i = 0; i < unique.length; i += BATCH_LIMIT) chunks.push(unique.slice(i, i + BATCH_LIMIT));

  const results: RecipeCard[] = [];
  for (const chunk of chunks) {
    let cards: RecipeCard[] | null = null;
    try {
      const res = await fetch(`/api-proxy/getRecipes/batch?ids=${chunk.join(",")}`, { headers: { Accept: "application/json" } });
      if (res.ok) cards = parseRecipeArray(await res.json());
    } catch {
      cards = null;
    }
    if (cards === null) cards = await fetchOneByOne(chunk);
    results.push(...cards);
  }
  const order = new Map(unique.map((id, i) => [id, i]));
  return results.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

async function fetchOneByOne(ids: number[]): Promise<RecipeCard[]> {
  const cards = await Promise.all(
    ids.map(async (id) => {
      try {
        const res = await fetch(`/api-proxy/getRecipes/${id}`, { headers: { Accept: "application/json" } });
        return res.ok ? parseRecipeBody(await res.json()) : null;
      } catch {
        return null;
      }
    }),
  );
  return cards.filter((c): c is NonNullable<typeof c> => c !== null);
}
