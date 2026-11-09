import { describe, expect, it } from "vitest";
import { mapRecipe, mapRecipeCard, parseRecipeArray, parseRecipeBody, parseRecipeList, toImageProxyUrl } from "../src/lib/api/map";

const raw = {
  id: 40723,
  title: "Курица в аэрогриле",
  description: "Сочная курица",
  main_image: "/storage/recipes/a.jpg",
  cooking_time: "45",
  difficulty: "medium",
  likes_count: 12,
  average_rating: "4.567",
  category: { id: 3, title: "Аэрогриль" },
  user: { name: "Анна" },
  created_at: "2026-01-01T00:00:00Z",
  ingredients: [{ name: "Курица", amount: "1", unit: "кг" }],
  steps: [{ order: 1, text: "Запечь", image: "storage/s1.jpg" }],
};

describe("toImageProxyUrl", () => {
  it("прячет origin за /api-images", () => {
    expect(toImageProxyUrl("/storage/a.jpg")).toBe("/api-images/storage/a.jpg");
    expect(toImageProxyUrl("storage/a.jpg")).toBe("/api-images/storage/a.jpg");
    expect(toImageProxyUrl("/api-images/x.jpg")).toBe("/api-images/x.jpg");
    expect(toImageProxyUrl("https://cdn.example/x.jpg")).toBe("https://cdn.example/x.jpg");
    expect(toImageProxyUrl("")).toBeUndefined();
    expect(toImageProxyUrl(null)).toBeUndefined();
  });
});

describe("mapRecipeCard / mapRecipe", () => {
  it("карточка", () => {
    expect(mapRecipeCard(raw)).toEqual({
      id: 40723,
      slug: "kurica-v-aerogrile",
      url: "/recipe/40723-kurica-v-aerogrile",
      title: "Курица в аэрогриле",
      description: "Сочная курица",
      main_image: "/api-images/storage/recipes/a.jpg",
      cooking_time: 45,
      difficulty: "medium",
      likes_count: 12,
      average_rating: 4.57,
      category: { id: 3, title: "Аэрогриль", href: "/aerogril" },
      author: "Анна",
      created_at: "2026-01-01T00:00:00Z",
    });
  });
  it("slug из API имеет приоритет", () => {
    expect(mapRecipeCard({ ...raw, slug: "kurica" })?.url).toBe("/recipe/40723-kurica");
  });
  it("полный рецепт: ингредиенты, шаги, без выдуманных порций", () => {
    const r = mapRecipe(raw);
    expect(r?.ingredients).toEqual([{ name: "Курица", amount: "1", unit: "кг" }]);
    expect(r?.steps).toEqual([{ order: 1, text: "Запечь", image: "/api-images/storage/s1.jpg" }]);
    expect(r?.servings).toBeUndefined();
    expect(mapRecipe({ ...raw, servings: 4 })?.servings).toBe(4);
  });
  it("невалидный id → null, неизвестная сложность отбрасывается", () => {
    expect(mapRecipeCard({ ...raw, id: "local-1" })).toBeNull();
    expect(mapRecipeCard({ ...raw, difficulty: "insane" })?.difficulty).toBeUndefined();
  });
});

describe("parseRecipeList", () => {
  it("Laravel paginator в data", () => {
    const res = parseRecipeList({ success: true, data: { data: [raw, { id: "x", title: "bad" }], total: 41, per_page: 20, last_page: 3, current_page: 2 } }, 2);
    expect(res.list).toHaveLength(1);
    expect(res).toMatchObject({ total: 41, totalPages: 3, currentPage: 2 });
  });
  it("простой массив", () => {
    expect(parseRecipeList({ data: [raw] })).toMatchObject({ total: 1, totalPages: 1 });
    expect(parseRecipeList([raw]).list[0].id).toBe(40723);
    expect(parseRecipeList(null)).toMatchObject({ list: [], total: 0, totalPages: 1 });
  });
});

describe("parseRecipeBody / parseRecipeArray", () => {
  it("рецепт и «не найдено» старого API (200 + success:false)", () => {
    expect(parseRecipeBody({ success: true, data: raw })?.id).toBe(40723);
    expect(parseRecipeBody({ success: false, message: "Not found" })).toBeNull();
    expect(parseRecipeBody({ success: true, data: [] })).toBeNull();
  });
  it("batch/similar", () => {
    expect(parseRecipeArray({ success: true, data: [raw] })).toHaveLength(1);
    expect(parseRecipeArray([raw])).toHaveLength(1);
    expect(parseRecipeArray({ data: { data: [raw] } })).toHaveLength(1);
    expect(parseRecipeArray("x")).toEqual([]);
  });
});
