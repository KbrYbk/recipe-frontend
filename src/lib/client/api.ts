/** Запросы из браузера — только через /api-proxy (allowlist в src/middleware.ts). */

/**
 * Content-Type обязателен: PATCH без него Astro считает «межсайтовой отправкой формы» и отвечает 403,
 * не передав запрос бэкенду (за nginx адрес страницы и заголовок Origin не совпадают по схеме).
 */
export async function incrementLike(id: number): Promise<Response> {
  return fetch(`/api-proxy/incrementLike/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: "{}",
  });
}

/** IP в теле не передаём: бэкенд берёт адрес из заголовка, который выставляет наш прокси. */
export async function setRating(id: number, rating: number): Promise<Response> {
  return fetch(`/api-proxy/setRating/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ rating }),
  });
}
