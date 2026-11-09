/**
 * Пересчёт количеств ингредиентов («Количество: ×2»).
 * Числа в строке количества («200 г», «0,5 ч.л.», «1/2 стакана», «1 1/2», «1-2 шт.», «½») умножаются,
 * нечисловые значения («по вкусу») остаются как есть.
 */
export const SCALE_OPTIONS = [
  { value: 0.5, label: "½×" },
  { value: 1, label: "1×" },
  { value: 1.5, label: "1½×" },
  { value: 2, label: "2×" },
  { value: 3, label: "3×" },
] as const;

export function scaleKey(recipeId: number): string {
  return `recipe:scale:${recipeId}`;
}

/** Допустимый множитель из сохранённого значения (иначе 1). */
export function parseScale(raw: string | null | undefined): number {
  const n = Number(raw);
  return SCALE_OPTIONS.some((o) => o.value === n) ? n : 1;
}

const UNICODE_FRACTIONS: Record<string, number> = { "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3, "⅛": 0.125 };

const NUM = String.raw`(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?|[½¼¾⅓⅔⅛])`;
// Число (или диапазон «1-2»), не приклеенное слева к букве/цифре («С1», «E220» не трогаем).
const QUANTITY_RE = new RegExp(String.raw`(?<![\p{L}\d.,/])(${NUM})(?:(\s*[-–—]\s*)(${NUM}))?(?![\d/]|[.,]\d)`, "gu");

/** «0,5» → 0.5, «1/2» → 0.5, «1 1/2» → 1.5, «½» → 0.5; null — не число. */
export function parseNumber(token: string): number | null {
  const t = token.trim();
  if (t in UNICODE_FRACTIONS) return UNICODE_FRACTIONS[t];
  let m = t.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (m) return Number(m[3]) === 0 ? null : Number(m[1]) + Number(m[2]) / Number(m[3]);
  m = t.match(/^(\d+)\/(\d+)$/);
  if (m) return Number(m[2]) === 0 ? null : Number(m[1]) / Number(m[2]);
  if (/^\d+(?:[.,]\d+)?$/.test(t)) return Number(t.replace(",", "."));
  return null;
}

/** 1.5 → «1,5», 0.333 → «0,33», 2 → «2». */
export function formatNumber(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return String(rounded).replace(".", ",");
}

/** Умножить все количества в строке. При factor = 1 строка не меняется. */
export function scaleAmountText(text: string, factor: number): string {
  if (!text || factor === 1 || !Number.isFinite(factor) || factor <= 0) return text;
  return text.replace(QUANTITY_RE, (whole, a: string, sep: string | undefined, b: string | undefined) => {
    const x = parseNumber(a);
    if (x === null) return whole;
    if (b !== undefined) {
      const y = parseNumber(b);
      if (y === null) return whole;
      return `${formatNumber(x * factor)}${sep ?? "-"}${formatNumber(y * factor)}`;
    }
    return formatNumber(x * factor);
  });
}

/** Подпись под переключателем. servings — число порций из API (если есть). */
export function scaleCaption(factor: number, servings?: number): string {
  if (servings && servings > 0) {
    const n = Math.max(1, Math.round(servings * factor * 10) / 10);
    return `на ${formatNumber(n)} ${pluralPortions(n)}${factor === 1 ? " — как в рецепте" : ""}`;
  }
  return factor === 1 ? "Количество: ×1 — как в рецепте" : `Количество: ×${formatNumber(factor)}`;
}

export function pluralPortions(n: number): string {
  if (!Number.isInteger(n)) return "порции";
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "порцию";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "порции";
  return "порций";
}
