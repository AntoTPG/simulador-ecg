/**
 * ============================================================================
 *  CICLO CARDÍACO (diagrama de Wiggers)
 * ============================================================================
 * Modelo hemodinámico SIMPLIFICADO del corazón izquierdo, calculado latido a
 * latido a partir de los tiempos eléctricos de la simulación (cada QRS dispara
 * una sístole; cada P, una contracción auricular). No resuelve ecuaciones de
 * fluidos: usa formas paramétricas fisiológicamente razonables, pero respeta
 * las relaciones de causa‑efecto que se estudian:
 *
 *  - ACOPLAMIENTO ELECTROMECÁNICO: la sístole empieza ~45 ms después del QRS
 *    y la válvula aórtica se cierra (R2) hacia el final de la onda T.
 *  - FRANK‑STARLING: el volumen de eyección depende del volumen telediastólico,
 *    que depende de cuánto dure la diástole (en una FA cada latido es distinto).
 *  - WINDKESSEL: tras cerrarse la válvula aórtica, la presión aórtica cae de
 *    forma exponencial mientras la sangre sale a la periferia.
 *  - CONTRACCIÓN AURICULAR: aporta ~15 % del llenado ("patada auricular") y
 *    genera la onda a. Si la aurícula se contrae con la mitral cerrada (BAV
 *    completo), aparece una onda a "en cañón".
 *
 * Fases (válvulas):
 *   cierre mitral (R1) → contracción isovolumétrica → apertura aórtica →
 *   eyección → cierre aórtico (R2) → relajación isovolumétrica → apertura
 *   mitral → llenado rápido → diástasis → sístole auricular → cierre mitral…
 */
import { mod, smoothstep } from './math';
import type { SimResult } from './simulate';

export interface HemoParams {
  /** Presión sistólica aórtica (mmHg) con un volumen de eyección de 70 mL. */
  psys: number;
  /** Constante de tiempo del vaciado arterial en diástole (ms). Menor = cae más rápido. */
  tau: number;
  /** Presión hacia la que tiende el vaciado arterial (mmHg). */
  pInf: number;
  /** Volumen telesistólico (mL): refleja la contractilidad (menor = mejor). */
  esv: number;
  /** Volumen máximo del llenado pasivo por encima del VTS (mL). */
  fillVol: number;
  /** Constante de tiempo del llenado rápido (ms). Mayor = llenado lento (estenosis mitral). */
  tauFill: number;
  /** Volumen aportado por la contracción auricular (mL). */
  kickVol: number;
  /** Presión telediastólica de referencia (mmHg): mayor = ventrículo más rígido. */
  edpRef: number;
  /** Gradiente sistólico máximo VI–aorta (mmHg): estenosis aórtica. */
  aoGrad: number;
  /** Volumen que regurgita desde la aorta en diástole (mL): insuficiencia aórtica. */
  arLeak: number;
  /** Fracción del volumen de eyección que vuelve a la aurícula (0–1): insuficiencia mitral. */
  mrFrac: number;
  /** Gradiente diastólico AI–VI (mmHg): estenosis mitral. */
  mvGrad: number;
  /** Presión basal de la aurícula izquierda (mmHg). */
  laBase: number;
  /** Altura de la onda v (mmHg). */
  vWave: number;
  /** Altura de la onda a (mmHg). */
  aWave: number;
  /** Duración de la contracción y relajación isovolumétricas (ms). */
  ivc: number;
  ivr: number;
}

export const NORMAL_HEMO: HemoParams = {
  psys: 120,
  tau: 1500,
  pInf: 25,
  esv: 50,
  fillVol: 58,
  tauFill: 90,
  kickVol: 14,
  edpRef: 9,
  aoGrad: 0,
  arLeak: 0,
  mrFrac: 0,
  mvGrad: 1,
  laBase: 6,
  vWave: 6,
  aWave: 4,
  ivc: 50,
  ivr: 75,
};

