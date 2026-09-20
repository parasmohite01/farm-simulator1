import React from 'react';
import { simulate, type ScenarioInput } from '@farm/engine';
import { useFormat, useI18n } from '../i18n/index.js';

/** Side-by-side numbers with the delta called out in its own column. */
export function CompareTable({ a, b }: { a: ScenarioInput; b: ScenarioInput }) {
  const { t } = useI18n();
  const f = useFormat();
  const ra = simulate(a), rb = simulate(b);

  const rows: { key: string; a: string; b: string; delta: number; lowerIsBetter?: boolean }[] = [
    { key: 'table.yieldHa',    a: f.num(ra.yieldQuintalHa),    b: f.num(rb.yieldQuintalHa),    delta: rb.yieldQuintalHa - ra.yieldQuintalHa },
    { key: 'table.yieldTotal', a: f.num(ra.yieldQuintalTotal), b: f.num(rb.yieldQuintalTotal), delta: rb.yieldQuintalTotal - ra.yieldQuintalTotal },
    { key: 'table.water',      a: f.num(ra.waterUsedM3),       b: f.num(rb.waterUsedM3),       delta: rb.waterUsedM3 - ra.waterUsedM3, lowerIsBetter: true },
    { key: 'table.cost',       a: f.money(ra.cost.total),      b: f.money(rb.cost.total),      delta: rb.cost.total - ra.cost.total, lowerIsBetter: true },
    { key: 'table.revenue',    a: f.money(ra.revenue),         b: f.money(rb.revenue),         delta: rb.revenue - ra.revenue },
    { key: 'table.profit',     a: f.money(ra.profit),          b: f.money(rb.profit),          delta: rb.profit - ra.profit },
    { key: 'table.risk',       a: `${ra.risk.score}/100`,      b: `${rb.risk.score}/100`,      delta: rb.risk.score - ra.risk.score, lowerIsBetter: true },
  ];

  return (
    <table className="num">
      <thead>
        <tr>
          <th>{t('table.measure')}</th>
          <th>{a.name ?? t('table.planA')}</th>
          <th>{b.name ?? t('table.planB')}</th>
          <th>{t('table.change')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const good = r.lowerIsBetter ? r.delta < 0 : r.delta > 0;
          return (
            <tr key={r.key}>
              <td>{t(r.key)}</td><td>{r.a}</td><td>{r.b}</td>
              <td className={r.delta === 0 ? '' : good ? 'gain' : 'loss'}>
                {r.delta > 0 ? '+' : ''}{f.num(Math.round(r.delta))}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
