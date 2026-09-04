// Yandex Context JS — загружаем один раз, строго один экземпляр
(function () {
  var s = document.createElement("script");
  s.src = "https://yandex.ru/ads/system/context.js";
  s.async = true;
  document.head.appendChild(s);
})();

window.initAdSlot = function (containerId, id, isFeed, refreshInterval) {
  // Защита от повторного рендера этого же экземпляра
  var _rendered = false;
  var _adRefreshTriggered = false;

  function renderAd() {
    var container = document.getElementById(containerId);
    if (!container) return;

    // Если контейнер уже содержит рекламу или процесс рендеринга
    if (container.children.length > 0 || container.dataset.rendering === "true") return;

    // Уже успешно отрендили — не повторяем
    if (_rendered && !_adRefreshTriggered) return;

    container.dataset.rendering = "true";

    window.yaContextCb = window.yaContextCb || [];
    window.yaContextCb.push(function () {
      try {
        var isFeedBlock = isFeed === true || isFeed === "true";
        if (isFeedBlock && typeof window.Ya.Context.AdvManager.renderFeed === "function") {
          window.Ya.Context.AdvManager.renderFeed({ blockId: id, renderTo: containerId });
        } else {
          window.Ya.Context.AdvManager.render({ blockId: id, renderTo: containerId, async: true });
        }
        _rendered = true;
        _adRefreshTriggered = false;
      } catch (e) {
        console.error("Yandex Ad Render Error [" + id + "]:", e);
        container.dataset.rendering = "false";
        _rendered = false;
      }
    });
  }

  function startAdRefresh() {
    if (refreshInterval && refreshInterval > 0) {
      setInterval(function () {
        var container = document.getElementById(containerId);
        if (_rendered && container && container.children.length > 0) {
          _adRefreshTriggered = true;
          container.innerHTML = "";
          container.dataset.rendering = "false";
          _rendered = false;
          renderAd();
        }
      }, refreshInterval * 1000);
    }
  }

  var fallbackTimer = setTimeout(function () {
    var container = document.getElementById(containerId);
    if (container && container.children.length === 0 && container.dataset.rendering !== "true") {
      renderAd();
    }
  }, 3000);

  // IntersectionObserver для ленивой загрузки
  var observer = null;
  try {
    observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            clearTimeout(fallbackTimer);
            renderAd();
            if (refreshInterval && refreshInterval > 0) {
              startAdRefresh();
            }
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: "200px",
      },
    );
  } catch (e) {
    // Fallback для старых браузеров — рендерим сразу
    clearTimeout(fallbackTimer);
    renderAd();
    if (refreshInterval && refreshInterval > 0) {
      startAdRefresh();
    }
  }

  if (observer) {
    var el = document.getElementById(containerId);
    if (el) {
      observer.observe(el);
    }
  }
};

// Запускаем инициализацию, когда DOM готов
(function () {
  function run() {
    document.querySelectorAll("[data-ad-slot]").forEach(function (el) {
      window.initAdSlot(el.id, el.dataset.adSlot, el.dataset.adFeed, parseInt(el.dataset.adRefresh || "0", 10));
    });
  }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", run) : run();
})();

// Fullscreen и FloorAd
(function () {
  var configEl = document.getElementById("ya-global-ads");
  if (!configEl) return;

  var fullscreenId = configEl.dataset.fullscreen;
  var floorId = configEl.dataset.floor;

  window.yaContextCb = window.yaContextCb || [];
  window.yaContextCb.push(function () {
    if (fullscreenId) {
      try {
        window.Ya.Context.AdvManager.render({ blockId: fullscreenId, type: "fullscreen", platform: "touch" });
      } catch (e) {}
    }
    if (floorId) {
      try {
        window.Ya.Context.AdvManager.render({ blockId: floorId, type: "floorAd", platform: "touch" });
      } catch (e) {}
    }
  });
})();
