/**
 * Безопасная работа с localStorage в браузере (приватный режим/запрет хранилища не роняют страницу)
 * и списки id рецептов (избранное, лайки) с поддержкой старого формата "db-123".
 */
import { normalizeStoredId, normalizeStoredIdList } from "../recipeUrl";

export const FAVORITES_KEY = "swageda_favorites";
export const LIKES_KEY = "liked_recipes";
export const RATINGS_KEY = "my_ratings";

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // хранилище недоступно или переполнено — молча игнорируем
  }
}

export function readString(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeString(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

/** Список id (нормализованный: "db-123" → "123"). */
export function readIdList(key: string): string[] {
  return normalizeStoredIdList(readJson<unknown>(key, []));
}

export function hasId(key: string, id: string | number): boolean {
  const norm = normalizeStoredId(id);
  return norm !== null && readIdList(key).includes(norm);
}

/** Добавить/убрать id. Возвращает новое состояние (true — id в списке). */
export function toggleId(key: string, id: string | number, force?: boolean): boolean {
  const norm = normalizeStoredId(id);
  if (norm === null) return false;
  const list = readIdList(key);
  const present = list.includes(norm);
  const want = force ?? !present;
  const next = want ? (present ? list : [...list, norm]) : list.filter((x) => x !== norm);
  writeJson(key, next);
  return want;
}

/** Оценка пользователя: ключи могли сохраняться как "db-123". */
export function getMyRating(id: string | number): number | null {
  const map = readJson<Record<string, unknown>>(RATINGS_KEY, {});
  const norm = normalizeStoredId(id);
  if (norm === null) return null;
  const v = Number(map[norm] ?? map[`db-${norm}`]);
  return v >= 1 && v <= 5 ? v : null;
}

export function setMyRating(id: string | number, rating: number): void {
  const norm = normalizeStoredId(id);
  if (norm === null) return;
  const map = readJson<Record<string, unknown>>(RATINGS_KEY, {});
  delete map[`db-${norm}`];
  map[norm] = rating;
  writeJson(RATINGS_KEY, map);
}
