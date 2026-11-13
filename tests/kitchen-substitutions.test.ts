import { describe, expect, it } from "vitest";
import { calculableSubs, formatAmount, substituteAmount, substitutionLead, substitutionSeo } from "../src/lib/kitchen/substitutions";
import { DESCRIPTION_MAX, TITLE_MAX } from "../src/lib/seo";
import type { Substitute } from "../src/types/kitchen";

const sub = (name: string, factor?: number): Substitute => ({
  name,
  ratioText: `На 1 ч. л. разрыхлителя - ½ ч. л.: ${name}.`,
  ...(factor !== undefined ? { factor } : {}),
  bestFor: ["блины"],
  notFor: [],
});
const powder = {
  forms: { nom: "разрыхлитель", gen: "разрыхлителя", acc: "разрыхлитель" },
  subs: [sub("сода с уксусом", 0.5), sub("сода с кефиром"), sub("взбитые белки"), sub("газированная вода", 0)],
};

describe("замены: пересчёт количества", () => {
  it("количество × коэффициент, с округлением", () => {
    expect(substituteAmount(100, 0.8)).toBe(80);
    expect(substituteAmount(2, 0.5)).toBe(1);
    expect(substituteAmount(1, 0.33)).toBe(0.3);
    expect(substituteAmount(250, 1.25)).toBe(313);
    expect(substituteAmount(3, 1.5)).toBe(4.5);
  });
  it("без коэффициента или количества расчёта нет", () => {
    expect(substituteAmount(100, undefined)).toBeNull();
    expect(substituteAmount(0, 0.5)).toBeNull();
    expect(substituteAmount(-1, 0.5)).toBeNull();
    expect(substituteAmount(100, 0)).toBeNull();
    expect(substituteAmount(100, Number.NaN)).toBeNull();
  });
  it("в калькулятор попадают только замены с коэффициентом", () => {
    expect(calculableSubs(powder).map((s) => s.name)).toEqual(["сода с уксусом"]);
    expect(calculableSubs({ subs: [sub("а"), sub("б")] })).toEqual([]);
  });
  it("формат количества с единицей", () => {
    expect(formatAmount(80, "г")).toBe("80 г");
    expect(formatAmount(1.5, "стакан")).toBe("1,5 стакана");
    expect(formatAmount(5, "стакан")).toBe("5 стаканов");
    expect(formatAmount(2, "ст. л.")).toBe("2 ст. л.");
  });
});

describe("замены: тексты страницы", () => {
  it("прямой ответ: до трёх вариантов и пропорция лучшего", () => {
    expect(substitutionLead(powder)).toBe("Вместо разрыхлителя подойдёт сода с уксусом, сода с кефиром или взбитые белки. На 1 ч. л. разрыхлителя - ½ ч. л.: сода с уксусом.");
    expect(substitutionLead({ forms: powder.forms, subs: [sub("сода")] })).toContain("подойдёт сода.");
  });
  it("title ≤ 65, description ≤ 160", () => {
    const seo = substitutionSeo(powder);
    expect(seo.h1).toBe("Чем заменить разрыхлитель");
    expect(seo.title).toBe("Чем заменить разрыхлитель - 4 варианта с пропорциями | SwagEda");
    expect(seo.description).toContain("сода с уксусом");
    const long = {
      forms: { nom: "x", gen: "x", acc: "нерафинированное кокосовое масло холодного отжима первого сорта" },
      subs: powder.subs.map((s) => ({ ...s, name: `${s.name} и ещё очень длинное уточнение к названию` })),
    };
    for (const entry of [powder, long]) {
      const s = substitutionSeo(entry);
      expect(s.title.length, s.title).toBeLessThanOrEqual(TITLE_MAX);
      expect(s.description.length, s.description).toBeLessThanOrEqual(DESCRIPTION_MAX);
    }
  });
});
