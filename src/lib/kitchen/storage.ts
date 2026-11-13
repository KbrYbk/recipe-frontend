/** «Сроки хранения»: форматирование сроков и расчёт «съесть до». Чистые функции. */
import type { KitchenForms, StorageCondition, StorageEntry, StoragePlace, StorageUnit } from "../../types/kitchen";
import type { PageSeo } from "../seo";
import { BRAND, DESCRIPTION_MAX, fitTitle } from "../seo";
import { formatDecimal, formatRange, pluralRu, type PluralForms } from "./format";
import { capitalize } from "./seo";

/** Порядок строк таблицы и пунктов калькулятора. */
export const PLACE_ORDER: readonly StoragePlace[] = ["fridge", "freezer", "room"];

const PLACE: Record<StoragePlace, { label: string; inside: string; option: string }> = {
  fridge: { label: "В холодильнике", inside: "в холодильнике", option: "Холодильник" },
  freezer: { label: "В морозилке", inside: "в морозилке", option: "Морозилка" },
  room: { label: "При комнатной температуре", inside: "при комнатной температуре", option: "Комнатная температура" },
};

const UNIT_FORMS: Record<StorageUnit, PluralForms> = {
  h: ["час", "часа", "часов"],
  d: ["день", "дня", "дней"],
  mo: ["месяц", "месяца", "месяцев"],
};
const YEAR_FORMS: PluralForms = ["год", "года", "лет"];
const HOUR_GENITIVE: PluralForms = ["часа", "часов", "часов"];

export function placeLabel(where: StoragePlace): string {
  return PLACE[where].label;
}

export function placeOption(where: StoragePlace): string {
  return PLACE[where].option;
}

/** Условия в порядке таблицы: холодильник, морозилка, комнатная температура. */
export function orderedConditions(entry: Pick<StorageEntry, "conditions">): StorageCondition[] {
  return PLACE_ORDER.flatMap((where) => entry.conditions.filter((c) => c.where === where).slice(0, 1));
}

/** «3–4 дня», «2 часа», «6–12 месяцев», «1–2 года» (месяцы, кратные 12, показываются годами). Слово согласуется с последним числом. */
export function formatTerm(c: Pick<StorageCondition, "min" | "max" | "unit">): string {
  if (c.unit === "mo" && c.min % 12 === 0 && c.max % 12 === 0) return `${formatRange(c.min / 12, c.max / 12)} ${pluralRu(c.max / 12, YEAR_FORMS)}`;
  return `${formatRange(c.min, c.max)} ${pluralRu(c.max, UNIT_FORMS[c.unit])}`;
}

/** Срок в предложении: часы — как предел («не дольше 2 часов»), остальное — диапазон («3–4 дня»). */
export function termPhrase(c: Pick<StorageCondition, "min" | "max" | "unit">): string {
  return c.unit === "h" ? `не дольше ${formatDecimal(c.max)} ${pluralRu(c.max, HOUR_GENITIVE)}` : formatTerm(c);
}

function storeVerb(forms: Pick<KitchenForms, "plural">): string {
  return forms.plural ? "хранятся" : "хранится";
}

/** Прямой ответ: «Варёная курица хранится в холодильнике 3–4 дня, в морозилке — 2–4 месяца, при комнатной температуре — не дольше 2 часов.» */
export function storageLead(entry: Pick<StorageEntry, "conditions" | "forms">): string {
  const parts = orderedConditions(entry).map((c, i) => `${PLACE[c.where].inside}${i === 0 ? "" : " -"} ${termPhrase(c)}`);
  return `${capitalize(entry.forms.nom)} ${storeVerb(entry.forms)} ${parts.join(", ")}.`;
}

/** title / description / H1 страницы продукта. В description — сроки из данных. */
export function storageSeo(entry: Pick<StorageEntry, "conditions" | "forms">): PageSeo {
  const h1 = `Сколько ${storeVerb(entry.forms)} ${entry.forms.nom}`;
  const conditions = orderedConditions(entry);
  const places = conditions.filter((c) => c.where !== "room").map((c) => PLACE[c.where].inside);
  const where = places.length > 0 ? ` ${places.join(" и ")}` : "";
  const heading = capitalize(h1);
  const title = fitTitle([`${heading}${where} | ${BRAND}`, `${heading}${where}`, `${heading} | ${BRAND}`, heading]);

  const facts = conditions.map((c) => `${PLACE[c.where].inside} - ${termPhrase(c)}`);
  const tail = "Признаки порчи и калькулятор «съесть до».";
  let description = "";
  for (let n = facts.length; n > 0; n--) {
    const candidate = `${capitalize(entry.forms.nom)}: ${facts.slice(0, n).join(", ")}. ${tail}`;
    if (candidate.length <= DESCRIPTION_MAX) {
      description = candidate;
      break;
    }
  }
  if (!description) description = `Сроки хранения: ${facts[0] ?? "таблица"}. ${tail}`.slice(0, DESCRIPTION_MAX);
  return { title, description, h1 };
}