/** Tiempos y valores de un latido mecánico (ms dentro del registro, sin envolver). */
export interface MechBeat {
  /** Índice del latido eléctrico. */
  beat: number;
  qrs: number;
  /** Cierre mitral (R1). */
  mc: number;
  /** Apertura aórtica. */
  ao: number;
  /** Cierre aórtico (R2). */
  ac: number;
  /** Apertura mitral. */
  mo: number;
  /** Fin del ciclo (cierre mitral del latido siguiente). */
  end: number;
  edv: number;
  esv: number;
  /** Presión aórtica sistólica y diastólica del latido (mmHg). */
  pSys: number;
  pDia: number;
  /** PR de este latido (ms) o null si no hay P propia. */
  pr: number | null;
  /** Contracciones auriculares durante la diástole de este latido (para el R4). */
  atrialInDiastole: number[];
}

export interface Cycle {
  dt: number;
  n: number;
  duration: number;
  /** Presiones (mmHg) y volumen (mL), muestreados cada `dt` ms. */
  plv: Float32Array;
  pao: Float32Array;
  pla: Float32Array;
  vlv: Float32Array;
  beats: MechBeat[];
  /** Momentos de contracción auricular (pico de la onda a). */
  atrial: number[];
}

const gauss = (t: number, c: number, s: number) => Math.exp(-0.5 * ((t - c) / s) ** 2);

