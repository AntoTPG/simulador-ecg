/**
 * PLANIFICADOR DEL RITMO
 * ----------------------
 * Separa el CUÁNDO (qué ondas ocurren y en qué momento) del CÓMO (la forma de
 * cada onda). Un latido es: una activación auricular (P) y/o una ventricular
 * (QRS + T). Separarlas permite modelar más adelante:
 *   - bloqueos AV: P sin QRS detrás (2.º grado) o P y QRS independientes (3.er grado);
 *   - fibrilación/flúter: actividad auricular continua (ondas f / F) y QRS irregulares;
 *   - extrasístoles, WPW, etc.
 *
 * El registro se repite en bucle; su duración es un número entero de ciclos lo
 * más cercano posible a 10 s, para que el bucle empalme sin saltos.
 */
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

export interface Schedule {
  /** Duración del registro en bucle (ms). */
  duration: number;
  beats: Beat[];
}

/** Retraso desde el inicio del registro hasta la primera P (deja algo de línea de base). */
const LEAD_IN = 180;

export function scheduleRhythm(p: SimParams): Schedule {
  switch (p.rhythm.kind) {
    case 'sinusal':
    default: {
      // RITMO SINUSAL: el nodo sinusal dispara a intervalos regulares (RR = 60000/FC);
      // cada P se conduce por el nodo AV y va seguida de un QRS tras el PR.
      const rr = 60000 / p.heartRate;
      const n = Math.max(1, Math.round(p.targetDuration / rr));
      const beats: Beat[] = [];
      for (let k = 0; k < n; k++) {
        const pOnset = LEAD_IN + k * rr;
        beats.push({ index: k, pOnset, qrsOnset: pOnset + p.prInterval, rr });
      }
      return { duration: n * rr, beats };
    }
  }
}
