import { describe, expect, it } from "vitest";
import { getRecipeUrl, isCanonicalRecipePath, isValidRecipeSlug, normalizeStoredId, normalizeStoredIdList, parseRecipeId, parseRecipeParam, recipeSlug } from "../src/lib/recipeUrl";

describe("getRecipeUrl", () => {
  it("берёт канонический path из API: /{категория}/{slug}", () => {
    expect(getRecipeUrl({ id: 42, title: "Борщ", slug: "borsch", path: "/supy/borsch" })).toBe("/supy/borsch");
    expect(getRecipeUrl({ id: 42, title: "Борщ", slug: "borsch", path: "/recipes/borsch" })).toBe("/recipes/borsch");
  });
  it("некорректный path игнорируется — прежний вид (только для старого API)", () => {
    for (const path of ["/recipe/borsch", "supy/borsch", "/supy/borsch/x", "/supy/Borsch", "//evil.com/x", "/supy/", "https://x.ru/a/b"]) {
      expect(getRecipeUrl({ id: 42, title: "Борщ", slug: "borsch", path })).toBe("/recipe/42-borsch");
    }
  });
  it("без path строит /recipe/{id}-{slug} по slug из API", () => {
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
    expect(getRecipeUrl({ id: "tmp-5", title: "x" })).toBe("/recipes");
  });
});

describe("isCanonicalRecipePath / isValidRecipeSlug", () => {
  it("канонический путь — ровно два валидных сегмента, не /recipe/", () => {
    expect(isCanonicalRecipePath("/supy/borsch-2")).toBe(true);
    expect(isCanonicalRecipePath("/recipes/5-minutnyy-pirog")).toBe(true);
    expect(isCanonicalRecipePath("/recipe/123-borsch")).toBe(false);
    expect(isCanonicalRecipePath("/supy")).toBe(false);
    expect(isCanonicalRecipePath(null)).toBe(false);
  });
  it("формат slug", () => {
    expect(isValidRecipeSlug("borsch-ukrainskiy")).toBe(true);
    for (const v of ["", "Borsch", "borsch--2", "-borsch", "borsch-", "борщ", "a".repeat(121)]) expect(isValidRecipeSlug(v)).toBe(false);
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
    expect(parseRecipeParam("local-999001")).toEqual({ id: 999001, slug: null });
  });
  it("мусор → null", () => {
    for (const v of ["", "abc", "local-", "local-1-x", "0", "-5", "db-", "db-12-x", undefined, null]) expect(parseRecipeParam(v)).toBeNull();
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
    expect(normalizeStoredIdList(["db-1", "2", 1, "local-999001", null, "db-2", 3, "x-5"])).toEqual(["1", "2", "999001", "3"]);
    expect(normalizeStoredIdList("oops")).toEqual([]);
  });
});
