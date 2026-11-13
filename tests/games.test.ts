import { describe, expect, it } from "vitest";
import { buildSitemapXml } from "../src/lib/kitchen/sitemap";
import { gameForRecipeSlug, gamePagePath, gameSitemapEntries, RECIPE_GAMES } from "../src/lib/games";
import { navSection } from "../src/lib/nav";

describe("игры рецептов", () => {
  it("игра есть только у зарегистрированного рецепта", () => {
    expect(gameForRecipeSlug("lukovyy-ugar")?.title).toBe("Луковый Угар");
    expect(gameForRecipeSlug("borsch")).toBeNull();
    expect(gameForRecipeSlug("")).toBeNull();
    expect(gameForRecipeSlug(undefined)).toBeNull();
  });

  it("служебные имена объекта не считаются играми", () => {
    for (const name of ["constructor", "toString", "__proto__", "hasOwnProperty"]) expect(gameForRecipeSlug(name)).toBeNull();
  });

  it("путь страницы игры строится от пути рецепта", () => {
    expect(gamePagePath("/vtorye-blyuda/lukovyy-ugar")).toBe("/vtorye-blyuda/lukovyy-ugar/igra");
    expect(gamePagePath("/vtorye-blyuda/lukovyy-ugar/")).toBe("/vtorye-blyuda/lukovyy-ugar/igra");
  });

  it("у каждой игры есть фрейм внутри папки игр и непустые тексты без длинного тире", () => {
    for (const game of Object.values(RECIPE_GAMES)) {
      expect(game.frameSrc).toMatch(/^\/game-files\/[a-z0-9-]+\/index\.html$/);
      expect(game.intro.length).toBeGreaterThan(20);
      expect(game.controls.length).toBeGreaterThan(0);
      expect(JSON.stringify(game)).not.toContain("\u2014");
    }
  });

  it("страница игры подсвечивает раздел рецептов", () => {
    expect(navSection("/vtorye-blyuda/lukovyy-ugar/igra")).toBe("recipes");
    expect(navSection("/vtorye-blyuda/lukovyy-ugar/igra/")).toBe("recipes");
  });

  it("в sitemap попадают только рецепты с игрой, адрес с категорией из API", () => {
    const entries = gameSitemapEntries([
      { slug: "lukovyy-ugar", url: "/vtorye-blyuda/lukovyy-ugar" },
      { slug: "borsch", url: "/supy/borsch" },
    ]);
    expect(entries).toEqual([{ path: "/vtorye-blyuda/lukovyy-ugar/igra", lastmod: "2026-11-13" }]);
    const xml = buildSitemapXml("https://swageda.ru", entries);
    expect(xml).toContain("<loc>https://swageda.ru/vtorye-blyuda/lukovyy-ugar/igra</loc>");
    expect(xml).toContain("<lastmod>2026-11-13</lastmod>");
    expect(xml).not.toContain("borsch");
  });

  it("дата обновления каждой игры - корректная дата", () => {
    for (const game of Object.values(RECIPE_GAMES)) expect(Number.isNaN(Date.parse(game.updatedAt))).toBe(false);
  });
});
