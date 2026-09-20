import { simulate, cropTable, modelConstants } from './simulate.js';
import type { ScenarioInput, RiskBand } from './types.js';

/** Box-Muller, seeded so the demo is reproducible. */
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function normal(rng: () => number, mean: number, sd: number): number {
  const u = Math.max(rng(), 1e-9), v = Math.max(rng(), 1e-9);
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Runs the deterministic model N times against sampled rainfall, price and
 * yield noise, and reports the profit distribution instead of a single number.
 *
 * This answers "Risk Assessment" with a probability of loss rather than a
 * made-up 0-100 score, and it still runs entirely offline in well under a second.
 */
export function runMonteCarlo(input: ScenarioInput, seed = 42): RiskBand {
  const base = simulate(input);
  const cfg = modelConstants.risk;
  const runs = cfg.monteCarloRuns;
  const rng = makeRng(seed);
  const profits: number[] = new Array(runs);

  for (let i = 0; i < runs; i++) {
    const rainfall = Math.max(0, normal(rng, input.rainfallMm, input.rainfallMm * cfg.rainfallCv));
    const price = Math.max(0, normal(rng, input.pricePerQuintal, input.pricePerQuintal * cfg.priceCv));
    const noise = Math.max(0.4, normal(rng, 1, cfg.yieldNoiseCv));
    const run = simulate({ ...input, rainfallMm: rainfall, pricePerQuintal: price });
    profits[i] = run.revenue * noise - run.cost.total;
  }

  profits.sort((a, b) => a - b);
  const pct = (p: number) => Math.round(profits[Math.floor(p * (runs - 1))]);
  const losses = profits.filter((p) => p < 0).length;

  return {
    ...base.risk,
    profitP10: pct(0.10),
    profitP50: pct(0.50),
    profitP90: pct(0.90),
    probabilityOfLoss: Math.round((losses / runs) * 1000) / 10,
  };
}

/** Which single input, if improved, cuts risk most. Used for the advice line. */
export function topRiskLever(input: ScenarioInput): string {
  const crop = cropTable[input.crop];
  const supplied = input.rainfallMm + input.irrigationMm;
  if (supplied < crop.waterRequirementMm * 0.9) return 'irrigationMm';
  if (input.pesticideCostHa < crop.recommendedProtectionHa * crop.pestPressure * 0.8) return 'pesticideCostHa';
  return 'plantingDate';
}
