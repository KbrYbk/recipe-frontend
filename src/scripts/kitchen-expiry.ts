/** Калькулятор «съесть до» на странице сроков хранения: связывает поля с расчётом из lib/kitchen/storage. */
import { expiryResult, parsePlainDate, toIsoDate, todayPlain } from "../lib/kitchen/storage";
import type { StorageCondition } from "../types/kitchen";

function readConditions(raw: string | undefined): StorageCondition[] {
  try {
    const parsed: unknown = JSON.parse(raw ?? "[]");
    return Array.isArray(parsed) ? (parsed as StorageCondition[]) : [];
  } catch {
    return [];
  }
}

function initExpiryCalculator(): void {
  document.querySelectorAll<HTMLElement>("[data-expiry-calculator]").forEach((root) => {
    const conditions = readConditions(root.dataset.conditions);
    const dateInput = root.querySelector<HTMLInputElement>("[data-expiry-date]");
    const where = root.querySelector<HTMLSelectElement>("[data-expiry-where]");
    const title = root.querySelector<HTMLElement>("[data-expiry-title]");
    const detail = root.querySelector<HTMLElement>("[data-expiry-detail]");
    if (!dateInput || !where || !title || !detail) return;

    const update = () => {
      const start = parsePlainDate(dateInput.value);
      const condition = conditions.find((c) => c.where === where.value);
      const result = start && condition ? expiryResult(start, condition, todayPlain()) : null;
      if (!result) {
        title.textContent = "Выберите дату";
        detail.textContent = "Калькулятор берёт нижнюю границу срока — так надёжнее.";
        title.classList.remove("text-negative");
        return;
      }
      title.textContent = result.title;
      detail.textContent = result.detail;
      title.classList.toggle("text-negative", result.expired);
    };

    if (!dateInput.value) dateInput.value = toIsoDate(todayPlain());
    dateInput.addEventListener("input", update);
    where.addEventListener("change", update);
    update();
  });
}

initExpiryCalculator();
