import React, { useEffect, useMemo, useState } from 'react';
import { simulate, runMonteCarlo, explainScenario, modelConstants,
         type ScenarioInput, type StoredScenario } from '@farm/engine';
import { ParamPanel } from './ParamPanel.js';
import { StatusBar } from './StatusBar.js';
import { CompareTable } from '../compare/CompareTable.js';
import { Waterfall } from '../compare/Waterfall.js';
import { allScenarios, saveScenario, newId } from '../platform/db.js';
import { sync } from '../platform/sync.js';
import { fetchPrice, fetchRainfall, provenanceKey, type Enriched } from '../platform/api.js';
import { useFormat, useI18n } from '../i18n/index.js';

const DEFAULT: ScenarioInput = {
  crop: 'soybean', areaHa: 2, plantingDate: '2026-06-20',
  irrigationMm: 150, rainfallMm: 350, fertilizerKgHa: 30,
  pesticideCostHa: 3000, pricePerQuintal: 5328, labourDaysHa: 40,
};

export function App() {
  const { t, locale } = useI18n();
  const f = useFormat();
  const [params, setParams] = useState<ScenarioInput>(DEFAULT);
  const [saved, setSaved] = useState<StoredScenario[]>([]);
  const [baseline, setBaseline] = useState<ScenarioInput | null>(null);
  const [price, setPrice] = useState<Enriched<number> | null>(null);
  const [rain, setRain] = useState<Enriched<number> | null>(null);

  useEffect(() => { void refresh(); void sync.run(); }, []);
  useEffect(() => { void fetchPrice(params.crop).then(setPrice); }, [params.crop]);
  useEffect(() => { void fetchRainfall(21.15, 79.09).then(setRain); }, []);

  async function refresh() {
    setSaved(await allScenarios());
    await sync.refreshPendingCount();
  }

  async function save() {
    await saveScenario({ ...params, id: newId(), createdAt: Date.now() });
    await refresh();
    void sync.run();
  }

  // Recomputed on every slider move. The model is pure and synchronous, so this
  // is the whole of "interactive adaptability" — no loading state, no network.
  const result = useMemo(() => simulate(params), [params]);
  const mc = useMemo(() => runMonteCarlo(params), [params]);
  const why = useMemo(() => explainScenario(params, t), [params, t]);

  const tag = (e: Enriched<number> | null) => {
    if (!e) return null;
    const { key, vars } = provenanceKey(e);
    return <span className={`tag ${e.provenance}`}>{t(key, vars)}</span>;
  };

  const current: ScenarioInput = { ...params, name: t('table.planB') };

  return (
    <>
      <StatusBar />
      <div className="layout">
        <aside className="rail">
          <ParamPanel value={params} onChange={setParams} onSave={save}
                      priceTag={tag(price)} rainTag={tag(rain)} />
        </aside>

        <main className="stage">
          <div className="headline">
            <div className={`figure num ${result.profit >= 0 ? 'gain' : 'loss'}`}>
              {result.profit < 0 ? '−' : ''}{f.money(result.profit)}
            </div>
            <div>
              {t('result.profit', { area: params.areaHa })} ·{' '}
              <span className="num">{result.yieldQuintalHa} {t('unit.qtlHa')}</span> ·{' '}
              {t('result.risk', { band: t(`band.${result.risk.band}`), score: result.risk.score })}
            </div>
            <div className="num" style={{ marginTop: '.5rem', color: 'var(--ink-2)' }}>
              {t('result.montecarlo', {
                runs: modelConstants.risk.monteCarloRuns,
                p10: f.money(mc.profitP10!), p50: f.money(mc.profitP50!),
                p90: f.money(mc.profitP90!), pct: mc.probabilityOfLoss!,
              })}
            </div>
          </div>

          <h2>{t('heading.why')}</h2>
          <div className="why">
            <ul style={{ margin: 0, paddingInlineStart: '1.1rem' }}>
              {why.map((l, i) => <li key={i}>{l}</li>)}
            </ul>
          </div>

          <h2>{t('heading.compare')}</h2>
          {saved.length === 0 ? (
            <p>{t('compare.empty')}</p>
          ) : (
            <>
              <select value={(baseline as StoredScenario)?.id ?? ''} style={{ padding: '.6rem', minHeight: 44 }}
                      onChange={(e) => setBaseline(saved.find((s) => s.id === e.target.value) ?? null)}>
                <option value="">{t('compare.choose')}</option>
                {saved.map((s) => (
                  <option key={s.id} value={s.id}>
                    {t(`crop.${s.crop}`)} — {f.date(s.createdAt)}
                    {s.synced ? '' : ` (${t('status.notSynced')})`}
                  </option>
                ))}
              </select>
              {baseline && (
                <>
                  <CompareTable a={baseline} b={current} />
                  <h2>{t('heading.cause')}</h2>
                  <Waterfall a={baseline} b={current} />
                </>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}
