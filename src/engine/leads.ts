/**
 * Cálculo de las derivaciones a partir del vector cardíaco H(t).
 * Ver la explicación del modelo en src/config/leads.ts.
 */
import { ELECTRODE_VECTORS, type LeadName, LEAD_NAMES, EXTRA_LEAD_NAMES } from '../config/leads';
import { add, dot, normalize, scale, sub, type Vec3 } from './math';

const E = ELECTRODE_VECTORS;

/**
 * Terminal central de Wilson (TCW): media de los potenciales de R, L y F.
 * Es la referencia "cero" de las precordiales. Con un triángulo de Einthoven
 * simétrico vale 0, pero lo calculamos igualmente para que el código sea general.
 */
const WILSON: Vec3 = scale(add(add(E.R, E.L), E.F), 1 / 3);

/**
 * Vector de cada derivación (en coordenadas del paciente). Se obtiene
 * restando vectores de electrodo, igual que el aparato resta potenciales.
 */
export const LEAD_VECTORS: Record<LeadName, Vec3> = {
  // Bipolares de Einthoven
  I: sub(E.L, E.R),
  II: sub(E.F, E.R),
  III: sub(E.F, E.L),
  // Aumentadas de Goldberger: electrodo explorador frente a la media de los otros dos
  aVR: sub(E.R, scale(add(E.L, E.F), 0.5)),
  aVL: sub(E.L, scale(add(E.R, E.F), 0.5)),
  aVF: sub(E.F, scale(add(E.R, E.L), 0.5)),
  // Precordiales de Wilson
  V1: sub(E.V1, WILSON),
  V2: sub(E.V2, WILSON),
  V3: sub(E.V3, WILSON),
  V4: sub(E.V4, WILSON),
  V5: sub(E.V5, WILSON),
  V6: sub(E.V6, WILSON),
  V3R: sub(E.V3R, WILSON),
  V4R: sub(E.V4R, WILSON),
};

/** Dirección unitaria del polo positivo de cada derivación (para dibujar su eje). */
export const LEAD_UNIT: Record<LeadName, Vec3> = Object.fromEntries(
  (Object.keys(LEAD_VECTORS) as LeadName[]).map((k) => [k, normalize(LEAD_VECTORS[k])]),
) as Record<LeadName, Vec3>;

/** Voltaje instantáneo (mV) de una derivación para un vector H dado. */
export const leadVoltage = (lead: LeadName, h: Readonly<Vec3>) => dot(LEAD_VECTORS[lead], h);

export type LeadSignals = Record<LeadName, Float32Array>;

/**
 * Calcula todas las derivaciones (12 + V3R/V4R) para un vector muestreado.
 * Se hace a partir de los potenciales de electrodo, para que Einthoven y
 * Goldberger se cumplan exactamente también en la señal numérica.
 */
export function computeLeads(hx: Float32Array, hy: Float32Array, hz: Float32Array): LeadSignals {
  const n = hx.length;
  const names = [...LEAD_NAMES, ...EXTRA_LEAD_NAMES];
  const out = Object.fromEntries(names.map((k) => [k, new Float32Array(n)])) as LeadSignals;
  const phi = (e: Vec3, i: number) => e[0] * hx[i] + e[1] * hy[i] + e[2] * hz[i];

  for (let i = 0; i < n; i++) {
    const r = phi(E.R, i);
    const l = phi(E.L, i);
    const f = phi(E.F, i);
    const wct = (r + l + f) / 3;
    out.I[i] = l - r;
    out.II[i] = f - r;
    out.III[i] = f - l;
    out.aVR[i] = r - (l + f) / 2;
    out.aVL[i] = l - (r + f) / 2;
    out.aVF[i] = f - (r + l) / 2;
    out.V1[i] = phi(E.V1, i) - wct;
    out.V2[i] = phi(E.V2, i) - wct;
    out.V3[i] = phi(E.V3, i) - wct;
    out.V4[i] = phi(E.V4, i) - wct;
    out.V5[i] = phi(E.V5, i) - wct;
    out.V6[i] = phi(E.V6, i) - wct;
    out.V3R[i] = phi(E.V3R, i) - wct;
    out.V4R[i] = phi(E.V4R, i) - wct;
  }
  return out;
}
