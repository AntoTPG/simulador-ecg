/**
 * MOTOR DE SIMULACIÓN
 * ===================
 *   1. El planificador decide cuándo ocurre cada P y cada QRS.
 *   2. Se suma en un búfer circular el bucle vectorial de cada onda colocada en
 *      su instante → H(t) muestreado (hx, hy, hz).
 *   3. Se proyecta H(t) sobre los electrodos → 12 derivaciones (+ V3R/V4R).
 *
 * El búfer es CIRCULAR: el registro se repite en bucle y una onda que se sale
 * por el final reaparece por el principio, así el bucle no tiene costuras.
 */
import { computeLeads, type LeadSignals } from './leads';
import { mod, skewGauss, smoothstep, type Vec3 } from './math';
import { U_WAVE } from './normalWaves';
import { qtFromQtc, type SimParams } from './params';
import { scheduleRhythm, type Beat } from './rhythm';
import { waveExtent, type Lobe, type WaveKind } from './waves';

export type SegmentKind = WaveKind | 'PR' | 'ST';

export interface Segment {
  kind: SegmentKind;
  start: number;
  end: number;
  beat: number;
}

export interface BeatTiming extends Beat {
  /** Ventana del latido para dibujar su bucle (ms, puede salirse del registro). */
  start: number;
  end: number;
  qt: number;
}

export interface SimResult {
  params: SimParams;
  sampleRate: number;
  /** Duración del registro en bucle (ms). */
  duration: number;
  n: number;
  hx: Float32Array;
  hy: Float32Array;
  hz: Float32Array;
  leads: LeadSignals;
  segments: Segment[];
  beats: BeatTiming[];
}

/** Suma un bucle vectorial (onda) en el búfer circular. */
function addWave(
  buf: [Float32Array, Float32Array, Float32Array],
  lobes: readonly Lobe[],
  durationMs: number,
  t0: number,
  dt: number,
) {
  const n = buf[0].length;
  for (const l of lobes) {
    const center = t0 + l.at * durationMs;
    const sl = l.wl * durationMs;
    const sr = l.wr * durationMs;
    // ±4 sigmas cubren el 99,99 % de la gaussiana
    const i0 = Math.floor((center - 4 * sl) / dt);
    const i1 = Math.ceil((center + 4 * sr) / dt);
    for (let i = i0; i <= i1; i++) {
      const g = skewGauss(i * dt, center, sl, sr);
      const k = mod(i, n);
      buf[0][k] += l.v[0] * g;
      buf[1][k] += l.v[1] * g;
      buf[2][k] += l.v[2] * g;
    }
  }
}

/**
 * Suma un vector CONSTANTE entre `a` y `b` con bordes suaves. Sirve para los
 * desplazamientos de segmentos (ST por corriente de lesión, PR en pericarditis).
 */
function addPlateau(
  buf: [Float32Array, Float32Array, Float32Array],
  v: Readonly<Vec3>,
  a: number,
  b: number,
  ramp: number,
  dt: number,
) {
  if (v[0] === 0 && v[1] === 0 && v[2] === 0) return;
  const n = buf[0].length;
  const r = Math.min(ramp, (b - a) / 2);
  for (let i = Math.floor(a / dt); i <= Math.ceil(b / dt); i++) {
    const t = i * dt;
    const w = smoothstep(a, a + r, t) * (1 - smoothstep(b - r, b, t));
    const k = mod(i, n);
    buf[0][k] += v[0] * w;
    buf[1][k] += v[1] * w;
    buf[2][k] += v[2] * w;
  }
}

/** Cache de los límites visibles de cada onda (dependen solo de la forma). */
const extentCache = new WeakMap<readonly Lobe[], [number, number]>();
function extentOf(lobes: readonly Lobe[]) {
  let e = extentCache.get(lobes);
  if (!e) {
    e = waveExtent(lobes);
    extentCache.set(lobes, e);
  }
  return e;
}

