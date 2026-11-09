import { describe, expect, it } from "vitest";
import { SITEMAP_PATTERN } from "../src/lib/sitemap";

describe("SITEMAP_PATTERN", () => {
  it("проксирует все файлы sitemap, включая лендинги", () => {
    for (const p of ["/sitemap.xml", "/sitemap_static.xml", "/sitemap_categories.xml", "/sitemap_landings.xml", "/sitemap_recipes_1.xml", "/sitemap_recipes_12.xml"]) {
      expect(SITEMAP_PATTERN.test(p)).toBe(true);
    }
  });
  it("прочие пути не проксирует", () => {
    for (const p of ["/sitemap_other.xml", "/sitemap_recipes_x.xml", "/sitemap.xml.gz", "/sitemap_landings.xml/", "/a/sitemap.xml"]) {
      expect(SITEMAP_PATTERN.test(p)).toBe(false);
    }
  });
});
