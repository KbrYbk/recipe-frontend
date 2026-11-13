/**
 * SEO-правила страниц: индексация листингов, шаблоны title/description/H1. Чистые функции (покрыты юнит-тестами).
 */

import { formatCount, pluralRecipes } from "./catalog";

/** Параметры, которые меняют состав/порядок выдачи: такие URL не индексируем (noindex,follow). */
export const INDEX_BLOCKING_PARAMS = ["sort", "difficulty", "minTime", "maxTime", "minRating", "maxRating"] as const;

/**
 * Тип листинга:
 * - category / landing — пагинация индексируется (своя выдача у каждой страницы);
 * - recipes / collection — страницы 2+ дублируют карточки категорий, поэтому только первая индексируется.
 */
export type ListingKind = "category" | "landing" | "recipes" | "collection";

/** true — страницу листинга нужно закрыть `noindex,follow` (ссылки при этом обходятся). */
export function listingNoindex(kind: ListingKind, params: URLSearchParams, page: number): boolean {
  if ((params.get("q") ?? "").trim()) return true;
  if (INDEX_BLOCKING_PARAMS.some((key) => (params.get(key) ?? "").trim() !== "")) return true;
  if ((kind === "recipes" || kind === "collection") && page > 1) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Шаблоны title / description / H1 (findings/seo-2026-11-10/content.md).
// Ориентир Яндекса: title ≤ 65 символов (бренд в конце отбрасывается первым), description ≤ 160, без бренда.
// ---------------------------------------------------------------------------

export const BRAND = "SwagEda";
export const TITLE_MAX = 65;
export const DESCRIPTION_MAX = 160;

/** «2 671 рецепт» (неразрывный пробел в числе). */
function countRecipes(n: number): string {
  return `${formatCount(n)} ${pluralRecipes(n)}`;
}

/** Обрезка по границе слова (без обрыва посреди слова) с многоточием. */
export function cutByWord(text: string, max: number): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  const slice = t.slice(0, max - 1);
  // Срез кончается на границе слова, если следующий символ — пробел; иначе откатываемся к последнему пробелу.
  const space = t.charAt(max - 1) === " " ? slice.length : slice.lastIndexOf(" ");
  const base = (space > 0 ? slice.slice(0, space) : slice).replace(/[\s,.;:!?—–-]+$/u, "");
  return `${base}…`;
}

/** Обрезка по концу предложения (если оно не короче половины лимита), иначе — по слову. */
export function cutBySentence(text: string, max: number): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  const slice = t.slice(0, max);
  const end = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("! "), slice.lastIndexOf("? "));
  if (end >= max * 0.5) return slice.slice(0, end + 1);
  return cutByWord(t, max);
}

/** Первый вариант, который помещается в лимит; если ни один — последний, обрезанный по слову. */
export function fitTitle(variants: string[], max = TITLE_MAX): string {
  const clean = variants.map((v) => v.trim().replace(/\s+/g, " ")).filter(Boolean);
  for (const v of clean) if (v.length <= max) return v;
  return cutByWord(clean[clean.length - 1] ?? "", max);
}

function ensurePeriod(text: string): string {
  const t = text.trim();
  if (!t) return t;
  return /[.!?…]$/u.test(t) ? t : `${t}.`;
}

function sameText(a: string, b: string): boolean {
  const norm = (s: string) =>
    s
      .toLocaleLowerCase("ru-RU")
      .replace(/ё/g, "е")
      .replace(/[^\p{L}\p{N}]+/gu, "");
  return norm(a) === norm(b);
}

/** «1 ч 40 мин», «30 мин», «2 ч». Пусто, если время неизвестно. */
export function humanDuration(minutes: number): string {
  if (!(minutes > 0)) return "";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return [h ? `${h} ч` : "", m ? `${m} мин` : ""].filter(Boolean).join(" ");
}

const DIFFICULTY_TEXT: Record<string, string> = { easy: "легко", medium: "средней сложности", hard: "сложно" };

// --- Рецепт ---

/**
 * Title рецепта: «{Название} — рецепт с фото пошагово | SwagEda» со ступенчатым урезанием до 65 символов.
 * Если «рецепт» уже есть в названии — «{Название} — пошагово с фото».
 */
export function recipeTitle(title: string): string {
  const t = title.trim();
  if (/рецепт/iu.test(t)) {
    return fitTitle([`${t} - пошагово с фото | ${BRAND}`, `${t} - пошагово с фото`, `${t} | ${BRAND}`, t]);
  }
  return fitTitle([`${t} - рецепт с фото пошагово | ${BRAND}`, `${t} - рецепт с фото пошагово`, `${t} - рецепт с фото`, t]);
}

export interface RecipeDescriptionSource {
  title: string;
  description?: string;
  cooking_time?: number;
  difficulty?: string;
  ingredients?: ReadonlyArray<{ name: string }>;
  steps?: ReadonlyArray<{ text: string }>;
}

