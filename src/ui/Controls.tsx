import { UI_LIMITS } from '../config/physiology';
import { useSim } from '../store/useSimStore';
import { Timeline } from './Timeline';

/** Reproducir/pausar, velocidad, FC, eje y línea de tiempo. */
export function Controls() {
  const playing = useSim((s) => s.playing);
  const togglePlay = useSim((s) => s.togglePlay);
  const speed = useSim((s) => s.speed);
  const setSpeed = useSim((s) => s.setSpeed);
  const hr = useSim((s) => s.heartRate);
  const setHr = useSim((s) => s.setHeartRate);
  const axis = useSim((s) => s.qrsAxis);
  const setAxis = useSim((s) => s.setQrsAxis);
  const compare = useSim((s) => s.compare);
  const toggleCompare = useSim((s) => s.toggleCompare);
  const isNormal = useSim((s) => s.pathologyId === 'normal');

  return (
    <section className="controls panel" aria-label="Controles de la simulación">
      <div className="controls-row">
        <button className="btn btn-primary play" onClick={togglePlay} aria-label={playing ? 'Pausar' : 'Reproducir'}>
          {playing ? '❚❚' : '▶'}
        </button>
        <div className="seg" role="group" aria-label="Velocidad">
          {UI_LIMITS.speeds.map((v) => (
            <button key={v} className={`btn btn-seg${speed === v ? ' is-on' : ''}`} onClick={() => setSpeed(v)}>
              {String(v).replace('.', ',')}×
            </button>
          ))}
        </div>
        <label className="slider">
          <span>
            FC <b className="mono">{hr}</b> lpm
          </span>
          <input
            type="range"
            min={UI_LIMITS.heartRate[0]}
            max={UI_LIMITS.heartRate[1]}
            value={hr}
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
      <Timeline />
    </section>
  );
}
