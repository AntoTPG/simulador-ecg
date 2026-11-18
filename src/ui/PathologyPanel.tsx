import { resolvePathology } from '../engine/applyPathology';
import { getPathology, REGISTRY_ERRORS } from '../pathologies/registry';
import { useSim } from '../store/useSimStore';
import { PathologyPicker } from './PathologyPicker';

/** Desplegable de patologías (agrupadas por categoría), deslizador de gravedad/fase y explicación. */
export function PathologyPanel() {
  const id = useSim((s) => s.pathologyId);
  const levelIndex = useSim((s) => s.levelIndex);
  const setLevel = useSim((s) => s.setLevel);
  const selectLead = useSim((s) => s.selectLead);
  const p = getPathology(id);
  const { level, afectadas, reciprocas } = resolvePathology(p, levelIndex);
  const niveles = p.control?.niveles ?? [];

  return (
    <section className="card pathology-panel" aria-labelledby="pat-title">
      <h2 id="pat-title">Patología</h2>
      <PathologyPicker />

      {REGISTRY_ERRORS.length > 0 && (
        <div className="registry-errors" role="alert">
          <b>Hay patologías con errores y no se han cargado:</b>
          <ul>
            {REGISTRY_ERRORS.map((e) => (
              <li key={e.archivo}>
                <code>{e.archivo}</code>: {e.mensaje}
              </li>
            ))}
          </ul>
        </div>
      )}

      {p.control && (
        <div className="level-control">
          <div className="level-head">
            <span className="muted">{p.control.etiqueta}:</span>
            <b>{level?.etiqueta}</b>
            {level?.detalle && <span className="muted">· {level.detalle}</span>}
          </div>
          <input
            type="range"
            min={0}
            max={niveles.length - 1}
            step={1}
            value={levelIndex}
            onChange={(e) => setLevel(Number(e.target.value))}
            aria-label={p.control.etiqueta}
            aria-valuetext={level?.etiqueta}
          />
          <div className="level-ticks" style={{ gridTemplateColumns: `repeat(${niveles.length}, 1fr)` }}>
            {niveles.map((n, i) => (
              <button key={n.id} className={`tick${i === levelIndex ? ' is-on' : ''}`} onClick={() => setLevel(i)}>
                {n.etiqueta}
              </button>
            ))}
          </div>
        </div>
      )}

      {(afectadas.length > 0 || reciprocas.length > 0) && (
        <div className="lead-chips">
          {afectadas.length > 0 && (
            <div>
              <span className="muted small">Derivaciones afectadas:</span>{' '}
              {afectadas.map((l) => (
                <button key={l} className="chip chip-afectada" onClick={() => selectLead(l)}>
                  {l}
                </button>
              ))}
            </div>
          )}
          {reciprocas.length > 0 && (
            <div>
              <span className="muted small">Cambios recíprocos / opuestos:</span>{' '}
              {reciprocas.map((l) => (
                <button key={l} className="chip chip-reciproca" onClick={() => selectLead(l)}>
                  {l}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="explanation" key={`${p.id}-${levelIndex}`}>
        {level?.explicacion?.map((t, i) => (
          <p key={`l${i}`} className="level-explanation">
            {t}
          </p>
        ))}
        {p.explicacion.map((t, i) => (
          <p key={i}>{t}</p>
        ))}
      </div>
    </section>
  );
}
