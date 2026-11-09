import { describe, expect, it } from "vitest";
import { navSection } from "../src/lib/nav";

describe("navSection", () => {
  it("определяет раздел по пути", () => {
    expect(navSection("/")).toBe("home");
    expect(navSection("/favorites")).toBe("favorites");
    expect(navSection("/favorites/")).toBe("favorites");
    expect(navSection("/shopping-list")).toBe("shopping");
    expect(navSection("/recipes")).toBe("recipes");
    expect(navSection("/recipes", "?page=2")).toBe("recipes");
    expect(navSection("/recipe/12-borsch")).toBe("recipes");
    expect(navSection("/categories")).toBe("recipes");
    expect(navSection("/collection/breakfast")).toBe("recipes");
    expect(navSection("/about")).toBeNull();
    expect(navSection("/recipesx")).toBeNull();
  });
  it("поиск отдельно от каталога", () => {
    expect(navSection("/recipes", "?action=search")).toBe("search");
    expect(navSection("/recipes", new URLSearchParams("q=суп"))).toBe("search");
  });
});
