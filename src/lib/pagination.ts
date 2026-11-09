/**
 * Номера страниц для пагинации: первая, последняя, соседние ±2 и «скачковые» ссылки ±10/±50/±100
 * (сокращают глубину вложенности: до любой страницы длинного раздела — несколько кликов). Пропуски — "...".
 */
export type PageItem = number | "...";

const NEIGHBOURS = 2;
const JUMPS = [10, 50, 100];

export function paginationItems(current: number, total: number): PageItem[] {
  if (total < 1) return [];
  const pages = new Set<number>([1, total]);
  for (let i = current - NEIGHBOURS; i <= current + NEIGHBOURS; i++) pages.add(i);
  for (const j of JUMPS) {
    pages.add(current - j);
    pages.add(current + j);
  }
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: PageItem[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("...");
    out.push(p);
  });
  return out;
}
