/** «Чем заменить»: тексты страницы и пересчёт количества замены. Чистые функции. */
import type { Substitute, SubstitutionEntry } from "../../types/kitchen";
import type { PageSeo } from "../seo";
import { DESCRIPTION_MAX } from "../seo";
import { formatDecimal, pluralRu, roundTo, type PluralForms } from "./format";
import { capitalize, entryTitle } from "./seo";

/** Единицы калькулятора: замена считается в тех же единицах, что и исходный продукт. */
export const SUBSTITUTE_UNITS = ["г", "мл", "ст. л.", "ч. л.", "стакан", "шт."] as const;
export type SubstituteUnit = (typeof SUBSTITUTE_UNITS)[number];

const UNIT_FORMS: Partial<Record<SubstituteUnit, PluralForms>> = {
  стакан: ["стакан", "стакана", "стаканов"],
};

const VARIANT_FORMS: PluralForms = ["вариант", "варианта", "вариантов"];

/** Замены, которые выражаются одним числом (для калькулятора). */
export function calculableSubs(entry: Pick<SubstitutionEntry, "subs">): Substitute[] {
  return entry.subs.filter((s) => typeof s.factor === "number" && Number.isFinite(s.factor) && s.factor > 0);
}

/** Сколько заменителя взять вместо `quantity` исходного продукта. null — нет коэффициента или количества. */
export function substituteAmount(quantity: number, factor: number | undefined): number | null {
  if (!(quantity > 0) || typeof factor !== "number" || !Number.isFinite(factor) || factor <= 0) return null;
  const raw = quantity * factor;
  return roundTo(raw, raw < 10 ? 1 : 0);
}

/** «80 г», «1,5 стакана», «2 ст. л.». */
export function formatAmount(amount: number, unit: SubstituteUnit): string {
  const forms = UNIT_FORMS[unit];
  return `${formatDecimal(amount)} ${forms ? pluralRu(amount, forms) : unit}`;
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} или ${names[names.length - 1]}`;
}

/** Прямой ответ: «Вместо разрыхлителя подойдёт сода, погашенная уксусом, … Лучший вариант: {пропорция}». */
export function substitutionLead(entry: Pick<SubstitutionEntry, "subs" | "forms">): string {
  const names = entry.subs.slice(0, 3).map((s) => s.name);
  const best = entry.subs[0];
  const head = `Вместо ${entry.forms.gen} подойдёт ${joinNames(names)}.`;
  return best ? `${head} ${best.ratioText}` : head;
}

/** title / description / H1 страницы продукта. */
export function substitutionSeo(entry: Pick<SubstitutionEntry, "subs" | "forms">): PageSeo {
  const h1 = `Чем заменить ${entry.forms.acc}`;
  const n = entry.subs.length;
  const tail = "Пропорции, где замена подойдёт, и калькулятор количества.";
  let description = "";
  for (let k = Math.min(4, n); k > 0; k--) {
    const candidate = `${capitalize(h1)}: ${joinNames(entry.subs.slice(0, k).map((s) => s.name))}. ${tail}`;
    if (candidate.length <= DESCRIPTION_MAX) {
      description = candidate;
      break;
    }
  }
  if (!description) description = `${capitalize(h1)} в рецепте. ${tail}`.slice(0, DESCRIPTION_MAX);
  return { title: entryTitle(h1, `${n} ${pluralRu(n, VARIANT_FORMS)} с пропорциями`), description, h1 };
}
