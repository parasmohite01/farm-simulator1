import { cacheGet, cachePut } from './db.js';
import type { Provenance } from '@farm/engine';

export type Enriched<T> = { value: T | null; provenance: Provenance; fetchedAt: number };

/**
 * Online data is enrichment, never a dependency. Order of preference:
 *   live call → device cache (any age) → null, which the caller replaces with
 *   the model default. The provenance travels with the value so every number
 *   on screen can say where it came from.
 */
async function enrich<T>(cacheKey: string, url: string, pick: (json: any) => T | null): Promise<Enriched<T>> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) throw new Error(String(r.status));
    const json = await r.json();
    const value = pick(json);
    if (value === null) throw new Error('empty');
    await cachePut(cacheKey, value);
    return { value, provenance: 'live', fetchedAt: Date.now() };
  } catch {
    const cached = await cacheGet<T>(cacheKey);
    if (cached) return { value: cached.value, provenance: 'cached', fetchedAt: cached.fetchedAt };
    return { value: null, provenance: 'default', fetchedAt: 0 };
  }
}

export const fetchRainfall = (lat: number, lon: number) =>
  enrich<number>(`rain:${lat},${lon}`, `/api/market/weather?lat=${lat}&lon=${lon}`,
    (j) => (typeof j.forecastRainfallMm === 'number' ? j.forecastRainfallMm : null));

export const fetchPrice = (crop: string, state = 'Maharashtra') =>
  enrich<number>(`price:${state}:${crop}`, `/api/market/prices?crop=${crop}&state=${state}`,
    (j) => (typeof j.pricePerQuintal === 'number' ? j.pricePerQuintal : null));

/** Returns a translation key plus its variables — never display text, so the
 *  freshness badge follows the selected language like everything else. */
export function provenanceKey(e: Enriched<unknown>): { key: string; vars?: Record<string, number> } {
  if (e.provenance === 'live') return { key: 'provenance.live' };
  if (e.provenance === 'cached') {
    const days = Math.floor((Date.now() - e.fetchedAt) / 86_400_000);
    return days < 1 ? { key: 'provenance.cachedToday' } : { key: 'provenance.cachedDays', vars: { n: days } };
  }
  return { key: 'provenance.default' };
}
