// ─── THE CONTRACT ────────────────────────────────────────────────────────────
// Merged on Day 1 before any other code. Every module codes against this.
// Changing it needs a PR approved by all four members (see .github/CODEOWNERS).

export type CropId = 'wheat' | 'rice' | 'cotton' | 'soybean' | 'gram' | 'tur';

export type Provenance = 'live' | 'cached' | 'default';

export interface ScenarioInput {
  id?: string;
  name?: string;
  crop: CropId;
  areaHa: number;
  /** ISO date, e.g. "2026-06-20" */
  plantingDate: string;
  /** Irrigation the farmer can actually apply, mm over the season */
  irrigationMm: number;
  /** Expected seasonal rainfall, mm. Filled from the weather API when online. */
  rainfallMm: number;
  /** Nitrogen-equivalent fertilizer, kg per hectare */
  fertilizerKgHa: number;
  /** Plant-protection spend, rupees per hectare */
  pesticideCostHa: number;
  /** Mandi price, rupees per quintal. From the market API when online. */
  pricePerQuintal: number;
  /** Hired labour, person-days per hectare */
  labourDaysHa: number;
  district?: string;
}

export interface FactorContribution {
  field: keyof ScenarioInput;
  /** Translation key, e.g. 'factor.irrigationMm' */
  labelKey: string;
  from: number | string;
  to: number | string;
  /** Rupee effect on profit, isolated by re-running the model */
  profitDelta: number;
  yieldDeltaPct: number;
}

export interface RiskDriver {
  /** Translation key, e.g. 'driver.waterDeficit'. The engine never emits
   *  display text — the renderer looks the key up in the active language. */
  key: string;
  /** Values substituted into the detail string, e.g. { supplied: 500 } */
  values: Record<string, string | number>;
  /** 0-100 contribution to the composite score */
  points: number;
}

export interface RiskBand {
  score: number;
  band: 'low' | 'medium' | 'high';
  drivers: RiskDriver[];
  /** Monte Carlo outputs — undefined until runMonteCarlo is called */
  profitP10?: number;
  profitP50?: number;
  profitP90?: number;
  probabilityOfLoss?: number;
}

export interface CostBreakdown {
  seed: number;
  fertilizer: number;
  plantProtection: number;
  irrigation: number;
  labour: number;
  machinery: number;
  total: number;
}

export interface ScenarioResult {
  input: ScenarioInput;
  yieldQuintalHa: number;
  yieldQuintalTotal: number;
  waterUsedM3: number;
  cost: CostBreakdown;
  revenue: number;
  profit: number;
  profitPerHa: number;
  /** The multipliers that produced the yield — this is what makes the model explainable */
  factors: { water: number; nutrient: number; protection: number; sowingWindow: number };
  risk: RiskBand;
  provenance: Partial<Record<keyof ScenarioInput, Provenance>>;
}

export interface StoredScenario extends ScenarioInput {
  id: string;
  createdAt: number;
  lastModified: number;
  synced: boolean;
  deleted?: boolean;
}
