/** Категории: нормализация и поиск по URL-сегменту. Чистые функции. */
import type { ApiCategory } from "../types/recipe";
import { formatCount, pluralRecipes } from "./catalog";
import { slugify } from "./slugify";

export interface Category {
  id: number;
  title: string;
  /** Канонический сегмент URL: slugify(title). Эти адреса уже проиндексированы — не менять. */
  path: string;
  /** slug из БД (может отличаться от path), используется только для резолва. */
  dbSlug?: string;
}

export function normalizeCategories(raw: unknown): Category[] {
  const list = Array.isArray(raw) ? raw : raw && typeof raw === "object" && Array.isArray((raw as { data?: unknown }).data) ? (raw as { data: unknown[] }).data : [];
  const out: Category[] = [];
  for (const item of list as ApiCategory[]) {
    const id = Number(item?.id);
    const title = String(item?.title ?? "").trim();
    if (!Number.isSafeInteger(id) || id <= 0 || !title) continue;
    const dbSlug = typeof item.slug === "string" && item.slug.trim() ? item.slug.trim() : undefined;
    out.push({ id, title, path: slugify(title), ...(dbSlug ? { dbSlug } : {}) });
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
