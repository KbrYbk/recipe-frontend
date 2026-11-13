/**
 * Игры, привязанные к рецептам. Ключ - slug рецепта; у такого рецепта появляется кнопка «Играть»
 * и страница `{путь рецепта}/igra` с игрой во фрейме.
 *
 * Файлы игры лежат в `public/game-files/<имя>/` (готовая сборка отдельного проекта, без SDK площадок).
 * Реклама на странице игры - обычная реклама сайта из Layout, внутри игры рекламы нет.
 */
export interface RecipeGame {
  /** Название игры для заголовков и кнопки. */
  title: string;
  /** Адрес страницы игры во фрейме (index.html сборки). */
  frameSrc: string;
  /** Короткое описание под заголовком страницы. */
  intro: string;
  /** Как управлять - список для блока под игрой. */
  controls: readonly string[];
}

/** Суффикс страницы игры после пути рецепта. */
export const GAME_PAGE_SUFFIX = "igra";

export const RECIPE_GAMES: Readonly<Record<string, RecipeGame>> = {
  "lukovyy-ugar": {
    title: "Луковый Угар",
    frameSrc: "/game-files/lukovyy-ugar/index.html",
    intro: "Аркада с мини-играми по мотивам рецепта: один ужин состоит из 6-8 шагов приготовления и нескольких коротких «сюрпризов». Каждый уровень занимает меньше пяти минут.",
    controls: ["На телефоне: касание, удержание и свайп.", "На компьютере: мышь, а также пробел или Enter и стрелки (или WASD).", "Esc - пауза. Прогресс сохраняется в вашем браузере."],
  },
};

/** Игра рецепта по его slug или null, если у рецепта игры нет. */
export function gameForRecipeSlug(slug: string | null | undefined): RecipeGame | null {
  if (!slug || !Object.prototype.hasOwnProperty.call(RECIPE_GAMES, slug)) return null;
  return RECIPE_GAMES[slug];
}

/** Путь страницы игры по пути рецепта: `/{категория}/{slug}` → `/{категория}/{slug}/igra`. */
export function gamePagePath(recipePath: string): string {
  return `${recipePath.replace(/\/+$/, "")}/${GAME_PAGE_SUFFIX}`;
}
