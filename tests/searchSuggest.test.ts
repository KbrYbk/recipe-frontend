import { describe, expect, it } from "vitest";
import { parseSuggestions, suggestQuery } from "../src/lib/searchSuggest";

describe("search suggestions", () => {
  it("разбирает массив { value }", () => {
    expect(parseSuggestions([{ value: "Борщ" }, { value: " борщ " }, { value: "" }, { foo: 1 }, "Блины"])).toEqual(["Борщ", "Блины"]);
    expect(parseSuggestions({ data: [{ value: "Суп" }] })).toEqual(["Суп"]);
    expect(parseSuggestions(null)).toEqual([]);
  });
  it("ограничивает количество", () => {
    expect(parseSuggestions(Array.from({ length: 20 }, (_, i) => ({ value: `r${i}` })))).toHaveLength(8);
  });
  it("минимум 2 символа", () => {
    expect(suggestQuery(" б ")).toBeNull();
    expect(suggestQuery("  бо   рщ ")).toBe("бо рщ");
  });
});
