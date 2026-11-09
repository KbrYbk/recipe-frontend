/**
 * Баннер о cookie: показывать, пока посетитель не нажал «Принято!».
 * Поддерживаются ключи прежних версий сайта.
 */
export const COOKIE_ACCEPTED_KEY = "swageda:cookie-accepted";
/** Ключ промежуточной версии ("accepted" | "rejected"). */
export const LEGACY_CONSENT_KEY = "swageda:cookie-consent";

export function isCookieBannerAccepted(read: (key: string) => string | null): boolean {
  return read(COOKIE_ACCEPTED_KEY) === "true" || read(LEGACY_CONSENT_KEY) === "accepted";
}
