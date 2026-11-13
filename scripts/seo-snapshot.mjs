#!/usr/bin/env node
/**
 * Снимок SEO-значимой части страниц и сравнение двух снимков.
 * Нужен при правках вёрстки и стилей: всё, что читают поисковики, должно остаться прежним.
 *
 *   node scripts/seo-snapshot.mjs --base http://127.0.0.1:4321 --out snapshot.json [--urls urls.txt]
 *   node scripts/seo-snapshot.mjs --diff before.json after.json
 *
 * Что попадает в снимок: статус и значимые заголовки ответа, теги <head>, JSON-LD, контур заголовков h1–h6,
 * ссылки (href + rel), атрибуты картинок, id-якоря, текст <main>. Классы и стили не учитываются.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { load } from "cheerio";

const DEFAULT_URLS = [
  "/",
  "/recipes",
  "/recipes?page=2",
  "/recipes?q=суп",
  "/recipes?sort=new",
  "/vtorye-blyuda",
  "/vtorye-blyuda/lukovyy-ugar",
  "/collection/hd",
  "/categories",
  "/favorites",
  "/shopping-list",
  "/spravochnik",
  "/spravochnik/hranenie",
  "/spravochnik/hranenie/svinina",
  "/spravochnik/mery",
  "/spravochnik/mery/muka-pshenichnaya",
  "/spravochnik/skolko-varit",
  "/spravochnik/skolko-varit/kartofel",
  "/spravochnik/zamena",
  "/spravochnik/zamena/razryhlitel",
  "/about",
  "/contacts",
  "/privacy",
  "/net-takoy-stranicy",
  "/robots.txt",
];

const KEPT_HEADERS = ["content-type", "cache-control", "x-robots-tag", "location", "content-security-policy", "referrer-policy", "x-content-type-options", "permissions-policy"];

/** Рекламные контейнеры получают случайный суффикс id при каждом рендере — он не несёт смысла. */
const stableId = (id) => String(id ?? "").replace(/^(yandex_rtb_R_A_\d+_\d+)_[a-z0-9]+$/, "$1_<rnd>");

const squash = (s) =>
  String(s ?? "")
    .replace(/\s+/g, " ")
    .trim();
const sha = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);

function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object")
    return Object.fromEntries(
      Object.keys(v)
        .sort()
        .map((k) => [k, sortKeys(v[k])]),
    );
  return v;
}

function snapshotHtml(html) {
  const $ = load(html);

  const head = [];
  $("head")
    .children("title, meta, link")
    .each((_, el) => {
      const tag = el.tagName;
      if (tag === "title") return void head.push(`title: ${squash($(el).text())}`);
      const attrs = { ...el.attribs };
      // Имена файлов сборки меняются при любой правке стилей — к SEO отношения не имеют.
      if (tag === "link" && /^\/_astro\//.test(attrs.href ?? "")) attrs.href = attrs.href.replace(/[.\-_][A-Za-z0-9_-]{6,}(\.\w+)$/, ".<hash>$1");
      if (tag === "link" && attrs.rel === "stylesheet") return;
      head.push(`${tag} ${JSON.stringify(sortKeys(attrs))}`);
    });

  const jsonLd = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).text();
    try {
      jsonLd.push(JSON.stringify(sortKeys(JSON.parse(raw))));
    } catch {
      jsonLd.push(`INVALID: ${squash(raw).slice(0, 200)}`);
    }
  });

  const headings = [];
  $("h1, h2, h3, h4, h5, h6").each((_, el) => void headings.push(`${el.tagName} ${squash($(el).text())}`));

  const links = [];
  $("a[href]").each((_, el) => {
    const rel = squash($(el).attr("rel"));
    links.push(`${$(el).attr("href")}${rel ? ` [${rel}]` : ""} :: ${squash($(el).text()) || squash($(el).attr("aria-label"))}`);
  });

  const images = [];
  $("img").each((_, el) => {
    const a = el.attribs;
    images.push(
      JSON.stringify({
        src: a.src ?? "",
        srcset: a.srcset ?? "",
        sizes: a.sizes ?? "",
        alt: a.alt ?? null,
        width: a.width ?? null,
        height: a.height ?? null,
        loading: a.loading ?? null,
        fetchpriority: a.fetchpriority ?? null,
        decoding: a.decoding ?? null,
      }),
    );
  });

  const ids = [];
  $("[id]").each((_, el) => void ids.push(`${el.tagName}#${stableId(el.attribs.id)}`));

  const landmarks = ["header", "nav", "main", "aside", "footer", "article", "table", "details", "ol", "dialog", "form"].map((t) => `${t}: ${$(t).length}`);

  const forms = [];
  $("form").each((_, el) => {
    const fields = $(el)
      .find("input[name], select[name], textarea[name]")
      .map((__, f) => `${f.attribs.name}${f.attribs.type === "hidden" ? `=${f.attribs.value ?? ""}` : ""}`)
      .get();
    forms.push(`${(el.attribs.method ?? "get").toLowerCase()} ${el.attribs.action ?? ""} {${fields.join(", ")}}`);
  });

  const ads = [];
  $("[data-ad-slot], #ya-global-ads").each((_, el) => {
    const attrs = Object.entries(el.attribs)
      .filter(([k]) => k === "id" || (k.startsWith("data-") && !k.startsWith("data-astro-cid")))
      .map(([k, v]) => [k, k === "id" ? stableId(v) : v]);
    ads.push(JSON.stringify(sortKeys(Object.fromEntries(attrs))));
  });

  const main = $("main").first().clone();
  main.find("script, style, noscript, template").remove();
  const mainText = squash(main.text());

  return {
    lang: $("html").attr("lang") ?? null,
    head,
    jsonLd,
    headings,
    links,
    images,
    ids,
    landmarks,
    forms,
    ads,
    mainTextLength: mainText.length,
    mainTextHash: sha(mainText),
    mainText,
  };
}

