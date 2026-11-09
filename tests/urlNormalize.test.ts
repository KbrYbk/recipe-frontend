import { describe, expect, it } from "vitest";
import { canonicalPathRedirect } from "../src/lib/urlNormalize";

describe("canonicalPathRedirect", () => {
  it("канонические пути не трогает", () => {
    for (const p of ["/", "/borsch", "/recipes", "/collection/hd", "/supy/borsch-moskovskiy", "/robots.txt", "/sitemap_recipes_2.xml"]) {
      expect(canonicalPathRedirect(p)).toBeNull();
    }
  });
  it("убирает слэш на конце", () => {
    expect(canonicalPathRedirect("/borsch/")).toBe("/borsch");
    expect(canonicalPathRedirect("/recipes/")).toBe("/recipes");
    expect(canonicalPathRedirect("/collection/breakfast///")).toBe("/collection/breakfast");
    expect(canonicalPathRedirect("/supy/borsch/")).toBe("/supy/borsch");
  });
  it("приводит к нижнему регистру", () => {
    expect(canonicalPathRedirect("/Borsch")).toBe("/borsch");
    expect(canonicalPathRedirect("/RECIPES")).toBe("/recipes");
    expect(canonicalPathRedirect("/About/")).toBe("/about");
    expect(canonicalPathRedirect("/Supy/Borsch")).toBe("/supy/borsch");
  });
  it("схлопывает повторные слэши", () => {
    expect(canonicalPathRedirect("//recipes")).toBe("/recipes");
    expect(canonicalPathRedirect("/supy//borsch")).toBe("/supy/borsch");
  });
  it("служебные пути и файлы не меняет по регистру", () => {
    expect(canonicalPathRedirect("/api-images/storage/recipes/AbC.webp")).toBeNull();
    expect(canonicalPathRedirect("/api-proxy/getCategories/")).toBeNull();
    expect(canonicalPathRedirect("/_astro/Inter.ABC123.woff2")).toBeNull();
    expect(canonicalPathRedirect("/AbCdEf123.txt")).toBeNull();
    expect(canonicalPathRedirect("/sitemap.xml/")).toBeNull();
  });
  it("%-кодированные пути: только слэш, регистр не трогается", () => {
    expect(canonicalPathRedirect("/%D0%B1%D0%BE%D1%80%D1%89")).toBeNull();
    expect(canonicalPathRedirect("/%D0%B1%D0%BE%D1%80%D1%89/")).toBe("/%D0%B1%D0%BE%D1%80%D1%89");
  });
});
