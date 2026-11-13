/** Быстрый поиск по списку продуктов на хабе подраздела справочника. */
import { matchesFilter } from "../lib/kitchen/filter";

function initKitchenFilter(): void {
  document.querySelectorAll<HTMLElement>("[data-kitchen-grid]").forEach((root) => {
    const input = root.querySelector<HTMLInputElement>("[data-kitchen-filter]");
    if (!input) return;
    const groups = Array.from(root.querySelectorAll<HTMLElement>("[data-kitchen-group]"));
    const empty = root.querySelector<HTMLElement>("[data-kitchen-empty]");

    const apply = () => {
      let total = 0;
      for (const group of groups) {
        let visible = 0;
        group.querySelectorAll<HTMLElement>("[data-kitchen-item]").forEach((item) => {
          const show = matchesFilter(item.dataset.kitchenItem ?? "", input.value);
          item.hidden = !show;
          if (show) visible++;
        });
        group.hidden = visible === 0;
        total += visible;
      }
      empty?.classList.toggle("hidden", total > 0);
    };

    input.addEventListener("input", apply);
    apply();
  });
}

initKitchenFilter();
