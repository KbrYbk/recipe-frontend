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

/** «200 г», «1 шт.» или пустая строка. */
export function formatIngredientAmount(row: IngredientRow): string {
  return [row.amount, row.unit]
    .map((v) => str(v))
    .filter(Boolean)
    .join(" ");
}

/** «Мука — 200 г» — одна строка для копирования, schema.org и списка покупок. */
export function formatIngredientLine(row: IngredientRow): string {
  const amount = formatIngredientAmount(row);
  return amount ? `${row.name} — ${amount}` : row.name;
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
