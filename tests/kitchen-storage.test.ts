import { describe, expect, it } from "vitest";
import {
  daysBetween,
  eatBy,
  expiryResult,
  formatPlainDate,
  formatTerm,
  orderedConditions,
  parsePlainDate,
  storageLead,
  storageSeo,
  termPhrase,
  toIsoDate,
  todayPlain,
} from "../src/lib/kitchen/storage";
import { KITCHEN_SECTIONS } from "../src/lib/kitchen/data";
import { DESCRIPTION_MAX, TITLE_MAX } from "../src/lib/seo";
import type { StorageCondition } from "../src/types/kitchen";

const chicken = {
  forms: { nom: "варёная курица", gen: "варёной курицы", acc: "варёную курицу" },
  conditions: [
    { where: "room", min: 1, max: 2, unit: "h" },
    { where: "freezer", min: 2, max: 4, unit: "mo" },
    { where: "fridge", min: 3, max: 4, unit: "d" },
  ] satisfies StorageCondition[],
};
const pasta = {
  forms: { nom: "макароны", gen: "макарон", acc: "макароны", plural: true },
  conditions: [
    { where: "room", min: 12, max: 24, unit: "mo" },
    { where: "fridge", min: 24, max: 24, unit: "mo" },
  ] satisfies StorageCondition[],
};
const date = (iso: string) => parsePlainDate(iso)!;

describe("хранение: форматирование сроков", () => {
  it("слово согласуется с последним числом, годы вместо месяцев, кратных 12", () => {
    const term = (min: number, max: number, unit: StorageCondition["unit"]) => formatTerm({ min, max, unit });
    expect(term(3, 4, "d")).toBe("3–4 дня");
    expect(term(5, 7, "d")).toBe("5–7 дней");
    expect(term(1, 1, "d")).toBe("1 день");
    expect(term(1, 2, "h")).toBe("1–2 часа");
    expect(term(2, 4, "mo")).toBe("2–4 месяца");
    expect(term(6, 12, "mo")).toBe("6–12 месяцев");
    expect(term(12, 24, "mo")).toBe("1–2 года");
    expect(term(12, 12, "mo")).toBe("1 год");
    expect(term(60, 60, "mo")).toBe("5 лет");
    expect(term(1.5, 2, "d")).toBe("1,5–2 дня");
  });

  it("часы в предложении — как предел", () => {
    expect(termPhrase({ min: 1, max: 2, unit: "h" })).toBe("не дольше 2 часов");
    expect(termPhrase({ min: 1, max: 1, unit: "h" })).toBe("не дольше 1 часа");
    expect(termPhrase({ min: 3, max: 4, unit: "d" })).toBe("3–4 дня");
  });

  it("условия упорядочены: холодильник, морозилка, комнатная температура", () => {
    expect(orderedConditions(chicken).map((c) => c.where)).toEqual(["fridge", "freezer", "room"]);
  });
});

describe("хранение: тексты страницы", () => {
  it("прямой ответ с цифрами, глагол согласован с числом", () => {
    expect(storageLead(chicken)).toBe("Варёная курица хранится в холодильнике 3–4 дня, в морозилке - 2–4 месяца, при комнатной температуре - не дольше 2 часов.");
    expect(storageLead(pasta)).toBe("Макароны хранятся в холодильнике 2 года, при комнатной температуре - 1–2 года.");
    expect(KITCHEN_SECTIONS[0].heading(pasta.forms)).toBe("Сколько хранятся макароны");
    expect(KITCHEN_SECTIONS[0].heading(chicken.forms)).toBe("Сколько хранится варёная курица");
  });

  it("title ≤ 65, description ≤ 160 и содержит срок", () => {
    const seo = storageSeo(chicken);
    expect(seo.h1).toBe("Сколько хранится варёная курица");
    expect(seo.title).toBe("Сколько хранится варёная курица в холодильнике и в морозилке");
    expect(seo.description).toContain("в холодильнике - 3–4 дня");
    expect(storageSeo(pasta).h1).toBe("Сколько хранятся макароны");
    const long = { forms: { nom: "салат из свежих овощей с майонезом и варёным мясом птицы", gen: "x", acc: "x" }, conditions: chicken.conditions };
    for (const entry of [chicken, pasta, long]) {
      const s = storageSeo(entry);
      expect(s.title.length, s.title).toBeLessThanOrEqual(TITLE_MAX);
      expect(s.description.length, s.description).toBeLessThanOrEqual(DESCRIPTION_MAX);
    }
  });
});

