/** «Меры веса и объёма»: таблица мер продукта и логика конвертера. Чистые функции. */
import type { MeasureEntry, MeasureKey } from "../../types/kitchen";
import type { PageSeo } from "../seo";
import { DESCRIPTION_MAX } from "../seo";
import { parseNumber } from "../scaleAmount";
import { formatDecimal, pluralRu, roundTo, type PluralForms } from "./format";
import { capitalize, entryTitle } from "./seo";

/** Порядок строк таблицы и пунктов конвертера. */
export const MEASURE_ORDER: readonly MeasureKey[] = ["glass250", "glass200", "tbsp", "tbspHeaped", "tsp", "tspHeaped", "piece"];

/** Граммы в мере: только заданные, положительные значения. */
export type MeasureGrams = Partial<Record<MeasureKey, number>>;

interface MeasureInfo {
  /** Подпись строки таблицы. */
  label: string;
  /** «в …» для прямого ответа: «в стакане 250 мл». */
  inside: string;
  /** Формы для результата «≈ 2 стакана». */
  forms: PluralForms;
  /** Уточнение после числа в результате: «(250 мл)». */
  suffix?: string;
}

const SPOON_TABLE: PluralForms = ["столовая ложка", "столовые ложки", "столовых ложек", "столовой ложки"];
const SPOON_TEA: PluralForms = ["чайная ложка", "чайные ложки", "чайных ложек", "чайной ложки"];

const INFO: Record<Exclude<MeasureKey, "piece">, MeasureInfo> = {
  glass250: { label: "Стакан 250 мл (тонкий, до краёв)", inside: "в стакане 250 мл", forms: ["стакан", "стакана", "стаканов"], suffix: "по 250 мл" },
  glass200: {
    label: "Гранёный стакан 200 мл (до риски)",
    inside: "в гранёном стакане 200 мл",
    forms: ["гранёный стакан", "гранёных стакана", "гранёных стаканов", "гранёного стакана"],
    suffix: "по 200 мл",
  },
  tbsp: { label: "Столовая ложка", inside: "в столовой ложке", forms: SPOON_TABLE },
  tbspHeaped: { label: "Столовая ложка с горкой", inside: "в столовой ложке с горкой", forms: SPOON_TABLE, suffix: "с горкой" },
  tsp: { label: "Чайная ложка", inside: "в чайной ложке", forms: SPOON_TEA },
  tspHeaped: { label: "Чайная ложка с горкой", inside: "в чайной ложке с горкой", forms: SPOON_TEA, suffix: "с горкой" },
};

const PIECE_FORMS: PluralForms = ["штука", "штуки", "штук"];
const LEVEL: Partial<Record<MeasureKey, MeasureKey>> = { tbsp: "tbspHeaped", tsp: "tspHeaped" };

export interface MeasureRow {
  key: MeasureKey;
  label: string;
  grams: number;
}

function hasMeasure(grams: MeasureGrams, key: MeasureKey): boolean {
  const g = grams[key];
  return typeof g === "number" && Number.isFinite(g) && g > 0;
}

/** Подпись меры. Ложка «без горки» уточняется, только когда у продукта есть и вариант «с горкой». */
export function measureLabel(key: MeasureKey, grams: MeasureGrams, pieceLabel?: string): string {
  if (key === "piece") return capitalize(pieceLabel ?? "1 штука");
  const heaped = LEVEL[key];
  return heaped && hasMeasure(grams, heaped) ? `${INFO[key].label} без горки` : INFO[key].label;
}

/** Строки таблицы мер в фиксированном порядке. */
export function measureRows(entry: Pick<MeasureEntry, "grams" | "pieceLabel">): MeasureRow[] {
  return MEASURE_ORDER.filter((key) => hasMeasure(entry.grams, key)).map((key) => ({ key, label: measureLabel(key, entry.grams, entry.pieceLabel), grams: entry.grams[key] as number }));
}

/** «160 г», «7,5 г»; от 1 кг — «1,2 кг». */
export function formatGrams(grams: number): string {
  if (grams >= 1000) return `${formatDecimal(grams / 1000, 2)} кг`;
  return `${formatDecimal(grams, grams < 20 ? 1 : 0)} г`;
}

