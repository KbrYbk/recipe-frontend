export function slugify(str: string): string {
  if (!str) return "";

  const ru: { [key: string]: string } = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "c",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ы: "y",
    э: "e",
    ю: "yu",
    я: "ya",
  };

  let slug = str.toLowerCase();
  slug = slug.replace(/[а-яё]/g, (match) => ru[match] || match);
  slug = slug.replace(/[^a-z0-9-]/g, "-");
  slug = slug.replace(/-+/g, "-").replace(/^-|-$/g, "");

  return slug || "recipe";
}
export function getRecipeUrl(r: any): string {
  if (r?.seo_url) return `/${r.seo_url}`;

  const catSlug = slugify(typeof r?.category === "object" ? r?.category?.title : r?.category || "category");
  const authorSlug = slugify(r?.user?.name || "author");
  const titleSlug = slugify(r?.title || "recipe");
  const cleanId = String(r?.id).replace(/^(db-|local-)/, "");

  return `/${catSlug}/${authorSlug}/${cleanId}/${titleSlug}`;
}
