import { describe, expect, it } from "vitest";
import { buildAliasIndex, matchIngredient, normalizeName, recipeRefLinks } from "../src/lib/kitchen/match";
import { buildSitemapXml, kitchenSitemapUrls } from "../src/lib/kitchen/sitemap";
import { KITCHEN_SECTIONS, getAll } from "../src/lib/kitchen/data";

const forms = (nom: string, gen: string, acc: string) => ({ nom, gen, acc });
const index = buildAliasIndex([
  {
    section: "measures",
    entries: [
      { slug: "muka-pshenichnaya", forms: forms("мука пшеничная", "пшеничной муки", "пшеничную муку"), aliases: ["мука пшеничная", "пшеничная мука", "мука"] },
      { slug: "muka-rzhanaya", forms: forms("мука ржаная", "ржаной муки", "ржаную муку"), aliases: ["мука ржаная", "ржаная мука"] },
      { slug: "sahar", forms: forms("сахар", "сахара", "сахар"), aliases: ["сахар"] },
      { slug: "med", forms: forms("мёд", "мёда", "мёд"), aliases: ["мёд"] },
    ],
  },
  {
    section: "substitutions",
    entries: [
      { slug: "razryhlitel", forms: forms("разрыхлитель", "разрыхлителя", "разрыхлитель"), aliases: ["разрыхлитель", "разрыхлитель теста"] },
      { slug: "sahar", forms: forms("сахар", "сахара", "сахар"), aliases: ["сахар"] },
    ],
  },
  { section: "cooking", entries: [{ slug: "svekla", forms: forms("свёкла", "свёклы", "свёклу"), aliases: ["свекла"] }] },
  { section: "storage", entries: [{ slug: "sahar", forms: forms("сахар", "сахара", "сахар"), aliases: ["сахар"] }] },
]);
const slugs = (name: string) => matchIngredient(name, index).map((t) => `${t.section}/${t.slug}`);
const ing = (...names: string[]) => names.map((name) => ({ name }));

describe("справочник: сопоставление ингредиентов", () => {
  it("нормализация: регистр, ё/е, знаки препинания", () => {
    expect(normalizeName("  Мука  пшеничная, в/с (просеянная) ")).toBe("мука пшеничная в с просеянная");
    expect(normalizeName("Свёкла")).toBe("свекла");
  });

  it("шумные названия из рецептов", () => {
    expect(slugs("Мука пшеничная")).toEqual(["measures/muka-pshenichnaya"]);
    expect(slugs("Мука пшеничная в/с")).toEqual(["measures/muka-pshenichnaya"]);
    expect(slugs("Мука (просеянная)")).toEqual(["measures/muka-pshenichnaya"]);
    expect(slugs("Разрыхлитель теста")).toEqual(["substitutions/razryhlitel"]);
  });

  it("ё и е равнозначны в обе стороны", () => {
    expect(slugs("Свёкла варёная")).toEqual(["cooking/svekla"]);
    expect(slugs("свекла")).toEqual(["cooking/svekla"]);
    expect(slugs("Мед цветочный")).toEqual(["measures/med"]);
  });

  it("длинный алиас важнее короткого", () => {
    expect(slugs("Мука ржаная обдирная")).toEqual(["measures/muka-rzhanaya"]);
    expect(slugs("Ржаная мука")).toEqual(["measures/muka-rzhanaya"]);
  });

  it("только целые слова", () => {
    expect(slugs("Мукалтин")).toEqual([]);
    expect(slugs("Сахарная пудра")).toEqual([]);
    expect(slugs("Соль")).toEqual([]);
    expect(slugs("")).toEqual([]);
  });

  it("один алиас — страницы во всех подразделах", () => {
    expect(slugs("Сахар").sort()).toEqual(["measures/sahar", "storage/sahar", "substitutions/sahar"]);
  });
});

