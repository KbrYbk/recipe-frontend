/**
 * Пересчёт количеств на странице рецепта: переключатели [data-scale-control] и количества [data-amount-base].
 * Событие "recipe:scale-changed" (detail.factor) — для остальных модулей (список покупок).
 */
import { readString, writeString } from "../lib/client/storage";
import { parseScale, scaleAmountText, scaleCaption, scaleKey } from "../lib/scaleAmount";

function apply(recipeId: number, factor: number): void {
  document.querySelectorAll<HTMLElement>(`[data-scale-control][data-recipe-id="${recipeId}"]`).forEach((control) => {
    control.querySelectorAll<HTMLInputElement>("[data-scale-option]").forEach((r) => (r.checked = Number(r.value) === factor));
    const caption = control.querySelector("[data-scale-caption]");
    const servings = Number(control.dataset.servings) || undefined;
    if (caption) caption.textContent = scaleCaption(factor, servings);
  });
  document.querySelectorAll<HTMLElement>("[data-amount-base]").forEach((el) => {
    el.textContent = scaleAmountText(el.dataset.amountBase ?? "", factor);
  });
  document.documentElement.dataset.recipeScale = String(factor);
}

function init(): void {
  const controls = document.querySelectorAll<HTMLElement>("[data-scale-control]");
  if (controls.length === 0) return;
  const recipeId = Number(controls[0].dataset.recipeId);
  if (!recipeId) return;

  const initial = parseScale(readString(scaleKey(recipeId)));
  if (initial !== 1) apply(recipeId, initial);

  controls.forEach((control) =>
    control.addEventListener("change", (e) => {
      const input = e.target as HTMLInputElement;
      if (!input.matches("[data-scale-option]")) return;
      const factor = parseScale(input.value);
      writeString(scaleKey(recipeId), factor === 1 ? null : String(factor));
      apply(recipeId, factor);
      document.dispatchEvent(new CustomEvent("recipe:scale-changed", { detail: { factor } }));
    }),
  );
}

init();

/** Текущий множитель на странице (1, если переключателя нет). */
export function currentScale(): number {
  return parseScale(document.documentElement.dataset.recipeScale ?? "1");
}
