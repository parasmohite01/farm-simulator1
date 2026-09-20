/**
 * The engine stays pure, but its output contains sentences and risk-driver
 * names that a farmer reads. So the engine never hardcodes those strings — it
 * emits KEYS, and whoever renders them supplies a translate function.
 *
 * The API server has no locale files, so an English fallback ships here.
 */
export type Translate = (key: string, vars?: Record<string, string | number>) => string;

export function fmt(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

/** English fallback for the keys the engine itself produces. */
export const EN_ENGINE: Record<string, string> = {
  'crop.wheat': 'Wheat',
  'crop.rice': 'Rice',
  'crop.cotton': 'Cotton',
  'crop.soybean': 'Soybean',
  'crop.gram': 'Gram (chana)',
  'crop.tur': 'Tur (pigeon pea)',

  'band.low': 'low',
  'band.medium': 'medium',
  'band.high': 'high',

  'driver.waterDeficit': 'Water deficit',
  'driver.waterDeficit.detail': '{supplied} mm available against {needed} mm needed',
  'driver.waterlogging': 'Waterlogging',
  'driver.waterlogging.detail': 'Supply exceeds the requirement by more than 25%',
  'driver.pest': 'Pest and disease',
  'driver.pest.detail': 'Protection spend covers {cover}% of the recommended level',
  'driver.sowingDate': 'Sowing date',
  'driver.sowingDate.detail': 'Sowing falls outside the recommended window',
  'driver.price': 'Price volatility',
  'driver.price.detail': 'Historical price variation for this crop is about ±{cv}%',

  'limit.water': 'Water',
  'limit.water.reason': 'irrigation and rainfall together fall short of the crop requirement',
  'limit.nutrient': 'Nutrients',
  'limit.nutrient.reason': 'fertilizer is below the recommended dose',
  'limit.protection': 'Plant protection',
  'limit.protection.reason': 'protection spend does not cover the pest pressure',
  'limit.sowing': 'Sowing date',
  'limit.sowing.reason': 'sowing falls outside the recommended window',

  'explain.yieldLine': 'Expected yield is {yield} quintal per hectare, {gap}% below this crop’s potential on your land.',
  'explain.binding': '{factor} is the binding constraint — {reason}, holding yield to {pct}% of potential.',
  'explain.noBinding': 'No single input is limiting yield; this plan is close to the crop’s potential.',
  'explain.riskLine': 'Risk is {band} at {score} out of 100, driven mainly by {driver}.',
  'explain.same': '{b} and {a} end up within a rupee of each other on profit.',
  'explain.betterBy': '{b} earns {amount} more than {a}.',
  'explain.worseBy': '{b} earns {amount} less than {a}.',
  'explain.factorAdds': '{label} changes from {from} to {to}, which adds {amount}{note}.',
  'explain.factorCosts': '{label} changes from {from} to {to}, which costs {amount}{note}.',
  'explain.yieldNote': ' and moves yield by {pct}%',
  'explain.interaction': '{amount} comes from the factors acting together rather than from any single change.',

  'factor.crop': 'Crop choice',
  'factor.areaHa': 'Area sown',
  'factor.plantingDate': 'Sowing date',
  'factor.irrigationMm': 'Irrigation',
  'factor.rainfallMm': 'Expected rainfall',
  'factor.fertilizerKgHa': 'Fertilizer',
  'factor.pesticideCostHa': 'Plant protection',
  'factor.pricePerQuintal': 'Market price',
  'factor.labourDaysHa': 'Hired labour',
};

export const defaultT: Translate = (key, vars) => fmt(EN_ENGINE[key] ?? key, vars);

/**
 * Indian digit grouping (1,00,000 not 100,000) with Latin numerals pinned.
 *
 * Without `-u-nu-latn`, Intl renders Marathi amounts in Devanagari digits
 * (₹२०,१५९) while Hindi stays Latin — so the same screen mixed two numeral
 * systems. Farmers read prices in Latin digits on every mandi board and
 * receipt, so we pin them everywhere.
 */
export function money(n: number, locale = 'en-IN'): string {
  return `₹${Math.abs(Math.round(n)).toLocaleString(withLatinDigits(locale))}`;
}

export const withLatinDigits = (locale: string) =>
  locale.includes('-u-nu-') ? locale : `${locale}-u-nu-latn`;
