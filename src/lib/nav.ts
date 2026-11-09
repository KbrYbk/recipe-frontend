/** Активный пункт навигации (шапка и нижняя панель) по текущему пути. */
export type NavSection = "home" | "recipes" | "search" | "favorites" | "shopping" | "random" | null;

const RECIPE_PATHS = new Set(["/recipes", "/categories"]);
const RECIPE_PREFIXES = ["/recipe/", "/collection/"];

export function navSection(pathname: string, search: URLSearchParams | string = ""): NavSection {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (path === "/") return "home";
  if (path === "/favorites") return "favorites";
  if (path === "/shopping-list") return "shopping";
  if (path === "/random") return "random";
  if (path === "/recipes" && (params.get("action") === "search" || params.has("q"))) return "search";
  if (RECIPE_PATHS.has(path) || RECIPE_PREFIXES.some((p) => path.startsWith(p))) return "recipes";
  // Страница рецепта: /{категория}/{slug} — единственные двухсегментные страницы, кроме префиксов выше.
  if (/^\/[^/]+\/[^/]+$/.test(path) && !path.startsWith("/partials/")) return "recipes";
  return null;
}
