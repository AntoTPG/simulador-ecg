/**
 * PLANIFICADOR DEL RITMO
 * ----------------------
 * Separa el CUÁNDO (qué ondas ocurren y en qué momento) del CÓMO (la forma de
 * cada onda). Un latido es una activación auricular (P) y/o una ventricular
 * (QRS + T). Separarlas permite modelar:
 *   - bloqueos AV: P sin QRS detrás (2.º grado) o P y QRS independientes (3.er grado);
 *   - fibrilación y flúter: actividad auricular continua (ondas f / F) y QRS
 *     a intervalos irregulares o con conducción fija.
 *
 * El registro se repite en bucle; su duración es un número entero de ciclos lo
 * más cercano posible a 10 s, para que el bucle empalme sin saltos.
 */
import type { Vec3 } from './math';
import type { SimParams } from './params';

export interface Beat {
  index: number;
  /** Inicio de la onda P (ms) o null si no hay P (p. ej. FA). */
  pOnset: number | null;
  /** Inicio del QRS (ms) o null si la P no se conduce (bloqueo AV). */
  qrsOnset: number | null;
  /** Intervalo RR de este latido (ms). */
  rr: number;
}

/** Actividad auricular independiente de los latidos (BAV 3.er grado, flúter, FA). */
export interface AtrialEvent {
  t: number;
  /** P: onda P normal · F: onda de flúter · f: onda de fibrilación. */
  kind: 'P' | 'F' | 'f';
  /** Dirección y amplitud (solo ondas f, que son irregulares). */
  v?: Vec3;
}

export interface Schedule {
  /** Duración del registro en bucle (ms). */
  duration: number;
  beats: Beat[];
  atrial: AtrialEvent[];
}

/** Retraso desde el inicio del registro hasta la primera P (deja algo de línea de base). */
const LEAD_IN = 180;

