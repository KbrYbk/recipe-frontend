/**
 * Сопоставление ингредиентов рецепта со справочником: по алиасам записей находятся страницы справочника,
 * на которые стоит сослаться со страницы рецепта. Чистые функции.
 */
import type { KitchenForms, KitchenSectionKey } from "../../types/kitchen";
import { KITCHEN_SECTIONS, entryHref, getAll, getSection } from "./data";

export interface AliasTarget {
  section: KitchenSectionKey;
  slug: string;
  forms: KitchenForms;
}

/** Алиас (нормализованный) → страницы справочника с таким алиасом. */
export type AliasIndex = Map<string, AliasTarget[]>;

export interface RecipeRefLink {
  section: KitchenSectionKey;
  href: string;
  /** Анкор: «Сколько грамм муки в стакане и ложке». */
  title: string;
}

/** Нижний регистр, ё → е, знаки препинания → пробел, одиночные пробелы. */
export function normalizeName(value: string): string {
  return value
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}%]+/gu, " ")
    .trim();
}

export function buildAliasIndex(sources: ReadonlyArray<{ section: KitchenSectionKey; entries: ReadonlyArray<{ slug: string; forms: KitchenForms; aliases: readonly string[] }> }>): AliasIndex {
  const index: AliasIndex = new Map();
  for (const { section, entries } of sources) {
    for (const entry of entries) {
      for (const alias of new Set(entry.aliases.map(normalizeName).filter(Boolean))) {
        const targets = index.get(alias) ?? [];
        // Один алиас — одна страница на подраздел (первая по порядку данных).
        if (!targets.some((t) => t.section === section)) targets.push({ section, slug: entry.slug, forms: entry.forms });
        index.set(alias, targets);
      }
    }
  }
  return index;
}

let defaultIndex: AliasIndex | undefined;
function getDefaultIndex(): AliasIndex {
  defaultIndex ??= buildAliasIndex(KITCHEN_SECTIONS.map((s) => ({ section: s.key, entries: getAll(s.key) })));
  return defaultIndex;
}

/**
 * Страницы справочника для названия ингредиента. Алиас должен входить в название целым словом/фразой
 * («мука» ⊂ «Мука пшеничная в/с», но не ⊂ «мукалтин»); если подходят несколько — берётся самый длинный.
 */
export function matchIngredient(name: string, index: AliasIndex = getDefaultIndex()): AliasTarget[] {
  const padded = ` ${normalizeName(name)} `;
  if (padded.trim() === "") return [];
  let best = "";
  for (const alias of index.keys()) {
    if (alias.length > best.length && padded.includes(` ${alias} `)) best = alias;
  }
  return best ? (index.get(best) ?? []) : [];
}

/** Какой подраздел полезнее на странице рецепта, если у продукта их несколько. */
const SECTION_PRIORITY: readonly KitchenSectionKey[] = ["substitutions", "measures", "cooking", "storage"];

/**
 * До `limit` ссылок на справочник для рецепта: по одной на ингредиент, в порядке ингредиентов.
 * Подразделы по возможности не повторяются — три ссылки «сколько грамм…» подряд выглядят как спам.
 */
export function recipeRefLinks(ingredients: ReadonlyArray<{ name: string }>, limit = 3, index: AliasIndex = getDefaultIndex()): RecipeRefLink[] {
  const products: AliasTarget[][] = [];
  const seen = new Set<string>();
  for (const ingredient of ingredients) {
    const targets = matchIngredient(ingredient.name, index);
    if (targets.length === 0) continue;
    const key = targets
      .map((t) => `${t.section}/${t.slug}`)
      .sort()
      .join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    products.push([...targets].sort((a, b) => SECTION_PRIORITY.indexOf(a.section) - SECTION_PRIORITY.indexOf(b.section)));
  }

  const links: RecipeRefLink[] = [];
  const usedSections = new Set<KitchenSectionKey>();
  const taken = new Set<AliasTarget[]>();
  const add = (product: AliasTarget[], target: AliasTarget) => {
    taken.add(product);
    usedSections.add(target.section);
    links.push({ section: target.section, href: entryHref(target.section, target.slug), title: getSection(target.section).heading(target.forms) });
  };
  // Сначала — продукты, для которых есть ещё не использованный подраздел; затем добираем остальными.
  for (const product of products) {
    if (links.length >= limit) break;
    const fresh = product.find((t) => !usedSections.has(t.section));
    if (fresh) add(product, fresh);
  }
  for (const product of products) {
    if (links.length >= limit) break;
    if (!taken.has(product)) add(product, product[0]);
  }
  return links;
}
