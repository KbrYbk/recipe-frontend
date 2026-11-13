/** Калькулятор замены ингредиента: связывает поля с расчётом из lib/kitchen/substitutions. */
import { parseQuantity } from "../lib/kitchen/measures";
import { SUBSTITUTE_UNITS, formatAmount, substituteAmount, type SubstituteUnit } from "../lib/kitchen/substitutions";

function readFactors(raw: string | undefined): number[] {
  try {
    const parsed: unknown = JSON.parse(raw ?? "[]");
    return Array.isArray(parsed) ? parsed.map(Number) : [];
  } catch {
    return [];
  }
}

function initSubstituteCalculator(): void {
  document.querySelectorAll<HTMLElement>("[data-substitute-calculator]").forEach((root) => {
    const factors = readFactors(root.dataset.factors);
    const qty = root.querySelector<HTMLInputElement>("[data-sc-qty]");
    const unitSelect = root.querySelector<HTMLSelectElement>("[data-sc-unit]");
    const hint = root.querySelector<HTMLElement>("[data-sc-hint]");
    if (!qty || !unitSelect) return;

    const update = () => {
      const quantity = parseQuantity(qty.value);
      const unit = (SUBSTITUTE_UNITS as readonly string[]).includes(unitSelect.value) ? (unitSelect.value as SubstituteUnit) : SUBSTITUTE_UNITS[0];
      const empty = qty.value.trim() === "";
      root.querySelectorAll<HTMLElement>("[data-sc-result]").forEach((cell) => {
        const amount = quantity === null ? null : substituteAmount(quantity, factors[Number(cell.dataset.scResult)]);
        cell.textContent = amount === null ? "-" : formatAmount(amount, unit);
      });
      hint?.classList.toggle("hidden", quantity !== null || empty);
      qty.setAttribute("aria-invalid", String(quantity === null && !empty));
    };

    qty.addEventListener("input", update);
    unitSelect.addEventListener("change", update);
  });
}

initSubstituteCalculator();