/** Generador pseudoaleatorio con semilla: la FA es irregular, pero siempre igual (reproducible). */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function scheduleRhythm(p: SimParams): Schedule {
  const L = p.targetDuration;
  const pp = 60000 / p.heartRate; // ciclo sinusal (auricular)
  const r = p.rhythm;

  switch (r.kind) {
    /**
     * BAV 2.º GRADO MOBITZ I (WENCKEBACH): el nodo AV se "fatiga": el PR se alarga
     * latido a latido (cada vez menos) hasta que una P no se conduce. Tras la pausa
     * el nodo se recupera y el ciclo vuelve a empezar. Los RR se ACORTAN dentro del
     * grupo, porque el incremento del PR es cada vez menor.
     */
    case 'wenckebach': {
      const n = r.conducidos + 1; // P por grupo (la última no se conduce)
      const groups = Math.max(1, Math.round(L / (n * pp)));
      const beats: Beat[] = [];
      for (let g = 0; g < groups; g++)
        for (let k = 0; k < n; k++) {
          const pOnset = LEAD_IN + (g * n + k) * pp;
          const pr = p.prInterval + (k === 0 ? 0 : r.incremento * (2 - Math.pow(2, 1 - k)));
          beats.push({ index: beats.length, pOnset, qrsOnset: k < r.conducidos ? pOnset + pr : null, rr: pp });
        }
      return { duration: groups * n * pp, beats, atrial: [] };
    }

    /**
     * BAV 2.º GRADO MOBITZ II: el bloqueo está por debajo del nodo (His‑Purkinje).
     * El PR es FIJO y, de repente, una P no conduce. `relacion` = P por cada grupo
     * (2 → 2:1, 3 → 3:2…). Riesgo de progresar a BAV completo: indica marcapasos.
     */
    case 'mobitz2': {
      const n = r.relacion;
      const groups = Math.max(1, Math.round(L / (n * pp)));
      const beats: Beat[] = [];
      for (let g = 0; g < groups; g++)
        for (let k = 0; k < n; k++) {
          const pOnset = LEAD_IN + (g * n + k) * pp;
          beats.push({ index: beats.length, pOnset, qrsOnset: k < n - 1 ? pOnset + p.prInterval : null, rr: pp });
        }
      return { duration: groups * n * pp, beats, atrial: [] };
    }

    /**
     * BAV 3.er GRADO (COMPLETO): ninguna P llega a los ventrículos. Las aurículas
     * siguen al nodo sinusal y los ventrículos a un marcapasos de escape más lento
     * (nodal ~40–60 lpm con QRS estrecho; ventricular ~20–40 lpm con QRS ancho).
     * Disociación AV: las P "pasean" por el trazado sin relación con los QRS.
     */
    case 'bav3': {
      const na = Math.max(1, Math.round(L / pp));
      const nv = Math.max(1, Math.round((L * r.fcVentricular) / 60000));
      const ppL = L / na;
      const rrL = L / nv;
      const atrial: AtrialEvent[] = Array.from({ length: na }, (_, i) => ({ t: LEAD_IN + i * ppL, kind: 'P' as const }));
      const beats: Beat[] = Array.from({ length: nv }, (_, j) => ({ index: j, pOnset: null, qrsOnset: 420 + j * rrL, rr: rrL }));
      return { duration: L, beats, atrial };
    }

    /**
     * FIBRILACIÓN AURICULAR: cientos de microrreentradas desorganizadas (350–600/min)
     * sustituyen a la P por ondas f pequeñas e irregulares. El nodo AV deja pasar
     * impulsos al azar: QRS estrechos con RR "irregularmente irregulares".
     */
    case 'fa': {
      const rand = rng(1234);
      const mean = 60000 / r.fcVentricular;
      const n = Math.max(2, Math.round(L / mean));
      const rr = Array.from({ length: n }, () => mean * (0.6 + 0.8 * rand()));
      const k = L / rr.reduce((a, b) => a + b, 0);
      const beats: Beat[] = [];
      let t = 300;
      rr.forEach((x, i) => {
        beats.push({ index: i, pOnset: null, qrsOnset: t, rr: x * k });
        t += x * k;
      });
      const atrial: AtrialEvent[] = [];
      for (let ta = 0; ta < L; ta += 110 + 70 * rand()) {
        const a = 0.025 + 0.05 * rand();
        const s = rand() < 0.5 ? -1 : 1;
        atrial.push({ t: ta, kind: 'f', v: [0.2 * s * a, 0.6 * s * a, 1.0 * s * a] });
      }
      return { duration: L, beats, atrial };
    }

    /**
     * FLÚTER AURICULAR TÍPICO: un macrocircuito de reentrada alrededor de la
     * válvula tricúspide (istmo cavotricuspídeo) a ~300/min genera ondas F "en
     * dientes de sierra", negativas en II, III y aVF. El nodo AV filtra: lo más
     * frecuente es la conducción 2:1 (FC ventricular ~150 lpm).
     */
    case 'fluter': {
      const cycle = 200; // 300 por minuto
      const nF = Math.round(L / cycle);
      const atrial: AtrialEvent[] = Array.from({ length: nF }, (_, i) => ({ t: i * cycle, kind: 'F' as const }));
      const pattern = r.conduccion === 'variable' ? [2, 4, 2, 3, 4, 2, 3] : [r.conduccion];
      const beats: Beat[] = [];
      let i = 0;
      let k = 0;
      while (i < nF) {
        const step = pattern[k++ % pattern.length];
        if (i + step > nF && beats.length) break;
        beats.push({ index: beats.length, pOnset: null, qrsOnset: i * cycle + 260, rr: step * cycle });
        i += step;
      }
      // Ajusta el último RR para cerrar el bucle
      const last = beats[beats.length - 1];
      last.rr = nF * cycle - (last.qrsOnset! - 260);
      return { duration: nF * cycle, beats, atrial };
    }

    /** RITMO SINUSAL: el nodo sinusal dispara a intervalos regulares y cada P se conduce. */
    case 'sinusal':
    default: {
      const n = Math.max(1, Math.round(L / pp));
      const beats: Beat[] = [];
      for (let k = 0; k < n; k++) {
        const pOnset = LEAD_IN + k * pp;
        beats.push({ index: k, pOnset, qrsOnset: pOnset + p.prInterval, rr: pp });
      }
      return { duration: n * pp, beats, atrial: [] };
    }
  }
}
