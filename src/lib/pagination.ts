/**
 * Номера страниц для пагинации: первая, последняя, соседние ±N и «скачковые» ссылки (±10/±50/±100)
 * (сокращают глубину вложенности: до любой страницы длинного раздела — несколько кликов). Пропуски — "...".
 */
export type PageItem = number | "...";

export interface PaginationOptions {
  neighbours?: number;
  jumps?: number[];
}

export function paginationItems(current: number, total: number, opts: PaginationOptions = {}): PageItem[] {
  const { neighbours = 2, jumps = [10, 50, 100] } = opts;
  if (total < 1) return [];
  const pages = new Set<number>([1, total]);
  for (let i = current - neighbours; i <= current + neighbours; i++) pages.add(i);
  for (const j of jumps) {
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

/** Брейкпоинты, на которых пагинация показывает разный набор страниц, чтобы всегда помещаться в одну строку. */
export type PaginationLevel = "base" | "md" | "lg";
const LEVELS: PaginationLevel[] = ["base", "md", "lg"];

export function levelOptions(level: PaginationLevel, total: number): PaginationOptions {
  // Четырёхзначные номера шире — соседей меньше.
  const neighbours = total >= 1000 ? 1 : 2;
  if (level === "lg") return { neighbours, jumps: [10, 100] };
  if (level === "md") return { neighbours, jumps: [10] };
  // Телефон: четырёхзначные номера не помещаются с соседями — остаются 1 … [текущая] … последняя и стрелки.
  return { neighbours: total >= 1000 ? 0 : 1, jumps: [] };
}

export interface ResponsiveItem {
  key: string;
  page: number | null; // null — «...»
  levels: PaginationLevel[]; // на каких брейкпоинтах элемент виден
}

/**
 * Один список для всех ширин (без дублирования ссылок в HTML): объединение страниц всех уровней,
 * у каждого элемента — уровни, на которых он виден. «...» ставится сразу за страницей, после которой на этом уровне пропуск.
 */
export function responsivePaginationItems(current: number, total: number): ResponsiveItem[] {
  if (total < 1) return [];
  const visible = new Map<number, Set<PaginationLevel>>();
  const dotsAfter = new Map<number, Set<PaginationLevel>>();
  for (const level of LEVELS) {
    const items = paginationItems(current, total, levelOptions(level, total));
    let prev: number | null = null;
    for (const it of items) {
      if (it === "...") {
        if (prev !== null) (dotsAfter.get(prev) ?? dotsAfter.set(prev, new Set()).get(prev)!).add(level);
        continue;
      }
      (visible.get(it) ?? visible.set(it, new Set()).get(it)!).add(level);
      prev = it;
    }
  }
  const out: ResponsiveItem[] = [];
  for (const p of [...visible.keys()].sort((a, b) => a - b)) {
    out.push({ key: `p${p}`, page: p, levels: LEVELS.filter((l) => visible.get(p)!.has(l)) });
    const dots = dotsAfter.get(p);
    if (dots) out.push({ key: `d${p}`, page: null, levels: LEVELS.filter((l) => dots.has(l)) });
  }
  return out;
}

/** Tailwind-классы видимости по уровням (строки целиком — чтобы Tailwind их нашёл). */
export function visibilityClass(levels: PaginationLevel[]): string {
  const base = levels.includes("base");
  const md = levels.includes("md");
  const lg = levels.includes("lg");
  const cls = [base ? "inline-flex" : "hidden"];
  if (md !== base) cls.push(md ? "md:inline-flex" : "md:hidden");
  if (lg !== md) cls.push(lg ? "lg:inline-flex" : "lg:hidden");
  return cls.join(" ");
}
