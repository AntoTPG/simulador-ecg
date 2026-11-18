/**
 * Reloj de la simulación, fuera de React.
 * Un único bucle requestAnimationFrame avanza el tiempo y avisa a los
 * suscriptores (ECG, línea de tiempo, paneles). La escena 3D lo lee
 * directamente en cada fotograma con `clock.t`.
 */
type Listener = (t: number) => void;

class SimClock {
  /** Tiempo actual dentro del registro (ms). */
  t = 0;
  private listeners = new Set<Listener>();

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.t);
    return () => this.listeners.delete(fn);
  }

  seek(t: number) {
    this.t = t;
    this.emit();
  }

  emit() {
    for (const fn of this.listeners) fn(this.t);
  }
}

export const clock = new SimClock();

/**
 * Arranca el bucle de animación. `getState` devuelve si está en marcha, la
 * velocidad (1 = tiempo real) y la duración del registro para hacer el bucle.
 */
export function startClockLoop(getState: () => { playing: boolean; speed: number; duration: number }) {
  let last = performance.now();
  let raf = 0;
  const loop = (now: number) => {
    const dt = Math.min(100, now - last); // si la pestaña estuvo oculta, no saltar
    last = now;
    const s = getState();
    if (s.playing) {
      clock.t = (clock.t + dt * s.speed) % s.duration;
      clock.emit();
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf);
}