/** Количество из поля ввода: «2», «1,5», «1/2», «1 1/2», «½». null — не число, ноль или слишком много. */
export function parseQuantity(input: string, max = 100_000): number | null {
  const n = parseNumber(input.replace(/\s+/g, " "));
  return n !== null && Number.isFinite(n) && n > 0 && n <= max ? n : null;
}

/** Меры → граммы. null — у продукта нет такой меры. */
export function toGrams(grams: MeasureGrams, key: MeasureKey, quantity: number): number | null {
  if (!hasMeasure(grams, key) || !(quantity > 0)) return null;
  return roundTo((grams[key] as number) * quantity, 1);
}

export interface MeasureAmount {
  key: MeasureKey;
  /** Сколько мер (до десятых; от 20 — целое). */
  count: number;
  /** «≈ 2,5 стакана по 250 мл». */
  text: string;
}

/** Граммы → меры: все меры продукта, от крупных к мелким. */
export function fromGrams(grams: MeasureGrams, weight: number): MeasureAmount[] {
  if (!(weight > 0)) return [];
  return MEASURE_ORDER.filter((key) => hasMeasure(grams, key)).map((key) => {
    const raw = weight / (grams[key] as number);
    const count = raw >= 20 ? Math.round(raw) : roundTo(raw, 1);
    const info = key === "piece" ? { forms: PIECE_FORMS, suffix: undefined } : INFO[key];
    const text = count === 0 ? `меньше 0,1 ${info.forms[3] ?? info.forms[1]}` : `≈ ${formatDecimal(count)} ${pluralRu(count, info.forms)}`;
    return { key, count, text: info.suffix ? `${text} ${info.suffix}` : text };
  });
}

/** Меры, из которых собирается прямой ответ: один стакан, одна столовая и одна чайная ложка. */
function headlineRows(entry: Pick<MeasureEntry, "grams" | "pieceLabel">): MeasureRow[] {
  const rows = measureRows(entry);
  const pick = (...keys: MeasureKey[]) => keys.map((k) => rows.find((r) => r.key === k)).find(Boolean);
  return [pick("glass250", "glass200"), pick("tbspHeaped", "tbsp"), pick("tspHeaped", "tsp")].filter((r): r is MeasureRow => !!r);
}

function insideText(row: MeasureRow): string {
  return row.key === "piece" ? "" : INFO[row.key].inside;
}

/** Прямой ответ под заголовком: «В стакане 250 мл — 160 г пшеничной муки, в столовой ложке с горкой — 25 г, …». */
export function measureLead(entry: Pick<MeasureEntry, "grams" | "pieceLabel" | "forms">): string {
  const rows = headlineRows(entry);
  const parts = rows.map((row, i) => `${insideText(row)} - ${formatGrams(row.grams)}${i === 0 ? ` ${entry.forms.gen}` : ""}`);
  const piece = hasMeasure(entry.grams, "piece") ? `${capitalize(entry.pieceLabel ?? "1 штука")} весит около ${formatGrams(entry.grams.piece as number)}.` : "";
  const main = parts.length > 0 ? `${capitalize(parts.join(", "))}.` : "";
  return [main, piece].filter(Boolean).join(" ");
}

/** title / description / H1 страницы продукта. В description — конкретные граммы. */
export function measureSeo(entry: Pick<MeasureEntry, "grams" | "pieceLabel" | "forms">): PageSeo {
  const h1 = `Сколько грамм ${entry.forms.gen} в стакане и ложке`;
  const rows = headlineRows(entry);
  const facts = rows.map((row) => `${insideText(row)} - ${formatGrams(row.grams)}`);
  if (hasMeasure(entry.grams, "piece")) facts.push(`${entry.pieceLabel ?? "1 штука"} - около ${formatGrams(entry.grams.piece as number)}`);
  const tail = "Таблица мер и калькулятор для пересчёта в граммы.";
  // Факты добавляются, пока описание помещается в лимит: обрывать цифру на полуслове нельзя.
  let description = "";
  for (let n = facts.length; n > 0; n--) {
    const candidate = `${capitalize(entry.forms.nom)}: ${facts.slice(0, n).join(", ")}. ${tail}`;
    if (candidate.length <= DESCRIPTION_MAX) {
      description = candidate;
      break;
    }
  }
  if (!description) description = `Сколько грамм ${entry.forms.gen} в стакане, столовой и чайной ложке. ${tail}`.slice(0, DESCRIPTION_MAX);
  return { title: entryTitle(h1), description, h1 };
}
