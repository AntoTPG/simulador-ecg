/**
 * ============================================================================
 *  FONOCARDIOGRAMA SINTÉTICO
 * ============================================================================
 * A partir de los eventos mecánicos del ciclo (cierres y aperturas valvulares,
 * contracciones auriculares) se colocan los ruidos y soplos de cada latido y se
 * sintetiza el sonido:
 *  - RUIDOS (R1, R2, R3, R4, clics, chasquidos): sinusoides amortiguadas. Los
 *    graves (R3, R4) tienen poca frecuencia; los clics, mucha.
 *  - SOPLOS: ruido blanco filtrado (paso banda) con la envolvente propia de
 *    cada soplo (romboidal, holosistólico, decreciente…). La turbulencia de la
 *    sangre es, literalmente, "ruido".
 *
 * La RESPIRACIÓN (ciclo de 5 s, 40 % inspiración) modula el desdoblamiento del R2.
 */
import type { Cycle, MechBeat } from '../engine/hemodynamics';
import { mod, smoothstep } from '../engine/math';
import type { HeartSoundDef, MurmurShape } from './catalog';

export const AUDIO_RATE = 22050;
export const RESP_PERIOD = 5000;

/** 0 = espiración, 1 = inspiración máxima (curva suave). */
export function inspiration(t: number) {
  const x = mod(t, RESP_PERIOD) / RESP_PERIOD;
  return x < 0.4 ? Math.sin((Math.PI * x) / 0.4) : 0;
}

export type AcousticEvent =
  | { kind: 'tono'; label: string; t: number; f: number; tau: number; amp: number }
  | { kind: 'soplo'; label: string; t0: number; t1: number; shape: MurmurShape; f: number; amp: number; beat: MechBeat }
  | { kind: 'roce'; label: string; t0: number; t1: number; amp: number };

const TONE_F = { grave: 90, medio: 190, agudo: 380 } as const;

/** Separación A2→P2 (ms; negativa = P2 antes que A2) según el tipo de desdoblamiento. */
function splitMs(kind: HeartSoundDef['desdoblamiento'], t: number) {
  const insp = inspiration(t);
  switch (kind) {
    case 'fisiologico':
      return 6 + 34 * insp;
    case 'amplio':
      return 45 + 30 * insp;
    case 'fijo':
      return 50;
    case 'paradojico':
      return -(45 - 38 * insp);
    case 'unico':
      return 0;
  }
}

export function buildAcousticEvents(cycle: Cycle, def: HeartSoundDef): AcousticEvent[] {
  const ev: AcousticEvent[] = [];
  for (const b of cycle.beats) {
    // R1: más intenso si el PR es corto o la diástole breve (las valvas están muy abiertas
    // cuando empieza la sístole); débil en el BAV de 1.er grado (ya casi cerradas).
    const pr = b.pr ?? 160;
    const prFactor = Math.min(1.4, Math.max(0.45, 1.35 - (pr - 120) / 260));
    const a1 = prFactor * (def.r1 ?? 1);
    ev.push({ kind: 'tono', label: 'R1', t: b.mc, f: 62, tau: 0.024, amp: a1 });
    ev.push({ kind: 'tono', label: 'T1', t: b.mc + 22, f: 52, tau: 0.02, amp: 0.55 * a1 });

    // R2 = A2 + P2
    const s = splitMs(def.desdoblamiento, b.ac);
    ev.push({ kind: 'tono', label: 'A2', t: b.ac, f: 95, tau: 0.016, amp: 0.95 });
    if (def.desdoblamiento !== 'unico') ev.push({ kind: 'tono', label: 'P2', t: b.ac + s, f: 82, tau: 0.015, amp: 0.9 * (def.p2 ?? 0.5) });

    const ejection = b.ac - b.ao;
    const diastole = b.end - b.mo;
    for (const e of def.elementos) {
      switch (e.tipo) {
        case 'R3':
          if (diastole > 160) ev.push({ kind: 'tono', label: 'R3', t: b.mo + 120, f: 40, tau: 0.04, amp: 0.6 });
          break;
        case 'R4':
          // Necesita contracción auricular eficaz con la mitral abierta (no existe en la FA)
          for (const ta of b.atrialInDiastole) ev.push({ kind: 'tono', label: 'R4', t: ta + 30, f: 44, tau: 0.035, amp: 0.55 });
          break;
        case 'clicEyeccion':
          ev.push({ kind: 'tono', label: 'Clic', t: b.ao + 15, f: 720, tau: 0.004, amp: 0.55 });
          break;
        case 'clicMesosistolico':
          ev.push({ kind: 'tono', label: 'Clic', t: b.ao + 0.5 * ejection, f: 650, tau: 0.005, amp: 0.65 });
          break;
        case 'chasquidoApertura':
          ev.push({ kind: 'tono', label: 'ChA', t: b.ac + e.retraso, f: 480, tau: 0.006, amp: 0.75 });
          break;
        case 'knock':
          ev.push({ kind: 'tono', label: 'Knock', t: b.mo + 70, f: 75, tau: 0.022, amp: 1.0 });
          break;
        case 'roce': {
          for (const ta of b.atrialInDiastole) ev.push({ kind: 'roce', label: 'Roce', t0: ta - 50, t1: ta + 50, amp: 0.45 });
          ev.push({ kind: 'roce', label: 'Roce', t0: b.ao, t1: b.ao + 0.7 * ejection, amp: 0.6 });
          ev.push({ kind: 'roce', label: 'Roce', t0: b.mo, t1: b.mo + Math.min(150, diastole * 0.4), amp: 0.4 });
          break;
        }
        case 'soplo': {
          const f = TONE_F[e.tono];
          let t0 = 0;
          let t1 = 0;
          switch (e.forma) {
            case 'romboidal':
              t0 = b.ao + 10;
              t1 = b.ac - 15;
              break;
            case 'eyectivoSuave':
              t0 = b.ao + 20;
              t1 = b.ao + 0.6 * ejection;
              break;
            case 'holosistolico':
              t0 = b.mc + 12;
              t1 = b.ac + 12;
              break;
            case 'telesistolico':
              t0 = b.ao + 0.5 * ejection + 15;
              t1 = b.ac;
              break;
            case 'decreciente':
              t0 = b.ac + 8;
              t1 = b.ac + 0.7 * (b.end - b.ac);
              break;
            case 'retumbo': {
              const snap = def.elementos.find((x) => x.tipo === 'chasquidoApertura');
              t0 = b.ac + (snap && snap.tipo === 'chasquidoApertura' ? snap.retraso + 25 : b.mo - b.ac + 30);
              t1 = b.end - 45;
              break;
            }
            case 'continuo':
              t0 = b.mc + 40;
              t1 = b.end;
              break;
          }
          if (t1 > t0 + 20) ev.push({ kind: 'soplo', label: 'Soplo', t0, t1, shape: e.forma, f, amp: e.intensidad, beat: b });
          break;
        }
      }
    }
  }
  return ev;
}

