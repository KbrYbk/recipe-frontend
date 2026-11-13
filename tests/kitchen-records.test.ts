import { describe, expect, it } from "vitest";
import { getAll } from "../src/lib/kitchen/data";
import { cookingLead, cookingSeo } from "../src/lib/kitchen/cooking";
import { measureLead, measureRows, measureSeo } from "../src/lib/kitchen/measures";
import { storageLead, storageSeo } from "../src/lib/kitchen/storage";
import { substitutionLead, substitutionSeo } from "../src/lib/kitchen/substitutions";
import { buildAliasIndex } from "../src/lib/kitchen/match";
import { DESCRIPTION_MAX, TITLE_MAX, type PageSeo } from "../src/lib/seo";

/** Проверки на всех записях из файлов данных: то, что реально увидит поисковик на каждой странице. */
function check(id: string, seo: PageSeo, lead: string, numeric = true): void {
  expect(seo.title.length, `${id}: title «${seo.title}»`).toBeLessThanOrEqual(TITLE_MAX);
  expect(seo.title.length, `${id}: title`).toBeGreaterThan(10);
  expect(seo.description.length, `${id}: description «${seo.description}»`).toBeLessThanOrEqual(DESCRIPTION_MAX);
  // В заменах вместо цифры — названия заменителей.
  if (numeric) expect(seo.description, `${id}: в description нет цифры`).toMatch(/\d/);
  expect(seo.description.endsWith("…"), `${id}: description оборван`).toBe(false);
  expect(lead, `${id}: прямой ответ без цифры`).toMatch(/\d|подойд/);
  expect(lead.length, `${id}: прямой ответ`).toBeGreaterThan(20);
}

describe("справочник: каждая запись даёт корректные title, description и прямой ответ", () => {
  it("хранение", () => {
    for (const e of getAll("storage")) check(`storage/${e.slug}`, storageSeo(e), storageLead(e));
  });
  it("меры", () => {
    for (const e of getAll("measures")) {
      check(`measures/${e.slug}`, measureSeo(e), measureLead(e));
      expect(measureRows(e).length, `measures/${e.slug}: строки таблицы`).toBeGreaterThanOrEqual(2);
    }
  });
  it("сколько варить", () => {
    for (const e of getAll("cooking")) check(`cooking/${e.slug}`, cookingSeo(e), cookingLead(e));
  });
  it("замены", () => {
    for (const e of getAll("substitutions")) {
      check(`substitutions/${e.slug}`, substitutionSeo(e), substitutionLead(e), false);
      expect(substitutionSeo(e).description, `substitutions/${e.slug}`).toContain(e.subs[0].name);
    }
  });

  it("внутри подраздела один алиас ведёт на одну страницу", () => {
    for (const section of ["storage", "measures", "cooking", "substitutions"] as const) {
      const entries = getAll(section);
      const total = new Set(entries.flatMap((e) => e.aliases.map((a) => a.replace(/ё/g, "е")))).size;
      const index = buildAliasIndex([{ section, entries }]);
      expect(index.size, `${section}: алиасы пересекаются между записями`).toBe(total);
      const owners = new Map<string, string>();
      for (const e of entries) {
        for (const a of e.aliases) {
          const key = a.replace(/ё/g, "е");
          expect(owners.get(key) ?? e.slug, `${section}: алиас «${a}» у двух записей`).toBe(e.slug);
          owners.set(key, e.slug);
        }
      }
    }
  });
});