export function computeCycle(sim: SimResult, h: HemoParams = NORMAL_HEMO): Cycle {
  const dt = 2;
  const D = sim.duration;
  const n = Math.round(D / dt);
  const plv = new Float32Array(n);
  const pao = new Float32Array(n);
  const pla = new Float32Array(n);
  const vlv = new Float32Array(n);

  // Sístoles: un QRS → una contracción ventricular
  const vb = sim.beats.filter((b) => b.qrsOnset !== null).sort((a, b) => a.qrsOnset! - b.qrsOnset!);
  // Contracciones auriculares: ~120 ms después del inicio de cada P
  const pOnsets = [
    ...sim.beats.filter((b) => b.pOnset !== null).map((b) => b.pOnset!),
    ...sim.segments.filter((s) => s.kind === 'P' && s.beat === -1).map((s) => s.start),
  ];
  const atrial = pOnsets.map((p) => mod(p + 120, D)).sort((a, b) => a - b);
  /** Contracciones auriculares (con copias periódicas) dentro de [a, b). */
  const atrialIn = (a: number, b: number) => {
    const out: number[] = [];
    for (const k of [-1, 0, 1, 2]) for (const t of atrial) if (t + k * D >= a && t + k * D < b) out.push(t + k * D);
    return out;
  };

  const edvRef = h.esv + h.fillVol + h.kickVol + h.arLeak;
  const beats: MechBeat[] = [];
  // Estado que pasa de un latido al siguiente
  let V = edvRef;
  let decay = { pac: 100, tac: -600, tau: h.tau, pInf: h.pInf };
  const aortaDecay = (t: number) => decay.pInf + (decay.pac - decay.pInf) * Math.exp(-(t - decay.tac) / decay.tau);

  // Dos pasadas: la primera estabiliza volúmenes y presiones; la segunda se guarda
  for (let pass = 0; pass < 2; pass++) {
    const record = pass === 1;
    // Al volver a empezar el registro, el último cierre aórtico queda una vuelta atrás
    if (pass > 0) decay = { ...decay, tac: decay.tac - D };
    for (let i = 0; i < vb.length; i++) {
      const b = vb[i];
      const q = b.qrsOnset!;
      const qn = i + 1 < vb.length ? vb[i + 1].qrsOnset! : vb[0].qrsOnset! + D;
      const mc = q + 45;
      const ao = mc + h.ivc;
      const ac = Math.min(Math.max(q + b.qt + 15, ao + 120), qn - 90);
      const mo = Math.min(ac + h.ivr, qn - 30);
      const end = qn + 45;

      const edv = V;
      const esv = h.esv;
      const sv = Math.max(8, edv - esv);
      const fwd = sv * (1 - h.mrFrac); // volumen que realmente sale por la aorta
      const pdia = aortaDecay(ao);
      // Presión sistólica aórtica: crece con el volumen anterógrado (Frank‑Starling)
      const peakAo = Math.max(pdia + 8, pdia + (h.psys - 80) * Math.min(1.5, Math.max(0.35, fwd / 70)));
      const peakAt = Math.min(0.6, 0.35 + 0.004 * h.aoGrad); // EA: pulso "tardus"
      const edp = plvFill(edv);
      const atrialHere = atrialIn(mo, end);
      let pacNew = 0;
      let plvAc = 0;
      let vEnd = edv;

      /** Presión diastólica del VI según su volumen (curva de distensibilidad). */
      function plvFill(vol: number) {
        const x = Math.max(0, (vol - esv) / (edvRef - esv));
        return 2 + (h.edpRef - 2) * x * x;
      }
      /** Forma de la presión aórtica en eyección (0→1→~0,55). */
      const sAo = (x: number) =>
        x < peakAt ? Math.sin((Math.PI / 2) * (x / peakAt)) : 1 - 0.45 * Math.pow((x - peakAt) / (1 - peakAt), 1.5);

      for (let t = Math.ceil(mc / dt) * dt; t < end; t += dt) {
        let PLV: number;
        let PAO: number;
        let PLA: number;
        let VOL: number;

        if (t < ao) {
          // CONTRACCIÓN ISOVOLUMÉTRICA: todas las válvulas cerradas, la presión sube sin cambiar el volumen
          const x = (t - mc) / (ao - mc);
          PLV = edp + (pdia + 1 - edp) * smoothstep(0, 1, x);
          PAO = aortaDecay(t);
          VOL = edv - h.mrFrac * sv * 0.15 * x; // en la IM ya hay reflujo: no es "isovolumétrica"
          PLA = h.laBase + 2 * gauss(t, mc + 25, 12); // onda c: la mitral abomba hacia la aurícula
        } else if (t < ac) {
          // EYECCIÓN: la válvula aórtica está abierta; rápida al principio, lenta después
          const x = (t - ao) / (ac - ao);
          PAO = pdia + (peakAo - pdia) * sAo(x);
          PLV = PAO + (h.aoGrad + 2) * Math.sin(Math.PI * x);
          const e = 1 - Math.pow(1 - x, 2.2);
          VOL = edv - h.mrFrac * sv * 0.15 - (sv - h.mrFrac * sv * 0.15) * e;
          // La aurícula se llena desde las venas pulmonares (rama ascendente de la onda v)
          PLA = h.laBase + (h.vWave + h.mrFrac * 60) * Math.pow((t - ao) / (mo - ao), 1.3);
          pacNew = PAO;
          plvAc = PLV;
        } else if (t < mo) {
          // RELAJACIÓN ISOVOLUMÉTRICA: aórtica cerrada (R2), mitral aún cerrada
          PLV = 2 + (plvAc - 2) * Math.exp(-(t - ac) / 28);
          PAO = (h.pInf + (pacNew - h.pInf) * Math.exp(-(t - ac) / h.tau)) - incisura(t - ac);
          VOL = esv;
          PLA = h.laBase + (h.vWave + h.mrFrac * 60) * Math.pow((t - ao) / (mo - ao), 1.3);
        } else {
          // LLENADO: mitral abierta. Rápido al principio (exponencial), diástasis y patada auricular
          const tf = t - mo;
          let kick = 0;
          let aBump = 0;
          for (const ta of atrialHere) {
            kick += h.kickVol * smoothstep(ta - 70, ta + 30, t);
            aBump += gauss(t, ta, 35);
          }
          VOL = esv + h.fillVol * (1 - Math.exp(-tf / h.tauFill)) + h.arLeak * (1 - Math.exp(-tf / 150)) + kick;
          PLV = plvFill(VOL) + (plvAc - 2) * Math.exp(-(t - ac) / 28) + 0.6 * h.aWave * aBump;
          PAO = h.pInf + (pacNew - h.pInf) * Math.exp(-(t - ac) / h.tau) - incisura(t - ac);
          const plaMo = h.laBase + h.vWave + h.mrFrac * 60;
          // Descenso y: la aurícula se vacía al abrirse la mitral
          PLA = PLV + h.mvGrad + (plaMo - (PLV + h.mvGrad)) * Math.exp(-tf / 45) + h.aWave * aBump * (1 + h.mvGrad / 10);
          vEnd = VOL;
        }

        // Onda a "en cañón": la aurícula se contrae contra una mitral cerrada
        if (t < mo) for (const ta of atrialIn(mc, mo)) PLA += 2.5 * h.aWave * gauss(t, ta, 30);

        if (record) {
          const k = mod(Math.round(t / dt), n);
          plv[k] = PLV;
          pao[k] = PAO;
          pla[k] = PLA;
          vlv[k] = VOL;
        }
      }

      if (record) {
        const own = sim.beats[b.index];
        beats.push({
          beat: b.index,
          qrs: q,
          mc,
          ao,
          ac,
          mo,
          end,
          edv,
          esv: edv - sv,
          pSys: peakAo,
          pDia: pdia,
          pr: own.pOnset !== null ? q - own.pOnset : null,
          atrialInDiastole: atrialHere,
        });
      }
      V = vEnd;
      decay = { pac: pacNew, tac: ac, tau: h.tau, pInf: h.pInf };
    }
  }
  return { dt, n, duration: D, plv, pao, pla, vlv, beats, atrial };
}

