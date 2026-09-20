import React from 'react';
import { LANGS, useI18n, type LangCode } from '../i18n/index.js';

/** Sits in the top bar. Switching is instant and needs no network. */
export function LanguageSwitch() {
  const { lang, setLang, t } = useI18n();
  return (
    <label style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}>
      <span className="visually-hidden">{t('action.language')}</span>
      <select value={lang} onChange={(e) => setLang(e.target.value as LangCode)}
              style={{ background: 'transparent', color: 'inherit', border: '1px solid currentColor',
                       borderRadius: 3, padding: '.2rem .4rem', font: 'inherit', minHeight: 32 }}>
        {(Object.keys(LANGS) as LangCode[]).map((code) => (
          <option key={code} value={code} style={{ color: '#16211C' }}>
            {(LANGS[code] as Record<string, string>)['lang.name']}
          </option>
        ))}
      </select>
    </label>
  );
}
