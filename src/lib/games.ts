/**
 * Игры, привязанные к рецептам. Ключ - slug рецепта; у такого рецепта появляется кнопка «Играть»
 * и страница `{путь рецепта}/igra` с игрой во фрейме.
 *
 * Файлы игры лежат в `public/game-files/<имя>/` (готовая сборка отдельного проекта, без SDK площадок).
 * Реклама на странице игры - блоки сайта из Layout в составе adLayout="game" (боковые и нижний), внутри игры рекламы нет.
 */
export interface RecipeGame {
  /** Название игры для заголовков и кнопки. */
  title: string;
  /** Адрес страницы игры во фрейме (index.html сборки). */
  frameSrc: string;
  /** Короткое описание под заголовком страницы. */
  intro: string;
  /** Описание для meta description и соцсетей (не длиннее 160 символов). */
  description: string;
  /** Подробно об игре: абзацы текста под игрой (только то, что в игре есть на самом деле). */
  about: readonly string[];
  /** Жанры для разметки schema.org. */
  genres: readonly string[];
  /** Текст кнопки «Играть» на странице рецепта: заголовок (он же текст ссылки) и подпись. */
  cta: { title: string; subtitle: string };
  /** Как управлять - список для блока под игрой. */
  controls: readonly string[];
  /** Дата последнего обновления игры (YYYY-MM-DD): идёт в lastmod файла sitemap_games.xml. */
  updatedAt: string;
}

/** Суффикс страницы игры после пути рецепта. */
export const GAME_PAGE_SUFFIX = "igra";

export const RECIPE_GAMES: Readonly<Record<string, RecipeGame>> = {
  "lukovyy-ugar": {
    title: "Луковый Угар",
    frameSrc: "/game-files/lukovyy-ugar/index.html",
    intro: "Аркада с мини-играми по мотивам рецепта: один ужин состоит из 6-8 шагов приготовления и нескольких коротких «сюрпризов». Каждый уровень занимает меньше пяти минут.",
    description: "Играйте в «Луковый Угар» онлайн бесплатно: готовьте ужин по рецепту, шинкуйте лук и не плачьте. Мини-игра на каждый шаг, без регистрации.",
    about: [
      "Вы готовите ужин по рецепту «Луковый Угар», и каждый шаг рецепта - отдельная мини-игра: шинкуйте лук и не трогайте картошку, держите мелкий огонь, лейте апельсиновый сок ровно до 300 мл, считайте ложки специй.",
      "Точные действия растят шкалу «Угар» и умножают очки, а промахи копят «Слёзы». Если слёзы зальют всё до края, ужин сорван. Между шагами случаются сюрпризы: кот, сосед, муха и мама.",
      "После первого ужина рецепты меняются: «Жареное мясо» и «Свиная башка» готовятся по-своему. За очки вы получаете звания, от «Лукового стажёра» до «Шефа угара». Игра на русском и английском языках.",
    ],
    genres: ["Аркада", "Казуальная игра"],
    cta: { title: "Попробуй не заплакать: играть в «Луковый Угар»", subtitle: "Режь лук, спасай ужин и не дай гостям уйти. Бесплатно, прямо здесь" },
    controls: ["На телефоне: касание, удержание и свайп.", "На компьютере: мышь, а также пробел или Enter и стрелки (или WASD).", "Esc - пауза. Прогресс сохраняется в вашем браузере."],
    updatedAt: "2026-11-13",
  },
};

/** Игра рецепта по его slug или null, если у рецепта игры нет. */
export function gameForRecipeSlug(slug: string | null | undefined): RecipeGame | null {
  if (!slug || !Object.prototype.hasOwnProperty.call(RECIPE_GAMES, slug)) return null;
  return RECIPE_GAMES[slug];
}

/** Страницы игр для sitemap: по одной на игру, адрес берётся из пути рецепта (категория приходит из API). */
export function gameSitemapEntries(recipes: ReadonlyArray<{ slug: string; url: string }>): Array<{ path: string; lastmod: string }> {
  const out: Array<{ path: string; lastmod: string }> = [];
  for (const recipe of recipes) {
    const game = gameForRecipeSlug(recipe.slug);
    if (game) out.push({ path: gamePagePath(recipe.url), lastmod: game.updatedAt });
  }
  return out;
}

/** Путь страницы игры по пути рецепта: `/{категория}/{slug}` → `/{категория}/{slug}/igra`. */
export function gamePagePath(recipePath: string): string {
  return `${recipePath.replace(/\/+$/, "")}/${GAME_PAGE_SUFFIX}`;
}

/** Разметка schema.org VideoGame для страницы игры. */
export function buildGameJsonLd(game: RecipeGame, opts: { origin: string; path: string; recipePath: string; recipeTitle: string; image?: string }): Record<string, unknown> {
  const base = opts.origin.replace(/\/+$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: game.title,
    description: game.description,
    url: `${base}${opts.path}`,
    genre: game.genres,
    gamePlatform: "Web browser",
    applicationCategory: "Game",
    operatingSystem: "Any",
    playMode: "SinglePlayer",
    inLanguage: ["ru", "en"],
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "RUB", availability: "https://schema.org/InStock" },
    isBasedOn: { "@type": "CreativeWork", name: opts.recipeTitle, url: `${base}${opts.recipePath}` },
    publisher: { "@type": "Organization", name: "SwagEda", url: base },
    ...(opts.image ? { image: opts.image } : {}),
  };
}
