/**
 * ============================================================================
 *  BUCLE PRESIÓN‑VOLUMEN DEL VENTRÍCULO IZQUIERDO
 * ============================================================================
 * Traduce los tres determinantes clásicos del volumen de eyección a los
 * parámetros del modelo hemodinámico (`hemodynamics.ts`), que es el que dibuja
 * el bucle latido a latido. Se usa el modelo de ELASTANCIAS (Suga y Sagawa):
 *
 *  - CONTRACTILIDAD → Ees, pendiente de la relación presión‑volumen
 *    telesistólica (RPVTS): Pts = Ees · (VTS − V0). Más contractilidad = recta
 *    más empinada = el ventrículo se vacía más.
 *  - POSCARGA → Ea, elastancia arterial efectiva: Pts ≈ Ea · VS. Resume la
 *    resistencia periférica y la rigidez arterial. Más poscarga = más presión
 *    para el mismo VS = el ventrículo se vacía menos.
 *  - PRECARGA → VTD. La presión telediastólica sale de la relación
 *    presión‑volumen telediastólica (RPVTD), exponencial: un ventrículo rígido
 *    (disfunción diastólica) sube mucho la presión con poco volumen.
 *
 * El punto de fin de sístole cae donde se cruzan la RPVTS y la recta de Ea:
 *    VTS = (Ea · VTD + Ees · V0) / (Ea + Ees)
 *
 * Valores orientativos de un adulto sano: Ees ≈ 2,5 mmHg/mL, Ea ≈ 1,4 mmHg/mL,
 * VTD ≈ 120 mL, V0 ≈ 10 mL. Modelo simplificado y educativo.
 */
import { computeCycle, NORMAL_HEMO, type Cycle, type HemoParams } from './hemodynamics';
import type { SimResult } from './simulate';

/** Volumen de la RPVTS a presión cero (mL). */
export const V0 = 10;

export type Valvula = 'ninguna' | 'ea' | 'ia' | 'im' | 'em';

export interface PvInputs {
  /** Precarga: volumen telediastólico objetivo (mL). */
  edv: number;
  /** Poscarga: elastancia arterial efectiva (mmHg/mL). */
  ea: number;
  /** Contractilidad: elastancia telesistólica (mmHg/mL). */
  ees: number;
  /** Rigidez diastólica (1 = normal; > 1 = ventrículo rígido). */
  rigidez: number;
  valvula: Valvula;
}

export const PV_NORMAL: PvInputs = { edv: 122, ea: 1.4, ees: 2.5, rigidez: 1, valvula: 'ninguna' };

/** Cambios de cada valvulopatía (los mismos rasgos que usan los soplos). */
const VALVULA: Record<Valvula, Partial<HemoParams>> = {
  ninguna: {},
  // Estenosis aórtica: gradiente VI–aorta en sístole
  ea: { aoGrad: 60 },
  // Insuficiencia aórtica: la aorta devuelve sangre al VI en diástole (no hay fase isovolumétrica real)
  ia: { arLeak: 55, tau: 650, pInf: 0 },
  // Insuficiencia mitral: parte del VS vuelve a la aurícula (baja la poscarga efectiva)
  im: { mrFrac: 0.4, vWave: 14 },
  // Estenosis mitral: llenado lento y aurícula a alta presión
  em: { mvGrad: 12, tauFill: 280, laBase: 18 },
};

/**
 * RPVTD: presión telediastólica (mmHg) para un volumen (mL). Exponencial,
 * ajustada para dar ~9 mmHg con 122 mL. `rigidez` > 1 la empina (hipertrofia);
 * < 1 la aplana (ventrículo dilatado y remodelado, que admite más volumen).
 */
export function edpvr(v: number, rigidez = 1) {
  const k = 0.018 * rigidez;
  const A = 9 / (Math.exp(0.018 * (PV_NORMAL.edv - V0)) - 1);
  return A * (Math.exp(k * Math.max(0, v - V0)) - 1);
}

export interface PvResult {
  cycle: Cycle;
  inputs: PvInputs;
  /** Valores teóricos del punto de fin de sístole (para dibujar las rectas). */
  esv: number;
  pes: number;
  edp: number;
}

/**
 * Calcula el ciclo con unos determinantes dados. La presión sistólica del
 * modelo se ajusta en pocas iteraciones para que el punto de fin de sístole
 * caiga de verdad sobre la RPVTS.
 */
