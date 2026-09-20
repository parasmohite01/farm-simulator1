import { simulate } from './simulate.js';
import type { ScenarioInput, FactorContribution } from './types.js';

const TRACKED: (keyof ScenarioInput)[] = [
  'crop', 'areaHa', 'plantingDate', 'irrigationMm', 'rainfallMm',
  'fertilizerKgHa', 'pesticideCostHa', 'pricePerQuintal', 'labourDaysHa',
];

/**
 * Why is scenario B better than scenario A?
 *
 * One-at-a-time decomposition: for every input that differs, re-run the model
 * with A's values plus that single change and measure the profit it moves.
 * The leftover is reported as interaction, because the factors are not additive
 * and pretending they are would be dishonest.
 *
 * Labels are emitted as translation keys, never as text, so the same
 * attribution renders in English, Hindi or Marathi without recomputation.
 */
export function attribute(a: ScenarioInput, b: ScenarioInput): {
  contributions: FactorContribution[];
  interaction: number;
  totalDelta: number;
} {
  const baseRun = simulate(a);
  const targetRun = simulate(b);
  const totalDelta = targetRun.profit - baseRun.profit;

  const contributions: FactorContribution[] = [];
  for (const field of TRACKED) {
    if (a[field] === b[field] || b[field] === undefined) continue;
    const probe = simulate({ ...a, [field]: b[field] } as ScenarioInput);
    contributions.push({
      field,
      labelKey: `factor.${field}`,
      from: a[field] as number | string,
      to: b[field] as number | string,
      profitDelta: Math.round(probe.profit - baseRun.profit),
      yieldDeltaPct:
        Math.round(((probe.yieldQuintalHa - baseRun.yieldQuintalHa) / baseRun.yieldQuintalHa) * 1000) / 10,
    });
  }

  contributions.sort((x, y) => Math.abs(y.profitDelta) - Math.abs(x.profitDelta));
  const explained = contributions.reduce((s, c) => s + c.profitDelta, 0);
  return { contributions, interaction: Math.round(totalDelta - explained), totalDelta: Math.round(totalDelta) };
}

/** Local sensitivity: how much profit moves per 1% change in one input. */
export function sensitivity(input: ScenarioInput, field: keyof ScenarioInput): number {
  const v = input[field];
  if (typeof v !== 'number') return 0;
  const up = simulate({ ...input, [field]: v * 1.01 } as ScenarioInput);
  const down = simulate({ ...input, [field]: v * 0.99 } as ScenarioInput);
  return Math.round((up.profit - down.profit) / 2);
}
