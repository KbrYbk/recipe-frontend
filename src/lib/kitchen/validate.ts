/**
 * Проверка записей справочника (используется в тестах: невалидная запись не проходит CI).
 * Сроки хранения — тема безопасности еды, поэтому запись без источника или с перепутанными границами отклоняется.
 */
import type { KitchenSectionKey } from "../../types/kitchen";
import { slugify } from "../slugify";

const PLACES = new Set(["room", "fridge", "freezer"]);
const STORAGE_UNITS = new Set(["h", "d", "mo"]);
const MEASURES = new Set(["glass250", "glass200", "tbsp", "tbspHeaped", "tsp", "tspHeaped", "piece"]);
const METHODS = new Set(["boil", "steam", "multicooker", "pressure", "oven", "microwave"]);

export const MIN_FAQ = 3;
export const MAX_FAQ = 5;
/** Минимум заполненных условий / мер / способов / вариантов замены в записи. */
export const MIN_ITEMS = 2;

type Rec = Record<string, unknown>;

function isRecord(v: unknown): v is Rec {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function text(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function isPositive(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v > 0;
}

function isTextList(v: unknown, min = 0): v is string[] {
  return Array.isArray(v) && v.length >= min && v.every((s) => text(s) !== "");
}

/** Сравнение текстов без регистра, ё/е и лишних пробелов. */
export function normalizeText(value: string): string {
  return value.toLocaleLowerCase("ru-RU").replace(/ё/g, "е").replace(/\s+/g, " ").trim();
}

function isIsoDate(v: unknown): boolean {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:\d{2})?)?$/.test(v) && Number.isFinite(Date.parse(v));
}

function validateBase(e: Rec, errors: string[]): void {
  const forms = isRecord(e.forms) ? e.forms : {};
  const nom = text(forms.nom);
  if (!nom || !text(forms.gen) || !text(forms.acc)) errors.push("forms: нужны nom, gen и acc");
  const slug = text(e.slug);
  if (!slug) errors.push("slug пуст");
  else if (nom && slug !== slugify(nom)) errors.push(`slug «${slug}» не совпадает со slugify(forms.nom) = «${slugify(nom)}»`);

  if (!isTextList(e.aliases, 1)) errors.push("aliases: нужен хотя бы один непустой алиас");
  else if (e.aliases.some((a) => a !== a.toLocaleLowerCase("ru-RU").trim())) errors.push("aliases: только нижний регистр, без пробелов по краям");

  if (!text(e.group)) errors.push("group пуст");
  if (!isTextList(e.sources, 1)) errors.push("sources: нужен хотя бы один источник");
  if (!isIsoDate(e.updatedAt)) errors.push("updatedAt: нужна ISO-дата");

  const faq = Array.isArray(e.faq) ? e.faq : [];
  if (faq.length < MIN_FAQ || faq.length > MAX_FAQ) errors.push(`faq: нужно от ${MIN_FAQ} до ${MAX_FAQ} вопросов, сейчас ${faq.length}`);
  if (faq.some((f) => !isRecord(f) || !text(f.q) || !text(f.a))) errors.push("faq: у каждого вопроса нужны q и a");
}

function validateStorage(e: Rec, errors: string[]): void {
  const conditions = Array.isArray(e.conditions) ? e.conditions : [];
  if (conditions.length < MIN_ITEMS) errors.push(`conditions: нужно минимум ${MIN_ITEMS} условия хранения`);
  const seen = new Set<string>();
  for (const c of conditions) {
    if (!isRecord(c) || !PLACES.has(String(c.where)) || !STORAGE_UNITS.has(String(c.unit))) {
      errors.push("conditions: неизвестное место или единица срока");
      continue;
    }
    if (seen.has(String(c.where))) errors.push(`conditions: условие «${String(c.where)}» повторяется`);
    seen.add(String(c.where));
    if (!isPositive(c.min) || !isPositive(c.max)) errors.push(`conditions(${String(c.where)}): min и max — положительные числа`);
    else if (c.min > c.max) errors.push(`conditions(${String(c.where)}): min > max`);
  }
  if (!isTextList(e.spoilSigns, 1)) errors.push("spoilSigns: нужен хотя бы один признак порчи");
  if (!isTextList(e.tips)) errors.push("tips: список строк");
}

