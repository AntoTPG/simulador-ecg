/**
 * MEDICIONES sobre la señal simulada, como haría quien lee el ECG:
 * intervalos (PR, QRS, QT, QTc) y eje eléctrico.
 */
import { LEAD_VECTORS } from './leads';
import { mod, norm, rad2deg } from './math';
import { qtFromQtc, type SimParams } from './params';
import type { SimResult } from './simulate';
import { waveExtent } from './waves';

export interface Intervals {
  rr: number;
  pr: number;
  pDuration: number;
  qrs: number;
  qt: number;
  /** QT corregido por Bazett. */
  qtc: number;
}

/**
 * Intervalos medidos sobre las ondas: se buscan los puntos donde cada onda
 * empieza y termina de verdad (umbral del 5 % de su pico), no los parámetros
 * nominales. Así comprobamos que la forma de las ondas es coherente con ellos.
 */
export function measureIntervals(p: SimParams): Intervals {
  const rr = 60000 / p.heartRate;
  const qtNominal = qtFromQtc(p.qtc, p.heartRate);
  const tDur = Math.max(100, qtNominal - p.qrsDuration);
  const [pA, pB] = waveExtent(p.waves.P);
  const [qA, qB] = waveExtent(p.waves.QRS);
  const [, tB] = waveExtent(p.waves.T);

  const pOn = pA * p.pDuration;
  const qrsOn = p.prInterval + qA * p.qrsDuration;
  const qrsOff = p.prInterval + qB * p.qrsDuration;
  const tOff = p.prInterval + p.qrsDuration + tB * tDur;
  const qt = tOff - qrsOn;
  return {
    rr,
    pr: qrsOn - pOn,
    pDuration: (pB - pA) * p.pDuration,
    qrs: qrsOff - qrsOn,
    qt,
    qtc: qt / Math.sqrt(rr / 1000),
  };
}

/**
 * EJE ELÉCTRICO a partir de las derivaciones I y aVF (método clásico):
 * se integra el área neta del QRS en I (componente horizontal) y en aVF
 * (componente vertical), se corrige por la "longitud" de cada derivación y
 * el eje es el ángulo del vector resultante.
 */
export function measureAxis(sim: SimResult, beatIndex = 0): number {
  const seg = sim.segments.find((s) => s.kind === 'QRS' && s.beat === beatIndex);
  if (!seg) return NaN;
  const dt = 1000 / sim.sampleRate;
  let aI = 0;
  let aF = 0;
  for (let t = seg.start; t <= seg.end; t += dt) {
    const k = mod(Math.round(t / dt), sim.n);
    aI += sim.leads.I[k];
    aF += sim.leads.aVF[k];
  }
  const x = aI / norm(LEAD_VECTORS.I);
  const y = aF / norm(LEAD_VECTORS.aVF);
  return rad2deg(Math.atan2(y, x));
}

/** Área neta (mV·ms) de una derivación durante el QRS de un latido. */
export function qrsNetArea(sim: SimResult, lead: keyof SimResult['leads'], beatIndex = 0): number {
  const seg = sim.segments.find((s) => s.kind === 'QRS' && s.beat === beatIndex);
  if (!seg) return NaN;
  const dt = 1000 / sim.sampleRate;
  let a = 0;
  for (let t = seg.start; t <= seg.end; t += dt) a += sim.leads[lead][mod(Math.round(t / dt), sim.n)] * dt;
  return a;
}

/** Pico máximo (positivo) y mínimo (negativo) de una derivación durante el QRS. */
export function qrsPeaks(sim: SimResult, lead: keyof SimResult['leads'], beatIndex = 0): { r: number; s: number } {
  const seg = sim.segments.find((s) => s.kind === 'QRS' && s.beat === beatIndex);
  if (!seg) return { r: NaN, s: NaN };
  const dt = 1000 / sim.sampleRate;
  let r = 0;
  let s = 0;
  for (let t = seg.start; t <= seg.end; t += dt) {
    const v = sim.leads[lead][mod(Math.round(t / dt), sim.n)];
    if (v > r) r = v;
    if (v < s) s = v;
  }
  return { r, s };
}
