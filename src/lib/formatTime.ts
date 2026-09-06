export function formatTime(minutes: number | string | undefined | null): string {
  if (minutes === undefined || minutes === null) return "";
  const mins = Number(minutes);
  if (isNaN(mins)) return "";

  const h = Math.floor(mins / 60);
  const m = Math.floor(mins % 60);

  if (h > 0) {
    return m > 0 ? `${h}ч ${m}м` : `${h}ч`;
  }
  return `${m}м`;
}
