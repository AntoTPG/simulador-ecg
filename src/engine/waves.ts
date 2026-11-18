/**
 * ONDAS COMO BUCLES VECTORIALES
 * -----------------------------
 * Cada onda (P, QRS, T, U) es un pequeño bucle que dibuja la punta del vector
 * cardíaco en el espacio: el bucle vectocardiográfico. Lo construimos como una
 * suma de "lóbulos": gaussianas en el tiempo, cada una con una dirección 3D.
 *
 *   H_onda(t) = Σ_i  v_i · g( (t − t0)/D ;  at_i, wl_i, wr_i )
 *
 *  - D: duración de la onda (ms). Los tiempos de los lóbulos son FRACCIONES de D,
 *    así una onda se ensancha o se estrecha sin cambiar de forma (útil para un
 *    QRS ancho en un bloqueo de rama o un QT largo).
 *  - v_i: dirección y amplitud (mV) del lóbulo en coordenadas del paciente.
 *  - Como lóbulos sucesivos apuntan a sitios distintos y se solapan en el
 *    tiempo, la punta del vector traza un BUCLE, no una línea recta.
 */
import { rotateFrontal, skewGauss, type Vec3 } from './math';

export interface Lobe {
  /** Momento del pico, como fracción de la duración de la onda (0 = inicio, 1 = final). */
  at: number;
  /** Anchura (sigma) antes del pico, en fracción de la duración. */
  wl: number;
  /** Anchura (sigma) después del pico, en fracción de la duración. */
  wr: number;
  /** Dirección y amplitud del lóbulo (mV), coordenadas del paciente. */
  v: Vec3;
}

export type WaveKind = 'P' | 'QRS' | 'T' | 'U';

/** Vector de una onda en el instante relativo `tRel` (ms desde su inicio). */
export function evalWave(lobes: readonly Lobe[], durationMs: number, tRel: number): Vec3 {
  const out: Vec3 = [0, 0, 0];
  const x = tRel / durationMs;
  for (const l of lobes) {
    const g = skewGauss(x, l.at, l.wl, l.wr);
    out[0] += l.v[0] * g;
    out[1] += l.v[1] * g;
    out[2] += l.v[2] * g;
  }
  return out;
}

/** Gira todos los lóbulos en el plano frontal (cambio del eje eléctrico). */
export const rotateLobes = (lobes: readonly Lobe[], deg: number): Lobe[] =>
  lobes.map((l) => ({ ...l, v: rotateFrontal(l.v, deg) }));

/** Escala la amplitud de todos los lóbulos. */
export const scaleLobes = (lobes: readonly Lobe[], k: number): Lobe[] =>
  lobes.map((l) => ({ ...l, v: [l.v[0] * k, l.v[1] * k, l.v[2] * k] as Vec3 }));

/**
 * Inicio y final "visibles" de una onda, en fracción de su duración: donde el
 * módulo del vector supera un `threshold` (5 %) de su máximo. Es lo que haría
 * un lector humano al buscar dónde empieza y acaba la onda en el papel.
 */
export function waveExtent(lobes: readonly Lobe[], threshold = 0.05): [number, number] {
  const N = 3000;
  const from = -1;
  const to = 2;
  const mags = new Float64Array(N);
  let peak = 0;
  for (let i = 0; i < N; i++) {
    const v = evalWave(lobes, 1, from + ((to - from) * i) / (N - 1));
    mags[i] = Math.hypot(v[0], v[1], v[2]);
    if (mags[i] > peak) peak = mags[i];
  }
  if (peak === 0) return [0, 0];
  let a = 0;
  let b = N - 1;
  while (a < N && mags[a] < threshold * peak) a++;
  while (b > 0 && mags[b] < threshold * peak) b--;
  const toFrac = (i: number) => from + ((to - from) * i) / (N - 1);
  return [toFrac(a), toFrac(b)];
}

/**
 * Vector medio de una onda (integral en el tiempo, por unidad de duración).
 * El área de una gaussiana asimétrica es √(2π)/2 · (σL + σR).
 * El ángulo frontal del vector medio del QRS ES el eje eléctrico.
 */
export function meanVector(lobes: readonly Lobe[]): Vec3 {
  const k = Math.sqrt(2 * Math.PI) / 2;
  const out: Vec3 = [0, 0, 0];
  for (const l of lobes) {
    const area = k * (l.wl + l.wr);
    out[0] += l.v[0] * area;
    out[1] += l.v[1] * area;
    out[2] += l.v[2] * area;
  }
  return out;
}
