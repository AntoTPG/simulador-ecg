import { useEffect, useRef } from 'react';
import { UI_LIMITS } from '../config/physiology';
import { mod } from '../engine/math';
import { clock } from '../store/clock';
import { useSim } from '../store/useSimStore';

/** Reproducir/pausar, avance fino, velocidad, FC, eje y «comparar con normal». */
export function Controls() {
  const playing = useSim((s) => s.playing);
  const togglePlay = useSim((s) => s.togglePlay);
  const setPlaying = useSim((s) => s.setPlaying);
  const speed = useSim((s) => s.speed);
  const setSpeed = useSim((s) => s.setSpeed);
  const hr = useSim((s) => s.heartRate);
  const setHr = useSim((s) => s.setHeartRate);
  const axis = useSim((s) => s.qrsAxis);
  const setAxis = useSim((s) => s.setQrsAxis);
  const compare = useSim((s) => s.compare);
  const toggleCompare = useSim((s) => s.toggleCompare);
  const isNormal = useSim((s) => s.pathologyId === 'normal');
  const rk = useSim((s) => s.sim.params.rhythm.kind);
  // FA y flúter: la frecuencia la marca la propia arritmia. En los bloqueos AV
  // el deslizador controla la frecuencia AURICULAR (la de las P).
  const rhythmFixed = rk === 'fa' || rk === 'fluter';
  const atrialHr = rk === 'wenckebach' || rk === 'mobitz2' || rk === 'bav3';
  const ownHr = useSim((s) => s.sim.params.heartRate !== s.heartRate);
  const timeRef = useRef<HTMLSpanElement>(null);

  useEffect(
    () =>
      clock.subscribe((t) => {
        const d = useSim.getState().sim.duration;
        if (timeRef.current) timeRef.current.textContent = `${(mod(t, d) / 1000).toFixed(2).replace('.', ',')} s`;
      }),
    [],
  );

  /** Avance fino: pausa y mueve el reloj `ms` milisegundos. */
  const step = (ms: number) => {
    setPlaying(false);
    clock.seek(mod(clock.t + ms, useSim.getState().sim.duration));
  };

  return (
    <section className="controls dock" aria-label="Controles de la simulación">
      <div className="controls-row">
        <div className="transport">
          <button className="icon-btn" onClick={() => step(-20)} aria-label="Retroceder 20 ms" title="Retroceder 20 ms">
            ◂
          </button>
          <button className="btn btn-primary play" onClick={togglePlay} aria-label={playing ? 'Pausar' : 'Reproducir'}>
            {playing ? '❚❚' : '▶'}
          </button>
          <button className="icon-btn" onClick={() => step(20)} aria-label="Avanzar 20 ms" title="Avanzar 20 ms">
            ▸
          </button>
          <span ref={timeRef} className="mono time-readout">
            0,00 s
          </span>
        </div>
        <div className="seg" role="group" aria-label="Velocidad">
          {UI_LIMITS.speeds.map((v) => (
            <button key={v} className={`btn btn-seg${speed === v ? ' is-on' : ''}`} onClick={() => setSpeed(v)}>
              {String(v).replace('.', ',')}×
            </button>
          ))}
        </div>
        <label
          className={`slider${rhythmFixed || ownHr ? ' is-disabled' : ''}`}
          title={
            rhythmFixed
              ? 'En esta arritmia la frecuencia la marca el propio ritmo (elígela en el panel de patología)'
              : ownHr
                ? 'Esta patología tiene su propia frecuencia (p. ej. taquicardia)'
                : undefined
          }
        >
          <span>
            FC {atrialHr ? 'auricular' : ''} <b className="mono">{rhythmFixed ? '—' : hr}</b> lpm
          </span>
          <input
            type="range"
            min={UI_LIMITS.heartRate[0]}
            max={UI_LIMITS.heartRate[1]}
            value={hr}
            disabled={rhythmFixed || ownHr}
            onChange={(e) => setHr(Number(e.target.value))}
          />
        </label>
        <label className="slider" title="Eje eléctrico del QRS en el plano frontal. Normal: −30° a +90°">
          <span>
            Eje <b className="mono">{axis > 0 ? '+' : ''}{axis}°</b>
          </span>
          <input type="range" min={-90} max={180} step={5} value={axis} onChange={(e) => setAxis(Number(e.target.value))} />
        </label>
        <button
          className={`btn compare-btn${compare ? ' is-on' : ''}`}
          onClick={toggleCompare}
          disabled={isNormal}
          aria-pressed={compare}
          title={isNormal ? 'Elige una patología para compararla con el ECG sano' : 'Superpone el ECG sano en azul'}
        >
          <span className="swatch" aria-hidden /> Comparar con normal
        </button>
      </div>
    </section>
  );
}
