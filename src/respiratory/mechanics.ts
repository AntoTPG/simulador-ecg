/**
 * ============================================================================
 *  MECÁNICA RESPIRATORIA (modelo de un compartimento)
 * ============================================================================
 * Modelo SIMPLIFICADO y educativo del pulmón y la pared torácica, con los
 * valores de referencia de West (Fisiología respiratoria) para un adulto sano.
 * El mismo modelo alimenta el ciclo respiratorio, el acino 3D y, más adelante,
 * la espirometría, para que todo cuadre.
 *
 * Unidades: volumen en L, flujo en L/s (positivo = inspiración), presiones en
 * cmH2O relativas a la atmosférica.
 *
 *  - PULMÓN: tiende a colapsarse. Su presión de retracción elástica
 *    (transpulmonar, Ptp = Palv − Ppl) crece con el volumen siguiendo una curva
 *    exponencial (curva presión‑volumen estática): blanda cerca de la CRF y
 *    cada vez más rígida cerca de la CPT.
 *  - PARED TORÁCICA: tiende a expandirse. Se trata como lineal: su presión es
 *    negativa por debajo de su volumen de reposo y positiva por encima.
 *  - CRF: volumen en que ambas fuerzas se equilibran con los músculos relajados.
 *    Aquí no se fija: SALE del equilibrio. Por eso sube en el enfisema (el
 *    pulmón tira menos) y baja en la fibrosis o la obesidad.
 *  - MÚSCULOS: el diafragma genera una presión (Pmus) en la inspiración. La
 *    espiración tranquila es pasiva.
 *  - VÍA AÉREA: el flujo es la diferencia de presión entre la boca (0) y el
 *    alvéolo dividida por la resistencia. En la espiración el flujo no puede
 *    superar un máximo que depende del volumen (limitación al flujo por
 *    compresión dinámica de la vía aérea), lo que en la EPOC produce
 *    atrapamiento aéreo y PEEP intrínseca.
 *
 * Ecuación del movimiento:  Pmus = Pel_pulmón(V) + Pel_pared(V) + R · V'
 */

export interface RespParams {
  /** Capacidad pulmonar total y volumen residual (L). */
  tlc: number;
  rv: number;
  /** Forma de la curva P‑V estática del pulmón (1/cmH2O): mayor = más distensible. */
  kLung: number;
  /** Distensibilidad de la pared torácica (L/cmH2O) y su volumen de reposo (L). */
  ccw: number;
  vcwRest: number;
  /** Resistencias de la vía aérea en inspiración y espiración (cmH2O·s/L). */
  rInsp: number;
  rExp: number;
  /**
   * Flujo espiratorio máximo según el volumen (envolvente de la curva flujo‑volumen):
   * Fmax(V) = fmaxCoef · (V − VR)^fmaxExp. El exponente > 1 da la forma «cóncava»
   * de la obstrucción.
   */
  fmaxCoef: number;
  fmaxExp: number;
  /** Frecuencia respiratoria (rpm) y fracción del ciclo en inspiración (Ti/Ttot). */
  fr: number;
  tiFrac: number;
  /** Presión máxima de los músculos inspiratorios en una respiración tranquila (cmH2O). */
  pmus: number;
}

/** Adulto sano (West): CPT 6 L, VR 1,2 L, CRF 2,4 L, VC 0,5 L, 12 rpm. */
export const RESP_NORMAL: RespParams = {
  tlc: 6,
  rv: 1.2,
  kLung: 0.0575,
  ccw: 0.2,
  vcwRest: 3.4,
  rInsp: 2,
  rExp: 2.2,
  fmaxCoef: 1.8,
  fmaxExp: 1,
  fr: 12,
  tiFrac: 0.4,
  pmus: 5.6,
};

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

/** Retracción elástica del pulmón (presión transpulmonar, cmH2O) a un volumen dado. */
export function lungRecoil(p: RespParams, v: number) {
  const x = clamp((v - p.rv) / (p.tlc - p.rv), 1e-4, 0.995);
  return -Math.log(1 - x) / p.kLung;
}

/** Volumen pulmonar para una presión transpulmonar (curva P‑V estática). */
export function lungVolumeAt(p: RespParams, ptp: number) {
  return p.rv + (p.tlc - p.rv) * (1 - Math.exp(-p.kLung * Math.max(0, ptp)));
}

/** Presión elástica de la pared torácica (cmH2O). Negativa = tira hacia fuera. */
export const chestWallRecoil = (p: RespParams, v: number) => (v - p.vcwRest) / p.ccw;

/** CRF: volumen de equilibrio con los músculos relajados (bisección). */
export function relaxedFrc(p: RespParams) {
  let a = p.rv + 1e-3;
  let b = p.tlc - 1e-3;
  for (let i = 0; i < 60; i++) {
    const m = (a + b) / 2;
    if (lungRecoil(p, m) + chestWallRecoil(p, m) > 0) b = m;
    else a = m;
  }
  return (a + b) / 2;
}

/** Flujo espiratorio máximo posible a un volumen (L/s). */
export const maxExpFlow = (p: RespParams, v: number) => p.fmaxCoef * Math.pow(Math.max(0, v - p.rv), p.fmaxExp);

/**
 * Presión muscular inspiratoria a lo largo del ciclo. Sube de forma suave en la
 * inspiración y, al acabar, el diafragma no se suelta de golpe: se relaja poco a
 * poco (freno postinspiratorio), lo que suaviza el comienzo de la espiración.
 */
