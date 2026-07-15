// src/scripts/metrics.js

// 1. Инициализация Метрики (твой стандартный код)
(function (m, e, t, r, i, k, a) {
  m[i] =
    m[i] ||
    function () {
      (m[i].a = m[i].a || []).push(arguments);
    };
  m[i].l = 1 * new Date();
  for (var j = 0; j < document.scripts.length; j++) {
    if (document.scripts[j].src === r) {
      return;
    }
  }
  ((k = e.createElement(t)), (a = e.getElementsByTagName(t)[0]), (k.async = 1), (k.src = r), a.parentNode.insertBefore(k, a));
})(window, document, "script", "https://mc.yandex.ru/metrika/tag.js?id=108404580", "ym");

// 2. Первый хит при загрузке
ym(108404580, "init", {
  ssr: true,
  webvisor: true,
  clickmap: true,
  ecommerce: "dataLayer",
  referrer: document.referrer,
  url: location.href,
  accurateTrackBounce: true,
  trackLinks: true,
});

// 3. Отправка хитов при навигации через View Transitions (без перезагрузки страницы)
// document.addEventListener("astro:page-load", () => {
//   ym(108404580, "hit", window.location.href);
// });
