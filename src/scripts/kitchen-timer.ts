/** Таймер варки: обратный отсчёт от времени окончания (не сбивается, когда вкладка в фоне), Wake Lock, сигнал. */
import { formatClock, formatMinutes, remainingSeconds, timerSeconds } from "../lib/kitchen/cooking";

type WakeLockSentinelLike = { release: () => Promise<void>; addEventListener: (t: "release", cb: () => void) => void };
type NavigatorWithWakeLock = Navigator & { wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> } };
type WindowWithAudio = Window & { webkitAudioContext?: typeof AudioContext };

interface Bounds {
  min: number;
  max: number;
}

function readMethods(raw: string | undefined): Bounds[] {
  try {
    const parsed: unknown = JSON.parse(raw ?? "[]");
    return Array.isArray(parsed) ? (parsed as Bounds[]) : [];
  } catch {
    return [];
  }
}

function initCookTimer(root: HTMLElement): void {
  const methods = readMethods(root.dataset.methods);
  const methodSelect = root.querySelector<HTMLSelectElement>("[data-timer-method]");
  const boundInputs = Array.from(root.querySelectorAll<HTMLInputElement>("[data-timer-bound]"));
  const maxOption = root.querySelector<HTMLElement>("[data-timer-max-option]");
  const clock = root.querySelector<HTMLElement>("[data-timer-clock]");
  const status = root.querySelector<HTMLElement>("[data-timer-status]");
  const toggle = root.querySelector<HTMLElement>("[data-timer-toggle]");
  const toggleLabel = root.querySelector<HTMLElement>("[data-timer-toggle-label]");
  const iconPlay = root.querySelector<HTMLElement>("[data-timer-icon-play]");
  const iconPause = root.querySelector<HTMLElement>("[data-timer-icon-pause]");
  const reset = root.querySelector<HTMLElement>("[data-timer-reset]");
  const wakeHint = root.querySelector<HTMLElement>("[data-timer-wakelock]");
  if (!methodSelect || !clock || !status || !toggle || methods.length === 0) return;

  const pageTitle = document.title;
  let duration = 0; // секунды
  let left = 0; // секунды, когда таймер на паузе
  let endAt: number | null = null; // мс, когда таймер идёт
  let tick: number | undefined;
  let wakeLock: WakeLockSentinelLike | null = null;
  let audio: AudioContext | null = null;

  const selected = (): Bounds => methods[Number(methodSelect.value)] ?? methods[0];
  const bound = (): "min" | "max" => (boundInputs.find((i) => i.checked)?.value === "max" ? "max" : "min");

  const requestWakeLock = async () => {
    const nav = navigator as NavigatorWithWakeLock;
    if (!nav.wakeLock || document.visibilityState !== "visible") return;
    try {
      wakeLock = await nav.wakeLock.request("screen");
      wakeHint?.classList.remove("hidden");
      wakeLock.addEventListener("release", () => wakeHint?.classList.add("hidden"));
    } catch {
      wakeLock = null;
    }
  };
  const releaseWakeLock = () => {
    wakeLock?.release().catch(() => {});
    wakeLock = null;
  };

  /** Три коротких сигнала. AudioContext создаётся по клику «Старт» — иначе браузер не даст звук. */
  const beep = () => {
    if (!audio) return;
    try {
      const start = audio.currentTime;
      for (let i = 0; i < 3; i++) {
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, start + i * 0.4);
        gain.gain.exponentialRampToValueAtTime(0.3, start + i * 0.4 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + i * 0.4 + 0.3);
        osc.connect(gain).connect(audio.destination);
        osc.start(start + i * 0.4);
        osc.stop(start + i * 0.4 + 0.32);
      }
    } catch {
      // звук недоступен — остаются текст и вибрация
    }
  };

  const render = () => {
    const running = endAt !== null;
    clock.textContent = formatClock(left);
    if (toggleLabel) toggleLabel.textContent = running ? "Пауза" : left < duration && left > 0 ? "Продолжить" : "Старт";
    iconPlay?.classList.toggle("hidden", running);
    iconPause?.classList.toggle("hidden", !running);
    document.title = running ? `${formatClock(left)} — ${pageTitle}` : pageTitle;
  };

  const stopTicking = () => {
    if (tick !== undefined) window.clearInterval(tick);
    tick = undefined;
    endAt = null;
    releaseWakeLock();
  };

  const finish = () => {
    stopTicking();
    left = 0;
    render();
    status.textContent = "Время вышло — проверьте готовность.";
    document.title = `Готово! — ${pageTitle}`;
    beep();
    navigator.vibrate?.([300, 150, 300]);
  };

  const onTick = () => {
    if (endAt === null) return;
    left = remainingSeconds(endAt, Date.now());
    if (left <= 0) finish();
    else render();
  };

  /** Перечитать выбранные способ и границу; сбрасывает отсчёт. */
  const load = () => {
    stopTicking();
    const { min, max } = selected();
    root.querySelectorAll<HTMLElement>("[data-timer-bound-label]").forEach((label) => {
      const value = label.dataset.timerBoundLabel === "max" ? max : min;
      label.textContent = formatMinutes(value, value);
    });
    if (maxOption) maxOption.hidden = min === max;
    if (min === max) boundInputs.forEach((i) => (i.checked = i.value === "min"));
    duration = timerSeconds(bound() === "max" ? max : min) ?? 0;
    left = duration;
    status.textContent = "Запустите таймер, когда вода закипит.";
    render();
  };

  const start = () => {
    if (left <= 0) left = duration;
    if (left <= 0) return;
    if (!audio) {
      const Ctx = window.AudioContext ?? (window as WindowWithAudio).webkitAudioContext;
      try {
        audio = Ctx ? new Ctx() : null;
      } catch {
        audio = null;
      }
    }
    audio?.resume().catch(() => {});
    endAt = Date.now() + left * 1000;
    tick = window.setInterval(onTick, 250);
    status.textContent = "Таймер идёт.";
    requestWakeLock();
    render();
  };

  const pause = () => {
    if (endAt === null) return;
    left = remainingSeconds(endAt, Date.now());
    stopTicking();
    status.textContent = "Пауза.";
    render();
  };

  toggle.addEventListener("click", () => (endAt === null ? start() : pause()));
  reset?.addEventListener("click", load);
  methodSelect.addEventListener("change", load);
  boundInputs.forEach((input) => input.addEventListener("change", load));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible" || endAt === null) return;
    onTick();
    if (endAt !== null) requestWakeLock();
  });

  load();
}

document.querySelectorAll<HTMLElement>("[data-cook-timer]").forEach(initCookTimer);
