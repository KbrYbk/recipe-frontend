import { describe, expect, it, vi } from "vitest";
import { buildCatalogHref, catalogCanonical, isPristineFirstPage, mergeFeatured, parseCatalogQuery, pluralRecipes, toApiSearchParams } from "../src/lib/catalog";
import { recipeListPath } from "../src/lib/api/recipes";

// API-клиент читает секреты из astro:env — в юнит-тестах сеть не нужна.
vi.mock("../src/lib/api/client", () => ({ apiGet: vi.fn() }));
import { categoryDescription, normalizeCategories, resolveCategory } from "../src/lib/categories";

const q = (s: string) => parseCatalogQuery(new URLSearchParams(s));

describe("parseCatalogQuery / toApiSearchParams", () => {
  it("пробрасывает sort/minTime/maxTime/minRating/difficulty в API", () => {
    const query = q("sort=rating&difficulty=easy&maxTime=30&minTime=10&minRating=4&page=3&q=  борщ  ");
    expect(query).toMatchObject({ q: "борщ", page: 3, sort: "rating", difficulty: "easy", minTime: 10, maxTime: 30, minRating: 4 });
    expect(toApiSearchParams(query).toString()).toBe("sort=rating&difficulty=easy&minTime=10&maxTime=30&minRating=4");
  });
  it("значения по умолчанию не отправляются, мусор игнорируется", () => {
    const query = q("sort=drop&difficulty=x&maxTime=-1&minRating=9&page=abc");
    expect(query).toMatchObject({ page: 1, sort: "popular", difficulty: "", maxTime: null, minRating: null });
    expect(toApiSearchParams(query).toString()).toBe("sort=popular");
  });
  it("«больше часа» = 9999", () => {
    expect(toApiSearchParams(q("maxTime=9999")).get("maxTime")).toBe("9999");
  });
});

describe("buildCatalogHref", () => {
  const cur = q("sort=name&difficulty=hard&page=4");
  it("смена фильтра сбрасывает страницу", () => {
    expect(buildCatalogHref("/supy", cur, { minRating: 4 })).toBe("/supy?sort=name&difficulty=hard&minRating=4");
  });
  it("пагинация сохраняет фильтры", () => {
    expect(buildCatalogHref("/supy", cur, { page: 5 })).toBe("/supy?sort=name&difficulty=hard&page=5");
    expect(buildCatalogHref("/supy", cur, { page: 1 })).toBe("/supy?sort=name&difficulty=hard");
  });
  it("сброс значений", () => {
    expect(buildCatalogHref("/recipes", cur, { sort: "popular", difficulty: null })).toBe("/recipes");
    expect(buildCatalogHref("/recipes", cur, { sort: null, difficulty: null })).toBe("/recipes");
    expect(buildCatalogHref("/recipes", cur, { sort: "newest", difficulty: null })).toBe("/recipes?sort=newest");
  });
  it("canonical — только страница", () => {
    expect(catalogCanonical("/supy", 1)).toBe("/supy");
    expect(catalogCanonical("/supy", 3)).toBe("/supy?page=3");
  });
});

describe("pluralRecipes", () => {
  it("склонения", () => {
    expect([1, 2, 5, 11, 21, 22, 25, 111].map(pluralRecipes)).toEqual(["рецепт", "рецепта", "рецептов", "рецептов", "рецепт", "рецепта", "рецептов", "рецептов"]);
  });
});

describe("категории", () => {
  const cats = normalizeCategories({
    success: true,
    data: [
      { id: 1, title: "Супы-пюре", slug: "supy-piure" },
      { id: 2, title: "Аэрогриль", slug: null },
      { id: 0, title: "bad" },
      { id: 3, title: "" },
    ],
  });
  it("нормализация: canonical path = slugify(title)", () => {
    expect(cats).toEqual([
      { id: 1, title: "Супы-пюре", path: "supy-pyure", dbSlug: "supy-piure" },
      { id: 2, title: "Аэрогриль", path: "aerogril" },
    ]);
  });
  it("резолв по slugify(title) и по slug из БД (с редиректом)", () => {
    expect(resolveCategory("supy-pyure", cats)).toEqual({ category: cats[0], redirect: false });
    expect(resolveCategory("supy-piure", cats)).toEqual({ category: cats[0], redirect: true });
    expect(resolveCategory("AEROGRIL", cats)?.category.id).toBe(2);
    expect(resolveCategory("nope", cats)).toBeNull();
    expect(resolveCategory("%E0%A4%A", cats)).toBeNull();
  });
  it("описание с названием и числом рецептов", () => {
    expect(categoryDescription("Аэрогриль", 1234)).toContain("Аэрогриль: 1\u00a0234 рецепта");
    expect(categoryDescription("Супы", 0)).toContain("Супы: Рецепты");
  });
});

describe("сортировка popular по умолчанию", () => {
  it("без sort в URL API получает popular", () => {
    expect(toApiSearchParams(q("")).toString()).toBe("sort=popular");
    expect(recipeListPath(q(""), 5)).toBe("/getRecipes/category/5/1?sort=popular");
    expect(recipeListPath(q("page=3"))).toBe("/getRecipes/page/3?sort=popular");
  });
  it("явная сортировка сохраняется, newest пишется в URL", () => {
    expect(toApiSearchParams(q("sort=newest")).get("sort")).toBe("newest");
    expect(buildCatalogHref("/supy", q(""), { sort: "newest" })).toBe("/supy?sort=newest");
    expect(buildCatalogHref("/supy", q("sort=newest"), { sort: "popular" })).toBe("/supy");
  });
  it("в поиске без явной сортировки sort не отправляется (релевантность)", () => {
    expect(toApiSearchParams(q("q=борщ")).has("sort")).toBe(false);
    expect(toApiSearchParams(q("q=борщ&sort=rating")).get("sort")).toBe("rating");
  });
  it("закреплённые рецепты первыми, без дублей", () => {
    expect(mergeFeatured([{ id: 3 }, { id: 9 }], [{ id: 1 }, { id: 3 }, { id: 2 }]).map((r) => r.id)).toEqual([3, 9, 1, 2]);
    expect(mergeFeatured([], [{ id: 1 }]).map((r) => r.id)).toEqual([1]);
  });
  it("чистая первая страница — без поиска, фильтров, другой сортировки и пагинации", () => {
    expect(isPristineFirstPage(q(""))).toBe(true);
    expect(isPristineFirstPage(q("utm_source=x"))).toBe(true);
    for (const s of ["page=2", "q=борщ", "sort=newest", "difficulty=easy", "maxTime=30"]) expect(isPristineFirstPage(q(s))).toBe(false);
  });
});
