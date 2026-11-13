import { describe, expect, it } from "vitest";
import { KITCHEN_SECTIONS } from "../src/lib/kitchen/data";
import { capitalize, countProducts, entryTitle, fitDescription, kitchenSectionSeo } from "../src/lib/kitchen/seo";
import { filterKey, matchesFilter } from "../src/lib/kitchen/filter";
import { DESCRIPTION_MAX, TITLE_MAX } from "../src/lib/seo";

describe("справочник: SEO-шаблоны", () => {
  it("хабы подразделов: title ≤ 65, description ≤ 160 при любом числе продуктов", () => {
    for (const section of KITCHEN_SECTIONS) {
      for (const count of [1, 3, 50, 150, 1234]) {
        const seo = kitchenSectionSeo(section.key, count);
        expect(seo.title.length, seo.title).toBeLessThanOrEqual(TITLE_MAX);
        expect(seo.description.length, seo.description).toBeLessThanOrEqual(DESCRIPTION_MAX);
        expect(seo.h1).not.toBe("");
        expect(seo.intro.length).toBeGreaterThan(80);
      }
    }
  });

  it("число продуктов склоняется", () => {
    expect([1, 2, 5, 11, 21, 22, 112, 150].map(countProducts)).toEqual(["1 продукт", "2 продукта", "5 продуктов", "11 продуктов", "21 продукт", "22 продукта", "112 продуктов", "150 продуктов"]);
    expect(kitchenSectionSeo("measures", 80).description).toContain("80 продуктов");
  });

  it("title страницы продукта: не помещается — сначала без бренда, затем без хвоста", () => {
    expect(entryTitle("сколько варить свёклу")).toBe("Сколько варить свёклу | SwagEda");
    expect(entryTitle("сколько варить свёклу", "40–60 минут")).toBe("Сколько варить свёклу — 40–60 минут | SwagEda");
    const long = entryTitle("сколько грамм панировочных сухарей в стакане и ложке", "таблица и калькулятор");
    expect(long.length).toBeLessThanOrEqual(TITLE_MAX);
    expect(long).toBe("Сколько грамм панировочных сухарей в стакане и ложке | SwagEda");
    expect(capitalize("  ёлка ")).toBe("Ёлка");
    expect(fitDescription("слово ".repeat(60)).length).toBeLessThanOrEqual(DESCRIPTION_MAX);
  });
});

describe("справочник: фильтр списка продуктов", () => {
  it("ищет по началу слова, без учёта регистра и ё/е", () => {
    const key = filterKey("Мука  пшеничная");
    expect(key).toBe("мука пшеничная");
    expect(matchesFilter(key, "")).toBe(true);
    expect(matchesFilter(key, "  ")).toBe(true);
    expect(matchesFilter(key, "МУК")).toBe(true);
    expect(matchesFilter(key, "пшен")).toBe(true);
    expect(matchesFilter(key, "пшен мук")).toBe(true);
    expect(matchesFilter(key, "ука")).toBe(false);
    expect(matchesFilter(key, "мука ржаная")).toBe(false);
    expect(matchesFilter(filterKey("Свёкла"), "свекла")).toBe(true);
    expect(matchesFilter(filterKey("хмели-сунели"), "сунели")).toBe(true);
  });
});
