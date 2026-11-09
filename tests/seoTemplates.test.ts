import { describe, expect, it } from "vitest";
import { parseSectionContent, normalizeCategories } from "../src/lib/categories";
import { collectionSeo, cutByWord, fitTitle, hasOwnDescription, homeSeo, humanDuration, isDescriptionRedundant, recipeDescription, recipesSeo, recipeTitle, sectionSeo } from "../src/lib/seo";

/** Числа форматируются с неразрывным пробелом — в ожиданиях пишем обычный. */
const sp = (s: string) => s.replace(/\u00a0/g, " ");

describe("recipeTitle — ступенчатое урезание до 65", () => {
  it("короткое название — полный шаблон", () => {
    expect(recipeTitle("Луковый Угар")).toBe("Луковый Угар — рецепт с фото пошагово | SwagEda");
  });
  it("длиннее — сначала убирается бренд", () => {
    const t = "Молодая картошка с мясом в духовке";
    expect(recipeTitle(t)).toBe(`${t} — рецепт с фото пошагово`);
    expect(recipeTitle(t).length).toBeLessThanOrEqual(65);
  });
  it("ещё длиннее — «рецепт с фото», затем только название", () => {
    const t = "Салат с курицей, ананасами и грецкими орехами";
    expect(recipeTitle(t)).toBe(`${t} — рецепт с фото`);
    const long = "Очень длинное название домашнего пирога с яблоками, корицей и орехами";
    const r = recipeTitle(long);
    expect(r.length).toBeLessThanOrEqual(65);
    expect(r.endsWith("…")).toBe(true);
    expect(long.startsWith(r.slice(0, -1))).toBe(true);
    expect(r).not.toMatch(/\s…$/);
  });
  it("«рецепт» в названии не дублируется", () => {
    expect(recipeTitle("Борщ — классический рецепт")).toBe("Борщ — классический рецепт — пошагово с фото | SwagEda");
  });
});

describe("cutByWord / fitTitle", () => {
  it("не рвёт слово", () => {
    expect(cutByWord("один два три четыре", 12)).toBe("один два…");
    expect(cutByWord("коротко", 12)).toBe("коротко");
  });
  it("fitTitle берёт первый вариант в лимите", () => {
    expect(fitTitle(["aaaaaaaaaa", "bbb"], 5)).toBe("bbb");
    expect(fitTitle(["aaaa bbbb cccc"], 10)).toBe("aaaa bbbb…");
    expect(fitTitle(["aaaa bbbb cccc"], 9)).toBe("aaaa…");
  });
});

describe("recipeDescription — фолбэк описания", () => {
  const base = {
    title: "Борщ по-белорусски",
    cooking_time: 100,
    difficulty: "hard",
    ingredients: [{ name: "Говядина" }, { name: "Свёкла" }, { name: "Картофель" }, { name: "Капуста" }, { name: "Лук" }],
    steps: [{ text: "Сварить бульон." }],
  };
  it("описание == названию → собирается из данных, с точкой", () => {
    const d = recipeDescription({ ...base, description: "Борщ по-белорусски" });
    expect(d).toBe("Борщ по-белорусски: пошаговый рецепт с фото. Готовится за 1 ч 40 мин, сложно. Понадобится: говядина, свёкла, картофель, капуста и др.");
    expect(d.length).toBeLessThanOrEqual(160);
  });
  it("пустое описание без ингредиентов → первый шаг", () => {
    const d = recipeDescription({ title: "Чай", description: "", cooking_time: 5, ingredients: [], steps: [{ text: "Заварить чай в чайнике" }] });
    expect(d).toBe("Чай: пошаговый рецепт с фото. Готовится за 5 мин. Заварить чай в чайнике.");
  });
  it("своё длинное описание сохраняется и дополняется временем/сложностью", () => {
    const own = "Для поклонников мультфильма «Холодное сердце» предлагаю приготовить красивый и вкусный тортик.";
    const d = recipeDescription({ ...base, title: "Торт", description: own, cooking_time: 80, difficulty: "medium" });
    expect(d).toBe(`${own} Готовится за 1 ч 20 мин, средней сложности.`);
    expect(d.length).toBeLessThanOrEqual(160);
  });
  it("любой результат ≤ 160 и заканчивается точкой", () => {
    const long = "Очень ".repeat(60) + "длинное описание.";
    for (const description of ["", long, "Коротко"]) {
      const d = recipeDescription({ ...base, description, ingredients: Array.from({ length: 10 }, (_, i) => ({ name: `ингредиент с длинным названием ${i}` })) });
      expect(d.length).toBeLessThanOrEqual(160);
      expect(d).toMatch(/[.!?…]$/);
    }
  });
  it("hasOwnDescription / isDescriptionRedundant", () => {
    expect(hasOwnDescription({ title: "Борщ", description: "Борщ" })).toBe(false);
    expect(isDescriptionRedundant({ title: "Борщ по-белорусски", description: "борщ  по белорусски" })).toBe(true);
    expect(isDescriptionRedundant({ title: "Борщ", description: "" })).toBe(true);
    expect(isDescriptionRedundant({ title: "Борщ", description: "Наваристый борщ" })).toBe(false);
  });
  it("humanDuration — «1 ч 30 мин»", () => {
    expect(humanDuration(90)).toBe("1 ч 30 мин");
    expect(humanDuration(120)).toBe("2 ч");
    expect(humanDuration(15)).toBe("15 мин");
    expect(humanDuration(0)).toBe("");
  });
});

