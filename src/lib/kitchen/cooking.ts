/** «Сколько варить»: форматирование времени, тексты страницы, логика таймера. Чистые функции. */
import type { CookingEntry, CookingMethod, CookingMethodKey } from "../../types/kitchen";
import type { PageSeo } from "../seo";
import { BRAND, DESCRIPTION_MAX, fitTitle } from "../seo";
import { formatRange, pluralRu, type PluralForms } from "./format";
import { capitalize } from "./seo";

const METHOD: Record<CookingMethodKey, { label: string; inside: string }> = {
  boil: { label: "В кастрюле", inside: "в кастрюле" },
  steam: { label: "На пару", inside: "на пару" },
  multicooker: { label: "В мультиварке", inside: "в мультиварке" },
  pressure: { label: "В скороварке", inside: "в скороварке" },
  oven: { label: "В духовке", inside: "в духовке" },
  microwave: { label: "В микроволновке", inside: "в микроволновке" },
};

const MINUTE_FORMS: PluralForms = ["минута", "минуты", "минут"];
const MINUTE_ACC: PluralForms = ["минуту", "минуты", "минут"];
const HOUR_FORMS: PluralForms = ["час", "часа", "часов"];

export function methodLabel(m: Pick<CookingMethod, "method" | "variant">): string {
  return m.variant ? `${METHOD[m.method].label}: ${m.variant}` : METHOD[m.method].label;
}

/**
 * «40–60 минут», «5 минут»; от полутора часов, если обе границы кратны 15 минутам, — в часах: «1,5–2 часа».
 * `accusative` — для фраз «варят 1 минуту».
 */
export function formatMinutes(min: number, max: number, accusative = false): string {
  if (max >= 90 && min % 15 === 0 && max % 15 === 0) return `${formatRange(min / 60, max / 60, 2)} ${pluralRu(max / 60, HOUR_FORMS)}`;
  return `${formatRange(min, max)} ${pluralRu(max, accusative ? MINUTE_ACC : MINUTE_FORMS)}`;
}

/** Основная строка (первый способ в данных) и до двух других способов — по одному на способ. */
function headline(entry: Pick<CookingEntry, "methods">): { main: CookingMethod | undefined; others: CookingMethod[] } {
  const [main, ...rest] = entry.methods;
  const others: CookingMethod[] = [];
  for (const m of rest) {
    if (others.length >= 2) break;
    if (m.method !== main?.method && !others.some((o) => o.method === m.method)) others.push(m);
  }
  return { main, others };
}

/** Прямой ответ: «Свёклу варят 40–60 минут (целая, среднего размера). В скороварке — 15–20 минут, в мультиварке — 40–50 минут.» */
export function cookingLead(entry: Pick<CookingEntry, "methods" | "forms">): string {
  const { main, others } = headline(entry);
  if (!main) return "";
  const where = main.method === "boil" ? "" : ` ${METHOD[main.method].inside}`;
  const first = `${capitalize(entry.forms.acc)} варят${where} ${formatMinutes(main.minMin, main.maxMin, true)}${main.variant ? ` (${main.variant})` : ""}.`;
  const rest = others.map((m) => `${METHOD[m.method].inside} — ${formatMinutes(m.minMin, m.maxMin)}`).join(", ");
  return rest ? `${first} ${capitalize(rest)}.` : first;
}

/** title / description / H1 страницы продукта. В description — минуты из данных. */
export function cookingSeo(entry: Pick<CookingEntry, "methods" | "forms">): PageSeo {
  const h1 = `Сколько варить ${entry.forms.acc}`;
  const { main, others } = headline(entry);
  const places = [main, ...others].filter((m): m is CookingMethod => !!m).map((m) => METHOD[m.method].inside);
  const where = places.length > 1 ? ` ${places.slice(0, 2).join(" и ")}` : "";
  const title = fitTitle([`${h1}${where} | ${BRAND}`, `${h1}${where}`, `${h1} | ${BRAND}`, h1]);

  const tail = "Как понять, что готово, и таймер.";
  const mainFact = main ? `${capitalize(entry.forms.acc)} варят ${formatMinutes(main.minMin, main.maxMin, true)}` : capitalize(h1);
  const facts = others.map((m) => `${METHOD[m.method].inside} — ${formatMinutes(m.minMin, m.maxMin)}`);
  let description = "";
  for (let n = facts.length; n >= 0; n--) {
    const candidate = `${[mainFact, ...facts.slice(0, n)].join(", ")}. ${tail}`;
    if (candidate.length <= DESCRIPTION_MAX) {
      description = candidate;
      break;
    }
  }
  if (!description) description = `${h1}: таблица времени варки. ${tail}`.slice(0, DESCRIPTION_MAX);
  return { title, description, h1 };
}

// --- Таймер ---

/** Оставшиеся секунды до `endAt` (мс), не меньше нуля. */
export function remainingSeconds(endAt: number, now: number): number {
  return Math.max(0, Math.ceil((endAt - now) / 1000));
}

/** «05:00», «59:59», от часа — «1:05:00». */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Длительность таймера в секундах из минут в данных; null — некорректное значение (до 24 часов). */
export function timerSeconds(minutes: number): number | null {
  return Number.isFinite(minutes) && minutes > 0 && minutes <= 24 * 60 ? Math.round(minutes * 60) : null;
}
