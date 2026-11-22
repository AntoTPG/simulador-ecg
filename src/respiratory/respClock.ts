/**
 * Reloj propio de la sección respiratoria (en segundos), fuera de React, igual
 * que el del corazón: un bucle requestAnimationFrame avisa a las gráficas y la
 * escena 3D lo lee en cada fotograma. Es independiente del reloj cardíaco
 * porque el ciclo respiratorio dura mucho más que el cardíaco.
 */
import { create } from 'zustand';

type Listener = (t: number) => void;

class RespClock {
  t = 0;
  private listeners = new Set<Listener>();
  subscribe(fn: Listener) {
    this.listeners.add(fn);
    fn(this.t);
    return () => {
      this.listeners.delete(fn);
    };
  }
  emit() {
    for (const fn of this.listeners) fn(this.t);
  }
}

export const respClock = new RespClock();

export const useRespPlay = create<{ playing: boolean; speed: number; toggle: () => void; setSpeed: (s: number) => void }>()((set, get) => ({
  playing: true,
  speed: 1,
  toggle: () => set({ playing: !get().playing }),
  setSpeed: (speed) => set({ speed }),
}));

/** Arranca el bucle; devuelve la función para pararlo. */
export function startRespLoop() {
  let last = performance.now();
  let raf = 0;
  const loop = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const s = useRespPlay.getState();
    if (s.playing) {
      respClock.t += dt * s.speed;
      respClock.emit();
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf);
}
