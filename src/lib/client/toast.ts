/** Короткое всплывающее уведомление (aria-live). */
export type ToastType = "success" | "error" | "info";

const COLORS: Record<ToastType, string> = {
  success: "bg-text-main",
  error: "bg-negative",
  info: "bg-text-main",
};

export function showToast(message: string, type: ToastType = "success", action?: { label: string; href: string }): void {
  const toast = document.createElement("div");
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.className = `fixed right-4 bottom-24 md:bottom-6 z-[100] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-control px-4 py-2.5 font-medium text-page-bg shadow-float transition-opacity duration-300 ${COLORS[type]}`;
  const text = document.createElement("span");
  text.textContent = message;
  toast.appendChild(text);
  if (action) {
    const link = document.createElement("a");
    link.href = action.href;
    link.textContent = action.label;
    link.className = "underline underline-offset-2 font-semibold whitespace-nowrap";
    toast.appendChild(link);
  }
  document.body.appendChild(toast);
  window.setTimeout(() => {
    toast.style.opacity = "0";
    window.setTimeout(() => toast.remove(), 300);
  }, 3500);
}
