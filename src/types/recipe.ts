export interface Recipe {
  id: number;
  title: string;
  description: string;
  image?: string;
  time: number;
  difficulty?: string;
  category: string;
  ingredients: string[];
  videoUrl?: string;
  steps: (string | { text: string; image?: string })[];
}