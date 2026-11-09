/**
 * Баннер о cookie (src/components/shared/CookieConsent.astro): показывается, пока не нажато «Принято!».
 * На загрузку Яндекс Метрики не влияет — она подключается сразу (src/scripts/metrics.ts).
 */
import { readString, writeString } from "../lib/client/storage";
import { COOKIE_ACCEPTED_KEY, isCookieBannerAccepted } from "../lib/cookieBanner";

function init(): void {
  const banner = document.getElementById("cookie-banner");
  if (!banner || isCookieBannerAccepted(readString)) return;

  requestAnimationFrame(() => banner.classList.remove("hidden", "translate-y-10", "opacity-0"));

  banner.querySelector("[data-consent-accept]")?.addEventListener(
    "click",
    () => {
      writeString(COOKIE_ACCEPTED_KEY, "true");
      banner.classList.add("translate-y-10", "opacity-0");
      window.setTimeout(() => banner.remove(), 500);
    },
    { once: true },
  );
}

init();
