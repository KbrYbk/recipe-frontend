/** Ответы Laravel API (сырой вид) и нормализованные модели фронтенда. */

export type Difficulty = "easy" | "medium" | "hard";

export interface Ingredient {
  name: string;
  amount?: string | number;
  unit?: string;
}

export interface Step {
  order?: number;
  text: string;
  image?: string;
}

export interface User {
  id?: number;
  name: string;
}

/** Категория, как её отдаёт `GET /getCategories` (поле slug может отсутствовать на старом API). */
export interface ApiCategory {
  id: number;
  title: string;
  slug?: string | null;
}

/** Рецепт или карточка рецепта, как их отдаёт API. Все поля, кроме id/title, необязательны. */
export interface ApiRecipe {
  id: number | string;
  title: string;
  slug?: string | null;
  /** Путь страницы рецепта на фронте: `/{категория}/{slug}`. */
  path?: string | null;
  description?: string | null;
  main_image?: string | null;
  cooking_time?: number | string | null;
  difficulty?: string | null;
  category_id?: number | string | null;
  category?: { id?: number; title?: string; slug?: string | null } | string | null;
  ingredients?: unknown;
  steps?: unknown;
  video_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  likes_count?: number | string | null;
  average_rating?: number | string | null;
  ratings_count?: number | null;
  servings?: number | string | null;
  user?: { id?: number; name?: string } | null;
}

/** Laravel LengthAwarePaginator::toArray(). */
export interface ApiPaginator<T> {
  data: T[];
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
}

export interface ApiEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
}

/** Нормализованная категория рецепта. */
export interface RecipeCategoryRef {
  id?: number;
  title: string;
  /** Путь страницы категории на фронте: `/{slugify(title)}`. */
  href: string;
}

/** Карточка рецепта для списков. */
export interface RecipeCard {
  id: number;
  slug: string;
  url: string;
  title: string;
  description: string;
  main_image?: string;
  cooking_time: number;
  difficulty?: Difficulty;
  likes_count: number;
  average_rating: number;
  category?: RecipeCategoryRef;
  author?: string;
  created_at?: string;
}

/** Полный рецепт для страницы рецепта. */
export interface Recipe extends RecipeCard {
  ingredients: Ingredient[];
  steps: Step[];
  video_url?: string;
  updated_at?: string;
  ratings_count?: number;
  servings?: number;
}

export interface RecipeList {
  list: RecipeCard[];
  total: number;
  totalPages: number;
  currentPage: number;
}

/** Результат запроса к API: ok — данные есть; иначе status (0 — сеть/таймаут). */
export type ApiResult<T> = { ok: true; status: number; data: T } | { ok: false; status: number; data?: undefined };
