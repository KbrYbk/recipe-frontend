import type { Ingredient, Step } from "../types/recipe";

export type IngredientRow = Ingredient;

function str(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

/** Laravel может отдать строки или объекты — приводим к одному виду для UI. Пустые строки отбрасываем. */
export function normalizeIngredients(raw: unknown): IngredientRow[] {
  if (!Array.isArray(raw)) return [];
  const rows: IngredientRow[] = [];
  for (const item of raw) {
    if (typeof item === "string" || typeof item === "number") {
      const name = str(item);
      if (name) rows.push({ name });
      continue;
    }
    if (item && typeof item === "object" && "name" in item) {
      const o = item as Record<string, unknown>;
      const name = str(o.name);
      if (!name) continue;
      const amount = typeof o.amount === "number" ? o.amount : str(o.amount);
      const unit = str(o.unit);
      rows.push({
        name,
        ...(amount !== "" ? { amount } : {}),
        ...(unit ? { unit } : {}),
      });
    }
  }
  return rows;
}

/** Ведущие тире/дефисы и пробелы в количестве и единице («- 0,5», «— 2») — артефакты данных. */
function stripLeadingDashes(v: string): string {
  return v.replace(/^[\s\-\u2010-\u2015\u2212]+/u, "").trim();
}

/**
 * Только для отображения: «вкусу» → «по вкусу», без ведущих тире. Данные не меняются.
 * Пример: { amount: "- 0,5", unit: "ч.л." } → «0,5 ч.л.»; { unit: "вкусу" } → «по вкусу».
 */
export function cleanIngredientAmount(raw: string): string {
  const tokens = stripLeadingDashes(raw).split(/\s+/).filter(Boolean);
  const out: string[] = [];
  tokens.forEach((t) => {
    if (t.toLocaleLowerCase("ru-RU") === "вкусу" && out[out.length - 1]?.toLocaleLowerCase("ru-RU") !== "по") out.push("по");
    out.push(t);
  });
  return out.join(" ");
}

/** «200 г», «1 шт.», «по вкусу» или пустая строка. */
export function formatIngredientAmount(row: IngredientRow): string {
  return cleanIngredientAmount(
    [row.amount, row.unit]
      .map((v) => stripLeadingDashes(str(v)))
      .filter(Boolean)
      .join(" "),
  );
}

/** «Мука — 200 г» — одна строка для копирования, schema.org и списка покупок. */
export function formatIngredientLine(row: IngredientRow): string {
  const amount = formatIngredientAmount(row);
  return amount ? `${row.name} - ${amount}` : row.name;
}

/** Шаги: строки или объекты {order,text,image}; шаги без текста и картинки отбрасываем. */
export function normalizeSteps(raw: unknown, mapImage: (src: string | undefined) => string | undefined = (s) => s): Step[] {
  if (!Array.isArray(raw)) return [];
  const steps: Step[] = [];
  raw.forEach((item, index) => {
    if (typeof item === "string") {
      const text = item.trim();
      if (text) steps.push({ order: index + 1, text });
      return;
    }
    if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      const text = str(o.text ?? o.description);
      const image = mapImage(str(o.image) || undefined);
      if (!text && !image) return;
      const order = Number(o.order);
      steps.push({ order: Number.isFinite(order) && order > 0 ? order : index + 1, text, ...(image ? { image } : {}) });
    }
  });
  return steps;
}
