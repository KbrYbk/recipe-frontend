/**
 * Согласие на cookie и аналитику. Яндекс Метрика (с Вебвизором) загружается ТОЛЬКО после «Принять».
 * Выбор хранится в localStorage; баннер — src/components/shared/CookieConsent.astro.
 */
import { readString, writeString } from "../lib/client/storage";

export const CONSENT_KEY = "swageda:cookie-consent";
const METRIKA_ID = 108404580;

type Choice = "accepted" | "rejected";

declare global {
  interface Window {
    ym?: ((...args: unknown[]) => void) & { a?: unknown[][]; l?: number };
  }
}

function getChoice(): Choice | null {
  const v = readString(CONSENT_KEY);
  return v === "accepted" || v === "rejected" ? v : null;
}

let metrikaLoaded = false;

function loadMetrika(): void {
  if (metrikaLoaded) return;
  metrikaLoaded = true;
  const src = `https://mc.yandex.ru/metrika/tag.js?id=${METRIKA_ID}`;
  const ym = function (...args: unknown[]) {
    (ym.a = ym.a || []).push(args);
  } as NonNullable<Window["ym"]>;
  ym.l = Date.now();
  window.ym = window.ym || ym;
  const script = document.createElement("script");
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
  window.ym(METRIKA_ID, "init", {
    ssr: true,
    webvisor: true,
    clickmap: true,
    ecommerce: "dataLayer",
    referrer: document.referrer,
    url: location.href,
    accurateTrackBounce: true,
    trackLinks: true,
  });
}

function hideBanner(banner: HTMLElement): void {
  banner.classList.add("translate-y-10", "opacity-0");
  window.setTimeout(() => banner.classList.add("hidden"), 500);
}

function showBanner(banner: HTMLElement): void {
  banner.classList.remove("hidden");
  requestAnimationFrame(() => banner.classList.remove("translate-y-10", "opacity-0"));
}

function init(): void {
  const banner = document.getElementById("cookie-banner");
  const choice = getChoice();
  if (choice === "accepted") loadMetrika();

  if (banner) {
    if (!choice) showBanner(banner);
    banner.querySelector("[data-consent-accept]")?.addEventListener("click", () => {
      writeString(CONSENT_KEY, "accepted");
      loadMetrika();
      hideBanner(banner);
    });
    banner.querySelector("[data-consent-reject]")?.addEventListener("click", () => {
      writeString(CONSENT_KEY, "rejected");
      hideBanner(banner);
    });
  }

  // Ссылка «Настройки cookie» в футере: снова показать баннер.
  document.querySelectorAll("[data-consent-reopen]").forEach((el) =>
    el.addEventListener("click", (e) => {
      e.preventDefault();
      if (banner) showBanner(banner);
    }),
  );
}

init();
