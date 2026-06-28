import { setRating } from "../lib/api/recipes";

/* === Lightbox === */
function setupLightbox() {
  let o = document.getElementById("image-lightbox") as HTMLDivElement | null;
  if (!o) {
    o = document.createElement("div");
    o.id = "image-lightbox";
    o.className = "image-lightbox";
    o.innerHTML =
      '<button type="button" class="image-lightbox__close" aria-label="Закрыть"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button><img class="image-lightbox__img" alt="" draggable="false"/><span class="image-lightbox__hint">Свайп вниз чтобы закрыть</span>';
    document.body.appendChild(o);

    var close = function () {
      o!.classList.remove("is-open");
      var img = o!.querySelector(".image-lightbox__img") as HTMLImageElement | null;
      if (img) {
        img.style.transform = "scale(1)";
        img.style.transformOrigin = "center center";
      }
    };

    var btn = o.querySelector(".image-lightbox__close");
    o.addEventListener("click", function (e) {
      if (e.target === o) close();
    });
    if (btn) btn.addEventListener("click", close);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });

    /* Swipe down to close (mobile) */
    var touchStartY = 0;
    var touchMoved = false;
    o.addEventListener(
      "touchstart",
      function (e) {
        touchStartY = e.touches[0].clientY;
        touchMoved = false;
      },
      { passive: true }
    );
    o.addEventListener(
      "touchmove",
      function (e) {
        var dy = e.touches[0].clientY - touchStartY;
        if (dy > 40) {
          touchMoved = true;
        }
      },
      { passive: true }
    );
    o.addEventListener(
      "touchend",
      function (e) {
        var dy = e.changedTouches[0].clientY - touchStartY;
        if (dy > 80 && touchMoved) {
          close();
        }
      },
      { passive: true }
    );
  }

  var li = o.querySelector(".image-lightbox__img") as HTMLImageElement | null;
  var z = document.querySelectorAll<HTMLImageElement>("img[data-zoomable]");
  z.forEach(function (n) {
    if (n.dataset.lightboxBound === "1") return;
    n.dataset.lightboxBound = "1";
    n.addEventListener("click", function () {
      if (!li) return;
      li.src = n.currentSrc || n.src;
      li.alt = n.alt || "Увеличенное изображение";
      li.style.transform = "scale(1)";
      li.style.transformOrigin = "center center";
      o!.classList.add("is-open");
    });
  });
}

/* === Share button === */
function setupShare() {
  var b = document.getElementById("shareBtn");
  if (!b || b.dataset.bound === "1") return;
  b.dataset.bound = "1";
  b.addEventListener("click", function () {
    if (navigator.share) {
      navigator.share({ title: document.title, url: window.location.href }).catch(function () {});
    } else {
      navigator.clipboard
        .writeText(window.location.href)
        .then(function () {
          alert("Ссылка скопирована!");
        })
        .catch(function () {});
    }
  });
}

/* === Reading progress bar === */
function setupReadingProgress() {
  var bar = document.getElementById("reading-progress") as HTMLDivElement | null;
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "reading-progress";
    bar.className = "reading-progress";
    bar.setAttribute("role", "progressbar");
    bar.setAttribute("aria-label", "Прогресс чтения страницы");
    bar.setAttribute("aria-valuenow", "0");
    bar.setAttribute("aria-valuemin", "0");
    bar.setAttribute("aria-valuemax", "100");
    bar.style.cssText =
      "position:fixed;top:0;left:0;z-index:1001;height:3px;width:100%;background:#ff6900;opacity:0;transform-origin:left;transform:scaleX(0);pointer-events:none;transition:transform .1s linear,opacity .2s ease;";
    document.body.appendChild(bar);
  }
  var ticking = false;
  function update() {
    var st = window.scrollY || document.documentElement.scrollTop;
    var dh = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    var p = dh > 0 ? Math.min((st / dh) * 100, 100) : 0;
    bar!.style.transform = "scaleX(" + p / 100 + ")";
    bar!.setAttribute("aria-valuenow", String(Math.round(p)));
    bar!.style.opacity = dh > 50 && st > 50 ? "1" : "0";
    ticking = false;
  }
  window.addEventListener(
    "scroll",
    function () {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    },
    { passive: true }
  );
  window.addEventListener("resize", update, { passive: true });
  window.addEventListener("load", update);
  setTimeout(update, 500);
  update();
}

/* === Scroll position persistence === */
function setupScrollPersistence() {
  var ae = document.querySelector("article[data-recipe-id]");
  var rid = ae ? ae.getAttribute("data-recipe-id") : "";
  var key = "recipe:scroll:" + rid;
  if (!window.location.hash) {
    var sp = sessionStorage.getItem(key);
    if (sp) {
      var restore = function () {
        var dh = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        if (dh > 0) window.scrollTo(0, Math.round(parseFloat(sp!) * dh));
      };
      requestAnimationFrame(restore);
      setTimeout(restore, 300);
      setTimeout(restore, 1000);
    }
  }
  var saving = false;
  var saveScroll = function () {
    var dh = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    if (dh > 0) sessionStorage.setItem(key, String(Math.min(window.scrollY / dh, 1)));
    saving = false;
  };
  window.addEventListener(
    "scroll",
    function () {
      if (!saving) {
        requestAnimationFrame(saveScroll);
        saving = true;
      }
    },
    { passive: true }
  );
  window.addEventListener("beforeunload", saveScroll);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") saveScroll();
  });
}

