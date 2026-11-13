import { describe, expect, it } from "vitest";
import { KITCHEN_SECTIONS, entryHref, getAll, getBySlug, groupEntries, sectionHref } from "../src/lib/kitchen/data";
import { findDuplicateFaq, kitchenSlug, validateEntries, validateEntry } from "../src/lib/kitchen/validate";
import { kitchenHubSeo } from "../src/lib/kitchen/seo";
import { DESCRIPTION_MAX, TITLE_MAX } from "../src/lib/seo";
import { isLandingSlugCandidate } from "../src/lib/landings";

const faq = (name: string) => [1, 2, 3].map((n) => ({ q: `Вопрос ${n} про ${name}?`, a: `Ответ ${n} про ${name}.` }));
const base = (nom: string, slug: string) => ({
  slug,
  forms: { nom, gen: `${nom} (род.)`, acc: `${nom} (вин.)` },
  aliases: [nom],
  group: "бакалея",
  faq: faq(nom),
  sources: ["Справочник"],
  updatedAt: "2026-11-13",
});

const storage = () => ({
  ...base("варёная курица", "varenaya-kurica"),
  conditions: [
    { where: "fridge", min: 2, max: 3, unit: "d" },
    { where: "freezer", min: 2, max: 3, unit: "mo" },
  ],
  spoilSigns: ["кислый запах"],
  tips: [],
});
const measures = () => ({ ...base("мука", "muka"), grams: { glass250: 160, tbsp: 25 } });
const cooking = () => ({
  ...base("свёкла", "svekla"),
  methods: [
    { method: "boil", minMin: 40, maxMin: 60 },
    { method: "pressure", minMin: 15, maxMin: 20 },
  ],
  readiness: "Нож входит легко.",
  tips: [],
});
const substitutions = () => ({
  ...base("разрыхлитель", "razryhlitel"),
  role: "Поднимает тесто.",
  subs: [
    { name: "сода и уксус", ratioText: "½ ч. л. соды + ½ ч. л. уксуса", factor: 0.5, bestFor: ["блины"], notFor: [] },
    { name: "сода и кефир", ratioText: "½ ч. л. соды на стакан кефира", bestFor: ["оладьи"], notFor: ["песочное тесто"] },
  ],
});

