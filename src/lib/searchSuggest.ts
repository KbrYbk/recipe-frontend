/** Подсказки поиска: разбор ответа `GET /getRecipes/suggest/{q}` (массив { value }). */
export const SUGGEST_MIN_CHARS = 2;
export const SUGGEST_DEBOUNCE_MS = 250;
const MAX_SUGGESTIONS = 8;

export function parseSuggestions(body: unknown): string[] {
  const list = Array.isArray(body) ? body : body && typeof body === "object" && Array.isArray((body as { data?: unknown }).data) ? (body as { data: unknown[] }).data : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    const raw = typeof item === "string" ? item : item && typeof item === "object" ? (item as { value?: unknown }).value : null;
    if (typeof raw !== "string") continue;
    const value = raw.trim();
    const key = value.toLocaleLowerCase("ru-RU");
    if (!value || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= MAX_SUGGESTIONS) break;
  }
  return out;
}

/** Нормализованный запрос для подсказок или null, если он слишком короткий. */
export function suggestQuery(input: string): string | null {
  const q = input.trim().replace(/\s+/g, " ").slice(0, 100);
  return q.length >= SUGGEST_MIN_CHARS ? q : null;
}