/** Envolvente de cada soplo (0–1) en el instante t. */
function murmurEnvelope(e: Extract<AcousticEvent, { kind: 'soplo' }>, t: number) {
  const x = (t - e.t0) / (e.t1 - e.t0);
  if (x < 0 || x > 1) return 0;
  const edges = smoothstep(0, 0.05, x) * (1 - smoothstep(0.95, 1, x));
  switch (e.shape) {
    case 'romboidal':
      return Math.pow(Math.sin(Math.PI * Math.pow(x, 0.85)), 1.2);
    case 'eyectivoSuave':
      return Math.sin(Math.PI * x);
    case 'holosistolico':
      return edges * 0.95;
    case 'telesistolico':
      return edges * (0.55 + 0.45 * x);
    case 'decreciente':
      return edges * Math.exp(-2.6 * x);
    case 'retumbo': {
      // Decreciente + refuerzo presistólico si hay contracción auricular
      let v = 0.75 * Math.exp(-1.6 * x);
      for (const ta of e.beat.atrialInDiastole) v += Math.exp(-0.5 * ((t - (ta + 40)) / 45) ** 2);
      return edges * Math.min(1.2, v);
    }
    case 'continuo': {
      const ac = e.beat.ac;
      const v = t < ac ? smoothstep(e.t0, ac, t) : Math.exp(-(t - ac) / 380);
      return edges * (0.25 + 0.75 * v);
    }
  }
}

/** Filtro paso banda (biquad de Robert Bristow‑Johnson). */
function bandpass(f0: number, q: number) {
  const w = (2 * Math.PI * f0) / AUDIO_RATE;
  const alpha = Math.sin(w) / (2 * q);
  const a0 = 1 + alpha;
  const b0 = alpha / a0;
  const b2 = -alpha / a0;
  const a1 = (-2 * Math.cos(w)) / a0;
  const a2 = (1 - alpha) / a0;
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  return (x: number) => {
    const y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    return y;
  };
}

/** Generador pseudoaleatorio reproducible. */
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

/** Sintetiza el sonido de todo el registro (bucle de `durationMs`). */
export function synthesize(events: AcousticEvent[], durationMs: number): Float32Array {
  const n = Math.round((durationMs / 1000) * AUDIO_RATE);
  const out = new Float32Array(n);
  const rand = rng(7);
  const idx = (tMs: number) => Math.round((tMs / 1000) * AUDIO_RATE);

  for (const e of events) {
    if (e.kind === 'tono') {
      // Sinusoide amortiguada con un armónico (para que se oiga también en altavoces pequeños)
      const i0 = idx(e.t);
      const len = Math.round(e.tau * 6 * AUDIO_RATE);
      for (let k = 0; k < len; k++) {
        const s = k / AUDIO_RATE;
        const env = (1 - Math.exp(-s / 0.003)) * Math.exp(-s / e.tau);
        const v = Math.sin(2 * Math.PI * e.f * s) + 0.45 * Math.sin(2 * Math.PI * e.f * 2.3 * s + 1) + 0.2 * Math.sin(2 * Math.PI * e.f * 4.1 * s);
        out[mod(i0 + k, n)] += e.amp * env * v * 0.55;
      }
    } else if (e.kind === 'soplo') {
      const bp = bandpass(e.f, 0.9);
      const bp2 = bandpass(e.f * 2.2, 1.2);
      const i0 = idx(e.t0);
      const i1 = idx(e.t1);
      for (let i = i0; i < i1; i++) {
        const t = (i / AUDIO_RATE) * 1000;
        const w = rand() * 2 - 1;
        const v = bp(w) + 0.5 * bp2(w);
        out[mod(i, n)] += e.amp * murmurEnvelope(e, t) * v * 0.9;
      }
    } else {
      // Roce: ruido agudo áspero, modulado a saltos ("rasposo")
      const bp = bandpass(520, 0.7);
      const i0 = idx(e.t0);
      const i1 = idx(e.t1);
      let scratch = 1;
      for (let i = i0; i < i1; i++) {
        if (i % 160 === 0) scratch = 0.35 + 0.65 * rand();
        const x = (i - i0) / Math.max(1, i1 - i0);
        out[mod(i, n)] += e.amp * Math.sin(Math.PI * x) * scratch * bp(rand() * 2 - 1) * 1.6;
      }
    }
  }

  // Normalización
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
  if (peak > 0) for (let i = 0; i < n; i++) out[i] *= 0.85 / peak;
  return out;
}
