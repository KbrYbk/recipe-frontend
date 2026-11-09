/** Страница рецепта: восстановление позиции прокрутки и печать (с подгрузкой lazy-картинок). */

function initScrollRestore(): void {
  const article = document.querySelector<HTMLElement>("article[data-recipe-id]");
  const rid = article?.dataset.recipeId;
  if (!rid) return;
  const PREFIX = "recipe:scroll:";
  const key = PREFIX + rid;

  try {
    const saved = sessionStorage.getItem(key);
    if (!location.hash && saved) {
      window.setTimeout(() => {
        const dh = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        if (dh > 0) window.scrollTo(0, Math.round(parseFloat(saved) * dh));
      }, 300);
    }
    const keys = Object.keys(sessionStorage).filter((k) => k.startsWith(PREFIX));
    if (keys.length > 10)
      keys
        .sort()
        .slice(0, keys.length - 10)
        .forEach((k) => sessionStorage.removeItem(k));
  } catch {
    return;
  }

  let ticking = false;
  const save = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const dh = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      try {
        if (dh > 0) sessionStorage.setItem(key, String(Math.min(window.scrollY / dh, 1)));
      } catch {
        // ignore
      }
      ticking = false;
    });
  };
  window.addEventListener("scroll", save, { passive: true });
  window.addEventListener("pagehide", save);
}

// При печати браузер не подгружает lazy-картинки, до которых не доскроллили.
function wakeLazyImages(): void {
  document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach((img) => {
    img.loading = "eager";
  });
}

function printRecipe(): void {
  wakeLazyImages();
  const pending = Array.from(document.images).filter((img) => !img.complete);
  let printed = false;
  const finish = () => {
    if (printed) return;
    printed = true;
    window.print();
  };
  if (pending.length === 0) return finish();
  let remaining = pending.length;
  pending.forEach((img) => {
    const done = () => {
      remaining -= 1;
      if (remaining <= 0) finish();
    };
    img.addEventListener("load", done, { once: true });
    img.addEventListener("error", done, { once: true });
  });
  window.setTimeout(finish, 2000);
}

initScrollRestore();
window.addEventListener("beforeprint", wakeLazyImages);
document.getElementById("printRecipeBtn")?.addEventListener("click", (e) => {
  e.preventDefault();
  printRecipe();
});
