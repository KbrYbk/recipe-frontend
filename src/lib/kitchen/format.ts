/** Числа и склонения для текстов справочника. Чистые функции (сервер и клиентские скрипты). */

/** Формы для 1, 2–4, 5+ и (необязательно) для дробного числа — родительный падеж единственного числа. */
export type PluralForms = readonly [one: string, few: string, many: string, fraction?: string];

/** «1 стакан», «2 стакана», «5 стаканов»; дробное число — «1,5 стакана», «0,5 столовой ложки». */
export function pluralRu(n: number, forms: PluralForms): string {
  if (!Number.isInteger(n)) return forms[3] ?? forms[1];
  const abs = Math.abs(n);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

/** Округление до `digits` знаков без хвостовых нулей и двоичного шума (0.1 + 0.2 → 0.3). */
export function roundTo(n: number, digits: number): number {
  const k = 10 ** digits;
  return Math.round((n + Number.EPSILON) * k) / k;
}

/** Число для показа: запятая вместо точки, без хвостовых нулей. */
export function formatDecimal(n: number, digits = 1): string {
  return String(roundTo(n, digits)).replace(".", ",");
}

/** «2–3», а при равных границах — «3». */
export function formatRange(min: number, max: number, digits = 1): string {
  return min === max ? formatDecimal(min, digits) : `${formatDecimal(min, digits)}–${formatDecimal(max, digits)}`;
}
