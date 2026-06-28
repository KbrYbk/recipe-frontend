import type { APIRoute } from "astro";
import { fetchRecipeById, mapBackendRecipe } from "../../../lib/api/recipes";

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: "Missing id" }), { status: 400 });
  }

  const { item, ok, status } = await fetchRecipeById(id);

  if (!ok || !item) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: status || 404 });
  }

  const recipe = mapBackendRecipe(item);
  return new Response(JSON.stringify(recipe), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
