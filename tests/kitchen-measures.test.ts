import { describe, expect, it } from "vitest";
import { formatGrams, fromGrams, measureLabel, measureLead, measureRows, measureSeo, parseQuantity, toGrams } from "../src/lib/kitchen/measures";
import { formatDecimal, formatRange, pluralRu, roundTo } from "../src/lib/kitchen/format";
import { DESCRIPTION_MAX, TITLE_MAX } from "../src/lib/seo";

const flour = { forms: { nom: "мука пшеничная", gen: "пшеничной муки", acc: "пшеничную муку" }, grams: { glass250: 160, glass200: 130, tbsp: 15, tbspHeaped: 25, tspHeaped: 10 } };
const milk = { forms: { nom: "молоко", gen: "молока", acc: "молоко" }, grams: { glass250: 250, glass200: 200, tbsp: 18, tsp: 5 } };
const egg = { forms: { nom: "куриное яйцо", gen: "куриного яйца", acc: "куриное яйцо" }, grams: { piece: 55, glass250: 240 }, pieceLabel: "1 яйцо категории С1" };

describe("меры: таблица", () => {
  it("строки идут в фиксированном порядке, пустые меры пропускаются", () => {
    expect(measureRows(flour).map((r) => r.key)).toEqual(["glass250", "glass200", "tbsp", "tbspHeaped", "tspHeaped"]);
    expect(measureRows({ grams: { tsp: 5, glass250: 0, tbsp: Number.NaN } }).map((r) => r.key)).toEqual(["tsp"]);
  });

  it("«без горки» уточняется, только если есть вариант с горкой", () => {
    expect(measureLabel("tbsp", flour.grams)).toBe("Столовая ложка без горки");
    expect(measureLabel("tbsp", milk.grams)).toBe("Столовая ложка");
    expect(measureLabel("tspHeaped", flour.grams)).toBe("Чайная ложка с горкой");
    expect(measureLabel("piece", egg.grams, egg.pieceLabel)).toBe("1 яйцо категории С1");
  });

  it("формат граммов", () => {
    expect([160, 7.5, 12.25, 19.96, 25.4, 1000, 1250, 0.5].map(formatGrams)).toEqual(["160 г", "7,5 г", "12,3 г", "20 г", "25 г", "1 кг", "1,25 кг", "0,5 г"]);
  });
});

describe("меры: конвертер", () => {
  it("разбирает дроби, запятую и смешанные числа", () => {
    expect(parseQuantity("2")).toBe(2);
    expect(parseQuantity(" 1,5 ")).toBe(1.5);
    expect(parseQuantity("1.5")).toBe(1.5);
    expect(parseQuantity("1/2")).toBe(0.5);
    expect(parseQuantity("1 1/2")).toBe(1.5);
    expect(parseQuantity("1  1/2")).toBe(1.5);
    expect(parseQuantity("½")).toBe(0.5);
  });

  it("отклоняет мусор, ноль и слишком большие значения", () => {
    for (const bad of ["", "abc", "0", "-2", "1/0", "1,5,5", "2 стакана", "1e3", "1000000"]) expect(parseQuantity(bad), bad).toBeNull();
  });

  it("меры → граммы", () => {
    expect(toGrams(flour.grams, "glass250", 2)).toBe(320);
    expect(toGrams(flour.grams, "tbspHeaped", 0.5)).toBe(12.5);
    expect(toGrams(flour.grams, "glass250", 1 / 3)).toBe(53.3);
    expect(toGrams(flour.grams, "tsp", 1)).toBeNull();
    expect(toGrams(flour.grams, "glass250", 0)).toBeNull();
  });

  it("граммы → меры (обратный пересчёт) со склонением", () => {
    const amounts = Object.fromEntries(fromGrams(flour.grams, 320).map((a) => [a.key, a.text]));
    expect(amounts).toEqual({
      glass250: "≈ 2 стакана по 250 мл",
      glass200: "≈ 2,5 гранёного стакана по 200 мл",
      tbsp: "≈ 21 столовая ложка",
      tbspHeaped: "≈ 12,8 столовой ложки с горкой",
      tspHeaped: "≈ 32 чайные ложки с горкой",
    });
    expect(fromGrams(milk.grams, 250)[0]).toEqual({ key: "glass250", count: 1, text: "≈ 1 стакан по 250 мл" });
    expect(fromGrams(egg.grams, 165).find((a) => a.key === "piece")?.text).toBe("≈ 3 штуки");
    expect(fromGrams(flour.grams, 5).find((a) => a.key === "glass250")?.text).toBe("меньше 0,1 стакана по 250 мл");
    expect(fromGrams(flour.grams, 0)).toEqual([]);
  });

  it("пересчёт туда и обратно сходится", () => {
    const grams = toGrams(flour.grams, "glass200", 3)!;
    expect(fromGrams(flour.grams, grams).find((a) => a.key === "glass200")?.count).toBe(3);
  });
});

describe("меры: тексты страницы", () => {
  it("прямой ответ содержит цифры и родительный падеж", () => {
    expect(measureLead(flour)).toBe("В стакане 250 мл - 160 г пшеничной муки, в столовой ложке с горкой - 25 г, в чайной ложке с горкой - 10 г.");
    expect(measureLead(milk)).toBe("В стакане 250 мл - 250 г молока, в столовой ложке - 18 г, в чайной ложке - 5 г.");
    expect(measureLead(egg)).toBe("В стакане 250 мл - 240 г куриного яйца. 1 яйцо категории С1 весит около 55 г.");
  });

  it("title ≤ 65, description ≤ 160 и содержит граммы", () => {
    for (const entry of [flour, milk, egg]) {
      const seo = measureSeo(entry);
      expect(seo.title.length).toBeLessThanOrEqual(TITLE_MAX);
      expect(seo.description.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
      expect(seo.description).toMatch(/\d+ г/);
      expect(seo.h1).toBe(`Сколько грамм ${entry.forms.gen} в стакане и ложке`);
    }
    expect(measureSeo(flour).title).toBe("Сколько грамм пшеничной муки в стакане и ложке | SwagEda");
    const long = { forms: { nom: "смесь сушёных прованских трав с чесноком и перцем", gen: "смеси сушёных прованских трав с чесноком и перцем", acc: "смесь" }, grams: flour.grams };
    expect(measureSeo(long).title.length).toBeLessThanOrEqual(TITLE_MAX);
    expect(measureSeo(long).description.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
  });
});

describe("числа и склонения", () => {
  it("pluralRu", () => {
    const forms = ["день", "дня", "дней"] as const;
    expect([1, 2, 5, 11, 12, 21, 22, 25, 101, 111].map((n) => pluralRu(n, forms))).toEqual(["день", "дня", "дней", "дней", "дней", "день", "дня", "дней", "день", "дней"]);
    expect(pluralRu(1.5, forms)).toBe("дня");
    expect(pluralRu(0.5, ["столовая ложка", "столовые ложки", "столовых ложек", "столовой ложки"])).toBe("столовой ложки");
  });
  it("округление и диапазоны", () => {
    expect(roundTo(0.1 + 0.2, 1)).toBe(0.3);
    expect(roundTo(1.005, 2)).toBe(1.01);
    expect(formatDecimal(2.5)).toBe("2,5");
    expect(formatDecimal(2)).toBe("2");
    expect(formatRange(2, 3)).toBe("2–3");
    expect(formatRange(3, 3)).toBe("3");
  });
});