/* === Favorites + Rating === */
function setupInteractions() {
  const favBtn = document.getElementById("favoriteBtn") as HTMLButtonElement | null;
  const ratingContainer = document.getElementById("ratingStars");
  const recipeId = (favBtn || ratingContainer)?.dataset?.id;
  if (!recipeId) return;

  // === FAVORITES ===
  if (favBtn) {
    const favorites = JSON.parse(localStorage.getItem("swageda_favorites") || "[]");
    const isFav = favorites.includes(recipeId);

    const applyFavState = (active: boolean) => {
      const icon = favBtn.querySelector(".bookmark-icon") as SVGElement | null;
      const label = favBtn.querySelector(".button-label") as HTMLElement | null;
      if (active) {
        favBtn.classList.add("text-brand", "border-brand");
        favBtn.setAttribute("aria-pressed", "true");
        if (icon) icon.classList.add("fill-current");
        if (label) label.textContent = "В избранном";
      } else {
        favBtn.classList.remove("text-brand", "border-brand");
        favBtn.setAttribute("aria-pressed", "false");
        if (icon) icon.classList.remove("fill-current");
        if (label) label.textContent = "Избранное";
      }
    };

    applyFavState(isFav);

    favBtn.addEventListener("click", () => {
      const currentFavs = JSON.parse(localStorage.getItem("swageda_favorites") || "[]");
      const index = currentFavs.indexOf(recipeId);
      if (index > -1) {
        currentFavs.splice(index, 1);
        applyFavState(false);
      } else {
        currentFavs.push(recipeId);
        applyFavState(true);
      }
      localStorage.setItem("swageda_favorites", JSON.stringify(currentFavs));
    });
  }

  // === RATING ===
  if (ratingContainer) {
    const myRatings = JSON.parse(localStorage.getItem("my_ratings") || "{}");
    const userRating = (myRatings as Record<string, number>)[recipeId];
    const stars = ratingContainer.querySelectorAll(".star-btn") as NodeListOf<HTMLButtonElement>;
    const avgValSpan = ratingContainer.querySelector(".avg-val");
    const avgNum = parseFloat(ratingContainer.dataset.avg || "0");
    let isProcessing = false;

    const renderStars = (val: number, isHover = false) => {
      stars.forEach((s) => {
        const starNum = parseInt(s.dataset.star || "0");
        const filled = starNum <= val;
        const svg = s.querySelector("svg");
        if (svg) svg.classList.toggle("fill-current", filled);
        s.setAttribute("aria-pressed", String(filled && !isHover));
        if (isHover) s.classList.toggle("scale-110", filled);
      });
    };

    const showUserRating = (val: number) => {
      const userValEl = ratingContainer.querySelector(".user-val") as HTMLElement | null;
      const valSpan = userValEl?.querySelector(".val");
      if (userValEl && valSpan) {
        userValEl.classList.remove("hidden");
        valSpan.textContent = String(val);
      }
    };

    if (userRating) {
      renderStars(Math.round(avgNum));
      showUserRating(userRating);
      stars.forEach((s) => {
        s.disabled = true;
        s.classList.add("cursor-default");
        s.classList.remove("hover:scale-110", "active:scale-90");
      });
      ratingContainer.classList.add("opacity-90");
    } else {
      renderStars(Math.round(avgNum));

      stars.forEach((btn) => {
        btn.addEventListener("mouseenter", () => {
          if (isProcessing) return;
          const val = parseInt(btn.dataset.star || "0");
          renderStars(val, true);
        });
      });

      ratingContainer.addEventListener("mouseleave", () => {
        if (isProcessing) return;
        renderStars(Math.round(avgNum));
      });
    }

    stars.forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (isProcessing) return;
        if (localStorage.getItem(`rated_${recipeId}`) || (myRatings as Record<string, number>)[recipeId]) return;

        const rating = parseInt(btn.dataset.star || "0");
        isProcessing = true;

        stars.forEach((s) => {
          s.disabled = true;
        });

        try {
          const ip = await fetch("https://api64.ipify.org?format=json")
            .then((r) => r.json())
            .then((d) => d.ip)
            .catch(() => "0.0.0.0");

          const res = await setRating(recipeId, rating, ip).catch(() => null);

          if (res?.ok) {
            const result = await res.json().catch(() => ({}));
            const newAvg = (result?.data?.average_rating || result?.average_rating) as number | undefined;

            (myRatings as Record<string, number>)[recipeId] = rating;
            localStorage.setItem("my_ratings", JSON.stringify(myRatings));
            localStorage.setItem(`rated_${recipeId}`, "true");

            const displayAvg = newAvg ? Math.round(Number(newAvg)) : rating;
            renderStars(displayAvg);
            showUserRating(rating);

            ratingContainer.classList.add("ring-2", "ring-amber-500", "ring-offset-2");
            setTimeout(() => ratingContainer.classList.remove("ring-2", "ring-amber-500", "ring-offset-2"), 2000);

            if (avgValSpan) {
              avgValSpan.textContent = newAvg ? Number(newAvg).toFixed(1) : String(rating);
            }
          } else {
            const status = res?.status;
            if (status === 403) {
              alert("Вы уже оценивали этот рецепт");
              (myRatings as Record<string, number>)[recipeId] = rating;
              localStorage.setItem("my_ratings", JSON.stringify(myRatings));
              localStorage.setItem(`rated_${recipeId}`, "true");
            } else {
              alert("Произошла ошибка при сохранении оценки. Попробуйте позже.");
              stars.forEach((s) => {
                s.disabled = false;
              });
              isProcessing = false;
            }
          }
        } catch (err) {
          console.error(err);
          stars.forEach((s) => {
            s.disabled = false;
          });
          isProcessing = false;
        }
      });
    });
  }
}

/* === Init === */
function init() {
  setupLightbox();
  setupShare();
  setupReadingProgress();
  setupScrollPersistence();
  setupInteractions();
}

init();
document.addEventListener("astro:page-load", init);
