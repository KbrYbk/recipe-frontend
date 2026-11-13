/** Записи «Кухонного справочника» (`src/data/kitchen/*.json`). */

/** Ключ подраздела = имя файла данных. */
export type KitchenSectionKey = "storage" | "measures" | "cooking" | "substitutions";

/** Падежные формы названия продукта: «варёная курица» / «варёной курицы» / «варёную курицу». */
export interface KitchenForms {
  nom: string;
  gen: string;
  acc: string;
  /** Название во множественном числе («макароны», «сливки»): «Сколько хранятся…» вместо «хранится». */
  plural?: boolean;
}

export interface KitchenFaqItem {
  q: string;
  a: string;
}

/** Поля, общие для всех подразделов. */
export interface KitchenEntryBase {
  /** = kitchenSlug(forms.nom): транслитерация без «ь/ъ»; уникален в пределах файла. */
  slug: string;
  forms: KitchenForms;
  /** Как продукт называется в ингредиентах рецептов (нижний регистр). */
  aliases: string[];
  /** Группа для хаба: «мясо», «крупы», «молочное»… */
  group: string;
  faq: KitchenFaqItem[];
  /** Откуда взяты цифры (документ или справочник). Обязательно. */
  sources: string[];
  /** ISO-дата: Last-Modified и lastmod в sitemap. */
  updatedAt: string;
}

export type StoragePlace = "room" | "fridge" | "freezer";
export type StorageUnit = "h" | "d" | "mo";

export interface StorageCondition {
  where: StoragePlace;
  min: number;
  max: number;
  unit: StorageUnit;
  note?: string;
}

/** Сроки хранения. Сырой и приготовленный продукт — разные записи. */
export interface StorageEntry extends KitchenEntryBase {
  conditions: StorageCondition[];
  spoilSigns: string[];
  tips: string[];
}

export type MeasureKey = "glass250" | "glass200" | "tbsp" | "tbspHeaped" | "tsp" | "tspHeaped" | "piece";

/** Меры веса и объёма: граммы в одной мере. */
export interface MeasureEntry extends KitchenEntryBase {
  grams: Partial<Record<MeasureKey, number>>;
  /** Подпись меры «штука»: «1 среднее яйцо». */
  pieceLabel?: string;
  note?: string;
}

export type CookingMethodKey = "boil" | "steam" | "multicooker" | "pressure" | "oven" | "microwave";

export interface CookingMethod {
  method: CookingMethodKey;
  /** Уточнение: «молодая», «кусочками», «замороженная». */
  variant?: string;
  minMin: number;
  maxMin: number;
  note?: string;
}

/** Время приготовления. */
export interface CookingEntry extends KitchenEntryBase {
  methods: CookingMethod[];
  /** Как понять, что готово. */
  readiness: string;
  tips: string[];
}

export interface Substitute {
  name: string;
  /** Пропорция словами: «1 ч. л. разрыхлителя = ½ ч. л. соды + ½ ч. л. уксуса». */
  ratioText: string;
  /** Сколько заменителя на 1 часть продукта (в тех же единицах). Нет — калькулятор не показывается. */
  factor?: number;
  bestFor: string[];
  notFor: string[];
  note?: string;
}

/** Замены ингредиентов. */
export interface SubstitutionEntry extends KitchenEntryBase {
  /** Зачем продукт в рецепте. */
  role: string;
  subs: Substitute[];
}

export interface KitchenEntryMap {
  storage: StorageEntry;
  measures: MeasureEntry;
  cooking: CookingEntry;
  substitutions: SubstitutionEntry;
}

export type KitchenEntry = KitchenEntryMap[KitchenSectionKey];
