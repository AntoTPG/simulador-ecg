import { resolvePathology } from '../engine/applyPathology';
import { getPathology, PATHOLOGIES, REGISTRY_ERRORS } from '../pathologies/registry';
import { CATEGORIES } from '../pathologies/schema';
import { useSim } from '../store/useSimStore';

/** Desplegable de patologías (agrupadas por categoría), deslizador de gravedad/fase y explicación. */
export function PathologyPanel() {
  const id = useSim((s) => s.pathologyId);
  const levelIndex = useSim((s) => s.levelIndex);
  const setPathology = useSim((s) => s.setPathology);
  const setLevel = useSim((s) => s.setLevel);
  const selectLead = useSim((s) => s.selectLead);
  const p = getPathology(id);
  const { level, afectadas, reciprocas } = resolvePathology(p, levelIndex);
  const groups = CATEGORIES.map((c) => ({ c, items: PATHOLOGIES.filter((x) => x.categoria === c) })).filter(
    (g) => g.items.length > 0,
  );
  const niveles = p.control?.niveles ?? [];

  return (
    <section className="panel pathology-panel" aria-labelledby="pat-title">
      <h2 id="pat-title">Patología</h2>
      <label className="field">
        <span className="sr-only">Selecciona una patología</span>
        <select value={id} onChange={(e) => setPathology(e.target.value)}>
          {groups.map((g) => (
            <optgroup key={g.c} label={g.c}>
              {g.items.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nombre}
                </option>
              ))}
            </optgroup>
          ))}
          <optgroup label="Próximamente (fase 3)">
            <option disabled>Pericarditis · miocarditis · calcio</option>
            <option disabled>Bloqueos de rama y hemibloqueos · HVI · WPW</option>
            <option disabled>Bloqueos AV · FA · flúter · TEP · Brugada · QT largo · digital</option>
          </optgroup>
        </select>
      </label>

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

      <h3>{p.nombre}</h3>
      <div className="explanation">
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
