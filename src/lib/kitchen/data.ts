/**
 * «Кухонный справочник»: данные из JSON-файлов репозитория (без БД и API), индексы по slug.
 * Данные статичны — читаются один раз при старте процесса.
 */
import storageJson from "../../data/kitchen/storage.json";
import measuresJson from "../../data/kitchen/measures.json";
import cookingJson from "../../data/kitchen/cooking.json";
import substitutionsJson from "../../data/kitchen/substitutions.json";
import type { KitchenEntryBase, KitchenEntryMap, KitchenForms, KitchenSectionKey } from "../../types/kitchen";

export const KITCHEN_ROOT = "/spravochnik";
export const KITCHEN_NAME = "Кухонный справочник";

export interface KitchenSection {
  key: KitchenSectionKey;
  /** Сегмент URL: /spravochnik/{path}. */
  path: string;
  /** Название подраздела (крошки, карточка на хабе). */
  name: string;
  /** Одна фраза о подразделе для хаба. */
  lead: string;
  /** Иконка lucide для карточки. */
  icon: string;
  /** H1 и анкор ссылки на страницу продукта. */
  heading: (forms: KitchenForms) => string;
}

/** Порядок — как на хабе и в sitemap. */
export const KITCHEN_SECTIONS: readonly KitchenSection[] = [
  {
    key: "storage",
    path: "hranenie",
    name: "Сроки хранения",
    lead: "Сколько продукт хранится в холодильнике, морозилке и при комнатной температуре.",
    icon: "lucide:refrigerator",
    heading: (f) => `Сколько хранится ${f.nom}`,
  },
  {
    key: "measures",
    path: "mery",
    name: "Меры веса и объёма",
    lead: "Сколько граммов продукта в стакане, столовой и чайной ложке.",
    icon: "lucide:scale",
    heading: (f) => `Сколько грамм ${f.gen} в стакане и ложке`,
  },
  {
    key: "cooking",
    path: "skolko-varit",
    name: "Сколько варить",
    lead: "Время варки в кастрюле, на пару, в мультиварке и скороварке.",
    icon: "lucide:timer",
    heading: (f) => `Сколько варить ${f.acc}`,
  },
  {
    key: "substitutions",
    path: "zamena",
    name: "Чем заменить",
    lead: "Чем заменить продукт в рецепте и в какой пропорции.",
    icon: "lucide:repeat",
    heading: (f) => `Чем заменить ${f.acc}`,
  },
];

const RAW: { [K in KitchenSectionKey]: KitchenEntryMap[K][] } = {
  storage: storageJson as unknown as KitchenEntryMap["storage"][],
  measures: measuresJson as unknown as KitchenEntryMap["measures"][],
  cooking: cookingJson as unknown as KitchenEntryMap["cooking"][],
  substitutions: substitutionsJson as unknown as KitchenEntryMap["substitutions"][],
};

const collator = new Intl.Collator("ru");
const byName = (a: KitchenEntryBase, b: KitchenEntryBase) => collator.compare(a.forms.nom, b.forms.nom);

const SORTED = Object.fromEntries(KITCHEN_SECTIONS.map((s) => [s.key, [...RAW[s.key]].sort(byName)])) as unknown as typeof RAW;
const INDEX = Object.fromEntries(KITCHEN_SECTIONS.map((s) => [s.key, new Map(RAW[s.key].map((e) => [e.slug, e]))])) as unknown as { [K in KitchenSectionKey]: Map<string, KitchenEntryMap[K]> };

export function getSection(key: KitchenSectionKey): KitchenSection {
  const section = KITCHEN_SECTIONS.find((s) => s.key === key);
  if (!section) throw new Error(`Unknown kitchen section: ${key}`);
  return section;
}

/** Все записи подраздела по алфавиту. */
export function getAll<K extends KitchenSectionKey>(key: K): readonly KitchenEntryMap[K][] {
  return SORTED[key];
}

export function getBySlug<K extends KitchenSectionKey>(key: K, slug: string): KitchenEntryMap[K] | undefined {
  return INDEX[key].get(slug);
}

export function sectionHref(key: KitchenSectionKey): string {
  return `${KITCHEN_ROOT}/${getSection(key).path}`;
}

export function entryHref(key: KitchenSectionKey, slug: string): string {
  return `${sectionHref(key)}/${slug}`;
}

/** Подразделы, в которых уже есть записи (пустые на хабе и в sitemap не показываются). */
export function filledSections(): KitchenSection[] {
  return KITCHEN_SECTIONS.filter((s) => SORTED[s.key].length > 0);
}

/** Записи по группам: группы и записи внутри — по алфавиту. */
export function groupEntries<T extends KitchenEntryBase>(entries: readonly T[]): { group: string; entries: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const entry of entries) {
    const list = groups.get(entry.group);
    if (list) list.push(entry);
    else groups.set(entry.group, [entry]);
  }
  return [...groups.entries()].sort(([a], [b]) => collator.compare(a, b)).map(([group, list]) => ({ group, entries: [...list].sort(byName) }));
}

/** Даты изменения записей (для Last-Modified): одного подраздела или всего справочника. */
export function updatedDates(key?: KitchenSectionKey): string[] {
  const keys = key ? [key] : KITCHEN_SECTIONS.map((s) => s.key);
  return keys.flatMap((k) => SORTED[k].map((e) => e.updatedAt));
}