function validateMeasures(e: Rec, errors: string[]): void {
  const grams = isRecord(e.grams) ? e.grams : {};
  const keys = Object.keys(grams);
  if (keys.some((k) => !MEASURES.has(k))) errors.push("grams: неизвестная мера");
  if (keys.some((k) => !isPositive(grams[k]))) errors.push("grams: вес меры — положительное число");
  if (keys.length < MIN_ITEMS) errors.push(`grams: нужно минимум ${MIN_ITEMS} меры`);
  if ("piece" in grams && !text(e.pieceLabel)) errors.push("pieceLabel: обязателен, если задана мера piece");
}

function validateCooking(e: Rec, errors: string[]): void {
  const methods = Array.isArray(e.methods) ? e.methods : [];
  if (methods.length < MIN_ITEMS) errors.push(`methods: нужно минимум ${MIN_ITEMS} способа`);
  for (const m of methods) {
    if (!isRecord(m) || !METHODS.has(String(m.method))) {
      errors.push("methods: неизвестный способ");
      continue;
    }
    if (!isPositive(m.minMin) || !isPositive(m.maxMin)) errors.push(`methods(${String(m.method)}): minMin и maxMin — положительные числа`);
    else if (m.minMin > m.maxMin) errors.push(`methods(${String(m.method)}): min > max`);
  }
  if (!text(e.readiness)) errors.push("readiness пуст");
  if (!isTextList(e.tips)) errors.push("tips: список строк");
}

function validateSubstitutions(e: Rec, errors: string[]): void {
  if (!text(e.role)) errors.push("role пуст");
  const subs = Array.isArray(e.subs) ? e.subs : [];
  if (subs.length < MIN_ITEMS) errors.push(`subs: нужно минимум ${MIN_ITEMS} варианта замены`);
  for (const s of subs) {
    if (!isRecord(s) || !text(s.name) || !text(s.ratioText)) {
      errors.push("subs: нужны name и ratioText");
      continue;
    }
    if (s.factor !== undefined && !isPositive(s.factor)) errors.push(`subs(${text(s.name)}): factor — положительное число`);
    if (!isTextList(s.bestFor, 1)) errors.push(`subs(${text(s.name)}): bestFor — хотя бы одно применение`);
    if (!isTextList(s.notFor)) errors.push(`subs(${text(s.name)}): notFor — список строк`);
  }
}

const SPECIFIC: Record<KitchenSectionKey, (e: Rec, errors: string[]) => void> = {
  storage: validateStorage,
  measures: validateMeasures,
  cooking: validateCooking,
  substitutions: validateSubstitutions,
};

/** Ошибки одной записи (пустой массив — запись корректна). */
export function validateEntry(section: KitchenSectionKey, entry: unknown): string[] {
  if (!isRecord(entry)) return ["запись должна быть объектом"];
  const errors: string[] = [];
  validateBase(entry, errors);
  SPECIFIC[section](entry, errors);
  return errors;
}

/** Ошибки файла: каждая запись + уникальность slug. Формат строки: «{slug}: {ошибка}». */
export function validateEntries(section: KitchenSectionKey, entries: unknown): string[] {
  if (!Array.isArray(entries)) return ["файл должен содержать массив записей"];
  const errors: string[] = [];
  const slugs = new Set<string>();
  entries.forEach((entry, i) => {
    const slug = isRecord(entry) ? text(entry.slug) : "";
    const label = slug || `#${i}`;
    for (const e of validateEntry(section, entry)) errors.push(`${label}: ${e}`);
    if (slug) {
      if (slugs.has(slug)) errors.push(`${label}: slug дублируется`);
      slugs.add(slug);
    }
  });
  return errors;
}

/**
 * FAQ, дословно совпадающие у разных записей (вопрос или ответ): такие страницы — дубли для поисковика.
 * Принимает записи всех подразделов сразу.
 */
export function findDuplicateFaq(entries: ReadonlyArray<{ id: string; faq: ReadonlyArray<{ q: string; a: string }> }>): string[] {
  const errors: string[] = [];
  const questions = new Map<string, string>();
  const answers = new Map<string, string>();
  for (const { id, faq } of entries) {
    for (const item of faq) {
      for (const [kind, value, seen] of [
        ["вопрос", item.q, questions],
        ["ответ", item.a, answers],
      ] as const) {
        const key = normalizeText(value);
        const owner = seen.get(key);
        if (owner === undefined) seen.set(key, id);
        else errors.push(`${id}: ${kind} FAQ дословно совпадает с ${owner === id ? "другим вопросом той же записи" : owner} — «${value}»`);
      }
    }
  }
  return errors;
}
