/** Ключи localStorage для отметок рецепта (общие для страницы и «Режима готовки») и навигация по шагам. */

export function ingredientKey(recipeId: number, index: number): string {
  return `recipe:ing:${recipeId}:${index}`;
}

export function stepKey(recipeId: number, index: number): string {
  return `recipe:step:${recipeId}:${index}`;
}

export function cookPositionKey(recipeId: number): string {
  return `recipe:cook:${recipeId}`;
}

/** Ограничение индекса шага диапазоном [0, total-1]. */
export function clampStep(index: number, total: number): number {
  if (total <= 0 || !Number.isFinite(index)) return 0;
  return Math.min(Math.max(0, Math.trunc(index)), total - 1);
}

/** Направление свайпа: горизонтальный жест длиннее порога и «горизонтальнее», чем вертикальный. */
export function swipeDirection(dx: number, dy: number, threshold = 50): "next" | "prev" | null {
  if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.5) return null;
  return dx < 0 ? "next" : "prev";
}
