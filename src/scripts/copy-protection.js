// Защита от копирования: добавление ссылки на источник
document.addEventListener("copy", (event) => {
    const selection = document.getSelection();
    if (selection && selection.toString().length > 30) {
      const pagelink = `\n\nИсточник: ${document.location.href}\n© SwagEda — Твоя уютная кухня`;
      const copytext = selection.toString() + pagelink;
      if (event.clipboardData) {
        event.clipboardData.setData("text/plain", copytext);
        event.preventDefault();
      }
    }
  });