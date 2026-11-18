import { CATEGORY_ORDER, getPathology, PATHOLOGIES } from '../pathologies/registry';
import { useSim } from '../store/useSimStore';

/** Desplegable de patologías (agrupadas por categoría) + explicación fisiopatológica. */
export function PathologyPanel() {
  const id = useSim((s) => s.pathologyId);
  const setPathology = useSim((s) => s.setPathology);
  const p = getPathology(id);
  const groups = CATEGORY_ORDER.map((c) => ({ c, items: PATHOLOGIES.filter((x) => x.categoria === c) })).filter(
    (g) => g.items.length > 0,
  );

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
          <optgroup label="Próximamente (fase 2–3)">
            <option disabled>Isquemia/infarto por arteria coronaria</option>
            <option disabled>Hiperpotasemia · hipopotasemia</option>
            <option disabled>Pericarditis · miocarditis</option>
            <option disabled>Bloqueos de rama, bloqueos AV, FA, flúter, WPW…</option>
          </optgroup>
        </select>
      </label>
      <h3>{p.nombre}</h3>
      <div className="explanation">
        {p.explicacion.map((t, i) => (
          <p key={i}>{t}</p>
        ))}
      </div>
    </section>
  );
}
