import { beforeEach, describe, expect, it, vi } from "vitest";
import { isLandingSlugCandidate, parseLandingResponse } from "../src/lib/landings";
import { parseCatalogQuery } from "../src/lib/catalog";

const apiGet = vi.fn();
vi.mock("../src/lib/api/client", () => ({ apiGet: (...args: unknown[]) => apiGet(...args) }));

const { landingPath } = await import("../src/lib/api/landings");
const { loadCatalog } = await import("../src/lib/api/catalog");

const card = (id: number) => ({ id, title: `Блины ${id}`, slug: `bliny-${id}`, path: `/bliny/bliny-${id}` });
const landingBody = {
  landing: { slug: "bliny-na-moloke", name: "Блины на молоке", h1: "Блины на молоке: рецепты", intro: "Абзац 1\n\nАбзац 2", faq: [{ q: "В?", a: "О." }], featured_recipe_ids: [7] },
  data: [card(1), card(2)],
  meta: { current_page: 1, last_page: 3, total: 45, per_page: 20 },
};

function route(map: Record<string, { ok: boolean; status: number; data?: unknown }>) {
  apiGet.mockImplementation(async (path: string) => {
    for (const [prefix, res] of Object.entries(map)) if (path.startsWith(prefix)) return res;
    return { ok: false, status: 404 };
  });
}

describe("лендинги: разбор", () => {
  it("slug-кандидаты", () => {
    expect(isLandingSlugCandidate("bliny-na-moloke")).toBe(true);
    for (const s of ["", "Bliny", "bliny_na", "блины", "recipes", "categories", "-x", "a".repeat(101)]) expect(isLandingSlugCandidate(s)).toBe(false);
  });
  it("ответ API → лендинг + список с пагинацией", () => {
    const r = parseLandingResponse(landingBody, 1)!;
    expect(r.landing).toEqual({
      slug: "bliny-na-moloke",
      title: "Блины на молоке",
      h1: "Блины на молоке: рецепты",
      intro: ["Абзац 1", "Абзац 2"],
      faq: [{ q: "В?", a: "О." }],
      featuredRecipeIds: [7],
    });
    expect(r.result).toMatchObject({ total: 45, totalPages: 3, currentPage: 1 });
    expect(r.result.list.map((c) => c.id)).toEqual([1, 2]);
  });
  it("мусор → null", () => {
    expect(parseLandingResponse({ success: false }, 1)).toBeNull();
    expect(parseLandingResponse({ landing: { slug: "x" } }, 1)).toBeNull();
    expect(parseLandingResponse(null, 1)).toBeNull();
  });
  it("путь API: страница и фильтры, без поиска; sort=popular по умолчанию", () => {
    expect(landingPath("bliny-na-moloke", parseCatalogQuery(new URLSearchParams("page=2&q=x&difficulty=easy")))).toBe("/getLanding/bliny-na-moloke/2?sort=popular&difficulty=easy");
  });
});

describe("корневой маршрут: категория → лендинг → 404", () => {
  const categories = { ok: true, status: 200, data: [{ id: 5, title: "Блины" }] };
  beforeEach(() => {
    apiGet.mockReset();
  });

  it("сначала категория (лендинг не запрашивается)", async () => {
    route({ "/getCategories": categories, "/getRecipes/category/5/1": { ok: true, status: 200, data: { data: { data: [card(1)], total: 1, last_page: 1 } } } });
    const s = await loadCatalog(new URL("https://swageda.ru/bliny"), "bliny");
    expect(s.kind).toBe("ok");
    expect(apiGet.mock.calls.some(([p]) => String(p).startsWith("/getLanding"))).toBe(false);
  });

  it("не категория → лендинг, закреплённые первыми", async () => {
    route({
      "/getCategories": categories,
      "/getLanding/bliny-na-moloke/1": { ok: true, status: 200, data: landingBody },
      "/getRecipes/batch": { ok: true, status: 200, data: [card(7)] },
    });
    const s = await loadCatalog(new URL("https://swageda.ru/bliny-na-moloke"), "bliny-na-moloke");
    expect(s.kind).toBe("ok");
    if (s.kind !== "ok") return;
    expect(s.basePath).toBe("/bliny-na-moloke");
    expect(s.landing?.title).toBe("Блины на молоке");
    expect(s.result.list.map((c) => c.id)).toEqual([7, 1, 2]);
  });

  it("старый API без лендингов (404) → 404, а не 503", async () => {
    route({ "/getCategories": categories });
    expect((await loadCatalog(new URL("https://swageda.ru/nope"), "nope")).kind).toBe("not_found");
  });

  it("403/405 от API на лендинг → 404", async () => {
    route({ "/getCategories": categories, "/getLanding": { ok: false, status: 403 } });
    expect((await loadCatalog(new URL("https://swageda.ru/nope"), "nope")).kind).toBe("not_found");
  });

  it("сбой API на лендинг → 503", async () => {
    route({ "/getCategories": categories, "/getLanding": { ok: false, status: 502 } });
    expect((await loadCatalog(new URL("https://swageda.ru/nope"), "nope")).kind).toBe("unavailable");
  });

  it("невалидный сегмент → 404 без запроса лендинга", async () => {
    route({ "/getCategories": categories });
    expect((await loadCatalog(new URL("https://swageda.ru/x_y"), "x_y")).kind).toBe("not_found");
    expect(apiGet.mock.calls.some(([p]) => String(p).startsWith("/getLanding"))).toBe(false);
  });

  it("страница за пределами → 404", async () => {
    route({ "/getCategories": categories, "/getLanding": { ok: true, status: 200, data: { ...landingBody, data: [], meta: { current_page: 9, last_page: 3, total: 45 } } } });
    expect((await loadCatalog(new URL("https://swageda.ru/bliny-na-moloke?page=9"), "bliny-na-moloke")).kind).toBe("not_found");
  });
});
