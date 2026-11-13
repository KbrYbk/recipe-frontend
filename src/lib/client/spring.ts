/**
 * Пружинное движение для жестов: анимация стартует от текущего значения, принимает скорость пальца
 * и в любой момент может быть остановлена и продолжена перетаскиванием.
 * Чистые функции (project, rubberband, springAt, releaseVelocity) не зависят от DOM и покрыты тестами.
 */

/**
 * Куда «долетит» значение после броска со скоростью velocity (px/с) — как затухание прокрутки.
 * Цель привязки выбирают по этой точке, а не по месту, где отпустили палец.
 */
export function project(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/** Упругая граница: чем дальше за край, тем слабее элемент следует за пальцем (вместо жёсткой остановки). */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  if (dimension <= 0) return 0;
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

export interface SpringParams {
  /** Отзывчивость, с: за сколько примерно значение доходит до цели. Меньше — резче. */
  response?: number;
  /** Затухание: 1 — без перелёта (по умолчанию), меньше 1 — с лёгким отскоком (только после броска). */
  damping?: number;
}

/**
 * Состояние пружины через t секунд: x — смещение от цели, v — скорость.
 * x0 — начальное смещение от цели, v0 — начальная скорость (px/с).
 */
export function springAt(t: number, x0: number, v0: number, { response = 0.35, damping = 1 }: SpringParams = {}): { x: number; v: number } {
  const omega = (2 * Math.PI) / Math.max(response, 0.01);
  const zeta = Math.max(damping, 0.01);
  if (zeta >= 1) {
    const b = v0 + omega * x0;
    const decay = Math.exp(-omega * t);
    return { x: (x0 + b * t) * decay, v: (v0 - omega * b * t) * decay };
  }
  const wd = omega * Math.sqrt(1 - zeta * zeta);
  const c = (v0 + zeta * omega * x0) / wd;
  const decay = Math.exp(-zeta * omega * t);
  const cos = Math.cos(wd * t);
  const sin = Math.sin(wd * t);
  return {
    x: decay * (x0 * cos + c * sin),
    v: decay * ((c * wd - zeta * omega * x0) * cos - (x0 * wd + zeta * omega * c) * sin),
  };
}

export interface MotionSample {
  /** Время, мс. */
  t: number;
  /** Положение, px. */
  p: number;
}

/**
 * Скорость в момент отпускания (px/с) по последним ~100 мс движения; старые точки не учитываются.
 * releasedAt — время отпускания (мс): если палец перед этим замер дольше idleMs, броска не было и скорость равна 0.
 */
export function releaseVelocity(samples: readonly MotionSample[], releasedAt?: number, windowMs = 100, idleMs = 60): number {
  if (samples.length < 2) return 0;
  const last = samples[samples.length - 1];
  if (releasedAt !== undefined && releasedAt - last.t > idleMs) return 0;
  let first = last;
  for (let i = samples.length - 2; i >= 0; i--) {
    if (last.t - samples[i].t > windowMs) break;
    first = samples[i];
  }
  const dt = last.t - first.t;
  return dt > 0 ? ((last.p - first.p) / dt) * 1000 : 0;
}

export interface SpringAnimation {
  /** Останавливает анимацию и возвращает значение и скорость на этот момент — с них продолжает жест. */
  stop: () => { value: number; velocity: number };
}

export interface AnimateSpringOptions extends SpringParams {
  from: number;
  to: number;
  /** Начальная скорость, px/с (скорость пальца при отпускании). */
  velocity?: number;
  onUpdate: (value: number) => void;
  onRest?: () => void;
  /** Порог покоя по смещению и скорости. */
  precision?: number;
}

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Анимирует значение пружиной через requestAnimationFrame. При «уменьшении движения» сразу ставит цель. */
export function animateSpring({ from, to, velocity = 0, onUpdate, onRest, precision = 0.5, ...params }: AnimateSpringOptions): SpringAnimation {
  let value = from;
  let speed = velocity;
  let frame = 0;
  let done = false;

  if (prefersReducedMotion()) {
    done = true;
    onUpdate(to);
    onRest?.();
    return { stop: () => ({ value: to, velocity: 0 }) };
  }

  const start = performance.now();
  const tick = (now: number) => {
    if (done) return;
    const state = springAt((now - start) / 1000, from - to, velocity, params);
    value = to + state.x;
    speed = state.v;
    if (Math.abs(state.x) < precision && Math.abs(state.v) < precision * 10) {
      done = true;
      onUpdate(to);
      onRest?.();
      return;
    }
    onUpdate(value);
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);

  return {
    stop: () => {
      if (!done) {
        done = true;
        cancelAnimationFrame(frame);
      }
      return { value, velocity: done && value === to ? 0 : speed };
    },
  };
}
