import { useEffect, useRef, useState } from 'react';
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
  { k: 'horizontal', label: 'Superior' },
  { k: 'lateral', label: 'Lateral' },
];

/** Botones de vista de cámara (se superponen al 3D). */
export function ViewButtons() {
  const view = useSim((s) => s.cameraView);
  const setView = useSim((s) => s.setCameraView);
  return (
    <div className="seg seg-glass" role="group" aria-label="Vista de la cámara">
      {VIEWS.map((v) => (
        <button key={v.k} className={`btn btn-seg${view === v.k ? ' is-on' : ''}`} onClick={() => setView(v.k)}>
          {v.label}
        </button>
      ))}
    </div>
  );
}

/** Contenido del panel de capas: mostrar/ocultar, transparencia y corte. */
export function LayerToggles() {
  const layers = useSim((s) => s.layers);
  const toggle = useSim((s) => s.toggleLayer);
  const opacity = useSim((s) => s.heartOpacity);
  const setOpacity = useSim((s) => s.setHeartOpacity);
  const cut = useSim((s) => s.cut);
  const setCut = useSim((s) => s.setCut);

  return (
    <div className="layers-panel">
      <div className="checks">
        {LAYERS.map((l) => (
          <label key={l.k} className="switch">
            <input type="checkbox" checked={layers[l.k]} onChange={() => toggle(l.k)} />
            <span className="switch-track" aria-hidden />
            {l.label}
          </label>
        ))}
      </div>
      <label className="slider">
        <span>Opacidad del corazón</span>
        <input type="range" min={0.08} max={1} step={0.01} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} />
      </label>
      <label className="switch">
        <input type="checkbox" checked={cut !== null} onChange={(e) => setCut(e.target.checked ? 0.3 : null)} />
        <span className="switch-track" aria-hidden />
        Corte frontal (ver el interior)
      </label>
      {cut !== null && (
        <label className="slider">
          <span>Profundidad del corte</span>
          <input type="range" min={-1.6} max={1.6} step={0.02} value={cut} onChange={(e) => setCut(Number(e.target.value))} />
        </label>
      )}
    </div>
  );
}

/** Botón «Capas» con el panel flotante. */
export function LayersButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  return (
    <div className="layers-wrap" ref={ref}>
      <button className={`btn btn-glass${open ? ' is-on' : ''}`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        ☰ Capas
      </button>
      {open && (
        <div className="popover">
          <LayerToggles />
        </div>
      )}
    </div>
  );
}
