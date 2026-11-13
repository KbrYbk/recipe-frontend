import { describe, expect, it } from "vitest";
import { buildSitemapXml } from "../src/lib/kitchen/sitemap";
import { buildGameJsonLd, gameForRecipeSlug, gamePagePath, gameSitemapEntries, RECIPE_GAMES } from "../src/lib/games";
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

  it("SEO-тексты игры укладываются в лимиты и не содержат длинного тире", () => {
    for (const game of Object.values(RECIPE_GAMES)) {
      expect(game.description.length).toBeLessThanOrEqual(160);
      expect(game.description.length).toBeGreaterThan(70);
      expect(game.about.join(" ").split(/\s+/).length).toBeGreaterThan(60);
      expect(game.cta.title).toContain(game.title);
      expect(JSON.stringify([game.description, game.about, game.cta])).not.toContain("\u2014");
    }
  });

  it("разметка VideoGame: бесплатная веб-игра с адресом, рецептом-основой и картинкой", () => {
    const game = RECIPE_GAMES["lukovyy-ugar"];
    const ld = buildGameJsonLd(game, {
      origin: "https://swageda.ru/",
      path: "/vtorye-blyuda/lukovyy-ugar/igra",
      recipePath: "/vtorye-blyuda/lukovyy-ugar",
      recipeTitle: "Луковый Угар",
      image: "https://swageda.ru/api-images/x.webp",
    });
    expect(ld["@type"]).toBe("VideoGame");
    expect(ld.url).toBe("https://swageda.ru/vtorye-blyuda/lukovyy-ugar/igra");
    expect(ld.isAccessibleForFree).toBe(true);
    expect(ld.isBasedOn).toEqual({ "@type": "CreativeWork", name: "Луковый Угар", url: "https://swageda.ru/vtorye-blyuda/lukovyy-ugar" });
    expect(ld.image).toBe("https://swageda.ru/api-images/x.webp");
    expect(buildGameJsonLd(game, { origin: "https://swageda.ru", path: "/a/b/igra", recipePath: "/a/b", recipeTitle: "B" })).not.toHaveProperty("image");
  });
});
