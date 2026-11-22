/**
 * ============================================================================
 *  ESPIROMETRÍA FORZADA
 * ============================================================================
 * Simula la maniobra: inspiración máxima hasta la CPT, espiración forzada hasta
 * el VR (capacidad vital forzada) e inspiración forzada de vuelta (para la rama
 * inspiratoria de la curva flujo‑volumen).
 *
 * Fisiología que se respeta (West; normativa SEPAR; ATS/ERS):
 *  - Tras el pico de flujo, la espiración forzada es INDEPENDIENTE DEL ESFUERZO:
 *    la vía aérea se comprime y el flujo queda limitado a un máximo que depende
 *    del volumen pulmonar (envolvente; misma función que usa el ciclo
 *    respiratorio). Por eso la forma de la curva refleja la enfermedad.
 *  - Obstrucción de vías pequeñas (asma, EPOC): envolvente baja y cóncava
 *    («excavada»); el aire sale despacio y el FEV1/FVC cae.
 *  - Restricción: volúmenes pequeños pero flujos conservados o altos para ese
 *    volumen (más retracción elástica): FEV1/FVC normal o alto.
 *  - Obstrucción de la vía aérea CENTRAL: el flujo choca contra un techo fijo
 *    (meseta) en espiración, inspiración o ambas, según dónde y cómo sea.
 *  - El PICO de flujo sí depende del esfuerzo: en la enfermedad neuromuscular es bajo.
 *
 * Los valores «teóricos» son los del sujeto sano del modelo (no las ecuaciones
 * de referencia GLI): sirven para aprender a leer el informe, no para diagnosticar.
 */
import { RESP_NORMAL } from './mechanics';

export interface SpiroParams {
  tlc: number;
  rv: number;
  /** Envolvente espiratoria: Fmax(V) = coef · (V − VR)^exp (L/s). */
  fmaxCoef: number;
  fmaxExp: number;
  /** Flujo máximo que permite el esfuerzo muscular (L/s). */
  esfuerzo: number;
  /** Pico de flujo inspiratorio forzado (L/s). */
  fiMax: number;
  /** Techo de flujo por obstrucción de la vía aérea central (L/s), si lo hay. */
  techoEsp?: number;
  techoInsp?: number;
}

export const SPIRO_NORMAL: SpiroParams = {
  tlc: RESP_NORMAL.tlc,
  rv: RESP_NORMAL.rv,
  fmaxCoef: RESP_NORMAL.fmaxCoef,
  fmaxExp: RESP_NORMAL.fmaxExp,
  esfuerzo: 12,
  fiMax: 6.5,
};

export interface SpiroCurve {
  /** Espiración forzada: tiempo (s), volumen espirado (L) y flujo (L/s). */
  t: Float32Array;
  vEsp: Float32Array;
  fEsp: Float32Array;
  /** Inspiración forzada desde el VR: volumen espirado (L, va de FVC a 0) y flujo (negativo). */
  vIns: Float32Array;
  fIns: Float32Array;
  /** Duración de la espiración (s). */
  tEsp: number;
}

export interface SpiroMetrics {
  fvc: number;
  fev1: number;
  ratio: number;
  pef: number;
  /** Flujo medio entre el 25 y el 75 % de la FVC (L/s). */
  fef2575: number;
  /** Flujo inspiratorio máximo (L/s, positivo). */
  pif: number;
  /** Flujo a mitad de la FVC: espiratorio / inspiratorio (cociente de la vía alta). */
  fef50: number;
  fif50: number;
  /**
   * Fracción de la FVC recorrida con el flujo en meseta (≥ 95 % del máximo),
   * en espiración y en inspiración. Una meseta larga indica un techo de flujo:
   * obstrucción de la vía aérea central.
   */
  mesetaEsp: number;
  mesetaIns: number;
}

/** Simula la maniobra completa. */
export function simulateSpirometry(p: SpiroParams): { curve: SpiroCurve; m: SpiroMetrics } {
  const dt = 0.005;
  const t: number[] = [];
  const vE: number[] = [];
  const fE: number[] = [];
  let V = p.tlc;
  let time = 0;
  let quietFor = 0;
  // Espiración forzada: el flujo es el menor entre el que permite el esfuerzo (sube en ~0,1 s),
  // la envolvente de la vía aérea (depende del volumen) y el techo de la vía central
  while (time < 20) {
    const effort = p.esfuerzo * (1 - Math.exp(-time / 0.035));
    const env = p.fmaxCoef * Math.pow(Math.max(0, V - p.rv), p.fmaxExp);
    const f = Math.min(effort, env, p.techoEsp ?? Infinity);
    t.push(time);
    vE.push(p.tlc - V);
    fE.push(f);
    V -= f * dt;
    time += dt;
    // Final de la prueba (criterio ATS/ERS): cambio de volumen < 25 mL en 1 s
    quietFor = f < 0.025 ? quietFor + dt : 0;
    if (quietFor >= 1 || V <= p.rv + 1e-4) break;
  }
  const fvc = p.tlc - Math.max(V, p.rv);

  // Inspiración forzada desde el VR hasta la CPT: curva casi semicircular, con su techo
  const nI = 200;
  const vI: number[] = [];
  const fI: number[] = [];
  for (let i = 0; i <= nI; i++) {
    const x = i / nI;
    const f = Math.min(p.fiMax * Math.pow(Math.sin(Math.PI * x), 0.55), p.techoInsp ?? Infinity);
    vI.push(fvc * (1 - x));
    fI.push(-f);
  }

  const curve: SpiroCurve = {
    t: Float32Array.from(t),
    vEsp: Float32Array.from(vE),
    fEsp: Float32Array.from(fE),
    vIns: Float32Array.from(vI),
    fIns: Float32Array.from(fI),
    tEsp: time,
  };
  return { curve, m: metrics(curve, fvc) };
}

