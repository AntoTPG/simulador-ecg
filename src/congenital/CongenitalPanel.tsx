/**
 * Sección «Cardiopatías congénitas»: selector de malformaciones, esquema
 * anatómico con saturaciones y flujos, explicación fisiopatológica, hallazgos
 * clave y enlaces al soplo y al ECG relacionados de otras secciones de la app.
 */
import { useState } from 'react';
import { getPathology } from '../pathologies/registry';
import { getSound } from '../sounds/catalog';
import { useSim } from '../store/useSimStore';
import { CONGENITAS, getCongenita } from './catalog';
import { CongenitalDiagram, satColor } from './CongenitalDiagram';

const TIPO_LABEL = { normal: 'Referencia', acianogena: 'Acianógena (cortocircuito I→D)', cianogena: 'Cianógena' } as const;

export function CongenitalPanel() {
  const [id, setId] = useState('normal');
  const [showValues, setShowValues] = useState(true);
  const setSound = useSim((s) => s.setSound);
  const setPathology = useSim((s) => s.setPathology);
  const c = getCongenita(id);

  return (
    <section className="card congenital-card" aria-labelledby="cg-title">
      <div className="cg-head">
        <h2 id="cg-title">Cardiopatías congénitas · anatomía y flujos</h2>
        <label className="switch">
          <input type="checkbox" checked={showValues} onChange={(e) => setShowValues(e.target.checked)} />
          <span className="switch-track" aria-hidden />
          Saturación y presiones
        </label>
      </div>

      <div className="cg-chips" role="tablist" aria-label="Malformación">
        {CONGENITAS.map((x) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={x.id === id}
            className={`sound-chip ${x.tipo === 'cianogena' ? 'patologico' : x.tipo === 'normal' ? 'fisiologico' : 'acianogena'}${x.id === id ? ' is-on' : ''}`}
            onClick={() => setId(x.id)}
          >
            {x.nombre}
          </button>
        ))}
      </div>

      <div className="cg-body" key={c.id}>
        <figure className="cg-figure">
          <CongenitalDiagram c={c} showValues={showValues} />
          <figcaption className="cg-legend small">
            <span className="cg-scale" aria-hidden>
              <i style={{ background: `linear-gradient(90deg, ${satColor(70)}, ${satColor(85)}, ${satColor(98)})` }} />
            </span>
            <span>SatO₂ ≤ 72 % (venosa) → 85 % (mezcla) → 98 % (arterial)</span>
            <span className="muted">· Vista frontal: la derecha del paciente queda a la izquierda · Pasa el ratón por una cavidad para ver sus datos</span>
          </figcaption>
        </figure>

        <div className="cg-info">
          <div className="sound-badges">
            <span className={`badge ${c.tipo === 'cianogena' ? 'patologico' : c.tipo === 'normal' ? 'fisiologico' : ''}`}>{TIPO_LABEL[c.tipo]}</span>
            {c.frecuencia && <span className="badge">{c.frecuencia} de las cardiopatías congénitas</span>}
            <span className="badge">Qp/Qs {c.qpqs}</span>
          </div>
          <p className="cg-summary">{c.resumen}</p>
          <div className="explanation">
            {c.explicacion.map((t, i) => (
              <p key={i}>{t}</p>
            ))}
          </div>
          <dl className="cg-findings">
            {c.hallazgos.map((h) => (
              <div key={h.titulo}>
                <dt>{h.titulo}</dt>
                <dd>{h.texto}</dd>
              </div>
            ))}
          </dl>
          <div className="cg-links">
            {c.sonido && (
              <button className="btn btn-small" onClick={() => setSound(c.sonido!)} title="Lo selecciona en la sección «Ruidos cardíacos»">
                🩺 Elegir el ruido: {getSound(c.sonido).nombre}
              </button>
            )}
            {c.ecg && (
              <button className="btn btn-small" onClick={() => setPathology(c.ecg!)}>
                ∿ Ver el ECG: {getPathology(c.ecg).nombre}
              </button>
            )}
          </div>
          <p className="sources small muted">
            Fuente:{' '}
            <a
              href="https://www.msdmanuals.com/es/professional/pediatr%C3%ADa/anomal%C3%ADas-cardiovasculares-cong%C3%A9nitas/generalidades-sobre-las-anomal%C3%ADas-cardiovasculares-cong%C3%A9nitas"
              target="_blank"
              rel="noreferrer"
            >
              Manual MSD, «Anomalías cardiovasculares congénitas»
            </a>
            . Saturaciones y presiones orientativas (valores típicos de libro).
          </p>
        </div>
      </div>
    </section>
  );
}
