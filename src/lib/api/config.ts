// Заголовок для авторизации запросов на бэкенде
export const PROJECT_HEADER = "X-Project-Key-ass";

// Дефолтный бэкенд, если переменная окружения не задана
const DEFAULT_URL = "";

/** 
 * Список заголовков (hop-by-hop), которые браузер отправляет нашему Astro-серверу, 
 * но которые НЕЛЬЗЯ передавать дальше на бэкенд, чтобы не сломать TCP-соединение.
 */
export const EXCLUDED_HEADERS = [
  'connection',
  'upgrade',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'host', // Host мы будем задавать вручную
  'cookie',
];

/** 
 * Получаем единственный базовый URL бэкенда.
 * Убираем слэш на конце (replace), чтобы не было двойных слэшей при склейке путей.
 */
export function getBackendBaseUrl(): string {
  const envUrl = import.meta.env.API_BASE_URL || DEFAULT_URL;
  return String(envUrl).replace(/\/$/, "").trim();
}