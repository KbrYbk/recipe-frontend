export interface Recipe {
  id: number;
  title: string;
  description: string;
  main_image: string;
  cooking_time: number;
  difficulty: "easy" | "medium" | "hard" | string;
  category: string;
  ingredients: string[];
  videoUrl?: string;
  steps: (string | { text: string; image?: string })[];
}
