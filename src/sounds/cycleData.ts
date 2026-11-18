/**
 * Datos del ciclo cardíaco y del sonido para la simulación actual y el ruido
 * elegido. Se calculan una sola vez por combinación (caché) porque los usan
 * varios componentes a la vez (Wiggers, fonocardiograma, audio).
 */
import { computeCycle, NORMAL_HEMO, type Cycle } from '../engine/hemodynamics';
import type { SimResult } from '../engine/simulate';
import { buildAcousticEvents, synthesize, type AcousticEvent } from './acoustics';
import { getSound, type HeartSoundDef } from './catalog';

export interface CycleData {
  cycle: Cycle;
  sound: HeartSoundDef;
  events: AcousticEvent[];
  /** Audio de todo el registro (22 050 Hz). */
  audio: Float32Array;
}

const cache = new WeakMap<SimResult, Map<string, CycleData>>();

export function getCycleData(sim: SimResult, soundId: string): CycleData {
  let m = cache.get(sim);
  if (!m) {
    m = new Map();
    cache.set(sim, m);
  }
  let d = m.get(soundId);
  if (!d) {
    const sound = getSound(soundId);
    const cycle = computeCycle(sim, { ...NORMAL_HEMO, ...sound.hemo });
    const events = buildAcousticEvents(cycle, sound);
    d = { cycle, sound, events, audio: synthesize(events, sim.duration) };
    m.set(soundId, d);
  }
  return d;
}