export function simulate(p: SimParams): SimResult {
  const schedule = scheduleRhythm(p);
  const dt = 1000 / p.sampleRate;
  const n = Math.max(1, Math.round(schedule.duration / dt));
  const duration = n * dt;
  const buf: [Float32Array, Float32Array, Float32Array] = [
    new Float32Array(n),
    new Float32Array(n),
    new Float32Array(n),
  ];

  // (El eje ya viene aplicado en los lóbulos: ver defaultParams.)
  const qrs = p.waves.QRS;
  const tw = p.waves.T;
  const uw = p.waves.U;

  const extP = extentOf(p.waves.P);
  const extQRS = extentOf(p.waves.QRS);
  const extT = extentOf(p.waves.T);
  const extU = extentOf(p.waves.U);

  const segments: Segment[] = [];
  const beats: BeatTiming[] = [];
  const pushSeg = (kind: SegmentKind, start: number, end: number, beat: number) => {
    if (end <= start) return;
    // Normalizamos al registro; si cruza el final, lo partimos en dos trozos.
    const s = mod(start, duration);
    const e = s + (end - start);
    if (e <= duration) segments.push({ kind, start: s, end: e, beat });
    else {
      segments.push({ kind, start: s, end: duration, beat });
      segments.push({ kind, start: 0, end: e - duration, beat });
    }
  };

  for (const b of schedule.beats) {
    const qt = qtFromQtc(p.qtc, 60000 / b.rr);
    let pEnd: number | null = null;

    if (b.pOnset !== null) {
      addWave(buf, p.waves.P, p.pDuration, b.pOnset, dt);
      pushSeg('P', b.pOnset + extP[0] * p.pDuration, b.pOnset + extP[1] * p.pDuration, b.index);
      pEnd = b.pOnset + extP[1] * p.pDuration;
    }

    if (b.qrsOnset !== null) {
      const q0 = b.qrsOnset;
      const j = q0 + p.qrsDuration; // punto J: fin del QRS, inicio del ST
      const tDur = Math.max(100, qt - p.qrsDuration);
      addWave(buf, qrs, p.qrsDuration, q0, dt);
      addWave(buf, tw, tDur, j, dt);
      addWave(buf, uw, U_WAVE.duration, q0 + qt + U_WAVE.gapAfterT, dt);
      addPlateau(buf, p.stVector, j - 5, q0 + qt, 25, dt);

      const qrsA = q0 + extQRS[0] * p.qrsDuration;
      const qrsB = q0 + extQRS[1] * p.qrsDuration;
      const tA = j + Math.max(0, extT[0]) * tDur;
      const tB = j + extT[1] * tDur;
      if (pEnd !== null) {
        pushSeg('PR', pEnd, qrsA, b.index);
        addPlateau(buf, p.prSegmentVector, b.pOnset! + p.pDuration * 0.6, q0, 20, dt);
      }
      pushSeg('QRS', qrsA, qrsB, b.index);
      pushSeg('ST', qrsB, tA, b.index);
      pushSeg('T', tA, tB, b.index);
      const u0 = q0 + qt + U_WAVE.gapAfterT;
      pushSeg('U', u0 + extU[0] * U_WAVE.duration, u0 + extU[1] * U_WAVE.duration, b.index);
    }

    const start = (b.pOnset ?? b.qrsOnset ?? 0) - 60;
    beats.push({ ...b, start, end: start + b.rr, qt });
  }

  segments.sort((a, b) => a.start - b.start);

  return {
    params: p,
    sampleRate: p.sampleRate,
    duration,
    n,
    hx: buf[0],
    hy: buf[1],
    hz: buf[2],
    leads: computeLeads(buf[0], buf[1], buf[2]),
    segments,
    beats,
  };
}

/** Interpolación lineal en un búfer circular (t en ms). */
export function sampleSignal(sig: Float32Array, sampleRate: number, t: number): number {
  const n = sig.length;
  const x = (t * sampleRate) / 1000;
  const i = Math.floor(x);
  const f = x - i;
  return sig[mod(i, n)] * (1 - f) + sig[mod(i + 1, n)] * f;
}

/** Vector cardíaco H(t) interpolado. */
export function sampleH(sim: SimResult, t: number): Vec3 {
  return [
    sampleSignal(sim.hx, sim.sampleRate, t),
    sampleSignal(sim.hy, sim.sampleRate, t),
    sampleSignal(sim.hz, sim.sampleRate, t),
  ];
}

/** Segmento (onda) activo en el instante t, o null si es línea de base (TP). */
export function segmentAt(sim: SimResult, t: number): Segment | null {
  const tt = mod(t, sim.duration);
  for (const s of sim.segments) if (tt >= s.start && tt < s.end) return s;
  return null;
}

/** Latido al que pertenece el instante t (para dibujar su bucle). */
export function beatAt(sim: SimResult, t: number): BeatTiming {
  const tt = mod(t, sim.duration);
  for (const b of sim.beats) {
    const rel = mod(tt - b.start, sim.duration);
    if (rel < b.rr) return b;
  }
  return sim.beats[0];
}
