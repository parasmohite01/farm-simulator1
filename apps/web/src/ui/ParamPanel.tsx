import React from 'react';
import type { ScenarioInput, CropId } from '@farm/engine';
import { cropTable } from '@farm/engine';
import { useI18n } from '../i18n/index.js';

type Props = {
  value: ScenarioInput;
  onChange: (next: ScenarioInput) => void;
  onSave: () => void;
  priceTag?: React.ReactNode;
  rainTag?: React.ReactNode;
};

export function ParamPanel({ value, onChange, onSave, priceTag, rainTag }: Props) {
  const { t } = useI18n();
  const set = <K extends keyof ScenarioInput>(k: K, v: ScenarioInput[K]) => onChange({ ...value, [k]: v });

  return (
    <div>
      <h1>{t('app.title')}</h1>
      <p style={{ marginTop: 0, color: 'var(--ink-2)' }}>{t('app.subtitle')}</p>

      <div className="field">
        <label htmlFor="crop">{t('field.crop')}</label>
        <select id="crop" value={value.crop} onChange={(e) => set('crop', e.target.value as CropId)}>
          {Object.keys(cropTable).map((id) => (
            <option key={id} value={id}>{t(`crop.${id}`)}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="date">{t('field.sowingDate')}</label>
        <input id="date" type="date" value={value.plantingDate}
               onChange={(e) => set('plantingDate', e.target.value)} />
      </div>

      <Slider k="field.area"        u="unit.ha"     min={0.5} max={20}    step={0.5} value={value.areaHa}          onChange={(v) => set('areaHa', v)} />
      <Slider k="field.irrigation"  u="unit.mm"     min={0}   max={1200}  step={25}  value={value.irrigationMm}    onChange={(v) => set('irrigationMm', v)} />
      <Slider k="field.rainfall"    u="unit.mm"     min={0}   max={1500}  step={25}  value={value.rainfallMm}      onChange={(v) => set('rainfallMm', v)} tag={rainTag} />
      <Slider k="field.fertilizer"  u="unit.kgHa"   min={0}   max={200}   step={5}   value={value.fertilizerKgHa}  onChange={(v) => set('fertilizerKgHa', v)} />
      <Slider k="field.protection"  u="unit.rsHa"   min={0}   max={12000} step={250} value={value.pesticideCostHa} onChange={(v) => set('pesticideCostHa', v)} />
      <Slider k="field.labour"      u="unit.daysHa" min={0}   max={120}   step={5}   value={value.labourDaysHa}    onChange={(v) => set('labourDaysHa', v)} />
      <Slider k="field.price"       u="unit.rsQtl"  min={500} max={12000} step={50}  value={value.pricePerQuintal} onChange={(v) => set('pricePerQuintal', v)} tag={priceTag} />

      <button className="button" onClick={onSave}>{t('action.save')}</button>
    </div>
  );
}

function Slider(props: {
  k: string; u: string; min: number; max: number; step: number;
  value: number; onChange: (v: number) => void; tag?: React.ReactNode;
}) {
  const { t } = useI18n();
  const id = props.k.replace(/\W/g, '');
  return (
    <div className="field">
      <label htmlFor={id}>
        <span>{t(props.k)} {props.tag}</span>
        <span className="num">{props.value} {t(props.u)}</span>
      </label>
      <input id={id} type="range" min={props.min} max={props.max} step={props.step}
             value={props.value} onChange={(e) => props.onChange(Number(e.target.value))} />
    </div>
  );
}
