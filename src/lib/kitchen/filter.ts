/** Фильтр списка продуктов на хабе подраздела. Чистые функции — общие для сервера и клиентского скрипта. */

/** Ключ сравнения: нижний регистр, ё → е, одиночные пробелы. */
export function filterKey(value: string): string {
  return value.toLocaleLowerCase("ru-RU").replace(/ё/g, "е").replace(/\s+/g, " ").trim();
}

/** true — название подходит под запрос: каждое слово запроса — начало какого-то слова названия. Пустой запрос подходит всем. */
export function matchesFilter(itemKey: string, query: string): boolean {
  const words = filterKey(query).split(" ").filter(Boolean);
  if (words.length === 0) return true;
  const nameWords = itemKey.split(/[\s-]+/);
  return words.every((w) => nameWords.some((n) => n.startsWith(w)));
}
