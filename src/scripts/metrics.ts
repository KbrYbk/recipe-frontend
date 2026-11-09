/**
 * Яндекс Метрика: загружается сразу на каждой странице (параметры init — как в исходной версии сайта).
 */
const METRIKA_ID = 108404580;
const TAG_SRC = `https://mc.yandex.ru/metrika/tag.js?id=${METRIKA_ID}`;

type Ym = ((...args: unknown[]) => void) & { a?: unknown[][]; l?: number };

declare global {
  interface Window {
    ym?: Ym;
  }
}

function loadMetrika(): void {
  if (!window.ym) {
    const ym: Ym = function (...args: unknown[]) {
      (ym.a = ym.a || []).push(args);
    };
    ym.l = Date.now();
    window.ym = ym;
  }
  const alreadyLoaded = Array.from(document.scripts).some((s) => s.src === TAG_SRC);
  if (!alreadyLoaded) {
    const script = document.createElement("script");
    script.async = true;
    script.src = TAG_SRC;
    const first = document.getElementsByTagName("script")[0];
    if (first?.parentNode) first.parentNode.insertBefore(script, first);
    else document.head.appendChild(script);
  }
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

loadMetrika();
