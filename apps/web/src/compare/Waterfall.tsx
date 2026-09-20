import React from 'react';
import { attribute, explainComparison, type ScenarioInput } from '@farm/engine';
import { useFormat, useI18n } from '../i18n/index.js';

/**
 * The explainability panel. Every bar is a real re-run of the model with one
 * input swapped, so the chart can never contradict the table above it — and
 * because the engine returns keys rather than text, the same numbers render in
 * whichever language is selected.
 */
export function Waterfall({ a, b }: { a: ScenarioInput; b: ScenarioInput }) {
  const { t, locale } = useI18n();
  const f = useFormat();
  const { contributions, interaction, totalDelta } = attribute(a, b);
  const lines = explainComparison(a, b, t, locale);
  if (!contributions.length) return <p>{t('compare.identical')}</p>;

  const bars = [
    ...contributions.map((c) => ({ label: t(c.labelKey), value: c.profitDelta })),
    ...(Math.abs(interaction) > 1 ? [{ label: t('compare.combined'), value: interaction }] : []),
  ];
  const scale = Math.max(...bars.map((x) => Math.abs(x.value)), 1);

  return (
    <div>
      <div style={{ display: 'grid', gap: '.4rem', marginBottom: '1rem' }}>
        {bars.map((x) => (
          <div key={x.label} style={{ display: 'grid', gridTemplateColumns: '11rem 1fr 7rem', alignItems: 'center', gap: '.5rem' }}>
            <span>{x.label}</span>
            <span style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              <span style={{ justifySelf: 'end', width: x.value < 0 ? `${(Math.abs(x.value) / scale) * 100}%` : 0, height: 18, background: 'var(--loss)' }} />
              <span style={{ width: x.value > 0 ? `${(x.value / scale) * 100}%` : 0, height: 18, background: 'var(--gain)' }} />
            </span>
            <span className={`num ${x.value >= 0 ? 'gain' : 'loss'}`} style={{ textAlign: 'right' }}>
              {x.value > 0 ? '+' : '−'}{f.money(x.value)}
            </span>
          </div>
        ))}
      </div>
      <div className="why">
        <ul style={{ margin: 0, paddingInlineStart: '1.1rem' }}>
          {lines.map((l, i) => <li key={i}>{l}</li>)}
        </ul>
      </div>
      <p className="num" style={{ fontWeight: 700 }}>
        {t('compare.net')}: {totalDelta > 0 ? '+' : '−'}{f.money(totalDelta)}
      </p>
    </div>
  );
}