/** Собственное описание рецепта пригодно для сниппета: не пустое, не повторяет название, не слишком короткое. */
export function hasOwnDescription(recipe: { title: string; description?: string }, minLength = 70): boolean {
  const d = (recipe.description ?? "").trim();
  return d.length >= minLength && !sameText(d, recipe.title);
}

/** true — описание совпадает с названием (или пустое): блок «О рецепте» и абзац карточки не выводим. */
export function isDescriptionRedundant(recipe: { title: string; description?: string }): boolean {
  const d = (recipe.description ?? "").trim();
  return !d || sameText(d, recipe.title);
}

/**
 * Meta description рецепта (≤ 160, точка в конце обязательна):
 * - своё описание (≥ 70 символов, ≠ названию): «{описание до ~110}. Готовится за {время}, {сложность}.»
 * - иначе: «{Название}: пошаговый рецепт с фото. Готовится за …. Понадобится: {ингр.1}, {ингр.2}, {ингр.3} и др.»
 *   (без ингредиентов — начало первого шага).
 */
export function recipeDescription(recipe: RecipeDescriptionSource): string {
  const time = humanDuration(recipe.cooking_time ?? 0);
  const diff = recipe.difficulty ? DIFFICULTY_TEXT[recipe.difficulty] : undefined;
  const facts = [time ? `Готовится за ${time}` : "", diff ?? ""].filter(Boolean).join(", ");
  const factsSentence = facts ? ensurePeriod(facts.charAt(0).toUpperCase() + facts.slice(1)) : "";

  if (hasOwnDescription(recipe)) {
    const own = ensurePeriod(cutBySentence(recipe.description ?? "", 110));
    const full = [own, factsSentence].filter(Boolean).join(" ");
    return full.length <= DESCRIPTION_MAX ? full : ensurePeriod(cutBySentence(recipe.description ?? "", DESCRIPTION_MAX - 1));
  }

  const head = [`${recipe.title.trim()}: пошаговый рецепт с фото.`, factsSentence].filter(Boolean).join(" ");
  const names = (recipe.ingredients ?? []).map((i) => i.name.trim().toLocaleLowerCase("ru-RU")).filter(Boolean);
  const uniqueNames = [...new Set(names)];
  for (let n = Math.min(4, uniqueNames.length); n > 0; n--) {
    const more = uniqueNames.length > n ? " и др." : "";
    const candidate = `${head} Понадобится: ${uniqueNames.slice(0, n).join(", ")}${more}${more ? "" : "."}`;
    if (candidate.length <= DESCRIPTION_MAX) return candidate;
  }
  const firstStep = recipe.steps?.find((s) => s.text.trim())?.text ?? "";
  if (firstStep && head.length < DESCRIPTION_MAX - 30) {
    return ensurePeriod(`${head} ${cutByWord(firstStep, DESCRIPTION_MAX - head.length - 2)}`);
  }
  return ensurePeriod(cutByWord(head, DESCRIPTION_MAX - 1));
}

// --- Главная ---

export interface PageSeo {
  title: string;
  description: string;
  h1: string;
}

/** Главная: «Рецепты с фото пошагово — более 39 000 блюд | SwagEda». total — общее число рецептов (0 — неизвестно). */
export function homeSeo(total: number): PageSeo {
  const rounded = total >= 2000 ? Math.floor(total / 1000) * 1000 : 0;
  const more = rounded ? `Более ${formatCount(rounded)}` : "Тысячи";
  return {
    title: rounded ? `Рецепты с фото пошагово - более ${formatCount(rounded)} блюд | ${BRAND}` : `Рецепты с фото пошагово - простые и вкусные блюда | ${BRAND}`,
    description: `${more} пошаговых рецептов с фото и видео: супы, салаты, выпечка, мясо, блюда в аэрогриле. Режим готовки, пересчёт порций и список покупок.`,
    h1: "Рецепты с фото пошагово: что приготовить сегодня?",
  };
}

// --- Каталог, категории, лендинги ---

const pageSuffix = (page: number) => (page > 1 ? ` - страница ${page}` : "");
const pageSentence = (page: number) => (page > 1 ? ` Страница ${page}.` : "");

/** Каталог /recipes. */
export function recipesSeo(total: number, page: number): PageSeo {
  const n = total > 0 ? ` - каталог ${countRecipes(total)}` : "";
  return {
    title: fitTitle([`Все рецепты с фото пошагово${n}${pageSuffix(page)} | ${BRAND}`, `Все рецепты с фото пошагово${n}${pageSuffix(page)}`, `Все рецепты с фото${pageSuffix(page)}`]),
    description: `Каталог из ${total > 0 ? countRecipes(total) : "тысяч рецептов"} с фото: от быстрых завтраков до праздничных блюд. Фильтры по времени, сложности и рейтингу, новые рецепты каждый день.${pageSentence(page)}`,
    h1: "Все рецепты с фото",
  };
}

