import model from './model.json' with { type: 'json' };
import type { ScenarioInput, ScenarioResult, CostBreakdown, RiskDriver, RiskBand } from './types.js';

type CropParams = (typeof model.crops)['wheat'];
const crops = model.crops as Record<string, CropParams>;
const econ = model.economics;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function dayOfYear(iso: string): number {
  const d = new Date(iso + 'T00:00:00Z');
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.floor((d.getTime() - start) / 86_400_000) + 1;
}

/**
 * FAO-33 water production function.
 *   1 - Ky * (1 - ETa/ETm)
 * Above the requirement we add a waterlogging penalty instead of a bonus —
 * more water is not free yield, and modelling that is what separates this from
 * a linear toy model.
 */
export function waterFactor(suppliedMm: number, crop: CropParams): number {
  const ratio = suppliedMm / crop.waterRequirementMm;
  if (ratio >= 1) {
    const excess = ratio - 1;
    return clamp(1 - 0.25 * Math.max(0, excess - 0.15), 0, 1);
  }
  return clamp(1 - crop.ky * (1 - ratio), 0, 1);
}

/**
 * Mitscherlich diminishing-returns response to nitrogen.
 * Tuned so that applying the recommended dose reaches ~95% of potential
 * and doubling it adds almost nothing.
 */
export function nutrientFactor(appliedKgHa: number, crop: CropParams): number {
  const k = 3.0;
  const ratio = appliedKgHa / crop.recommendedNKgHa;
  return clamp((1 - Math.exp(-k * ratio)) / (1 - Math.exp(-k)), 0, 1.02);
}

/** Plant-protection spend vs. the pest pressure the crop actually faces. */
export function protectionFactor(spendHa: number, crop: CropParams): number {
  const need = crop.recommendedProtectionHa * crop.pestPressure;
  if (need <= 0) return 1;
  const cover = clamp(spendHa / need, 0, 1.5);
  const maxLoss = 0.30 * crop.pestPressure;
  return clamp(1 - maxLoss * (1 - Math.min(cover, 1)), 0, 1);
}

/** Yield penalty for sowing outside the agronomic window. */
export function sowingFactor(plantingDate: string, crop: CropParams): number {
  const doy = dayOfYear(plantingDate);
  const [start, end] = crop.sowingWindow;
  let daysOff = 0;
  if (doy < start) daysOff = start - doy;
  else if (doy > end) daysOff = doy - end;
  // wrap-around for rabi windows crossing the new year
  if (daysOff > 182) daysOff = 365 - daysOff;
  return clamp(1 - crop.sowingPenaltyPerDay * daysOff, 0.3, 1);
}

function buildCost(input: ScenarioInput, crop: CropParams): CostBreakdown {
  const seed = crop.seedCostPerHa;
  const fertilizer = input.fertilizerKgHa * econ.fertilizerCostPerKgN;
  const plantProtection = input.pesticideCostHa;
  const irrigation = input.irrigationMm * econ.irrigationCostPerMmHa;
  const labour = input.labourDaysHa * econ.labourWagePerDay;
  const machinery = econ.machineryCostPerHa;
  const perHa = seed + fertilizer + plantProtection + irrigation + labour + machinery;
  const a = input.areaHa;
  return {
    seed: seed * a, fertilizer: fertilizer * a, plantProtection: plantProtection * a,
    irrigation: irrigation * a, labour: labour * a, machinery: machinery * a,
    total: perHa * a,
  };
}

function assessRisk(input: ScenarioInput, f: ScenarioResult['factors'], crop: CropParams): RiskBand {
  const drivers: RiskDriver[] = [];
  const supplied = input.rainfallMm + input.irrigationMm;
  const deficit = 1 - clamp(supplied / crop.waterRequirementMm, 0, 1);

  if (deficit > 0.02) {
    drivers.push({
      key: 'driver.waterDeficit',
      values: { supplied: Math.round(supplied), needed: crop.waterRequirementMm },
      points: Math.round(deficit * 45),
    });
  }
  if (supplied > crop.waterRequirementMm * 1.25) {
    drivers.push({ key: 'driver.waterlogging', values: {}, points: 12 });
  }
  const protectionGap = 1 - clamp(input.pesticideCostHa / (crop.recommendedProtectionHa * crop.pestPressure), 0, 1);
  if (protectionGap > 0.05) {
    drivers.push({
      key: 'driver.pest',
      values: { cover: Math.round((1 - protectionGap) * 100) },
      points: Math.round(protectionGap * 30 * crop.pestPressure),
    });
  }
  if (f.sowingWindow < 0.98) {
    drivers.push({ key: 'driver.sowingDate', values: {}, points: Math.round((1 - f.sowingWindow) * 60) });
  }
  drivers.push({
    key: 'driver.price',
    values: { cv: Math.round(model.risk.priceCv * 100) },
    points: Math.round(model.risk.priceCv * 55),
  });

  const score = clamp(drivers.reduce((s, d) => s + d.points, 0), 0, 100);
  const band = score < 30 ? 'low' : score < 60 ? 'medium' : 'high';
  drivers.sort((a, b) => b.points - a.points);
  return { score: Math.round(score), band, drivers };
}

/**
 * The whole model. Pure, synchronous, deterministic, and completely offline.
 * Same function runs in the browser and on the server — that parity is the point.
 */
export function simulate(input: ScenarioInput): ScenarioResult {
  const crop = crops[input.crop];
  if (!crop) throw new Error(`Unknown crop: ${input.crop}`);

  const factors = {
    water: waterFactor(input.rainfallMm + input.irrigationMm, crop),
    nutrient: nutrientFactor(input.fertilizerKgHa, crop),
    protection: protectionFactor(input.pesticideCostHa, crop),
    sowingWindow: sowingFactor(input.plantingDate, crop),
  };

  const yieldQuintalHa =
    crop.baseYieldQtlHa * factors.water * factors.nutrient * factors.protection * factors.sowingWindow;
  const yieldQuintalTotal = yieldQuintalHa * input.areaHa;

  const cost = buildCost(input, crop);
  const revenue = yieldQuintalTotal * input.pricePerQuintal;
  const profit = revenue - cost.total;

  return {
    input,
    yieldQuintalHa: round2(yieldQuintalHa),
    yieldQuintalTotal: round2(yieldQuintalTotal),
    waterUsedM3: Math.round(input.irrigationMm * 10 * input.areaHa),
    cost,
    revenue: Math.round(revenue),
    profit: Math.round(profit),
    profitPerHa: Math.round(profit / input.areaHa),
    factors,
    risk: assessRisk(input, factors, crop),
    provenance: {},
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
export { crops as cropTable, model as modelConstants };
