import { attribute } from './attribution.js';
import { simulate } from './simulate.js';
import { defaultT, money, type Translate } from './i18n.js';
import type { ScenarioInput } from './types.js';

/**
 * Turns the attribution numbers into sentences.
 *
 * Deliberately template-based rather than generated: the text is computed from
 * the same numbers shown in the table, so it can never drift from them. Passing
 * a different `t` is all it takes to produce the same explanation in another
 * language — nothing is recomputed and nothing can disagree.
 */
export function explainComparison(
  a: ScenarioInput, b: ScenarioInput, t: Translate = defaultT, locale = 'en-IN'
): string[] {
  const { contributions, interaction, totalDelta } = attribute(a, b);
  const nameA = a.name ?? 'A';
  const nameB = b.name ?? 'B';
  const lines: string[] = [];

  if (Math.abs(totalDelta) < 1) return [t('explain.same', { a: nameA, b: nameB })];

  lines.push(
    t(totalDelta > 0 ? 'explain.betterBy' : 'explain.worseBy',
      { a: nameA, b: nameB, amount: money(totalDelta, locale) })
  );

  for (const c of contributions.slice(0, 3)) {
    const note = Math.abs(c.yieldDeltaPct) >= 0.5
      ? t('explain.yieldNote', { pct: `${c.yieldDeltaPct > 0 ? '+' : ''}${c.yieldDeltaPct}` })
      : '';
    lines.push(
      t(c.profitDelta >= 0 ? 'explain.factorAdds' : 'explain.factorCosts', {
        label: t(c.labelKey),
        from: c.field === 'crop' ? t(`crop.${c.from}`) : String(c.from),
        to: c.field === 'crop' ? t(`crop.${c.to}`) : String(c.to),
        amount: money(c.profitDelta, locale),
        note,
      })
    );
  }

  if (Math.abs(interaction) > Math.abs(totalDelta) * 0.05) {
    lines.push(t('explain.interaction', { amount: money(interaction, locale) }));
  }
  return lines;
}

/** One-scenario explanation: what is holding this plan back. */
export function explainScenario(input: ScenarioInput, t: Translate = defaultT): string[] {
  const r = simulate(input);
  const f = r.factors;
  const lines: string[] = [];

  const potential = f.water * f.nutrient * f.protection * f.sowingWindow;
  lines.push(t('explain.yieldLine', {
    yield: r.yieldQuintalHa,
    gap: Math.round((1 - potential) * 100),
  }));

  const limits: [string, number][] = [
    ['water', f.water], ['nutrient', f.nutrient],
    ['protection', f.protection], ['sowing', f.sowingWindow],
  ];
  const worst = limits.filter(([, v]) => v < 0.97).sort((x, y) => x[1] - y[1])[0];
  lines.push(
    worst
      ? t('explain.binding', {
          factor: t(`limit.${worst[0]}`),
          reason: t(`limit.${worst[0]}.reason`),
          pct: Math.round(worst[1] * 100),
        })
      : t('explain.noBinding')
  );

  lines.push(t('explain.riskLine', {
    band: t(`band.${r.risk.band}`),
    score: r.risk.score,
    driver: t(r.risk.drivers[0]?.key ?? 'driver.price').toLowerCase(),
  }));
  return lines;
}
