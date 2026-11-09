/**
 * При копировании большого фрагмента текста (> 300 символов) добавляем ссылку на страницу.
 * Выделение не блокируется; список ингредиентов и поля ввода копируются как есть.
 */
const MIN_LENGTH = 300;

document.addEventListener("copy", (event) => {
  const selection = document.getSelection();
  if (!selection || selection.rangeCount === 0 || !event.clipboardData) return;
  const text = selection.toString();
  if (text.length <= MIN_LENGTH) return;

  const node = selection.anchorNode;
  const el = node instanceof Element ? node : node?.parentElement;
  if (el?.closest("[data-no-copy-signature], input, textarea, [contenteditable]")) return;

  event.clipboardData.setData("text/plain", `${text}\n\nИсточник: ${location.origin}${location.pathname}`);
  event.preventDefault();
});
