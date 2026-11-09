/** Категории: нормализация и поиск по URL-сегменту. Чистые функции. */
import type { ApiCategory, ApiSeoFields } from "../types/recipe";
import { formatCount, pluralRecipes } from "./catalog";
import { slugify } from "./slugify";

/** SEO-контент раздела (категории или лендинга) из API. Нет поля — работает шаблон (src/lib/seo.ts). */
export interface SectionContent {
  seoTitle?: string;
  seoDescription?: string;
  h1?: string;
  /** Вводный текст: абзацы. */
  intro?: string[];
  faq?: FaqItem[];
  /** Рецепты, которые показываются первыми на 1-й странице. */
  featuredRecipeIds?: number[];
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface Category extends SectionContent {
  id: number;
  title: string;
  /** Канонический сегмент URL: slugify(title). Эти адреса уже проиндексированы — не менять. */
  path: string;
  /** slug из БД (может отличаться от path), используется только для резолва. */
  dbSlug?: string;
}

const MAX_FEATURED = 12;

function optText(v: unknown, max = 5000): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim().replace(/[ \t]+/g, " ");
  return t ? t.slice(0, max) : undefined;
}

/** Разбор SEO-полей раздела. Мусорные значения отбрасываются, без исключений. */
export function parseSectionContent(raw: ApiSeoFields | null | undefined): SectionContent {
  if (!raw || typeof raw !== "object") return {};
  const out: SectionContent = {};
  const seoTitle = optText(raw.seo_title, 120);
  const seoDescription = optText(raw.seo_description, 300);
  const h1 = optText(raw.h1, 200);
  if (seoTitle) out.seoTitle = seoTitle;
  if (seoDescription) out.seoDescription = seoDescription;
  if (h1) out.h1 = h1;

  if (typeof raw.intro === "string") {
    const paragraphs = raw.intro
      .replace(/\r\n?/g, "\n")
      .split(/\n\s*\n/)
      .map((p) => p.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    if (paragraphs.length) out.intro = paragraphs;
  }

  if (Array.isArray(raw.faq)) {
    const faq = raw.faq.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const q = optText(item.q, 300);
      const a = optText(item.a, 2000);
      return q && a ? [{ q, a }] : [];
    });
    if (faq.length) out.faq = faq;
  }

  if (Array.isArray(raw.featured_recipe_ids)) {
    const ids = raw.featured_recipe_ids.map((v) => Number(v)).filter((n) => Number.isSafeInteger(n) && n > 0);
    const unique = [...new Set(ids)].slice(0, MAX_FEATURED);
    if (unique.length) out.featuredRecipeIds = unique;
  }
  return out;
}

export function normalizeCategories(raw: unknown): Category[] {
  const list = Array.isArray(raw) ? raw : raw && typeof raw === "object" && Array.isArray((raw as { data?: unknown }).data) ? (raw as { data: unknown[] }).data : [];
  const out: Category[] = [];
  for (const item of list as ApiCategory[]) {
    const id = Number(item?.id);
    const title = String(item?.title ?? "").trim();
    if (!Number.isSafeInteger(id) || id <= 0 || !title) continue;
    const dbSlug = typeof item.slug === "string" && item.slug.trim() ? item.slug.trim() : undefined;
    out.push({ id, title, path: slugify(title), ...(dbSlug ? { dbSlug } : {}), ...parseSectionContent(item) });
  }
  return out;
}

export interface ResolvedCategory {
  category: Category;
  /** true — адрес не канонический (найдено по slug из БД), нужен 301 на `/${category.path}`. */
  redirect: boolean;
}

/** Найти категорию по сегменту URL: сначала slugify(title), затем slug из БД. */
export function resolveCategory(segment: string, categories: Category[]): ResolvedCategory | null {
  const s = decodeSegment(segment).toLowerCase();
  if (!s) return null;
  const byPath = categories.find((c) => c.path === s);
  if (byPath) return { category: byPath, redirect: false };
  const byDbSlug = categories.find((c) => c.dbSlug?.toLowerCase() === s);
  if (byDbSlug) return { category: byDbSlug, redirect: true };
  return null;
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment).trim();
  } catch {
    return segment.trim();
  }
}

/** Описание страницы категории для meta description: название + число рецептов. */
export function categoryDescription(title: string, total: number): string {
  const lower = title.toLocaleLowerCase("ru-RU");
  const count = total > 0 ? `${formatCount(total)} ${pluralRecipes(total)}` : "Рецепты";
  return `${title}: ${count} с пошаговыми инструкциями и фото на SwagEda. Подберите ${lower} по времени, сложности и рейтингу.`;
}
