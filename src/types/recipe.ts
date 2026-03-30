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
  id: number;
  name: string;
}

export interface Recipe {
  id: number;
  title: string;
  description: string;
  main_image?: string;
  cooking_time: number;
  difficulty?: "easy" | "medium" | "hard" | string;
  category_id?: number | string;
  category?: string;
  ingredients?: Ingredient[];
  steps?: Step[];
  video_url?: string;
  created_at?: string;
  updated_at?: string;
  likes_count?: number;
  average_rating?: number;
  source_url?: string | null;
  user?: User;
}
