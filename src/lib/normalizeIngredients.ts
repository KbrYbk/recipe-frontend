export interface IngredientRow {
  name: string;
  amount?: string | number;
  unit?: string;
}

/** Laravel может отдать строки или объекты — приводим к одному виду для UI. */
export function normalizeIngredients(raw: unknown): IngredientRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (typeof item === "string") return { name: item };
    if (item && typeof item === "object" && "name" in item) {
      const o = item as Record<string, unknown>;
      return {
        name: String(o.name ?? ""),
        amount: o.amount as string | number | undefined,
        unit: o.unit != null ? String(o.unit) : undefined,
      };
    }
    return { name: String(item) };
  });
}
