import React, { useEffect, useState } from 'react';
import { sync, type SyncState } from '../platform/sync.js';
import { useFormat, useI18n } from '../i18n/index.js';
import { LanguageSwitch } from './LanguageSwitch.js';

export function StatusBar() {
  const [s, setS] = useState<SyncState | null>(null);
  const { t } = useI18n();
  const f = useFormat();
  useEffect(() => sync.subscribe(setS), []);
  if (!s) return null;

  return (
    <div className={`bar ${s.online ? '' : 'offline'}`}>
      <strong>{t(s.online ? 'status.online' : 'status.offline')}</strong>
      <span>{t(s.online ? 'status.onlineNote' : 'status.offlineNote')}</span>
      <span className="spacer num">
        {s.pending > 0 && t('status.pending', { n: s.pending })}
        {s.pending === 0 && s.lastSync && t('status.synced', { time: f.time(s.lastSync) })}
      </span>
      {s.online && s.pending > 0 && (
        <button className="button secondary" style={{ width: 'auto', minHeight: 32, padding: '0 .75rem' }}
                onClick={() => sync.run()} disabled={s.running}>
          {t(s.running ? 'action.syncing' : 'action.syncNow')}
        </button>
      )}
      <LanguageSwitch />
    </div>
  );
}
