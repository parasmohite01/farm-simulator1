import { openDB, type IDBPDatabase } from 'idb';
import type { StoredScenario } from '@farm/engine';

const DB_NAME = 'farm-simulator';
const VERSION = 2;

let dbp: Promise<IDBPDatabase> | null = null;

function database() {
  if (!dbp) {
    dbp = openDB(DB_NAME, VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const store = db.createObjectStore('scenarios', { keyPath: 'id' });
          store.createIndex('lastModified', 'lastModified');
          store.createIndex('synced', 'synced');
        }
        if (oldVersion < 2 && !db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }
      },
    });
  }
  return dbp;
}

export const newId = () =>
  `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

/** IndexedDB is the source of truth. The server is a replica, never the other way round. */
export async function saveScenario(s: Omit<StoredScenario, 'lastModified' | 'synced'>): Promise<StoredScenario> {
  const record: StoredScenario = { ...s, lastModified: Date.now(), synced: false };
  await (await database()).put('scenarios', record);
  return record;
}

export async function allScenarios(): Promise<StoredScenario[]> {
  const rows = (await (await database()).getAll('scenarios')) as StoredScenario[];
  return rows.filter((r) => !r.deleted).sort((a, b) => b.lastModified - a.lastModified);
}

export async function pendingScenarios(): Promise<StoredScenario[]> {
  return (await allScenarios()).filter((s) => !s.synced);
}

export async function markSynced(ids: string[]) {
  const db = await database();
  const tx = db.transaction('scenarios', 'readwrite');
  for (const id of ids) {
    const row = (await tx.store.get(id)) as StoredScenario | undefined;
    if (row) await tx.store.put({ ...row, synced: true });
  }
  await tx.done;
}

export async function softDelete(id: string) {
  const db = await database();
  const row = (await db.get('scenarios', id)) as StoredScenario | undefined;
  if (row) await db.put('scenarios', { ...row, deleted: true, synced: false, lastModified: Date.now() });
}

/** Cache for enrichment data, so an offline launch still has prices and rainfall. */
export async function cacheGet<T>(key: string): Promise<{ value: T; fetchedAt: number } | null> {
  return ((await (await database()).get('cache', key)) as any) ?? null;
}
export async function cachePut(key: string, value: unknown) {
  await (await database()).put('cache', { key, value, fetchedAt: Date.now() });
}
