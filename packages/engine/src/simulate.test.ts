import { describe, it, expect } from 'vitest';
import { simulate, waterFactor, nutrientFactor, cropTable } from './simulate.js';
import { runMonteCarlo } from './risk.js';
import { attribute } from './attribution.js';
import { explainScenario } from './explain.js';
import type { ScenarioInput } from './types.js';

const base: ScenarioInput = {
  crop: 'soybean', areaHa: 2, plantingDate: '2026-06-20',
  irrigationMm: 150, rainfallMm: 350, fertilizerKgHa: 30,
  pesticideCostHa: 3000, pricePerQuintal: 5328, labourDaysHa: 40,
};

describe('water response', () => {
  it('reaches full factor at the crop requirement', () => {
    expect(waterFactor(cropTable.soybean.waterRequirementMm, cropTable.soybean)).toBeCloseTo(1, 2);
  });
  it('penalises heavy over-irrigation rather than rewarding it', () => {
    const c = cropTable.soybean;
    expect(waterFactor(c.waterRequirementMm * 1.6, c)).toBeLessThan(1);
  });
  it('never returns a negative factor', () => {
    expect(waterFactor(0, cropTable.rice)).toBeGreaterThanOrEqual(0);
  });
});

describe('nutrient response', () => {
  it('shows diminishing returns past the recommended dose', () => {
    const c = cropTable.wheat;
    const gain1 = nutrientFactor(c.recommendedNKgHa, c) - nutrientFactor(c.recommendedNKgHa * 0.5, c);
    const gain2 = nutrientFactor(c.recommendedNKgHa * 1.5, c) - nutrientFactor(c.recommendedNKgHa, c);
    expect(gain2).toBeLessThan(gain1);
  });
});

describe('simulate', () => {
  it('is deterministic', () => {
    expect(simulate(base)).toEqual(simulate(base));
  });
  it('scales revenue and cost with area', () => {
    const big = simulate({ ...base, areaHa: 4 });
    expect(big.revenue).toBeCloseTo(simulate(base).revenue * 2, 0);
  });
  it('produces a risk score inside 0-100', () => {
    const r = simulate({ ...base, irrigationMm: 0, rainfallMm: 100, pesticideCostHa: 0 });
    expect(r.risk.score).toBeGreaterThanOrEqual(0);
    expect(r.risk.score).toBeLessThanOrEqual(100);
  });
});

describe('monte carlo', () => {
  it('orders the percentiles correctly and is reproducible', () => {
    const a = runMonteCarlo(base);
    const b = runMonteCarlo(base);
    expect(a.profitP10!).toBeLessThanOrEqual(a.profitP50!);
    expect(a.profitP50!).toBeLessThanOrEqual(a.profitP90!);
    expect(a.probabilityOfLoss).toBe(b.probabilityOfLoss);
  });
});

describe('attribution', () => {
  it('explains most of the profit gap between two scenarios', () => {
    const better = { ...base, irrigationMm: 250, fertilizerKgHa: 45 };
    const { contributions, interaction, totalDelta } = attribute(base, better);
    expect(contributions.length).toBe(2);
    expect(Math.abs(interaction)).toBeLessThan(Math.abs(totalDelta));
  });
  it('reports no contributions for identical scenarios', () => {
    expect(attribute(base, { ...base }).contributions).toHaveLength(0);
  });
});

describe('language independence', () => {
  it('emits keys, never display text, so any language renders the same numbers', () => {
    const r = simulate({ ...base, irrigationMm: 0, rainfallMm: 100 });
    for (const d of r.risk.drivers) {
      expect(d.key).toMatch(/^driver\./);
      expect(d).not.toHaveProperty('name');
    }
  });
  it('explains in whichever language the caller supplies', () => {
    const marathi = (k: string) => (k === 'explain.noBinding' ? 'मराठी' : k);
    const lines = explainScenario(base, marathi as any);
    expect(lines.join(' ')).toContain('मराठी');
  });
});
