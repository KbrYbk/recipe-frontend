/** schema.org/Recipe для страницы рецепта. Чистая функция. */
import type { Recipe } from "../types/recipe";
import { formatIngredientLine } from "./normalizeIngredients";

export function toAbsoluteUrl(origin: string, path: string | undefined): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  return `${origin.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

/** JSON → строка, безопасная для вставки в <script type="application/ld+json">. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

export function buildRecipeJsonLd(recipe: Recipe, origin: string, canonicalPath: string): Record<string, unknown> {
  const image = toAbsoluteUrl(origin, recipe.main_image);
  const pageUrl = toAbsoluteUrl(origin, canonicalPath);
  const time = recipe.cooking_time > 0 ? `PT${recipe.cooking_time}M` : undefined;

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.title,
    description: recipe.description || undefined,
    image: image ? [image] : undefined,
    url: pageUrl,
    cookTime: time,
    totalTime: time,
    recipeCategory: recipe.category?.title,
    recipeIngredient: recipe.ingredients.map(formatIngredientLine),
    recipeInstructions: recipe.steps.map((step, index) => {
      const position = step.order ?? index + 1;
      return {
        "@type": "HowToStep",
        name: `Шаг ${position}`,
        url: `${pageUrl}#step-${position}`,
        position,
        text: step.text,
        image: toAbsoluteUrl(origin, step.image),
      };
    }),
    // Решение владельца (2026-11-09): aggregateRating/reviewCount оставляем как есть.
    aggregateRating:
      recipe.average_rating > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: recipe.average_rating,
            reviewCount: recipe.ratings_count || recipe.likes_count || 1,
          }
        : undefined,
    author: { "@type": "Person", name: recipe.author || "Команда SwagEda" },
    // Порции — только если поле реально есть в данных (без выдуманных значений по умолчанию).
    recipeYield: recipe.servings ? String(recipe.servings) : undefined,
    datePublished: recipe.created_at,
    dateModified: recipe.updated_at ?? recipe.created_at,
    video: recipe.video_url
      ? {
          "@type": "VideoObject",
          name: recipe.title,
          description: recipe.description || recipe.title,
          thumbnailUrl: image ? [image] : undefined,
          contentUrl: recipe.video_url,
          uploadDate: recipe.created_at,
        }
      : undefined,
  };
  return JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
}
