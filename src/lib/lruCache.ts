/**
 * Небольшой LRU-кэш с TTL и объединением параллельных запросов (single-flight).
 * Используется на SSR для GET-ответов API и для справочника категорий.
 */

interface Entry<V> {
  value: V;
  expiresAt: number;
}

export interface LruOptions {
  /** Максимум записей; при переполнении вытесняется давно не использованная. */
  maxEntries: number;
  /** Время жизни записи, мс. */
  ttlMs: number;
  /** Источник времени (для тестов). */
  now?: () => number;
}

export class LruCache<V> {
  private readonly map = new Map<string, Entry<V>>();
  private readonly inflight = new Map<string, Promise<V>>();
  private readonly maxEntries: number;
  private readonly ttlMs: number;
  private readonly now: () => number;

  constructor(opts: LruOptions) {
    this.maxEntries = Math.max(1, Math.floor(opts.maxEntries));
    this.ttlMs = Math.max(0, opts.ttlMs);
    this.now = opts.now ?? Date.now;
  }

  get size(): number {
    return this.map.size;
  }

  /** Свежее значение или undefined. Обращение поднимает запись в начало LRU. */
  get(key: string): V | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    // Истёкшую запись не удаляем сразу: она доступна через peekStale() и будет вытеснена по LRU.
    if (entry.expiresAt <= this.now()) return undefined;
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  /** Значение даже с истёкшим TTL (для отдачи «устаревшего» при ошибке источника). */
  peekStale(key: string): V | undefined {
    return this.map.get(key)?.value;
  }

  set(key: string, value: V, ttlMs: number = this.ttlMs): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, { value, expiresAt: this.now() + ttlMs });
    while (this.map.size > this.maxEntries) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
  }

  delete(key: string): void {
    this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
    this.inflight.clear();
  }

  /**
   * Вернуть кэш или вызвать loader. Одновременные вызовы с одним ключом ждут один и тот же промис
   * (защита от «шторма» запросов при истечении TTL). shouldCache решает, класть ли результат в кэш.
   */
  async getOrLoad(key: string, loader: () => Promise<V>, shouldCache: (value: V) => boolean = () => true): Promise<V> {
    const cached = this.get(key);
    if (cached !== undefined) return cached;

    const pending = this.inflight.get(key);
    if (pending) return pending;

    const promise = (async () => {
      try {
        const value = await loader();
        if (shouldCache(value)) this.set(key, value);
        return value;
      } finally {
        this.inflight.delete(key);
      }
    })();
    this.inflight.set(key, promise);
    return promise;
  }
}
