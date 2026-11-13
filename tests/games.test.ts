import { describe, expect, it } from "vitest";
import { gameForRecipeSlug, gamePagePath, RECIPE_GAMES } from "../src/lib/games";
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
});
