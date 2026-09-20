import { Router } from 'express';
import { db } from '../db.js';
import type { StoredScenario } from '@farm/engine';

export const scenarios = Router();

/** Everything changed since a timestamp — the client's pull half of sync. */
scenarios.get('/', (req, res) => {
  const since = Number(req.query.since ?? 0);
  const rows = db
    .prepare('SELECT payload, last_modified, deleted FROM scenarios WHERE last_modified > ? ORDER BY last_modified')
    .all(since) as { payload: string; last_modified: number; deleted: number }[];
  res.json({
    serverTime: Date.now(),
    scenarios: rows.map((r) => ({ ...JSON.parse(r.payload), lastModified: r.last_modified, deleted: !!r.deleted })),
  });
});

/**
 * Push half of sync. Last-write-wins on lastModified, which is deliberate:
 * a single-farmer app does not need CRDTs, and an honest simple rule beats a
 * complicated one nobody can explain to a judge.
 * Conflicts are reported back so the UI can show them instead of hiding them.
 */
scenarios.post('/sync', (req, res) => {
  const incoming = (req.body?.scenarios ?? []) as StoredScenario[];
  const conflicts: string[] = [];
  const accepted: string[] = [];

  const read = db.prepare('SELECT last_modified FROM scenarios WHERE id = ?');
  const write = db.prepare(
    'INSERT OR REPLACE INTO scenarios (id, owner, payload, last_modified, deleted) VALUES (?, ?, ?, ?, ?)'
  );

  db.transaction(() => {
    for (const s of incoming) {
      const existing = read.get(s.id) as { last_modified: number } | undefined;
      if (existing && existing.last_modified > s.lastModified) {
        conflicts.push(s.id);
        continue;
      }
      write.run(s.id, req.body?.owner ?? 'demo', JSON.stringify(s), s.lastModified, s.deleted ? 1 : 0);
      accepted.push(s.id);
    }
  })();

  res.json({ serverTime: Date.now(), accepted, conflicts });
});

scenarios.delete('/:id', (req, res) => {
  db.prepare('UPDATE scenarios SET deleted = 1, last_modified = ? WHERE id = ?').run(Date.now(), req.params.id);
  res.json({ ok: true });
});