describe("главная, каталог, разделы, подборки", () => {
  it("главная содержит «рецепты» и округлённое число", () => {
    const s = homeSeo(39222);
    expect(sp(s.title)).toBe("Рецепты с фото пошагово — более 39 000 блюд | SwagEda");
    expect(s.h1).toMatch(/^Рецепты с фото пошагово/);
    expect(homeSeo(0).title).toBe("Рецепты с фото пошагово — простые и вкусные блюда | SwagEda");
  });
  it("/recipes", () => {
    const s = recipesSeo(39222, 1);
    expect(sp(s.title)).toBe("Все рецепты с фото пошагово — каталог 39 222 рецепта | SwagEda");
    expect(s.title.length).toBeLessThanOrEqual(65);
    expect(recipesSeo(39222, 3).title).toContain("страница 3");
    expect(recipesSeo(39222, 3).description).toMatch(/Страница 3\.$/);
  });
  it("категория без SEO-полей — шаблон, бренд убирается при длине > 65", () => {
    const s = sectionSeo({ title: "Борщ" }, 141, 1);
    expect(s.title).toBe("Борщ — 141 рецепт с фото пошагово | SwagEda");
    expect(s.h1).toBe("Борщ — рецепты с фото");
    expect(s.description).not.toMatch(/SwagEda/);
    const long = sectionSeo({ title: "Салаты праздничные на Новый год" }, 1215, 2);
    expect(long.title.length).toBeLessThanOrEqual(65);
    expect(long.title).not.toContain("SwagEda");
    expect(long.title).toContain("страница 2");
  });
  it("категория с полями из API", () => {
    const s = sectionSeo(
      { title: "Борщ", seoTitle: "Борщ — рецепты с фото пошагово: классический, с мясом, зелёный", seoDescription: "141 рецепт борща с фото", h1: "Борщ: рецепты с фото пошагово" },
      141,
      1,
    );
    expect(s.title).toBe("Борщ — рецепты с фото пошагово: классический, с мясом, зелёный");
    expect(s.h1).toBe("Борщ: рецепты с фото пошагово");
    expect(s.description).toBe("141 рецепт борща с фото.");
    expect(sectionSeo({ title: "Борщ", seoTitle: "Борщ" }, 1, 1).title).toBe("Борщ | SwagEda");
    expect(sectionSeo({ title: "Борщ", seoDescription: "Описание." }, 1, 2).description).toBe("Описание. Страница 2.");
  });
  it("подборки под «что приготовить на …»", () => {
    expect({ ...collectionSeo("breakfast", "Завтраки", 2671, 1), title: sp(collectionSeo("breakfast", "Завтраки", 2671, 1).title) }).toMatchObject({
      title: "Что приготовить на завтрак — 2 671 рецепт с фото | SwagEda",
      h1: "Что приготовить на завтрак: рецепты с фото",
    });
    expect(collectionSeo("dinner", "Ужины", 6000, 1).title).toBe("Что приготовить на ужин — быстрые и простые рецепты с фото");
    const p2 = collectionSeo("lunch", "Обеды", 3000, 2);
    expect(p2.title).toContain("страница 2");
    expect(p2.title.length).toBeLessThanOrEqual(65);
    expect(collectionSeo("hd", "Здоровое питание", 500, 1).h1).toBe("Здоровое питание: рецепты с фото");
  });
});

describe("SEO-поля категории из API", () => {
  it("старый API без полей — пустой объект", () => {
    expect(parseSectionContent({})).toEqual({});
    expect(normalizeCategories([{ id: 1, title: "Борщ" }])[0]).toEqual({ id: 1, title: "Борщ", path: "borsch" });
  });
  it("разбирает поля, отбрасывает мусор", () => {
    const c = parseSectionContent({
      seo_title: "  Борщ  ",
      seo_description: "",
      h1: null,
      intro: "Первый абзац.\r\n\r\nВторой\nабзац.\n\n  ",
      faq: [{ q: "Сколько варить?", a: "2 часа" }, { q: "", a: "x" }, null as never, { q: "Без ответа" }],
      featured_recipe_ids: [5, "7", 5, -1, "x", 0],
    });
    expect(c).toEqual({
      seoTitle: "Борщ",
      intro: ["Первый абзац.", "Второй абзац."],
      faq: [{ q: "Сколько варить?", a: "2 часа" }],
      featuredRecipeIds: [5, 7],
    });
  });
});
