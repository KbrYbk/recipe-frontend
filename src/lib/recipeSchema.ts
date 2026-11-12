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

/** Длительность ISO 8601 с часами: 90 → «PT1H30M», 120 → «PT2H», 15 → «PT15M». Неизвестно → undefined. */
export function isoDuration(minutes: number): string | undefined {
  if (!(minutes > 0)) return undefined;
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  const out = `PT${h ? `${h}H` : ""}${m ? `${m}M` : ""}`;
  return out === "PT" ? undefined : out;
}

/** Дата в каноническом ISO 8601 без микросекунд: «2026-03-30T14:46:44.000000Z» → «2026-03-30T14:46:44Z». */
export function isoDate(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const ms = Date.parse(String(value).trim());
  if (!Number.isFinite(ms)) return undefined;
  return new Date(Math.floor(ms / 1000) * 1000).toISOString().replace(".000Z", "Z");
}

/** Прямой видеофайл (contentUrl) или страница плеера для iframe (embedUrl: YouTube, RuTube, VK…). */
function videoUrls(url: string): { contentUrl?: string; embedUrl?: string } {
  return /\.(mp4|webm|ogv|mov|m3u8)(\?|#|$)/i.test(url) ? { contentUrl: url } : { embedUrl: url };
}

/** «1 порция», «2 порции», «5 порций». */
export function servingsText(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  const word = mod10 === 1 && mod100 !== 11 ? "порция" : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? "порции" : "порций";
  return `${n} ${word}`;
}

/** «12,5» — число для показа и разметки: запятая, без хвостового нуля. */
export function formatGrams(n: number): string {
  return String(Math.round(n * 10) / 10).replace(".", ",");
}

/** schema.org/NutritionInformation на 100 г — только заданные значения. */
function nutritionJsonLd(nutrition: Recipe["nutrition"]): Record<string, unknown> | undefined {
  if (!nutrition) return undefined;
  return {
    "@type": "NutritionInformation",
    servingSize: "100 г",
    calories: nutrition.calories ? `${nutrition.calories} ккал` : undefined,
    proteinContent: nutrition.proteins !== undefined ? `${formatGrams(nutrition.proteins)} г` : undefined,
    fatContent: nutrition.fats !== undefined ? `${formatGrams(nutrition.fats)} г` : undefined,
    carbohydrateContent: nutrition.carbs !== undefined ? `${formatGrams(nutrition.carbs)} г` : undefined,
  };
}

export function buildRecipeJsonLd(recipe: Recipe, origin: string, canonicalPath: string): Record<string, unknown> {
  const image = toAbsoluteUrl(origin, recipe.main_image);
  const pageUrl = toAbsoluteUrl(origin, canonicalPath);
  const published = isoDate(recipe.created_at);
  const modified = isoDate(recipe.updated_at) ?? published;

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    "@id": pageUrl ? `${pageUrl}#recipe` : undefined,
    mainEntityOfPage: pageUrl,
    name: recipe.title,
    description: recipe.description || undefined,
    image: image ? [image] : undefined,
    url: pageUrl,
    // Одно значение времени из данных — это общее время; cookTime/prepTime не выдумываем.
    totalTime: isoDuration(recipe.cooking_time),
    recipeCategory: recipe.category?.title,
    keywords: recipe.category?.title ? recipe.category.title.toLocaleLowerCase("ru-RU") : undefined,
    recipeIngredient: recipe.ingredients.map(formatIngredientLine),
    recipeInstructions: recipe.steps.map((step, index) => {
      const position = step.order ?? index + 1;
      return {
        "@type": "HowToStep",
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
    // Автор неизвестен — это редакция сайта (организация), а не человек.
    author: recipe.author ? { "@type": "Person", name: recipe.author } : { "@type": "Organization", name: "SwagEda", url: `${origin.replace(/\/$/, "")}/` },
    // Порции — только если поле реально есть в данных (без выдуманных значений по умолчанию).
    recipeYield: recipe.servings ? servingsText(recipe.servings) : undefined,
    // КБЖУ — тоже только из данных.
    nutrition: nutritionJsonLd(recipe.nutrition),
    datePublished: published,
    dateModified: modified,
    video: recipe.video_url
      ? {
          "@type": "VideoObject",
          name: recipe.title,
          description: recipe.description || recipe.title,
          thumbnailUrl: image ? [image] : undefined,
          ...videoUrls(recipe.video_url),
          uploadDate: published,
        }
      : undefined,
  };
  return JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
}

/**
 * schema.org/ItemList для списков (каталог, категории, лендинги, подборки, главная, /categories).
 * Только элементы текущей страницы; position на странице N = (N-1)·perPage + i.
 */
export function buildItemListJsonLd(items: ReadonlyArray<{ url: string; title: string }>, origin: string, offset = 0, name?: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    ...(name ? { name } : {}),
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: offset + i + 1,
      url: toAbsoluteUrl(origin, item.url),
      name: item.title,
    })),
  };
}