describe("справочник: файлы данных", () => {
  for (const section of KITCHEN_SECTIONS) {
    it(`${section.key}.json проходит проверку`, () => {
      expect(validateEntries(section.key, getAll(section.key))).toEqual([]);
    });
  }

  it("FAQ не повторяются между записями всех подразделов", () => {
    const all = KITCHEN_SECTIONS.flatMap((s) => getAll(s.key).map((e) => ({ id: `${s.key}/${e.slug}`, faq: e.faq })));
    expect(findDuplicateFaq(all)).toEqual([]);
  });

  it("индекс по slug и адреса страниц", () => {
    expect(getBySlug("measures", "net-takogo-produkta")).toBeUndefined();
    for (const section of KITCHEN_SECTIONS) {
      for (const entry of getAll(section.key)) expect(getBySlug(section.key, entry.slug)).toBe(entry);
    }
    expect(sectionHref("storage")).toBe("/spravochnik/hranenie");
    expect(entryHref("measures", "muka")).toBe("/spravochnik/mery/muka");
    expect(entryHref("cooking", "svekla")).toBe("/spravochnik/skolko-varit/svekla");
    expect(entryHref("substitutions", "razryhlitel")).toBe("/spravochnik/zamena/razryhlitel");
  });

  it("сегмент раздела зарезервирован и не может стать лендингом", () => {
    expect(isLandingSlugCandidate("spravochnik")).toBe(false);
  });

  it("заголовки подразделов берут нужный падеж", () => {
    const forms = { nom: "мука", gen: "муки", acc: "муку" };
    expect(KITCHEN_SECTIONS.map((s) => s.heading(forms))).toEqual(["Сколько хранится мука", "Сколько грамм муки в стакане и ложке", "Сколько варить муку", "Чем заменить муку"]);
  });

  it("группировка: группы и записи по алфавиту", () => {
    const grouped = groupEntries([
      { ...base("рис", "ris"), group: "крупы" },
      { ...base("мука", "muka"), group: "бакалея" },
      { ...base("гречка", "grechka"), group: "крупы" },
    ]);
    expect(grouped.map((g) => [g.group, g.entries.map((e) => e.slug)])).toEqual([
      ["бакалея", ["muka"]],
      ["крупы", ["grechka", "ris"]],
    ]);
  });

  it("title ≤ 65 и description ≤ 160 у хаба", () => {
    const seo = kitchenHubSeo();
    expect(seo.title.length).toBeLessThanOrEqual(TITLE_MAX);
    expect(seo.description.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
  });
});

describe("справочник: валидатор", () => {
  it("корректные записи всех подразделов проходят", () => {
    expect(validateEntry("storage", storage())).toEqual([]);
    expect(validateEntry("measures", measures())).toEqual([]);
    expect(validateEntry("cooking", cooking())).toEqual([]);
    expect(validateEntry("substitutions", substitutions())).toEqual([]);
  });

  it("запись без источника отклоняется", () => {
    expect(validateEntry("storage", { ...storage(), sources: [] }).join()).toContain("sources");
    expect(validateEntry("storage", { ...storage(), sources: ["  "] }).join()).toContain("sources");
  });

  it("slug — транслитерация без мягкого и твёрдого знаков", () => {
    expect(["апельсин", "растительное масло", "соль", "свёкла", "яйцо куриное", "объёмный хлеб", "Мёд"].map(kitchenSlug)).toEqual([
      "apelsin",
      "rastitelnoe-maslo",
      "sol",
      "svekla",
      "yayco-kurinoe",
      "obemnyy-hleb",
      "med",
    ]);
    expect(validateEntry("measures", { ...measures(), forms: { nom: "соль", gen: "соли", acc: "соль" }, slug: "sol" })).toEqual([]);
    expect(validateEntry("measures", { ...measures(), forms: { nom: "апельсин", gen: "апельсина", acc: "апельсин" }, slug: "apel-sin" }).join()).toContain("не совпадает");
  });

  it("slug должен совпадать с названием продукта", () => {
    expect(validateEntry("measures", { ...measures(), slug: "flour" }).join()).toContain("не совпадает");
    // ё транслитерируется как е
    expect(validateEntry("cooking", cooking())).toEqual([]);
  });

  it("меньше трёх FAQ, пустые вопросы и неполные падежи", () => {
    expect(validateEntry("measures", { ...measures(), faq: faq("мука").slice(0, 2) }).join()).toContain("faq");
    expect(validateEntry("measures", { ...measures(), faq: [...faq("мука").slice(0, 2), { q: "Вопрос?", a: "" }] }).join()).toContain("q и a");
    expect(validateEntry("measures", { ...measures(), forms: { nom: "мука", gen: "", acc: "муку" } }).join()).toContain("forms");
  });

  it("алиасы — в нижнем регистре", () => {
    expect(validateEntry("measures", { ...measures(), aliases: ["Мука"] }).join()).toContain("aliases");
    expect(validateEntry("measures", { ...measures(), aliases: [] }).join()).toContain("aliases");
  });

  it("нужно минимум два условия / меры / способа / замены", () => {
    expect(validateEntry("storage", { ...storage(), conditions: storage().conditions.slice(0, 1) }).join()).toContain("минимум 2");
    expect(validateEntry("measures", { ...measures(), grams: { tbsp: 25 } }).join()).toContain("минимум 2");
    expect(validateEntry("cooking", { ...cooking(), methods: cooking().methods.slice(0, 1) }).join()).toContain("минимум 2");
    expect(validateEntry("substitutions", { ...substitutions(), subs: substitutions().subs.slice(0, 1) }).join()).toContain("минимум 2");
  });

  it("min > max отклоняется", () => {
    const badStorage = { ...storage(), conditions: [{ where: "fridge", min: 5, max: 3, unit: "d" }, storage().conditions[1]] };
    expect(validateEntry("storage", badStorage).join()).toContain("min > max");
    const badCooking = { ...cooking(), methods: [{ method: "boil", minMin: 60, maxMin: 40 }, cooking().methods[1]] };
    expect(validateEntry("cooking", badCooking).join()).toContain("min > max");
  });

  it("неизвестные место, мера, способ и нулевые значения", () => {
    expect(validateEntry("storage", { ...storage(), conditions: [{ where: "cellar", min: 1, max: 2, unit: "d" }, storage().conditions[1]] }).join()).toContain("неизвестное место");
    expect(validateEntry("storage", { ...storage(), conditions: [storage().conditions[0], { ...storage().conditions[0] }] }).join()).toContain("повторяется");
    expect(validateEntry("measures", { ...measures(), grams: { glass250: 160, cup: 100 } }).join()).toContain("неизвестная мера");
    expect(validateEntry("measures", { ...measures(), grams: { glass250: 160, tbsp: 0 } }).join()).toContain("положительное число");
    expect(validateEntry("measures", { ...measures(), grams: { glass250: 160, piece: 50 } }).join()).toContain("pieceLabel");
    expect(validateEntry("cooking", { ...cooking(), methods: [{ method: "fry", minMin: 1, maxMin: 2 }, cooking().methods[1]] }).join()).toContain("неизвестный способ");
    expect(validateEntry("substitutions", { ...substitutions(), subs: [{ ...substitutions().subs[0], factor: 0 }, substitutions().subs[1]] }).join()).toContain("factor");
  });

  it("дубли slug в файле", () => {
    expect(validateEntries("measures", [measures(), measures()]).join()).toContain("slug дублируется");
    expect(validateEntries("measures", {})).toEqual(["файл должен содержать массив записей"]);
  });

  it("FAQ, дословно совпадающие у разных записей (без учёта регистра и ё/е)", () => {
    const a = { id: "measures/muka", faq: [{ q: "Сколько весит стакан?", a: "Стакан весит 160 г." }] };
    const b = { id: "measures/sahar", faq: [{ q: "А сахар?", a: "стакан весит  160 г." }] };
    const c = { id: "measures/sol", faq: [{ q: "Сколько весит стакан?", a: "Стакан соли весит 300 г." }] };
    expect(findDuplicateFaq([a, b])).toHaveLength(1);
    expect(findDuplicateFaq([a, c])).toHaveLength(1);
    expect(findDuplicateFaq([a])).toEqual([]);
  });
});