async function snapshot(base, urls) {
  const out = {};
  for (const url of urls) {
    const res = await fetch(new URL(url, base), { redirect: "manual", headers: { Accept: "text/html,*/*" } });
    const headers = Object.fromEntries(KEPT_HEADERS.flatMap((h) => (res.headers.has(h) ? [[h, res.headers.get(h)]] : [])));
    const body = await res.text();
    const isHtml = (res.headers.get("content-type") ?? "").includes("text/html");
    out[url] = { status: res.status, headers, ...(isHtml ? snapshotHtml(body) : { body }) };
  }
  return out;
}

function diffValue(path, a, b, report) {
  if (Array.isArray(a) && Array.isArray(b)) {
    const removed = a.filter((x) => !b.includes(x));
    const added = b.filter((x) => !a.includes(x));
    if (removed.length || added.length) {
      report.push(`${path}:`);
      removed.slice(0, 20).forEach((x) => report.push(`    - ${x}`));
      added.slice(0, 20).forEach((x) => report.push(`    + ${x}`));
      if (removed.length > 20 || added.length > 20) report.push(`    … всего −${removed.length} +${added.length}`);
    } else if (JSON.stringify(a) !== JSON.stringify(b)) {
      report.push(`${path}: изменился порядок элементов`);
    }
    return;
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diffValue(`${path}.${k}`, a[k], b[k], report);
    return;
  }
  if (a !== b) {
    const short = (v) => (typeof v === "string" && v.length > 160 ? `${v.slice(0, 160)}…` : JSON.stringify(v));
    report.push(`${path}:\n    - ${short(a)}\n    + ${short(b)}`);
  }
}

function diff(beforeFile, afterFile) {
  const before = JSON.parse(readFileSync(beforeFile, "utf8"));
  const after = JSON.parse(readFileSync(afterFile, "utf8"));
  const report = [];
  for (const url of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (!before[url] || !after[url]) {
      report.push(`${url}: есть только в ${before[url] ? "первом" : "втором"} снимке`);
      continue;
    }
    // mainText нужен только для чтения расхождений глазами: сравниваем хэш и длину.
    const { mainText: ta, ...a } = before[url];
    const { mainText: tb, ...b } = after[url];
    const local = [];
    diffValue("", a, b, local);
    if (ta !== tb && typeof ta === "string" && typeof tb === "string") {
      let i = 0;
      while (i < ta.length && ta[i] === tb[i]) i++;
      local.push(`.mainText: первое расхождение на позиции ${i}:\n    - …${ta.slice(Math.max(0, i - 40), i + 80)}\n    + …${tb.slice(Math.max(0, i - 40), i + 80)}`);
    }
    if (local.length) report.push(`\n=== ${url}`, ...local);
  }
  if (report.length === 0) {
    process.stdout.write(`Снимки совпадают (${Object.keys(before).length} адресов).\n`);
    return 0;
  }
  process.stdout.write(`${report.join("\n")}\n\nЕсть расхождения.\n`);
  return 1;
}

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};

if (args.includes("--diff")) {
  const i = args.indexOf("--diff");
  if (!args[i + 1] || !args[i + 2]) {
    process.stderr.write("Использование: --diff before.json after.json\n");
    process.exit(2);
  }
  process.exit(diff(args[i + 1], args[i + 2]));
} else {
  const base = opt("--base");
  const outFile = opt("--out");
  if (!base || !outFile) {
    process.stderr.write("Использование: --base http://127.0.0.1:4321 --out snapshot.json [--urls urls.txt]\n");
    process.exit(2);
  }
  const urlsFile = opt("--urls");
  const urls = urlsFile
    ? readFileSync(urlsFile, "utf8")
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#"))
    : DEFAULT_URLS;
  const data = await snapshot(base, urls);
  writeFileSync(outFile, `${JSON.stringify(data, null, 1)}\n`);
  process.stdout.write(`Снято ${urls.length} адресов → ${outFile}\n`);
}
