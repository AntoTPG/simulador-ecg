import { useMemo } from 'react';
import { NORMAL_RANGES } from '../config/physiology';
import { measureAxis, measureIntervals, ventricularRate } from '../engine/measure';
import { useSim } from '../store/useSimStore';

/** Cabecera del ECG: mediciones automáticas y cambio de formato. */
export function EcgHeader() {
  const sim = useSim((s) => s.sim);
  const layout = useSim((s) => s.ecgLayout);
  const setLayout = useSim((s) => s.setEcgLayout);
  const m = useMemo(
    () => ({ ...measureIntervals(sim.params), axis: measureAxis(sim), fc: ventricularRate(sim) }),
    [sim],
  );
  const flag = (v: number, [a, b]: readonly [number, number]) => (v < a || v > b ? ' out' : '');
  const fmt = (v: number) => Math.round(v);
  const rk = sim.params.rhythm.kind;
  // El PR solo tiene sentido si cada QRS va precedido de "su" P
  const prText =
    rk === 'fa' || rk === 'fluter' || rk === 'bav3' ? 'PR —' : rk === 'wenckebach' ? 'PR variable' : `PR ${fmt(m.pr)} ms`;

  return (
    <div className="ecg-header">
      <div className="measures mono" aria-label="Mediciones">
        <span className={flag(m.fc, NORMAL_RANGES.heartRate)}>FC {m.fc} lpm</span>
        <span className={rk === 'sinusal' || rk === 'mobitz2' ? flag(m.pr, NORMAL_RANGES.pr) : ' out'}>{prText}</span>
        <span className={flag(m.qrs, NORMAL_RANGES.qrs)}>QRS {fmt(m.qrs)} ms</span>
        <span>QT {fmt(m.qt)} ms</span>
        <span className={flag(m.qtc, NORMAL_RANGES.qtc)}>QTc {fmt(m.qtc)} ms</span>
        <span className={flag(m.axis, NORMAL_RANGES.axis)}>
          Eje {m.axis > 0 ? '+' : ''}
          {fmt(m.axis)}°
        </span>
      </div>
      <div className="ecg-header-right">
        <span className="muted small">25 mm/s · 10 mm/mV</span>
        <div className="seg" role="group" aria-label="Formato del ECG">
          <button className={`btn btn-seg${layout === 'clasico' ? ' is-on' : ''}`} onClick={() => setLayout('clasico')}>
            3×4 + ritmo
          </button>
          <button className={`btn btn-seg${layout === 'simultaneo' ? ' is-on' : ''}`} onClick={() => setLayout('simultaneo')}>
            Simultáneo
          </button>
        </div>
      </div>
    </div>
  );
}
