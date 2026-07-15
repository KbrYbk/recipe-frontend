// Yandex Context JS — загружаем один раз, строго один экземпляр
(function () {
  // Защита от повторной загрузки context.js при View Transitions
  if (!window.__yaContextLoaded) {
    var s = document.createElement("script");
    s.src = "https://yandex.ru/ads/system/context.js";
    s.async = true;
    document.head.appendChild(s);
    window.__yaContextLoaded = true;
  }
})();

(function () {
  window.yaContextCb = window.yaContextCb || [];

  var _fullscreenRendered = false;

  function initFullscreenAd() {
    // Fullscreen и floor-рекламу рендерим только ОДИН раз за сессию страницы
    // При View Transition НЕ перезапускаем — они уже в DOM
    if (_fullscreenRendered) return;
    _fullscreenRendered = true;

    window.yaContextCb.push(function () {
      if (window.Ya && window.Ya.Context && window.Ya.Context.AdvManager) {
        try {
          window.Ya.Context.AdvManager.render({
            blockId: "R-A-19056160-20",
            type: "fullscreen",
            platform: "touch",
          });
        } catch (e) {
          console.error("Fullscreen ad error:", e);
        }

        try {
          window.Ya.Context.AdvManager.render({
            blockId: "R-A-19056160-21",
            type: "floorAd",
            platform: "touch",
          });
        } catch (e) {
          console.error("Floor ad error:", e);
        }
      }
    });
  }

  // Ждём, пока context.js инициализируется, но не дольше 5 секунд
  var attempts = 0;
  var maxAttempts = 50;
  var checkInterval = setInterval(function () {
    attempts++;
    if (window.Ya && window.Ya.Context && window.Ya.Context.AdvManager) {
      clearInterval(checkInterval);
      initFullscreenAd();
    } else if (attempts >= maxAttempts) {
      clearInterval(checkInterval);
      // context.js не ответил за 5 сек — всё равно пытаемся
      initFullscreenAd();
    }
  }, 100);
})();
