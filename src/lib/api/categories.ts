/**
 * Справочник категорий для SSR: один запрос на процесс раз в 10 минут.
 * Параллельные запросы при истечении TTL объединяются (single-flight); если бэкенд недоступен,
 * отдаём последнюю удачную версию (stale) — категории меняются редко.
 */
import { normalizeCategories, type Category } from "../categories";
import { LruCache } from "../lruCache";
import { apiGet } from "./client";

const KEY = "categories";
const cache = new LruCache<Category[]>({ maxEntries: 1, ttlMs: 10 * 60_000 });

async function load(): Promise<Category[]> {
  const res = await apiGet("/getCategories", { cache: false });
  if (!res.ok) throw new Error(`categories: HTTP ${res.status}`);
  const list = normalizeCategories(res.data);
  if (list.length === 0) throw new Error("categories: empty list");
  return list;
}

/** Категории или null, если бэкенд недоступен и в памяти ничего нет. */
export async function getCategories(): Promise<Category[] | null> {
  try {
    return await cache.getOrLoad(KEY, load);
  } catch (error) {
    const stale = cache.peekStale(KEY);
    if (stale) {
      // Продлеваем ненадолго, чтобы не долбить упавший бэкенд на каждый запрос.
      cache.set(KEY, stale, 30_000);
      return stale;
    }
    console.error(`[categories] unavailable: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}