/** Incisura (escotadura dícrota) de la curva aórtica tras el cierre de la válvula. */
function incisura(dtAc: number) {
  if (dtAc < 0 || dtAc > 120) return 0;
  return 5 * gauss(dtAc, 6, 6) - 3 * gauss(dtAc, 28, 12);
}

/** Valor de una serie del ciclo en el instante t (interpolación lineal, circular). */
export function sampleCycle(c: Cycle, arr: Float32Array, t: number) {
  const x = mod(t, c.duration) / c.dt;
  const i = Math.floor(x);
  const f = x - i;
  return arr[mod(i, c.n)] * (1 - f) + arr[mod(i + 1, c.n)] * f;
}

export type MechPhase =
  | 'contraccion-isovolumetrica'
  | 'eyeccion-rapida'
  | 'eyeccion-lenta'
  | 'relajacion-isovolumetrica'
  | 'llenado-rapido'
  | 'diastasis'
  | 'sistole-auricular';

export const MECH_PHASE_LABEL: Record<MechPhase, string> = {
  'contraccion-isovolumetrica': 'Contracción isovolumétrica',
  'eyeccion-rapida': 'Eyección rápida',
  'eyeccion-lenta': 'Eyección lenta',
  'relajacion-isovolumetrica': 'Relajación isovolumétrica',
  'llenado-rapido': 'Llenado rápido',
  diastasis: 'Diástasis',
  'sistole-auricular': 'Sístole auricular',
};

/** Latido mecánico que contiene el instante t (entre su cierre mitral y el siguiente). */
export function mechBeatAt(c: Cycle, t: number): MechBeat | null {
  if (!c.beats.length) return null;
  const tt = mod(t, c.duration);
  for (const b of c.beats) for (const k of [-1, 0, 1]) if (tt + k * c.duration >= b.mc && tt + k * c.duration < b.end) return b;
  return c.beats[0];
}

/** Fase mecánica en el instante t. */
export function mechPhaseAt(c: Cycle, t: number): MechPhase | null {
  const b = mechBeatAt(c, t);
  if (!b) return null;
  let tt = mod(t, c.duration);
  while (tt < b.mc) tt += c.duration;
  while (tt >= b.end) tt -= c.duration;
  if (tt < b.ao) return 'contraccion-isovolumetrica';
  if (tt < b.ac) return tt < b.ao + (b.ac - b.ao) * 0.4 ? 'eyeccion-rapida' : 'eyeccion-lenta';
  if (tt < b.mo) return 'relajacion-isovolumetrica';
  if (b.atrialInDiastole.some((ta) => tt > ta - 80 && tt < ta + 60)) return 'sistole-auricular';
  return tt < b.mo + 160 ? 'llenado-rapido' : 'diastasis';
}
