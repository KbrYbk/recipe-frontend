/**
 * Автокомплит для полей поиска `input[data-search-suggest]` (ARIA combobox + listbox).
 * Подсказки: GET /api-proxy/getRecipes/suggest/{q}; debounce 250 мс, от 2 символов; ↑ ↓ Enter Esc.
 */
import { parseSuggestions, suggestQuery, SUGGEST_DEBOUNCE_MS } from "../lib/searchSuggest";

let uid = 0;

function enhance(input: HTMLInputElement): void {
  if (input.dataset.suggestReady) return;
  input.dataset.suggestReady = "1";
  const form = input.form;
  const host = input.parentElement;
  if (!form || !host) return;

  const listId = `search-suggest-${++uid}`;
  const list = document.createElement("ul");
  list.id = listId;
  list.setAttribute("role", "listbox");
  list.setAttribute("aria-label", "Подсказки поиска");
  list.className = "bg-card-bg border-line absolute top-full right-0 left-0 z-[60] mt-2 hidden max-h-80 overflow-y-auto rounded-card border py-2 text-left shadow-float ";
  host.classList.add("relative");
  host.appendChild(list);

  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-controls", listId);

  let items: string[] = [];
  let active = -1;
  let timer: number | undefined;
  let controller: AbortController | null = null;
  let lastQuery = "";

  const close = () => {
    list.classList.add("hidden");
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    active = -1;
  };

  const highlight = (i: number) => {
    active = i;
    Array.from(list.children).forEach((li, n) => {
      const on = n === i;
      li.setAttribute("aria-selected", String(on));
      li.classList.toggle("bg-brand/10", on);
      li.classList.toggle("text-brand-ink", on);
      if (on) li.scrollIntoView({ block: "nearest" });
    });
    if (i >= 0) input.setAttribute("aria-activedescendant", `${listId}-${i}`);
    else input.removeAttribute("aria-activedescendant");
  };

  const choose = (value: string) => {
    input.value = value;
    close();
    form.requestSubmit();
  };

  const render = () => {
    list.replaceChildren();
    if (items.length === 0) return close();
    items.forEach((value, i) => {
      const li = document.createElement("li");
      li.id = `${listId}-${i}`;
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", "false");
      li.className = "text-text-main hover:bg-brand/10 flex min-h-11 cursor-pointer items-center px-4 py-2 text-base";
      li.textContent = value;
      // mousedown, чтобы выбор сработал до blur поля
      li.addEventListener("mousedown", (e) => {
        e.preventDefault();
        choose(value);
      });
      list.appendChild(li);
    });
    active = -1;
    list.classList.remove("hidden");
    input.setAttribute("aria-expanded", "true");
  };

  const load = async (q: string) => {
    controller?.abort();
    controller = new AbortController();
    try {
      const res = await fetch(`/api-proxy/getRecipes/suggest/${encodeURIComponent(q)}`, { headers: { Accept: "application/json" }, signal: controller.signal });
      if (!res.ok) throw new Error(String(res.status));
      if (q !== lastQuery) return;
      items = parseSuggestions(await res.json());
      if (document.activeElement === input) render();
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        items = [];
        close();
      }
    }
  };

  input.addEventListener("input", () => {
    window.clearTimeout(timer);
    const q = suggestQuery(input.value);
    if (!q) {
      controller?.abort();
      lastQuery = "";
      items = [];
      return close();
    }
    lastQuery = q;
    timer = window.setTimeout(() => load(q), SUGGEST_DEBOUNCE_MS);
  });

  input.addEventListener("keydown", (e) => {
    const open = !list.classList.contains("hidden") && items.length > 0;
    if (e.key === "ArrowDown") {
      if (!open && items.length > 0) render();
      if (items.length === 0) return;
      e.preventDefault();
      highlight(active + 1 >= items.length ? 0 : active + 1);
    } else if (e.key === "ArrowUp" && open) {
      e.preventDefault();
      highlight(active <= 0 ? items.length - 1 : active - 1);
    } else if (e.key === "Enter" && open && active >= 0) {
      e.preventDefault();
      choose(items[active]);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  });

  input.addEventListener("blur", () => window.setTimeout(close, 100));
}

function init(): void {
  document.querySelectorAll<HTMLInputElement>("input[data-search-suggest]").forEach(enhance);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
