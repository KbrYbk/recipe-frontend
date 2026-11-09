/**
 * Рантайм-конфигурация сервера (SSR).
 *
 * Значения читаются при каждом обращении из process.env через astro:env (access: "secret"),
 * поэтому НЕ попадают в сборку: одна и та же сборка работает с любым `.env`
 * (на проде — `node --env-file=/var/www/swageda/frontend/shared/.env`).
 * Модуль только для сервера: не импортировать из клиентских <script>.
 */
import { getSecret } from "astro:env/server";

/** Заголовок с ключом проекта. Бэкенд принимает и старое имя заголовка (совместимость). */
export const PROJECT_HEADER = "X-Project-Key";

const DEFAULT_API_BASE = "http://127.0.0.1:8000";

function clean(value: string | undefined): string {
  return String(value ?? "")
    .trim()
    .replace(/\/+$/, "");
}

/** Базовый URL Laravel без завершающего слэша (может уже оканчиваться на /api). */
export function getApiBaseUrl(): string {
  return clean(getSecret("API_BASE_URL")) || DEFAULT_API_BASE;
}

/** Полный префикс API: `${base}/api`. */
export function getApiRoot(): string {
  const base = getApiBaseUrl();
  return base.endsWith("/api") ? base : `${base}/api`;
}

/** Origin, откуда проксируются картинки (`/api-images/*`). По умолчанию — API_BASE_URL. */
export function getImageBaseUrl(): string {
  return clean(getSecret("IMAGE_BASE_URL")) || getApiBaseUrl().replace(/\/api$/, "");
}

let warnedNoKey = false;

/** Секретный ключ проекта для заголовка X-Project-Key. */
export function getProjectKey(): string {
  const key = String(getSecret("PROJECT_KEY") ?? "").trim();
  if (!key && !warnedNoKey) {
    warnedNoKey = true;
    console.error("[config] PROJECT_KEY is not set: backend requests will be rejected");
  }
  return key;
}

/** Ключ IndexNow (необязателен): пусто — файл `/{ключ}.txt` не отдаётся. */
export function getIndexNowKey(): string {
  return String(getSecret("INDEXNOW_KEY") ?? "").trim();
}
