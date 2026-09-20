import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';

mkdirSync('data', { recursive: true });
export const db = new Database('data/farm.db');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS scenarios (
    id            TEXT PRIMARY KEY,
    owner         TEXT NOT NULL DEFAULT 'demo',
    payload       TEXT NOT NULL,
    last_modified INTEGER NOT NULL,
    deleted       INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_scenarios_modified ON scenarios(last_modified);

  CREATE TABLE IF NOT EXISTS cache (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    fetched_at INTEGER NOT NULL
  );
`);

export function getCached<T>(key: string, maxAgeMs: number): { value: T; fetchedAt: number } | null {
  const row = db.prepare('SELECT value, fetched_at FROM cache WHERE key = ?').get(key) as
    | { value: string; fetched_at: number } | undefined;
  if (!row) return null;
  if (Date.now() - row.fetched_at > maxAgeMs) return null;
  return { value: JSON.parse(row.value) as T, fetchedAt: row.fetched_at };
}

export function putCached(key: string, value: unknown) {
  db.prepare('INSERT OR REPLACE INTO cache (key, value, fetched_at) VALUES (?, ?, ?)')
    .run(key, JSON.stringify(value), Date.now());
}

/** Stale-but-present read, used when the upstream API is unreachable. */
export function getStale<T>(key: string) {
  return getCached<T>(key, Number.MAX_SAFE_INTEGER);
}
