/**
 * Reproducción del sonido sincronizada con el reloj de la simulación.
 * El audio solo tiene sentido a velocidad real (1×): al activarlo se fija la
 * velocidad a 1× y, si el reloj salta (pausa, botones de fase, cambio de
 * velocidad), el audio se detiene o se vuelve a sincronizar.
 */
import { mod } from '../engine/math';
import { AUDIO_RATE } from './acoustics';

let ctx: AudioContext | null = null;
let src: AudioBufferSourceNode | null = null;
let gain: GainNode | null = null;
let startedAt = 0;
let offsetMs = 0;
let loopMs = 0;
let current: Float32Array | null = null;

export function isAudioRunning() {
  return src !== null;
}

export function playLoop(samples: Float32Array, durationMs: number, fromMs: number) {
  stopAudio();
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  const buf = ctx.createBuffer(1, samples.length, AUDIO_RATE);
  buf.getChannelData(0).set(samples);
  src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  gain = ctx.createGain();
  gain.gain.value = 0.9;
  src.connect(gain).connect(ctx.destination);
  offsetMs = mod(fromMs, durationMs);
  loopMs = durationMs;
  src.start(0, offsetMs / 1000);
  startedAt = ctx.currentTime;
  current = samples;
}

export function stopAudio() {
  if (src) {
    try {
      src.stop();
    } catch {
      /* ya parado */
    }
    src.disconnect();
  }
  src = null;
  current = null;
}

/** Instante del registro (ms) que está sonando ahora mismo, o null. */
export function audioPositionMs(): number | null {
  if (!ctx || !src) return null;
  return mod(offsetMs + (ctx.currentTime - startedAt) * 1000, loopMs);
}

export const currentSamples = () => current;
