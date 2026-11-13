import { describe, expect, it } from "vitest";
import { buildRobotsTxt } from "../src/lib/robots";

describe("robots.txt", () => {
  const txt = buildRobotsTxt("https://swageda.ru");
  const cleanParam = txt.split("\n").find((l) => l.startsWith("Clean-param:"));

  it("Clean-param склеивает метки трафика для всего сайта", () => {
    expect(cleanParam).toBe("Clean-param: utm_source&utm_medium&utm_campaign&utm_content&utm_term&yclid&ysclid&gclid&fbclid&from&action /");
  });
  it("page и фильтры каталога не склеиваются", () => {
    const params = cleanParam!.replace("Clean-param: ", "").replace(" /", "").split("&");
    for (const p of ["page", "sort", "q", "difficulty"]) expect(params).not.toContain(p);
  });
  it("сохраняет прежние Disallow и Sitemap", () => {
    for (const line of ["Disallow: /random", "Disallow: /favorites", "Disallow: /shopping-list", "Disallow: /api-proxy/", "Disallow: /partials/", "Sitemap: https://swageda.ru/sitemap.xml"]) {
      expect(txt).toContain(line);
    }
    expect(buildRobotsTxt("https://swageda.ru/")).toContain("Sitemap: https://swageda.ru/sitemap.xml");
  });
  it("вторая строка Sitemap — справочник", () => {
    const sitemaps = txt.split("\n").filter((l) => l.startsWith("Sitemap:"));
    expect(sitemaps).toEqual(["Sitemap: https://swageda.ru/sitemap.xml", "Sitemap: https://swageda.ru/sitemap_kitchen.xml"]);
  });
});