// --- Калькулятор «съесть до» ---

/** Календарная дата без времени и часового пояса. */
export interface PlainDate {
  year: number;
  /** 1–12 */
  month: number;
  day: number;
}

/** «2026-11-13» → дата. null — не дата (в т.ч. 31 февраля). */
export function parsePlainDate(value: string): PlainDate | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const date = { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  const check = new Date(Date.UTC(date.year, date.month - 1, date.day));
  return check.getUTCFullYear() === date.year && check.getUTCMonth() === date.month - 1 && check.getUTCDate() === date.day ? date : null;
}

function fromUtc(ms: number): PlainDate {
  const d = new Date(ms);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function toUtc(date: PlainDate): number {
  return Date.UTC(date.year, date.month - 1, date.day);
}

export function toIsoDate(date: PlainDate): string {
  return `${String(date.year).padStart(4, "0")}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

/** Сегодняшняя дата в часовом поясе пользователя. */
export function todayPlain(now = new Date()): PlainDate {
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

/** Число дней от `from` до `to` (отрицательное — `to` раньше). */
export function daysBetween(from: PlainDate, to: PlainDate): number {
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000);
}

/**
 * Последний день, когда продукт ещё можно есть: дата приготовления/вскрытия + НИЖНЯЯ граница срока.
 * Месяцы — календарные (31 января + 1 месяц = 28/29 февраля). Для сроков в часах дата не считается — null.
 */
export function eatBy(start: PlainDate, c: Pick<StorageCondition, "min" | "unit">): PlainDate | null {
  if (c.unit === "h" || !(c.min > 0)) return null;
  if (c.unit === "d") return fromUtc(toUtc(start) + Math.floor(c.min) * 86_400_000);
  const months = Math.floor(c.min);
  const extraDays = Math.round((c.min - months) * 30);
  const target = new Date(Date.UTC(start.year, start.month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  const base = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(start.day, lastDay));
  return fromUtc(base + extraDays * 86_400_000);
}

const MONTHS_GENITIVE = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

/** «16 ноября 2026». */
export function formatPlainDate(date: PlainDate): string {
  return `${date.day} ${MONTHS_GENITIVE[date.month - 1]} ${date.year}`;
}

export interface ExpiryResult {
  /** Крупная строка: «Съесть до 16 ноября 2026». */
  title: string;
  /** Пояснение: сколько осталось или что срок вышел. */
  detail: string;
  expired: boolean;
}

const DAY_FORMS: PluralForms = ["день", "дня", "дней"];

/** Результат калькулятора для даты `start` и условия хранения; null — посчитать нельзя (срок в часах, нет даты). */
export function expiryResult(start: PlainDate, c: Pick<StorageCondition, "min" | "max" | "unit">, today: PlainDate): ExpiryResult | null {
  const until = eatBy(start, c);
  if (!until) return null;
  const left = daysBetween(today, until);
  const basis = `Расчёт по нижней границе срока: ${formatDecimal(c.min)} ${pluralRu(c.min, UNIT_FORMS[c.unit])}.`;
  if (daysBetween(today, start) > 0) return { title: `Съесть до ${formatPlainDate(until)}`, detail: basis, expired: false };
  if (left < 0) {
    const ago = -left;
    return { title: `Срок вышел ${formatPlainDate(until)}`, detail: `Прошло ${ago} ${pluralRu(ago, DAY_FORMS)} - есть уже не стоит.`, expired: true };
  }
  const rest = left === 0 ? "Сегодня последний день." : `Осталось ${left} ${pluralRu(left, DAY_FORMS)}.`;
  return { title: `Съесть до ${formatPlainDate(until)}`, detail: `${rest} ${basis}`, expired: false };
}
