import { allScenarios, pendingScenarios, markSynced } from './db.js';
import type { StoredScenario } from '@farm/engine';

const LAST_PULL = 'farm:lastPull';

export type SyncState = {
  online: boolean;
  pending: number;
  lastSync: number | null;
  conflicts: string[];
  running: boolean;
};

type Listener = (s: SyncState) => void;

class SyncManager {
  private listeners = new Set<Listener>();
  private state: SyncState = {
    online: navigator.onLine,
    pending: 0,
    lastSync: Number(localStorage.getItem('farm:lastSync')) || null,
    conflicts: [],
    running: false,
  };

  constructor() {
    addEventListener('online', () => { this.patch({ online: true }); void this.run(); });
    addEventListener('offline', () => this.patch({ online: false }));
    // Retry on a timer AND on reconnect. The timer reads live state from the
    // manager rather than a captured React variable — the original code closed
    // over a stale `isOnline` inside useEffect([]) and never recovered.
    setInterval(() => { if (this.state.online) void this.run(); }, 30_000);
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }

  private patch(p: Partial<SyncState>) {
    this.state = { ...this.state, ...p };
    this.listeners.forEach((l) => l(this.state));
  }

  async refreshPendingCount() {
    this.patch({ pending: (await pendingScenarios()).length });
  }

  async run(): Promise<void> {
    if (this.state.running || !this.state.online) return;
    this.patch({ running: true });
    try {
      const outbox = await pendingScenarios();
      if (outbox.length) {
        const res = await fetch('/api/scenarios/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenarios: outbox }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) throw new Error(`sync ${res.status}`);
        const { accepted, conflicts } = (await res.json()) as { accepted: string[]; conflicts: string[] };
        await markSynced(accepted);
        this.patch({ conflicts });
      }

      const since = Number(localStorage.getItem(LAST_PULL)) || 0;
      const pull = await fetch(`/api/scenarios?since=${since}`, { signal: AbortSignal.timeout(10_000) });
      if (pull.ok) {
        const { serverTime } = (await pull.json()) as { serverTime: number; scenarios: StoredScenario[] };
        localStorage.setItem(LAST_PULL, String(serverTime));
      }

      const now = Date.now();
      localStorage.setItem('farm:lastSync', String(now));
      this.patch({ lastSync: now });
    } catch {
      // Staying offline is a normal state, not an error. Keep the outbox and retry later.
    } finally {
      this.patch({ running: false });
      await this.refreshPendingCount();
    }
  }
}

export const sync = new SyncManager();
export { allScenarios };
