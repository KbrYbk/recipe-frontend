/** title / description / H1 страниц «Кухонного справочника». Чистые функции. */
import { BRAND, DESCRIPTION_MAX, cutByWord, fitTitle, type PageSeo } from "../seo";
import { KITCHEN_NAME } from "./data";

function description(text: string): string {
  return cutByWord(text, DESCRIPTION_MAX);
}

/** Хаб /spravochnik. */
export function kitchenHubSeo(): PageSeo {
  return {
    title: fitTitle([`${KITCHEN_NAME}: сроки хранения, меры, время варки | ${BRAND}`, `${KITCHEN_NAME}: сроки хранения, меры, время варки`]),
    description: description("Справочник для кухни: сколько хранятся продукты, сколько граммов в стакане и ложке, сколько варить и чем заменить ингредиент. Таблицы и калькуляторы."),
    h1: KITCHEN_NAME,
  };
}
