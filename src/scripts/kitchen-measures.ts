/** Конвертер мер на странице продукта: связывает поля ввода с расчётом из lib/kitchen/measures. */
import { formatGrams, fromGrams, parseQuantity, toGrams, type MeasureGrams } from "../lib/kitchen/measures";
import type { MeasureKey } from "../types/kitchen";

function readGrams(raw: string | undefined): MeasureGrams {
  try {
    const parsed: unknown = JSON.parse(raw ?? "{}");
    return parsed && typeof parsed === "object" ? (parsed as MeasureGrams) : {};
  } catch {
    return {};
  }
}

function initMeasureConverter(): void {
  document.querySelectorAll<HTMLElement>("[data-measure-converter]").forEach((root) => {
    const grams = readGrams(root.dataset.grams);
    const qty = root.querySelector<HTMLInputElement>("[data-mc-qty]");
    const measure = root.querySelector<HTMLSelectElement>("[data-mc-measure]");
    const result = root.querySelector<HTMLElement>("[data-mc-result]");
    const qtyHint = root.querySelector<HTMLElement>("[data-mc-qty-hint]");
    const weight = root.querySelector<HTMLInputElement>("[data-mc-grams]");
    const list = root.querySelector<HTMLElement>("[data-mc-list]");
    const weightHint = root.querySelector<HTMLElement>("[data-mc-grams-hint]");

    const updateToGrams = () => {
      if (!qty || !measure || !result) return;
      const quantity = parseQuantity(qty.value);
      const total = quantity === null ? null : toGrams(grams, measure.value as MeasureKey, quantity);
      const empty = qty.value.trim() === "";
      result.textContent = total === null ? "" : `= ${formatGrams(total)}`;
      qtyHint?.classList.toggle("hidden", total !== null || empty);
      qty.setAttribute("aria-invalid", String(total === null && !empty));
    };

    const updateFromGrams = () => {
      if (!weight || !list) return;
      const value = parseQuantity(weight.value);
      const empty = weight.value.trim() === "";
      const amounts = value === null ? [] : fromGrams(grams, value);
      list.querySelectorAll<HTMLElement>("[data-mc-key]").forEach((item) => {
        const amount = amounts.find((a) => a.key === item.dataset.mcKey);
        item.textContent = amount?.text ?? "";
        item.hidden = !amount;
      });
      weightHint?.classList.toggle("hidden", value !== null || empty);
      weight.setAttribute("aria-invalid", String(value === null && !empty));
    };

    qty?.addEventListener("input", updateToGrams);
    measure?.addEventListener("change", updateToGrams);
    weight?.addEventListener("input", updateFromGrams);
  });
}

initMeasureConverter();