describe("справочник: ссылки со страницы рецепта", () => {
  it("человеческие анкоры, подразделы не повторяются", () => {
    const links = recipeRefLinks(ing("Мука пшеничная", "Разрыхлитель", "Свёкла"), 3, index);
    expect(links).toEqual([
      { section: "measures", href: "/spravochnik/mery/muka-pshenichnaya", title: "Сколько грамм пшеничной муки в стакане и ложке" },
      { section: "substitutions", href: "/spravochnik/zamena/razryhlitel", title: "Чем заменить разрыхлитель" },
      { section: "cooking", href: "/spravochnik/skolko-varit/svekla", title: "Сколько варить свёклу" },
    ]);
  });

  it("не больше трёх ссылок, по одной на продукт", () => {
    const links = recipeRefLinks(ing("Мука", "Сахар", "Разрыхлитель", "Свёкла", "Мёд", "Мука ржаная"), 3, index);
    expect(links).toHaveLength(3);
    expect(new Set(links.map((l) => l.href)).size).toBe(3);
    expect(recipeRefLinks(ing("Мука", "Сахар", "Свёкла"), 2, index)).toHaveLength(2);
  });

  it("у продукта с несколькими подразделами берётся свободный; повторы ингредиента не дублируют ссылку", () => {
    const links = recipeRefLinks(ing("Мука", "мука пшеничная", "Сахар"), 3, index);
    expect(links.map((l) => l.href)).toEqual(["/spravochnik/mery/muka-pshenichnaya", "/spravochnik/zamena/sahar"]);
  });

  it("подразделы закончились — добираем оставшимися продуктами", () => {
    const links = recipeRefLinks(ing("Мука", "Мука ржаная", "Мёд"), 3, index);
    expect(links.map((l) => l.href)).toEqual(["/spravochnik/mery/muka-pshenichnaya", "/spravochnik/mery/muka-rzhanaya", "/spravochnik/mery/med"]);
  });

  it("нет совпадений — пустой список", () => {
    expect(recipeRefLinks(ing("Соль", "Вода"), 3, index)).toEqual([]);
    expect(recipeRefLinks([], 3, index)).toEqual([]);
  });

  it("на реальных данных ссылки ведут на существующие страницы", () => {
    const links = recipeRefLinks(ing("Мука пшеничная", "Разрыхлитель", "Сахар", "Яйцо куриное", "Молоко"));
    expect(links.length).toBeLessThanOrEqual(3);
    for (const link of links) expect(link.href).toMatch(/^\/spravochnik\/[a-z-]+\/[a-z0-9-]+$/);
  });
});

describe("справочник: sitemap", () => {
  it("XML: абсолютные адреса, lastmod в формате W3C, экранирование", () => {
    const xml = buildSitemapXml("https://swageda.ru/", [{ path: "/spravochnik", lastmod: "2026-11-13T10:00:00Z" }, { path: "/spravochnik/mery/a&b" }, { path: "/x", lastmod: "не дата" }]);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')).toBe(true);
    expect(xml).toContain("<loc>https://swageda.ru/spravochnik</loc>\n    <lastmod>2026-11-13</lastmod>");
    expect(xml).toContain("<loc>https://swageda.ru/spravochnik/mery/a&amp;b</loc>\n  </url>");
    expect(xml.match(/<lastmod>/g)).toHaveLength(1);
    expect(xml.trimEnd().endsWith("</urlset>")).toBe(true);
  });

  it("в файле — хаб, хабы непустых подразделов и все страницы продуктов, без дублей", () => {
    const urls = kitchenSitemapUrls();
    const filled = KITCHEN_SECTIONS.filter((s) => getAll(s.key).length > 0);
    const total = filled.reduce((n, s) => n + getAll(s.key).length, 0);
    expect(urls).toHaveLength(total === 0 ? 0 : 1 + filled.length + total);
    expect(new Set(urls.map((u) => u.path)).size).toBe(urls.length);
    for (const u of urls) {
      expect(u.path).toMatch(/^\/spravochnik(\/[a-z0-9-]+){0,2}$/);
      expect(u.lastmod).toBeTruthy();
    }
    if (urls.length > 0) expect(urls[0].path).toBe("/spravochnik");
  });
});
