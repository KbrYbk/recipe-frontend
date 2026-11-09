/**
 * IndexNow: файл-подтверждение `/{ключ}.txt` с содержимым = ключ. Ключ задаётся в рантайме (INDEXNOW_KEY),
 * его же бэкенд использует при отправке URL. Нет ключа или запрошен другой файл — 404.
 */

/** Формат ключа по спецификации IndexNow: 8–128 символов a-z, A-Z, 0-9, «-». */
export const INDEXNOW_KEY_RE = /^[a-zA-Z0-9-]{8,128}$/;

/** Тело ответа для `/{requested}.txt` или null (→ 404). */
export function indexNowKeyFile(requested: string | undefined, configured: string | undefined): string | null {
  const key = (configured ?? "").trim();
  if (!key || !INDEXNOW_KEY_RE.test(key)) return null;
  return requested === key ? key : null;
}
