import { describe, expect, it } from "vitest";
import { listingNoindex } from "../src/lib/seo";

const p = (s: string) => new URLSearchParams(s);

describe("listingNoindex", () => {
  it("чистые страницы категорий и лендингов индексируются, включая пагинацию", () => {
    expect(listingNoindex("category", p(""), 1)).toBe(false);
    expect(listingNoindex("category", p("page=7"), 7)).toBe(false);
    expect(listingNoindex("landing", p("page=2"), 2)).toBe(false);
  });
  it("utm и прочие метки не закрывают страницу (их склеивает Clean-param)", () => {
    expect(listingNoindex("category", p("utm_source=x&yclid=1"), 1)).toBe(false);
  });
  it.each(["sort=rating", "difficulty=easy", "minTime=10", "maxTime=30", "minRating=4", "maxRating=5", "q=борщ"])("%s → noindex", (qs) => {
    expect(listingNoindex("category", p(qs), 1)).toBe(true);
    expect(listingNoindex("landing", p(qs), 1)).toBe(true);
    expect(listingNoindex("recipes", p(qs), 1)).toBe(true);
    expect(listingNoindex("collection", p(qs), 1)).toBe(true);
  });
  it("пустые значения параметров не считаются фильтром", () => {
    expect(listingNoindex("category", p("sort=&q=%20"), 1)).toBe(false);
  });
  it("/recipes и подборки: страница 2+ — noindex, первая — индекс", () => {
    expect(listingNoindex("recipes", p(""), 1)).toBe(false);
    expect(listingNoindex("recipes", p("page=2"), 2)).toBe(true);
    expect(listingNoindex("collection", p(""), 1)).toBe(false);
    expect(listingNoindex("collection", p("page=3"), 3)).toBe(true);
  });
});