describe("хранение: расчёт «съесть до»", () => {
  it("разбор и формат дат", () => {
    expect(date("2026-11-13")).toEqual({ year: 2026, month: 11, day: 13 });
    for (const bad of ["", "13.11.2026", "2026-02-31", "2026-13-01", "2026-11-13T10:00"]) expect(parsePlainDate(bad), bad).toBeNull();
    expect(toIsoDate({ year: 2026, month: 3, day: 5 })).toBe("2026-03-05");
    expect(formatPlainDate(date("2026-11-16"))).toBe("16 ноября 2026");
    expect(todayPlain(new Date(2026, 10, 13, 23, 59))).toEqual({ year: 2026, month: 11, day: 13 });
    expect(daysBetween(date("2026-11-13"), date("2026-11-16"))).toBe(3);
    expect(daysBetween(date("2026-03-01"), date("2026-02-27"))).toBe(-2);
  });

  it("берётся нижняя граница срока", () => {
    expect(toIsoDate(eatBy(date("2026-11-13"), { min: 3, unit: "d" })!)).toBe("2026-11-16");
    expect(toIsoDate(eatBy(date("2026-12-30"), { min: 3, unit: "d" })!)).toBe("2027-01-02");
    expect(toIsoDate(eatBy(date("2026-11-13"), { min: 2, unit: "mo" })!)).toBe("2027-01-13");
  });

  it("месяцы — календарные, конец месяца не перескакивает", () => {
    expect(toIsoDate(eatBy(date("2027-01-31"), { min: 1, unit: "mo" })!)).toBe("2027-02-28");
    expect(toIsoDate(eatBy(date("2028-01-31"), { min: 1, unit: "mo" })!)).toBe("2028-02-29");
    expect(toIsoDate(eatBy(date("2026-08-31"), { min: 6, unit: "mo" })!)).toBe("2027-02-28");
    expect(toIsoDate(eatBy(date("2026-11-13"), { min: 1.5, unit: "mo" })!)).toBe("2026-12-28");
  });

  it("сроки в часах датой не считаются", () => {
    expect(eatBy(date("2026-11-13"), { min: 2, unit: "h" })).toBeNull();
    expect(expiryResult(date("2026-11-13"), { min: 1, max: 2, unit: "h" }, date("2026-11-13"))).toBeNull();
  });

  it("текст результата: остаток, последний день, срок вышел", () => {
    const fridge = { min: 3, max: 4, unit: "d" } as const;
    expect(expiryResult(date("2026-11-13"), fridge, date("2026-11-13"))).toEqual({
      title: "Съесть до 16 ноября 2026",
      detail: "Осталось 3 дня. Расчёт по нижней границе срока: 3 дня.",
      expired: false,
    });
    expect(expiryResult(date("2026-11-13"), fridge, date("2026-11-16"))?.detail).toContain("Сегодня последний день.");
    expect(expiryResult(date("2026-11-13"), fridge, date("2026-11-18"))).toEqual({ title: "Срок вышел 16 ноября 2026", detail: "Прошло 2 дня - есть уже не стоит.", expired: true });
    expect(expiryResult(date("2026-11-20"), fridge, date("2026-11-13"))).toMatchObject({ title: "Съесть до 23 ноября 2026", expired: false });
  });
});
