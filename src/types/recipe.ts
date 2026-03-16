export interface Recipe {
  id: number;
  title: string;
  image: string;
  description: string;
  time: number;
  difficulty: "Легко" | "Средне" | "Сложно";
  ingredients: string[];
  steps: string[];
}
