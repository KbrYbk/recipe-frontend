import { describe, expect, it } from "vitest";
import { cookingLead, cookingSeo, formatClock, formatMinutes, methodLabel, remainingSeconds, timerSeconds } from "../src/lib/kitchen/cooking";
import { DESCRIPTION_MAX, TITLE_MAX } from "../src/lib/seo";
import type { CookingMethod } from "../src/types/kitchen";

const beet = {
  forms: { nom: "свёкла", gen: "свёклы", acc: "свёклу" },
  methods: [
    { method: "boil", variant: "целая, среднего размера", minMin: 40, maxMin: 60 },
    { method: "boil", variant: "кубиками", minMin: 15, maxMin: 20 },
    { method: "pressure", minMin: 15, maxMin: 20 },
    { method: "multicooker", minMin: 40, maxMin: 50 },
    { method: "microwave", minMin: 8, maxMin: 12 },
  ] satisfies CookingMethod[],
};
const egg = {
  forms: { nom: "куриное яйцо", gen: "куриного яйца", acc: "куриное яйцо" },
  methods: [
    { method: "boil", variant: "всмятку", minMin: 1, maxMin: 1 },
    { method: "steam", minMin: 10, maxMin: 12 },
  ] satisfies CookingMethod[],
};

describe("варка: время", () => {
  it("минуты и часы со склонением", () => {
    expect(formatMinutes(40, 60)).toBe("40–60 минут");
    expect(formatMinutes(5, 5)).toBe("5 минут");
    expect(formatMinutes(1, 1)).toBe("1 минута");
    expect(formatMinutes(1, 1, true)).toBe("1 минуту");
    expect(formatMinutes(2, 3)).toBe("2–3 минуты");
    expect(formatMinutes(60, 90)).toBe("1–1,5 часа");
    expect(formatMinutes(90, 120)).toBe("1,5–2 часа");
    expect(formatMinutes(120, 180)).toBe("2–3 часа");
    expect(formatMinutes(300, 300)).toBe("5 часов");
    expect(formatMinutes(50, 100)).toBe("50–100 минут");
    expect(formatMinutes(75, 105)).toBe("1,25–1,75 часа");
  });

  it("подпись способа", () => {
    expect(methodLabel(beet.methods[0])).toBe("В кастрюле: целая, среднего размера");
    expect(methodLabel(beet.methods[2])).toBe("В скороварке");
  });
});

describe("варка: тексты страницы", () => {
  it("прямой ответ: основной способ и два других, без повторов способа", () => {
    expect(cookingLead(beet)).toBe("Свёклу варят 40–60 минут (целая, среднего размера). В скороварке — 15–20 минут, в мультиварке — 40–50 минут.");
    expect(cookingLead(egg)).toBe("Куриное яйцо варят 1 минуту (всмятку). На пару — 10–12 минут.");
    expect(cookingLead({ forms: beet.forms, methods: [] })).toBe("");
  });

  it("title ≤ 65, description ≤ 160 и содержит минуты", () => {
    const seo = cookingSeo(beet);
    expect(seo.h1).toBe("Сколько варить свёклу");
    expect(seo.title).toBe("Сколько варить свёклу в кастрюле и в скороварке | SwagEda");
    expect(seo.description).toContain("40–60 минут");
    const long = { forms: { nom: "x", gen: "x", acc: "замороженную стручковую фасоль с молодой цветной капустой" }, methods: beet.methods };
    for (const entry of [beet, egg, long]) {
      const s = cookingSeo(entry);
      expect(s.title.length, s.title).toBeLessThanOrEqual(TITLE_MAX);
      expect(s.description.length, s.description).toBeLessThanOrEqual(DESCRIPTION_MAX);
    }
  });
});

describe("варка: таймер", () => {
  it("формат часов", () => {
    expect([0, 5, 65, 3599, 3600, 3905, -4].map(formatClock)).toEqual(["00:00", "00:05", "01:05", "59:59", "1:00:00", "1:05:05", "00:00"]);
  });
  it("остаток считается от времени окончания и не уходит в минус", () => {
    expect(remainingSeconds(10_000, 0)).toBe(10);
    expect(remainingSeconds(10_000, 9_001)).toBe(1);
    expect(remainingSeconds(10_000, 10_000)).toBe(0);
    expect(remainingSeconds(10_000, 25_000)).toBe(0);
  });
  it("длительность из минут", () => {
    expect(timerSeconds(40)).toBe(2400);
    expect(timerSeconds(0.5)).toBe(30);
    for (const bad of [0, -1, Number.NaN, 24 * 60 + 1]) expect(timerSeconds(bad)).toBeNull();
  });
});
