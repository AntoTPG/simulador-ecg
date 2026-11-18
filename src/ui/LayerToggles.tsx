import { useSim, type CameraView, type Layer } from '../store/useSimStore';

const LAYERS: { k: Layer; label: string }[] = [
  { k: 'electrodos', label: 'Electrodos' },
  { k: 'ejesMiembros', label: 'Ejes de miembros' },
  { k: 'ejesPrecordiales', label: 'Ejes precordiales' },
  { k: 'planoFrontal', label: 'Plano frontal' },
  { k: 'planoHorizontal', label: 'Plano horizontal' },
  { k: 'bucle', label: 'Bucle vectorial' },
  { k: 'coronarias', label: 'Arterias coronarias' },
  { k: 'conduccion', label: 'Sistema de conducción' },
];

const VIEWS: { k: CameraView; label: string }[] = [
  { k: 'oblicua', label: '3/4' },
  { k: 'frontal', label: 'Frontal' },
  { k: 'horizontal', label: 'Horizontal' },
  { k: 'lateral', label: 'Lateral izq.' },
];

/** Botones de vista de cámara (se superponen al 3D). */
export function ViewButtons() {
  const setView = useSim((s) => s.setCameraView);
  return (
    <div className="view-buttons" role="group" aria-label="Vista de la cámara">
      {VIEWS.map((v) => (
        <button key={v.k} className="btn btn-small" onClick={() => setView(v.k)}>
          {v.label}
        </button>
      ))}
    </div>
  );
}

/** Mostrar/ocultar capas del 3D, transparencia y corte. */
export function LayerToggles() {
  const layers = useSim((s) => s.layers);
  const toggle = useSim((s) => s.toggleLayer);
  const opacity = useSim((s) => s.heartOpacity);
  const setOpacity = useSim((s) => s.setHeartOpacity);
  const cut = useSim((s) => s.cut);
  const setCut = useSim((s) => s.setCut);

  return (
    <section className="panel layers-panel" aria-labelledby="layers-title">
      <h2 id="layers-title">Capas del 3D</h2>
      <div className="checks">
        {LAYERS.map((l) => (
          <label key={l.k} className="check">
            <input type="checkbox" checked={layers[l.k]} onChange={() => toggle(l.k)} />
            {l.label}
          </label>
        ))}
      </div>
      <label className="slider">
        <span>Opacidad del corazón</span>
        <input type="range" min={0.08} max={1} step={0.01} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} />
      </label>
      <label className="check">
        <input type="checkbox" checked={cut !== null} onChange={(e) => setCut(e.target.checked ? 0.3 : null)} />
        Corte frontal (ver el interior)
      </label>
      {cut !== null && (
        <label className="slider">
          <span>Profundidad del corte</span>
          <input type="range" min={-1.6} max={1.6} step={0.02} value={cut} onChange={(e) => setCut(Number(e.target.value))} />
        </label>
      )}
    </section>
  );
}
