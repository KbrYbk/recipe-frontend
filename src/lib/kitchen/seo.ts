/** title / description / H1 страниц «Кухонного справочника». Чистые функции. */
import { BRAND, DESCRIPTION_MAX, cutByWord, fitTitle, type PageSeo } from "../seo";
import type { KitchenSectionKey } from "../../types/kitchen";
import { KITCHEN_NAME } from "./data";

/** «Мука пшеничная» из «мука пшеничная». */
export function capitalize(text: string): string {
  const t = text.trim();
  return t ? t.charAt(0).toLocaleUpperCase("ru-RU") + t.slice(1) : t;
}

/** «1 продукт», «3 продукта», «150 продуктов». */
export function countProducts(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  const word = mod10 === 1 && mod100 !== 11 ? "продукт" : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? "продукта" : "продуктов";
  return `${n} ${word}`;
}

/** Description: не длиннее 160 символов, обрезка по слову. */
export function fitDescription(text: string): string {
  return cutByWord(text, DESCRIPTION_MAX);
}

/** Title страницы продукта: с брендом, если помещается в 65 символов, иначе без него. */
export function entryTitle(heading: string, tail = ""): string {
  const h = capitalize(heading);
  return fitTitle([...(tail ? [`${h} — ${tail} | ${BRAND}`, `${h} — ${tail}`] : []), `${h} | ${BRAND}`, h]);
}

/** Хаб /spravochnik. */
export function kitchenHubSeo(): PageSeo {
  return {
    title: fitTitle([`${KITCHEN_NAME}: сроки хранения, меры, время варки | ${BRAND}`, `${KITCHEN_NAME}: сроки хранения, меры, время варки`]),
    description: fitDescription("Справочник для кухни: сколько хранятся продукты, сколько граммов в стакане и ложке, сколько варить и чем заменить ингредиент. Таблицы и калькуляторы."),
    h1: KITCHEN_NAME,
  };
}

export interface KitchenSectionSeo extends PageSeo {
  /** Вводный абзац хаба подраздела. */
  intro: string;
}

const SECTION_SEO: Record<KitchenSectionKey, (count: string) => { titles: string[]; description: string; h1: string; intro: string }> = {
  storage: (n) => ({
    titles: [`Сроки хранения продуктов: таблицы на ${n} | ${BRAND}`, "Сроки хранения продуктов в холодильнике и морозилке"],
    description: `Сколько хранятся продукты и готовые блюда в холодильнике, морозилке и на столе: ${n} с таблицами сроков, признаками порчи и калькулятором «съесть до».`,
    h1: "Сроки хранения продуктов и готовых блюд",
    intro:
      "Здесь собраны сроки хранения сырых продуктов и готовых блюд: в холодильнике, в морозилке и на столе. Для каждого продукта указан безопасный срок, признаки того, что есть его уже нельзя, и калькулятор, который по дате приготовления считает, до какого числа блюдо нужно съесть.",
  }),
  measures: (n) => ({
    titles: [`Сколько грамм в стакане и ложке: таблицы на ${n} | ${BRAND}`, "Сколько грамм в стакане и ложке: таблицы мер продуктов"],
    description: `Сколько граммов муки, сахара, круп и других продуктов в стакане, столовой и чайной ложке: ${n} с таблицами мер и калькулятором.`,
    h1: "Сколько грамм в стакане и ложке",
    intro:
      "Весов под рукой нет, а в рецепте — граммы? В этом разделе указано, сколько весит стакан, столовая и чайная ложка каждого продукта. Калькулятор на странице продукта пересчитывает стаканы и ложки в граммы и обратно.",
  }),
  cooking: (n) => ({
    titles: [`Сколько варить: таблицы времени варки на ${n} | ${BRAND}`, "Сколько варить: таблицы времени варки продуктов"],
    description: `Сколько минут варить овощи, крупы, мясо, яйца и морепродукты в кастрюле, на пару и в мультиварке: ${n} с таблицами времени и таймером.`,
    h1: "Сколько варить: время варки продуктов",
    intro:
      "Время варки зависит от продукта, размера кусков и способа: в кастрюле, на пару, в мультиварке или скороварке. На странице каждого продукта — таблица времени, признаки готовности и таймер, который можно запустить прямо с телефона.",
  }),
  substitutions: (n) => ({
    titles: [`Чем заменить продукт в рецепте: таблицы замен | ${BRAND}`, "Чем заменить продукт в рецепте: таблицы замен"],
    description: `Чем заменить разрыхлитель, яйца, сливки, сметану и другие ингредиенты: ${n} с пропорциями замены и калькулятором количества.`,
    h1: "Чем заменить продукт в рецепте",
    intro:
      "Нужного ингредиента не оказалось дома — не повод откладывать готовку. Для каждого продукта подобраны замены с пропорциями и пометками: в каких блюдах замена сработает, а где изменит вкус или текстуру.",
  }),
};

/** Хаб подраздела. count — число продуктов в подразделе. */
export function kitchenSectionSeo(key: KitchenSectionKey, count: number): KitchenSectionSeo {
  const cfg = SECTION_SEO[key](countProducts(count));
  return { title: fitTitle(cfg.titles), description: fitDescription(cfg.description), h1: cfg.h1, intro: cfg.intro };
}