/** Volumen espirado en el instante t (interpolación lineal). */
export function volumeAt(c: SpiroCurve, time: number) {
  const i = Math.min(c.t.length - 1, Math.max(0, Math.floor(time / 0.005)));
  return c.vEsp[i];
}

function metrics(c: SpiroCurve, fvc: number): SpiroMetrics {
  const fev1 = volumeAt(c, 1);
  let pef = 0;
  for (const f of c.fEsp) pef = Math.max(pef, f);
  // Tiempo en que se alcanza el 25 % y el 75 % de la FVC
  const tAt = (frac: number) => {
    const target = frac * fvc;
    for (let i = 0; i < c.vEsp.length; i++) if (c.vEsp[i] >= target) return c.t[i];
    return c.tEsp;
  };
  const t25 = tAt(0.25);
  const t75 = tAt(0.75);
  const flowAtVol = (vols: Float32Array, flows: Float32Array, v: number) => {
    let best = 0;
    let d = Infinity;
    for (let i = 0; i < vols.length; i++) {
      const di = Math.abs(vols[i] - v);
      if (di < d) (d = di), (best = flows[i]);
    }
    return Math.abs(best);
  };
  let pif = 0;
  for (const f of c.fIns) pif = Math.max(pif, -f);
  // Meseta espiratoria: volumen espirado mientras el flujo está cerca del pico
  let vPlat = 0;
  for (let i = 1; i < c.fEsp.length; i++) if (c.fEsp[i] >= 0.95 * pef) vPlat += c.vEsp[i] - c.vEsp[i - 1];
  let nPlat = 0;
  for (const f of c.fIns) if (-f >= 0.95 * pif) nPlat++;
  return {
    fvc,
    fev1,
    ratio: fev1 / fvc,
    pef,
    fef2575: (0.5 * fvc) / Math.max(0.01, t75 - t25),
    pif,
    fef50: flowAtVol(c.vEsp, c.fEsp, fvc / 2),
    fif50: flowAtVol(c.vIns, c.fIns, fvc / 2),
    mesetaEsp: vPlat / fvc,
    mesetaIns: nPlat / c.fIns.length,
  };
}

// ---------------------------------------------------------------------------
//  Interpretación (SEPAR 2013; ATS/ERS 2005 y 2022; GOLD)
// ---------------------------------------------------------------------------

export interface Interpretacion {
  patron: 'normal' | 'obstructivo' | 'restrictivo' | 'mixto' | 'central';
  titulo: string;
  pasos: { texto: string; ok: boolean | null }[];
  gravedad?: string;
  pruebaBd?: { positiva: boolean; texto: string };
}

/** Gravedad de la obstrucción por el FEV1 (% del teórico), clasificación GOLD. */
export function gravedadGold(fev1Pct: number) {
  if (fev1Pct >= 80) return 'GOLD 1 · leve (FEV1 ≥ 80 %)';
  if (fev1Pct >= 50) return 'GOLD 2 · moderada (FEV1 50–79 %)';
  if (fev1Pct >= 30) return 'GOLD 3 · grave (FEV1 30–49 %)';
  return 'GOLD 4 · muy grave (FEV1 < 30 %)';
}

/** Gravedad de una obstrucción por el FEV1 (% del teórico), ATS/ERS 2005 (para el asma y otras). */
export function gravedadAts(fev1Pct: number) {
  if (fev1Pct > 70) return 'leve (FEV1 > 70 %, ATS/ERS)';
  if (fev1Pct >= 60) return 'moderada (FEV1 60–69 %, ATS/ERS)';
  if (fev1Pct >= 50) return 'moderadamente grave (FEV1 50–59 %, ATS/ERS)';
  if (fev1Pct >= 35) return 'grave (FEV1 35–49 %, ATS/ERS)';
  return 'muy grave (FEV1 < 35 %, ATS/ERS)';
}