export function computePvLoop(sim: SimResult, inp: PvInputs): PvResult {
  const v = VALVULA[inp.valvula];
  // Poscarga «efectiva»: en la IM parte del volumen sale hacia la aurícula (a baja presión);
  // en la EA el ventrículo tiene que vencer además el gradiente valvular.
  // En la IA, parte del volumen expulsado vuelve al VI en diástole: la poscarga efectiva también baja.
  const eaEff = inp.ea * (1 - (v.mrFrac ?? 0) * 0.6) * (1 + (v.aoGrad ?? 0) / 150) * (1 - (v.arLeak ?? 0) / 160);
  const esv = (eaEff * inp.edv + inp.ees * V0) / (eaEff + inp.ees);
  const pes = inp.ees * (esv - V0);
  const edp = edpvr(inp.edv, inp.rigidez);
  const kick = NORMAL_HEMO.kickVol;
  const leak = v.arLeak ?? 0;
  const fillVol = Math.max(5, inp.edv - esv - kick - leak);

  const h = (psys: number): HemoParams => ({
    ...NORMAL_HEMO,
    ...v,
    esv,
    fillVol,
    edpRef: Math.max(4, edp),
    psys,
    // Más poscarga, más resistencia: la presión aórtica cae más despacio en diástole
    tau: (v.tau ?? NORMAL_HEMO.tau) * Math.min(1.8, Math.max(0.6, inp.ea / PV_NORMAL.ea)),
  });
  /** Presión del VI al cierre aórtico (fin de sístole), media de los latidos. */
  const pFinSistole = (c: Cycle) => {
    let s = 0;
    for (const b of c.beats) s += c.plv[(Math.round(b.ac / c.dt) - 1 + c.n) % c.n];
    return s / (c.beats.length || 1);
  };
  // Método de la secante: busca la `psys` del modelo que pone el fin de sístole en la RPVTS
  let x0 = 120;
  let c0 = computeCycle(sim, h(x0));
  let f0 = pFinSistole(c0) - pes;
  let x1 = Math.min(260, Math.max(85, x0 - f0 / 1.8));
  let cycle = computeCycle(sim, h(x1));
  let f1 = pFinSistole(cycle) - pes;
  for (let it = 0; it < 4 && Math.abs(f1) > 1; it++) {
    const slope = (f1 - f0) / (x1 - x0 || 1e-6);
    const x2 = Math.min(260, Math.max(85, x1 - f1 / (Math.abs(slope) > 0.2 ? slope : 1.8)));
    if (Math.abs(x2 - x1) < 0.2) break;
    [x0, f0, c0] = [x1, f1, cycle];
    x1 = x2;
    cycle = computeCycle(sim, h(x1));
    f1 = pFinSistole(cycle) - pes;
  }
  return { cycle, inputs: inp, esv, pes, edp };
}

/** Medidas de un latido del bucle: volúmenes, presiones y trabajo sistólico. */
export function pvMetrics(r: PvResult) {
  const { cycle } = r;
  const b = cycle.beats[Math.min(1, cycle.beats.length - 1)];
  // Un latido: del cierre mitral al siguiente
  const i0 = Math.round(b.mc / cycle.dt);
  const i1 = Math.round(b.end / cycle.dt);
  let area = 0;
  let pMax = 0;
  let vMax = 0;
  let vMin = Infinity;
  for (let i = i0; i < i1; i++) {
    const a = i % cycle.n;
    const c = (i + 1) % cycle.n;
    // Fórmula del área de un polígono (shoelace): trabajo = ∮ P dV
    area += cycle.vlv[a] * cycle.plv[c] - cycle.vlv[c] * cycle.plv[a];
    pMax = Math.max(pMax, cycle.plv[a]);
    vMax = Math.max(vMax, cycle.vlv[a]);
    vMin = Math.min(vMin, cycle.vlv[a]);
  }
  const vtd = vMax;
  const vts = vMin;
  const vs = vtd - vts;
  return {
    vtd,
    vts,
    vs,
    fe: vs / vtd,
    pMax,
    /** Trabajo sistólico (mmHg·mL) = área del bucle. */
    trabajo: Math.abs(area) / 2,
    /** Volumen que sale realmente por la aorta (en la IM, parte vuelve a la aurícula). */
    vsAnterogrado: vs * (1 - (VALVULA[r.inputs.valvula].mrFrac ?? 0)),
  };
}