function muscle(p: RespParams, t: number, ti: number, period: number) {
  if (t < ti) return (p.pmus * (1 - Math.cos((Math.PI * t) / ti))) / 2;
  const relax = Math.min(1.2, 0.45 * (period - ti));
  const x = (t - ti) / relax;
  return x >= 1 ? 0 : (p.pmus * (1 + Math.cos(Math.PI * x))) / 2;
}

export interface RespCycle {
  /** Duración de un ciclo (s) y paso de las series (s). */
  period: number;
  dt: number;
  n: number;
  ti: number;
  /** Series de un ciclo completo en estado estable. */
  vol: Float32Array; // volumen pulmonar absoluto (L)
  flow: Float32Array; // L/s, + inspiración
  palv: Float32Array; // presión alveolar
  ppl: Float32Array; // presión pleural
  pmus: Float32Array;
  /** Si el flujo espiratorio está limitado (compresión dinámica) en cada instante. */
  limited: Uint8Array;
  /** CRF de equilibrio (sin atrapamiento) y volumen real al final de la espiración. */
  frcRelaxed: number;
  eelv: number;
  vt: number;
  /** PEEP intrínseca: presión alveolar al final de la espiración (cmH2O). */
  peepi: number;
}

/**
 * Simula varios ciclos hasta el estado estable y devuelve el último.
 * Si la espiración no da tiempo a vaciar el pulmón (asma, EPOC), el volumen
 * al final de la espiración queda por encima de la CRF: atrapamiento aéreo.
 */
export function simulateBreathing(p: RespParams, nCycles = 8): RespCycle {
  const period = 60 / p.fr;
  const ti = period * p.tiFrac;
  const h = 0.002; // paso de integración (s)
  const dt = 0.01; // paso de las series guardadas (s)
  const n = Math.round(period / dt);
  const steps = Math.round(period / h);
  const every = Math.round(dt / h);

  const vol = new Float32Array(n);
  const flow = new Float32Array(n);
  const palv = new Float32Array(n);
  const ppl = new Float32Array(n);
  const pmus = new Float32Array(n);
  const limited = new Uint8Array(n);

  const frcRelaxed = relaxedFrc(p);
  let V = frcRelaxed;
  for (let c = 0; c < nCycles; c++) {
    const record = c === nCycles - 1;
    for (let s = 0; s < steps; s++) {
      const t = s * h;
      const pm = muscle(p, t, ti, period);
      const pel = lungRecoil(p, V);
      // Presión neta que mueve el aire: músculos − retracción del pulmón − pared
      const drive = pm - pel - chestWallRecoil(p, V);
      let f = drive / (drive >= 0 ? p.rInsp : p.rExp);
      let lim = 0;
      if (f < 0) {
        const fmax = maxExpFlow(p, V);
        if (-f > fmax) {
          f = -fmax;
          lim = 1;
        }
      }
      if (record && s % every === 0) {
        const k = s / every;
        // Presión alveolar: la que empuja el aire (− flujo · R); con limitación, la resistencia
        // efectiva es mayor y la presión alveolar es la que corresponde al «drive»
        const pa = f >= 0 ? -f * p.rInsp : lim ? -drive : -f * p.rExp;
        vol[k] = V;
        flow[k] = f;
        palv[k] = pa;
        ppl[k] = pa - pel;
        pmus[k] = pm;
        limited[k] = lim;
      }
      V = clamp(V + f * h, p.rv + 0.01, p.tlc - 0.01);
    }
  }
  let vMin = Infinity;
  let vMax = -Infinity;
  for (let i = 0; i < n; i++) {
    vMin = Math.min(vMin, vol[i]);
    vMax = Math.max(vMax, vol[i]);
  }
  return {
    period,
    dt,
    n,
    ti,
    vol,
    flow,
    palv,
    ppl,
    pmus,
    limited,
    frcRelaxed,
    eelv: vol[0],
    vt: vMax - vMin,
    // PEEP intrínseca «estática»: presión elástica que queda al final de la espiración
    // porque el pulmón no ha vuelto a su CRF de equilibrio (atrapamiento aéreo)
    peepi: Math.max(0, lungRecoil(p, vol[0]) + chestWallRecoil(p, vol[0])),
  };
}

/** Valor de una serie en el instante t (s), interpolado y periódico. */
export function sampleResp(c: RespCycle, arr: ArrayLike<number>, t: number) {
  const x = (((t % c.period) + c.period) % c.period) / c.dt;
  const i = Math.floor(x);
  const f = x - i;
  return arr[i % c.n] * (1 - f) + arr[(i + 1) % c.n] * f;
}

export type RespPhase = 'inspiracion' | 'espiracion' | 'pausa';

export function respPhaseAt(c: RespCycle, t: number): RespPhase {
  const f = sampleResp(c, c.flow, t);
  if (f > 0.03) return 'inspiracion';
  if (f < -0.03) return 'espiracion';
  return 'pausa';
}

/** Distensibilidad estática del pulmón a la CRF (L/cmH2O). */
export function lungCompliance(p: RespParams, v = relaxedFrc(p)) {
  const ptp = lungRecoil(p, v);
  return p.kLung * (p.tlc - p.rv) * Math.exp(-p.kLung * ptp);
}
