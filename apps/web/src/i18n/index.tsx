import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fmt, withLatinDigits, EN_ENGINE, type Translate } from '@farm/engine';
import en from './locales/en.json';
import hi from './locales/hi.json';
import mr from './locales/mr.json';

/**
 * A ~40-line translator instead of i18next.
 *
 * Why no library: all three locale files are imported statically, so they are
 * inside the precached bundle and a language switch works with the device in
 * airplane mode. An i18n library that lazy-loads translations over HTTP is the
 * one thing that must not happen in an offline-first app.
 *
 * Lookup order: active language → English → the engine's own fallback → the
 * key itself. So English needs no duplicate entries for engine strings, and a
 * missing Marathi key degrades to English rather than to a blank label.
 */
export const LANGS = { en, hi, mr } as const;
export type LangCode = keyof typeof LANGS;

const STORAGE_KEY = 'farm:lang';

type Ctx = { lang: LangCode; setLang: (l: LangCode) => void; t: Translate; locale: string };
const I18nContext = createContext<Ctx | null>(null);

const LOCALE_TAG: Record<LangCode, string> = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' };

function detect(): LangCode {
  const saved = localStorage.getItem(STORAGE_KEY) as LangCode | null;
  if (saved && saved in LANGS) return saved;
  const nav = navigator.language.slice(0, 2) as LangCode;
  return nav in LANGS ? nav : 'en';
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(detect);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = LOCALE_TAG[lang];
  }, [lang]);

  const value = useMemo<Ctx>(() => {
    const dict = LANGS[lang] as Record<string, string>;
    const base = en as Record<string, string>;
    const t: Translate = (key, vars) => fmt(dict[key] ?? base[key] ?? EN_ENGINE[key] ?? key, vars);
    return { lang, setLang: setLangState, t, locale: LOCALE_TAG[lang] };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('Wrap the app in <I18nProvider>');
  return ctx;
}

/** Money and counts use Indian digit grouping in whichever language is active. */
export function useFormat() {
  const { locale } = useI18n();
  const n = withLatinDigits(locale);   // see money() in the engine for why
  return {
    money: (v: number) => `₹${Math.abs(Math.round(v)).toLocaleString(n)}`,
    num: (v: number) => v.toLocaleString(n),
    time: (ms: number) => new Date(ms).toLocaleTimeString(locale),
    date: (ms: number) => new Date(ms).toLocaleDateString(locale),
  };
}