/**
 * `escala`: 'gold' para la EPOC (clasificación GOLD); 'ats' para el resto.
 */
export function interpretar(m: SpiroMetrics, ref: SpiroMetrics, post?: SpiroMetrics, escala: 'gold' | 'ats' = 'ats'): Interpretacion {
  const pct = (a: number, b: number) => (100 * a) / b;
  const fvcPct = pct(m.fvc, ref.fvc);
  const fev1Pct = pct(m.fev1, ref.fev1);
  const obstr = m.ratio < 0.7;
  const fvcBaja = fvcPct < 80;
  const pasos: Interpretacion['pasos'] = [
    {
      texto: `FEV1/FVC = ${(m.ratio * 100).toFixed(0)} %: ${obstr ? 'menor de 70 % → hay OBSTRUCCIÓN' : 'no hay obstrucción (≥ 70 %)'}`,
      ok: !obstr,
    },
    {
      texto: `FVC = ${fvcPct.toFixed(0)} % del teórico: ${fvcBaja ? (obstr ? 'baja; puede ser por atrapamiento aéreo o por una restricción añadida' : 'baja con cociente normal → sugiere RESTRICCIÓN') : 'normal (≥ 80 %)'}`,
      ok: !fvcBaja,
    },
  ];
  // Morfología de la curva flujo‑volumen
  const platE = m.mesetaEsp > 0.3;
  const platI = m.mesetaIns > 0.5; // la rama inspiratoria normal es redondeada: ~25 % cerca del pico
  const central = platE || platI;
  let forma: string;
  if (platE && platI) forma = 'meseta en espiración E inspiración → obstrucción FIJA de la vía aérea central (p. ej., estenosis traqueal)';
  else if (platI) forma = 'meseta solo en la inspiración → obstrucción VARIABLE EXTRATORÁCICA (p. ej., parálisis de cuerdas vocales): al inspirar, la presión dentro de la vía es menor que la atmosférica y la estrechez se cierra más';
  else if (platE) forma = 'meseta solo en la espiración → obstrucción VARIABLE INTRATORÁCICA (p. ej., tumor de la tráquea torácica): al espirar con fuerza, la presión pleural positiva la comprime';
  else if (obstr) forma = 'rama espiratoria excavada (cóncava): el flujo cae enseguida tras el pico → obstrucción de las vías aéreas pequeñas';
  else forma = 'pico rápido y descenso casi recto hasta el VR; rama inspiratoria redondeada';
  pasos.push({ texto: `Forma de la curva flujo‑volumen: ${forma}.`, ok: central || obstr ? false : true });
  if (central)
    pasos.push({
      texto: `Índice de Empey (FEV1 en mL / PEF en L/min) = ${((m.fev1 * 1000) / (m.pef * 60)).toFixed(1)}: ${(m.fev1 * 1000) / (m.pef * 60) > 10 ? '> 10, apoya una obstrucción central' : '≤ 10'}.`,
      ok: null,
    });

  let patron: Interpretacion['patron'] = 'normal';
  if (central) patron = 'central';
  else if (obstr && fvcBaja && fvcPct < 70 && m.ratio > 0.5) patron = 'mixto';
  else if (obstr) patron = 'obstructivo';
  else if (fvcBaja) patron = 'restrictivo';

  const titulo = {
    normal: 'Espirometría normal',
    obstructivo: 'Patrón obstructivo',
    restrictivo: 'Patrón restrictivo (a confirmar)',
    mixto: 'Patrón mixto (a confirmar)',
    central: 'Obstrucción de la vía aérea central',
  }[patron];
  if (patron === 'restrictivo' || patron === 'mixto')
    pasos.push({ texto: 'La espirometría solo SUGIERE restricción: se confirma midiendo la CPT (pletismografía o dilución de gases).', ok: null });

  const res: Interpretacion = { patron, titulo, pasos };
  if (obstr && !central) res.gravedad = escala === 'gold' ? gravedadGold(fev1Pct) : gravedadAts(fev1Pct);

  if (post) {
    const dMl = (post.fev1 - m.fev1) * 1000;
    const dPct = pct(post.fev1 - m.fev1, m.fev1);
    const dPred = pct(post.fev1 - m.fev1, ref.fev1);
    const positiva = (dPct >= 12 && dMl >= 200) || dPred > 10;
    res.pruebaBd = {
      positiva,
      texto: `FEV1 +${dMl.toFixed(0)} mL (+${dPct.toFixed(0)} % del valor basal; +${dPred.toFixed(0)} % del teórico): ${
        positiva ? 'prueba broncodilatadora POSITIVA' : 'prueba broncodilatadora negativa'
      }. Criterio SEPAR/ATS‑ERS 2005: ≥ 12 % y ≥ 200 mL; ERS/ATS 2022: > 10 % del teórico.`,
    };
  }
  return res;
}
