import { describe, expect, it } from "vitest";
import { slugify } from "../src/lib/slugify";

describe("slugify", () => {
  it("транслитерирует кириллицу", () => {
    expect(slugify("Борщ украинский")).toBe("borsch-ukrainskiy");
    expect(slugify("Щи с ёжиком")).toBe("schi-s-ezhikom");
    expect(slugify("Аэрогриль")).toBe("aerogril");
  });
  it("заменяет прочие символы дефисами и схлопывает их", () => {
    expect(slugify("  Суп-пюре: тыквенный!!  ")).toBe("sup-pyure-tykvennyy");
    expect(slugify("Салат «Цезарь» (classic) 2.0")).toBe("salat-cezar-classic-2-0");
  });
  it("пустые значения", () => {
    expect(slugify("")).toBe("");
    expect(slugify("!!!")).toBe("recipe");
  });
});
