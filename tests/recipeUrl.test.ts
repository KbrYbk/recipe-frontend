import { describe, expect, it } from "vitest";
import { getRecipeUrl, normalizeStoredId, normalizeStoredIdList, parseRecipeId, parseRecipeParam, recipeSlug } from "../src/lib/recipeUrl";

describe("getRecipeUrl", () => {
  it("строит /recipe/{id}-{slug} по slug из API", () => {
    expect(getRecipeUrl({ id: 42, title: "Что угодно", slug: "borsch" })).toBe("/recipe/42-borsch");
  });
  it("вычисляет slug из title, если API его не отдаёт", () => {
    expect(getRecipeUrl({ id: "42", title: "Блины на молоке" })).toBe("/recipe/42-bliny-na-moloke");
    expect(recipeSlug({ id: 1, title: "Блины", slug: "  " })).toBe("bliny");
  });
  it("понимает старый id с префиксом db-", () => {
    expect(getRecipeUrl({ id: "db-7", title: "Каша" })).toBe("/recipe/7-kasha");
  });
  it("невалидный id → каталог", () => {
    expect(getRecipeUrl({ id: "local-5", title: "x" })).toBe("/recipes");
  });
});

describe("parseRecipeParam", () => {
  it("канонический вид", () => {
    expect(parseRecipeParam("123-borsch")).toEqual({ id: 123, slug: "borsch" });
    expect(parseRecipeParam("123-sup-s-frikadelkami")).toEqual({ id: 123, slug: "sup-s-frikadelkami" });
  });
  it("старые адреса", () => {
    expect(parseRecipeParam("db-40723")).toEqual({ id: 40723, slug: null });
    expect(parseRecipeParam("40723")).toEqual({ id: 40723, slug: null });
  });
  it("мусор → null", () => {
    for (const v of ["", "abc", "local-999001", "0", "-5", "db-", "db-12-x", undefined, null]) expect(parseRecipeParam(v)).toBeNull();
  });
});

describe("parseRecipeId / хранимые id", () => {
  it("нормализует", () => {
    expect(parseRecipeId(5)).toBe(5);
    expect(parseRecipeId("db-5")).toBe(5);
    expect(parseRecipeId(" 5 ")).toBe(5);
    expect(parseRecipeId(1.5)).toBeNull();
    expect(normalizeStoredId("db-12")).toBe("12");
  });
  it("список: старый формат, дубли и мусор", () => {
    expect(normalizeStoredIdList(["db-1", "2", 1, "local-999001", null, "db-2", 3])).toEqual(["1", "2", "3"]);
    expect(normalizeStoredIdList("oops")).toEqual([]);
  });
});
