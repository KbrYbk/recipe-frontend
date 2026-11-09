import { describe, expect, it } from "vitest";
import { clampStep, swipeDirection } from "../src/lib/cookState";
import { mapRecipe } from "../src/lib/api/map";
import { buildRecipeJsonLd, serializeJsonLd } from "../src/lib/recipeSchema";

describe("cookState", () => {
  it("clampStep", () => {
    expect(clampStep(-1, 5)).toBe(0);
    expect(clampStep(9, 5)).toBe(4);
    expect(clampStep(2.7, 5)).toBe(2);
    expect(clampStep(NaN, 5)).toBe(0);
    expect(clampStep(3, 0)).toBe(0);
  });
  it("swipeDirection", () => {
    expect(swipeDirection(-80, 10)).toBe("next");
    expect(swipeDirection(80, 10)).toBe("prev");
    expect(swipeDirection(30, 0)).toBeNull();
    expect(swipeDirection(-80, 70)).toBeNull();
  });
});

describe("buildRecipeJsonLd", () => {
  const recipe = mapRecipe({
    id: 5,
    title: "Блины",
    description: "Тонкие",
    main_image: "/storage/b.jpg",
    cooking_time: 30,
    likes_count: 120,
    average_rating: 4.5,
    ingredients: [{ name: "Мука", amount: "200", unit: "г" }],
    steps: [{ text: "Смешать" }],
  })!;
  const ld = buildRecipeJsonLd(recipe, "https://swageda.ru", recipe.url);

  it("без выдуманного recipeYield", () => {
    expect(ld).not.toHaveProperty("recipeYield");
    expect(buildRecipeJsonLd({ ...recipe, servings: 6 }, "https://swageda.ru", recipe.url).recipeYield).toBe("6");
  });
  it("aggregateRating/reviewCount — как раньше (решение владельца)", () => {
    expect(ld.aggregateRating).toEqual({ "@type": "AggregateRating", ratingValue: 4.5, reviewCount: 120 });
  });
  it("абсолютные URL", () => {
    expect(ld.image).toEqual(["https://swageda.ru/api-images/storage/b.jpg"]);
    expect(ld.url).toBe("https://swageda.ru/recipe/5-bliny");
    expect(ld.recipeIngredient).toEqual(["Мука — 200 г"]);
  });
  it("безопасная сериализация", () => {
    expect(serializeJsonLd({ a: "</script><b>&" })).toBe('{"a":"\\u003c/script\\u003e\\u003cb\\u003e\\u0026"}');
  });
});
