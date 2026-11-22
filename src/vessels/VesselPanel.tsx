/**
 * Sección «Pared arterial»: corte transversal de una arteria normal y de sus
 * principales patologías, con lo que le ocurre a cada capa.
 */
import { useState } from 'react';
import { CAPAS_NORMALES, GRUPOS_VASO, NOMBRE_VASO, PATOLOGIAS_VASO, getPatologiaVaso, normalDe, type Capa } from './catalog';
import { VesselSvg } from './VesselSvg';

const CAPAS: Capa[] = ['intima', 'media', 'adventicia'];

export function VesselPanel() {
  const [id, setId] = useState('aterosclerosis');
  const [nivel, setNivel] = useState<number | null>(null);
  const [comparar, setComparar] = useState(true);
  const [rotulos, setRotulos] = useState(true);
  const p = getPatologiaVaso(id);
  const niveles = p.niveles ?? [];
  const idx = nivel ?? p.inicial ?? 0;
  const lvl = niveles[idx];
  const rasgos = lvl?.rasgos ?? p.rasgos;
  const capas = { ...p.capas, ...lvl?.capas };
  const esNormal = p.grupo === 'Referencia';
  const normal = normalDe(p.vaso);

  const elegir = (nid: string) => {
    setId(nid);
    setNivel(null);
  };

  return (
    <section className="card vessel-card" aria-labelledby="vs-title-h">
      <div className="cg-head">
        <h2 id="vs-title-h">Pared arterial · corte transversal</h2>
        <div className="vs-toggles">
          {!esNormal && (
            <label className="switch">
              <input type="checkbox" checked={comparar} onChange={(e) => setComparar(e.target.checked)} />
              <span className="switch-track" aria-hidden />
              Comparar con normal
            </label>
          )}
          <label className="switch">
            <input type="checkbox" checked={rotulos} onChange={(e) => setRotulos(e.target.checked)} />
            <span className="switch-track" aria-hidden />
            Rótulos
          </label>
        </div>
      </div>

      <div className="vs-groups">
        {GRUPOS_VASO.map((g) => {
          const items = PATOLOGIAS_VASO.filter((x) => x.grupo === g);
          return (
            <div key={g} className="sound-group">
              <div className="sound-group-title">{g}</div>
              <div className="sound-chips">
                {items.map((x) => (
                  <button
                    key={x.id}
                    className={`sound-chip ${x.grupo === 'Referencia' ? 'fisiologico' : 'patologico'}${x.id === id ? ' is-on' : ''}`}
                    onClick={() => elegir(x.id)}
                  >
                    {x.nombre}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {niveles.length > 0 && (
        <div className="level-control">
          <div className="level-head">
            <span className="muted">Fase:</span>
            <b>{lvl?.etiqueta}</b>
            {lvl?.detalle && <span className="muted">· {lvl.detalle}</span>}
          </div>
          <input type="range" min={0} max={niveles.length - 1} step={1} value={idx} onChange={(e) => setNivel(Number(e.target.value))} aria-label="Fase" />
          <div className="level-ticks" style={{ gridTemplateColumns: `repeat(${niveles.length}, 1fr)` }}>
            {niveles.map((n, i) => (
              <button key={n.id} className={`tick${i === idx ? ' is-on' : ''}`} onClick={() => setNivel(i)}>
                {n.etiqueta}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={`vs-figs${comparar && !esNormal ? ' two' : ''}`} key={`${id}-${idx}`}>
        {comparar && !esNormal && (
          <figure className="vs-fig">
            <VesselSvg vaso={p.vaso} rasgos={normal.rasgos} rotulos={rotulos} titulo="Normal" seed={11} />
          </figure>
        )}
        <figure className="vs-fig">
          <VesselSvg vaso={p.vaso} rasgos={rasgos} rotulos={rotulos} titulo={esNormal ? NOMBRE_VASO[p.vaso] : p.nombre.split(' (')[0]} seed={11} />
        </figure>
      </div>
      <p className="muted small vs-note">
        {NOMBRE_VASO[p.vaso]} · esquema estilizado tipo hematoxilina‑eosina (núcleos morados, músculo rosa, láminas elásticas oscuras), no a escala.
      </p>

      <p className="cg-summary">{p.resumen}</p>

      <div className="vs-layers">
        {CAPAS.map((c) => {
          const cambio = capas[c];
          return (
            <div key={c} className={`vs-layer${cambio ? ' afectada' : ''}`}>
              <div className="vs-layer-head">
                <b>{CAPAS_NORMALES[c].nombre}</b>
                <span className={`badge ${cambio ? 'patologico' : 'fisiologico'}`}>{esNormal ? 'Normal' : cambio ? 'Afectada' : 'Sin cambios relevantes'}</span>
              </div>
              <p>{esNormal ? CAPAS_NORMALES[c].texto : cambio ?? CAPAS_NORMALES[c].texto}</p>
            </div>
          );
        })}
      </div>

      <div className="explanation">
        {lvl?.explicacion?.map((t, i) => (
          <p key={`l${i}`} className="level-explanation">
            {t}
          </p>
        ))}
        {p.explicacion.map((t, i) => (
          <p key={i}>{t}</p>
        ))}
      </div>
      {p.clinica.length > 0 && (
        <dl className="cg-findings">
          <div>
            <dt>Clínica</dt>
            {p.clinica.map((t, i) => (
              <dd key={i}>{t}</dd>
            ))}
          </div>
        </dl>
      )}
      <p className="sources small muted">
        Fuentes: Ross y Pawlina, <i>Histología</i> (sistema cardiovascular) y Manual MSD:{' '}
        <a href="https://www.msdmanuals.com/es/professional/trastornos-cardiovasculares/arteriosclerosis/arteriosclerosis-no-ateromatosa" target="_blank" rel="noreferrer">
          arteriosclerosis no ateromatosa
        </a>
        ,{' '}
        <a href="https://www.msdmanuals.com/es/professional/trastornos-cardiovasculares/enfermedades-de-la-aorta-y-sus-ramas/generalidades-sobre-los-aneurismas-a%C3%B3rticos" target="_blank" rel="noreferrer">
          aneurismas aórticos
        </a>{' '}
        y capítulos de aterosclerosis, disección aórtica, vasculitis y sífilis.
      </p>
    </section>
  );
}