/** SEO-поля раздела из API (категория или лендинг); любые из них могут отсутствовать. */
export interface SeoFields {
  title: string;
  seoTitle?: string;
  seoDescription?: string;
  h1?: string;
}

/**
 * Категория или лендинг: поля из API, а если их нет — шаблон.
 * Title (fallback): «{Название} — {N} рецептов с фото пошагово | SwagEda», при длине > 65 бренд убирается.
 * H1 (fallback): «{Название} — рецепты с фото». Description — без бренда.
 */
export function sectionSeo(section: SeoFields, total: number, page: number): PageSeo {
  const name = section.title.trim();
  const sfx = pageSuffix(page);
  const n = total > 0 ? countRecipes(total) : "";

  const title = section.seoTitle
    ? fitTitle(/swageda/i.test(section.seoTitle) ? [`${section.seoTitle}${sfx}`] : [`${section.seoTitle}${sfx} | ${BRAND}`, `${section.seoTitle}${sfx}`], 70)
    : fitTitle([
        n ? `${name} - ${n} с фото пошагово${sfx} | ${BRAND}` : `${name} - рецепты с фото пошагово${sfx} | ${BRAND}`,
        n ? `${name} - ${n} с фото пошагово${sfx}` : `${name} - рецепты с фото пошагово${sfx}`,
        `${name} - рецепты с фото${sfx}`,
      ]);

  const description = section.seoDescription
    ? `${ensurePeriod(section.seoDescription)}${pageSentence(page)}`
    : `${n ? `${n.charAt(0).toUpperCase()}${n.slice(1)} с фото пошагово` : "Рецепты с фото пошагово"} в разделе «${name}». Подберите блюдо по времени и сложности, готовьте в режиме «шаг за шагом».${pageSentence(page)}`;

  return { title, description, h1: section.h1?.trim() || `${name} - рецепты с фото` };
}

// --- Подборки ---

const COLLECTION_SEO: Record<string, { title: (n: string) => string[]; h1: string; description: (n: string) => string }> = {
  breakfast: {
    title: (n) => [`Что приготовить на завтрак - ${n} с фото | ${BRAND}`, `Что приготовить на завтрак - рецепты с фото`],
    h1: "Что приготовить на завтрак: рецепты с фото",
    description: (n) => `${n} завтраков с фото: быстрые и сытные, из яиц и творога, каши, блины и сырники. Идеи на каждый день и выходные - с временем приготовления.`,
  },
  lunch: {
    title: (n) => [`Что приготовить на обед - ${n} с фото | ${BRAND}`, `Что приготовить на обед - рецепты с фото`],
    h1: "Что приготовить на обед: рецепты с фото",
    description: (n) => `${n} обедов с фото: супы, вторые блюда, гарниры и салаты. Сытные и простые идеи на каждый день - с пошаговыми фото и временем приготовления.`,
  },
  dinner: {
    title: () => [`Что приготовить на ужин - быстрые и простые рецепты с фото`],
    h1: "Что приготовить на ужин: рецепты с фото",
    description: (n) => `${n} ужинов с фото: быстро из курицы, фарша, рыбы и овощей, в духовке и на сковороде. Простые идеи на каждый день с пошаговыми фото.`,
  },
  bakery: {
    title: (n) => [`Выпечка - ${n} с фото пошагово | ${BRAND}`, `Выпечка - рецепты с фото пошагово`],
    h1: "Выпечка: рецепты с фото пошагово",
    description: (n) => `${n} выпечки с фото: пироги, булочки, печенье, кексы и пирожки. Домашняя выпечка из дрожжевого, слоёного и песочного теста - пошагово.`,
  },
  hd: {
    title: (n) => [`Здоровое питание - ${n} с фото | ${BRAND}`, `Здоровое питание - рецепты с фото`],
    h1: "Здоровое питание: рецепты с фото",
    description: (n) => `${n} здорового питания с фото: лёгкие блюда из овощей, рыбы и птицы, полезные завтраки и ужины. Простые рецепты с пошаговыми фото.`,
  },
};

/** Подборки /collection/{type}: под запросы «что приготовить на завтрак/обед/ужин». */
export function collectionSeo(type: string, fallbackTitle: string, total: number, page: number): PageSeo {
  const cfg = COLLECTION_SEO[type];
  const n = total > 0 ? countRecipes(total) : "рецепты";
  const nCap = `${n.charAt(0).toUpperCase()}${n.slice(1)}`;
  if (!cfg) return sectionSeo({ title: fallbackTitle }, total, page);
  const sfx = pageSuffix(page);
  const variants = cfg.title(n).map((v) => (sfx ? v.replace(` | ${BRAND}`, `${sfx} | ${BRAND}`) : v));
  const withPage = sfx ? variants.map((v) => (v.includes(sfx) ? v : `${v}${sfx}`)) : variants;
  return {
    title: fitTitle(withPage),
    description: `${cfg.description(total > 0 ? nCap : "Рецепты")}${pageSentence(page)}`,
    h1: cfg.h1,
  };
}
