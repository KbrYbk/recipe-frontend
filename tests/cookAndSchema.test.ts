import { describe, expect, it } from "vitest";
import { clampStep, firstUndoneStep, swipeDirection } from "../src/lib/cookState";
import { mapRecipe } from "../src/lib/api/map";
import { buildItemListJsonLd, buildRecipeJsonLd, isoDate, isoDuration, serializeJsonLd } from "../src/lib/recipeSchema";

describe("cookState", () => {
  it("firstUndoneStep", () => {
    expect(firstUndoneStep([])).toBe(0);
    expect(firstUndoneStep([false, false])).toBe(0);
    expect(firstUndoneStep([true, true, false, true])).toBe(2);
    expect(firstUndoneStep([true, true, true])).toBe(0);
  });

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
    expect(buildRecipeJsonLd({ ...recipe, servings: 6 }, "https://swageda.ru", recipe.url).recipeYield).toBe("6 порций");
    expect(buildRecipeJsonLd({ ...recipe, servings: 2 }, "https://swageda.ru", recipe.url).recipeYield).toBe("2 порции");
    expect(buildRecipeJsonLd(recipe, "https://swageda.ru", recipe.url).nutrition).toBeUndefined();
    expect(buildRecipeJsonLd({ ...recipe, nutrition: { calories: 250 } }, "https://swageda.ru", recipe.url).nutrition).toEqual({
      "@type": "NutritionInformation",
      servingSize: "100 г",
      calories: "250 ккал",
    });
    expect(buildRecipeJsonLd({ ...recipe, nutrition: { calories: 187, proteins: 12.5, fats: 0, carbs: 30 } }, "https://swageda.ru", recipe.url).nutrition).toEqual({
      "@type": "NutritionInformation",
      servingSize: "100 г",
      calories: "187 ккал",
      proteinContent: "12,5 г",
      fatContent: "0 г",
      carbohydrateContent: "30 г",
    });
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
  it("длительность только totalTime, в формате с часами", () => {
    expect(ld.totalTime).toBe("PT30M");
    expect(ld).not.toHaveProperty("cookTime");
    expect(buildRecipeJsonLd({ ...recipe, cooking_time: 90 }, "https://swageda.ru", recipe.url).totalTime).toBe("PT1H30M");
    expect(buildRecipeJsonLd({ ...recipe, cooking_time: 0 }, "https://swageda.ru", recipe.url)).not.toHaveProperty("totalTime");
  });
  it("автор-фолбэк — Organization, mainEntityOfPage, без HowToStep.name", () => {
    expect(ld.author).toEqual({ "@type": "Organization", name: "SwagEda", url: "https://swageda.ru/" });
    expect(buildRecipeJsonLd({ ...recipe, author: "Валентина" }, "https://swageda.ru", recipe.url).author).toEqual({ "@type": "Person", name: "Валентина" });
    expect(ld.mainEntityOfPage).toBe("https://swageda.ru/recipe/5-bliny");
    expect((ld.recipeInstructions as Record<string, unknown>[])[0]).not.toHaveProperty("name");
  });
  it("даты без микросекунд", () => {
    const r = buildRecipeJsonLd({ ...recipe, created_at: "2026-03-30T14:46:44.000000Z", updated_at: "2026-04-01T10:00:00.123456Z" }, "https://swageda.ru", recipe.url);
    expect(r.datePublished).toBe("2026-03-30T14:46:44Z");
    expect(r.dateModified).toBe("2026-04-01T10:00:00Z");
  });
  it("YouTube-плеер — embedUrl, прямой файл — contentUrl", () => {
    const yt = buildRecipeJsonLd({ ...recipe, video_url: "https://www.youtube.com/embed/abc" }, "https://swageda.ru", recipe.url).video as Record<string, unknown>;
    expect(yt.embedUrl).toBe("https://www.youtube.com/embed/abc");
    expect(yt).not.toHaveProperty("contentUrl");
    const mp4 = buildRecipeJsonLd({ ...recipe, video_url: "https://swageda.ru/v/a.mp4" }, "https://swageda.ru", recipe.url).video as Record<string, unknown>;
    expect(mp4.contentUrl).toBe("https://swageda.ru/v/a.mp4");
  });
});

describe("isoDuration / isoDate", () => {
  it("PT1H30M", () => {
    expect(isoDuration(90)).toBe("PT1H30M");
    expect(isoDuration(120)).toBe("PT2H");
    expect(isoDuration(45)).toBe("PT45M");
    expect(isoDuration(0)).toBeUndefined();
    expect(isoDuration(NaN)).toBeUndefined();
  });
  it("isoDate", () => {
    expect(isoDate("2026-03-30T14:46:44.000000Z")).toBe("2026-03-30T14:46:44Z");
    expect(isoDate("bad")).toBeUndefined();
    expect(isoDate(undefined)).toBeUndefined();
  });
});

describe("buildItemListJsonLd", () => {
  const items = [
    { url: "/borsch/borsch-moskovskiy", title: "Борщ Московский" },
    { url: "https://swageda.ru/borsch/zelenyy", title: "Зелёный борщ" },
  ];
  it("абсолютные URL и сквозные позиции на странице N", () => {
    const ld = buildItemListJsonLd(items, "https://swageda.ru", 20, "Борщ — рецепты с фото");
    expect(ld).toEqual({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Борщ — рецепты с фото",
      numberOfItems: 2,
      itemListElement: [
        { "@type": "ListItem", position: 21, url: "https://swageda.ru/borsch/borsch-moskovskiy", name: "Борщ Московский" },
        { "@type": "ListItem", position: 22, url: "https://swageda.ru/borsch/zelenyy", name: "Зелёный борщ" },
      ],
    });
  });
  it("без имени и с нулевым смещением", () => {
    const ld = buildItemListJsonLd(items.slice(0, 1), "https://swageda.ru/");
    expect(ld).not.toHaveProperty("name");
    expect((ld.itemListElement as { position: number }[])[0].position).toBe(1);
  });
});
