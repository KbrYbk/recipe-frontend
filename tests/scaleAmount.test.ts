import { describe, expect, it } from "vitest";
import { formatNumber, parseNumber, parseScale, scaleAmountText, scaleCaption } from "../src/lib/scaleAmount";

describe("parseNumber", () => {
  it("целые, десятичные, дроби", () => {
    expect(parseNumber("200")).toBe(200);
    expect(parseNumber("0,5")).toBe(0.5);
    expect(parseNumber("1.25")).toBe(1.25);
    expect(parseNumber("1/2")).toBe(0.5);
    expect(parseNumber("1 1/2")).toBe(1.5);
    expect(parseNumber("½")).toBe(0.5);
    expect(parseNumber("1/0")).toBeNull();
    expect(parseNumber("щепотка")).toBeNull();
  });
});

describe("scaleAmountText", () => {
  it("умножает количества", () => {
    expect(scaleAmountText("200 г", 2)).toBe("400 г");
    expect(scaleAmountText("0,5 ч.л.", 3)).toBe("1,5 ч.л.");
    expect(scaleAmountText("1/2 стакана", 2)).toBe("1 стакана");
    expect(scaleAmountText("1 1/2 стакана", 2)).toBe("3 стакана");
    expect(scaleAmountText("½ шт.", 3)).toBe("1,5 шт.");
    expect(scaleAmountText("200г", 0.5)).toBe("100г");
    expect(scaleAmountText("1 стакан (200 мл)", 1.5)).toBe("1,5 стакан (300 мл)");
  });
  it("диапазоны", () => {
    expect(scaleAmountText("1-2 шт.", 2)).toBe("2-4 шт.");
    expect(scaleAmountText("2 – 3 зубчика", 1.5)).toBe("3 – 4,5 зубчика");
  });
  it("нечисловое и ×1 не трогает", () => {
    expect(scaleAmountText("по вкусу", 2)).toBe("по вкусу");
    expect(scaleAmountText("щепотка", 3)).toBe("щепотка");
    expect(scaleAmountText("200 г", 1)).toBe("200 г");
    expect(scaleAmountText("яйцо С1", 2)).toBe("яйцо С1");
    expect(scaleAmountText("", 2)).toBe("");
  });
  it("округление", () => {
    expect(scaleAmountText("1/3 стакана", 0.5)).toBe("0,17 стакана");
    expect(formatNumber(2)).toBe("2");
  });
});

describe("scale options", () => {
  it("parseScale", () => {
    expect(parseScale("2")).toBe(2);
    expect(parseScale("0.5")).toBe(0.5);
    expect(parseScale("7")).toBe(1);
    expect(parseScale(null)).toBe(1);
  });
  it("подпись", () => {
    expect(scaleCaption(1)).toBe("Количество: ×1 — как в рецепте");
    expect(scaleCaption(1.5)).toBe("Количество: ×1,5");
    expect(scaleCaption(1, 4)).toBe("на 4 порции — как в рецепте");
    expect(scaleCaption(2, 4)).toBe("на 8 порций");
    expect(scaleCaption(0.5, 1)).toBe("на 1 порцию");
  });
});
