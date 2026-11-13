import { describe, expect, it } from "vitest";
import { project, releaseVelocity, rubberband, springAt } from "../src/lib/client/spring";

describe("project", () => {
  it("без скорости значение остаётся на месте", () => {
    expect(project(0)).toBe(0);
  });

  it("бросок уносит дальше точки отпускания и сохраняет направление", () => {
    expect(project(1000)).toBeCloseTo(499, 0);
    expect(project(-1000)).toBeCloseTo(-499, 0);
  });

  it("более резкое затухание даёт более короткий полёт", () => {
    expect(project(1000, 0.99)).toBeLessThan(project(1000, 0.998));
  });
});

describe("rubberband", () => {
  it("на малом выходе за край почти следует за пальцем, на большом — отстаёт", () => {
    expect(rubberband(10, 400)).toBeGreaterThan(5);
    expect(rubberband(10, 400)).toBeLessThan(10);
    expect(rubberband(1000, 400)).toBeLessThan(400);
  });

  it("монотонна и симметрична по направлению", () => {
    expect(rubberband(200, 400)).toBeGreaterThan(rubberband(100, 400));
    expect(rubberband(-100, 400)).toBeCloseTo(-rubberband(100, 400));
  });

  it("не делит на ноль при нулевом размере", () => {
    expect(rubberband(50, 0)).toBe(0);
  });
});

describe("springAt", () => {
  it("в начальный момент возвращает исходные смещение и скорость", () => {
    expect(springAt(0, 100, 250)).toEqual({ x: 100, v: 250 });
    const bouncy = springAt(0, 100, 250, { damping: 0.8 });
    expect(bouncy.x).toBeCloseTo(100);
    expect(bouncy.v).toBeCloseTo(250);
  });

  it("при критическом затухании приходит к цели без перелёта", () => {
    let min = Infinity;
    for (let t = 0; t <= 2; t += 0.01) min = Math.min(min, springAt(t, 100, 0).x);
    expect(min).toBeGreaterThanOrEqual(0);
    expect(Math.abs(springAt(2, 100, 0).x)).toBeLessThan(0.01);
  });

  it("при затухании меньше 1 перелетает цель и всё равно успокаивается", () => {
    let min = Infinity;
    for (let t = 0; t <= 2; t += 0.01) min = Math.min(min, springAt(t, 100, 0, { damping: 0.6 }).x);
    expect(min).toBeLessThan(0);
    expect(Math.abs(springAt(3, 100, 0, { damping: 0.6 }).x)).toBeLessThan(0.01);
  });

  it("скорость согласована с изменением положения", () => {
    for (const damping of [1, 0.8]) {
      const dt = 1e-5;
      const a = springAt(0.1, 100, -300, { damping });
      const b = springAt(0.1 + dt, 100, -300, { damping });
      expect((b.x - a.x) / dt).toBeCloseTo(a.v, 0);
    }
  });

  it("меньшая отзывчивость — быстрее к цели", () => {
    expect(Math.abs(springAt(0.2, 100, 0, { response: 0.2 }).x)).toBeLessThan(Math.abs(springAt(0.2, 100, 0, { response: 0.5 }).x));
  });
});

describe("releaseVelocity", () => {
  it("меньше двух точек — скорости нет", () => {
    expect(releaseVelocity([])).toBe(0);
    expect(releaseVelocity([{ t: 0, p: 0 }])).toBe(0);
  });

  it("считает px/с по последним точкам", () => {
    expect(
      releaseVelocity([
        { t: 0, p: 0 },
        { t: 50, p: 50 },
        { t: 100, p: 100 },
      ]),
    ).toBeCloseTo(1000);
  });

  it("палец замер перед отпусканием — броска нет, даже если последние точки были быстрыми", () => {
    const fast = [
      { t: 0, p: 0 },
      { t: 16, p: 10 },
      { t: 32, p: 20 },
      { t: 48, p: 30 },
    ];
    expect(releaseVelocity(fast, 60)).toBeGreaterThan(500);
    expect(releaseVelocity(fast, 300)).toBe(0);
  });

  it("не учитывает движение старше окна: палец остановился перед отпусканием", () => {
    expect(
      releaseVelocity([
        { t: 0, p: 0 },
        { t: 50, p: 300 },
        { t: 400, p: 300 },
        { t: 450, p: 300 },
      ]),
    ).toBe(0);
  });
});
