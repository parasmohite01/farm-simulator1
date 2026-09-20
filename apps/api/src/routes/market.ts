import { Router } from 'express';
import { getCached, putCached, getStale } from '../db.js';

export const market = Router();

const SIX_HOURS = 6 * 60 * 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;

/**
 * All outbound calls go through here rather than from the browser, for three
 * reasons: the API key stays off the client, CORS stops being a problem, and
 * one server-side cache serves every user instead of each device hammering
 * the upstream. Every response carries `provenance` so the UI can label it.
 */
async function cachedFetch<T>(key: string, url: string, maxAge: number) {
  const fresh = getCached<T>(key, maxAge);
  if (fresh) return { data: fresh.value, provenance: 'cached' as const, fetchedAt: fresh.fetchedAt };
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(`upstream ${r.status}`);
    const data = (await r.json()) as T;
    putCached(key, data);
    return { data, provenance: 'live' as const, fetchedAt: Date.now() };
  } catch {
    const stale = getStale<T>(key);
    if (stale) return { data: stale.value, provenance: 'cached' as const, fetchedAt: stale.fetchedAt };
    return { data: null, provenance: 'default' as const, fetchedAt: 0 };
  }
}

/** Seasonal rainfall outlook from Open-Meteo. No API key required. */
market.get('/weather', async (req, res) => {
  const lat = Number(req.query.lat ?? 21.15);
  const lon = Number(req.query.lon ?? 79.09);
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&daily=precipitation_sum,temperature_2m_max&forecast_days=16&timezone=auto`;
  const out = await cachedFetch<any>(`weather:${lat},${lon}`, url, SIX_HOURS);
  const daily = out.data?.daily?.precipitation_sum ?? [];
  res.json({
    ...out,
    forecastRainfallMm: Math.round(daily.reduce((s: number, v: number) => s + (v ?? 0), 0)),
  });
});

/**
 * Mandi prices from data.gov.in (Agmarknet). Set AGMARKNET_KEY in .env.
 * Falls back to the MSP in model.json when unavailable, flagged as 'default'.
 */
market.get('/prices', async (req, res) => {
  const crop = String(req.query.crop ?? 'soybean');
  const state = String(req.query.state ?? 'Maharashtra');
  const key = process.env.AGMARKNET_KEY;
  if (!key) return res.json({ data: null, provenance: 'default', fetchedAt: 0 });

  const url =
    `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070` +
    `?api-key=${key}&format=json&limit=20` +
    `&filters[state]=${encodeURIComponent(state)}&filters[commodity]=${encodeURIComponent(crop)}`;
  const out = await cachedFetch<any>(`prices:${state}:${crop}`, url, ONE_DAY);
  const records = out.data?.records ?? [];
  const modal = records
    .map((r: any) => Number(r.modal_price))
    .filter((n: number) => Number.isFinite(n) && n > 0);
  res.json({
    ...out,
    pricePerQuintal: modal.length ? Math.round(modal.reduce((a: number, b: number) => a + b, 0) / modal.length) : null,
    sampleSize: modal.length,
  });
});
