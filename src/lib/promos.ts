/** Партнёрские промо-карточки (маркированная реклама с erid). */

export interface MarketPromo {
  url: string;
  title: string;
  description: string;
  image?: string;
  icon?: string;
  buttonText?: string;
  erid?: string;
}

export const AEROGRIL_PROMO: MarketPromo = {
  url: "https://market.yandex.ru/cc/BC9i2H?erid=5jtCeReNx12oak2pVMEWZBW",
  title: "Ищете идеальный аэрогриль?",
  description: "Собрали для вас лучшие модели на Яндекс Маркете по отличным ценам. Начните готовить эти рецепты уже завтра!",
  image: "/images/promo/aerogril.webp",
  icon: "lucide:shopping-bag",
  buttonText: "Выбрать на Яндекс Маркете",
  erid: "5jtCeReNx12oak2pVMEWZBW",
};

/** Промо для страницы категории (по каноническому пути категории). */
export const CATEGORY_PROMOS: Record<string, MarketPromo> = {
  aerogril: { ...AEROGRIL_PROMO, buttonText: "Смотреть на Маркете" },
};

/** Рецепт «про аэрогриль»: по категории, названию или описанию. */
export function isAerogrilRecipe(r: { title: string; description: string; category?: { title: string; href: string } }): boolean {
  const hay = `${r.category?.title ?? ""} ${r.title} ${r.description}`.toLocaleLowerCase("ru-RU");
  return r.category?.href === "/aerogril" || hay.includes("аэрогриль");
}
