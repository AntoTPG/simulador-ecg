/**
 * RUIDOS CARDÍACOS: catálogo de ruidos fisiológicos y patológicos, con su
 * explicación, el foco de auscultación y el sonido sintetizado y sincronizado.
 */
import { FOCO_INFO, HEART_SOUNDS, SOUND_GROUPS, getSound, type Foco } from '../sounds/catalog';
import { getPathology } from '../pathologies/registry';
import { useSim } from '../store/useSimStore';
import { Recordings } from './Recordings';

/** Posición de cada foco en el esquema del tórax (coordenadas del SVG). */
const FOCO_POS: Record<Foco, [number, number]> = {
  aortico: [44, 38],
  pulmonar: [66, 38],
  erb: [66, 54],
  tricuspideo: [62, 74],
  mitral: [84, 82],
};

function ChestMap({ foco }: { foco: Foco }) {
  return (
    <svg className="chest" viewBox="0 0 110 120" role="img" aria-label={`Foco de auscultación: ${FOCO_INFO[foco].nombre}`}>
      {/* Contorno del tórax y esternón */}
      <path d="M15 20 Q55 6 95 20 L100 110 Q55 118 10 110 Z" className="chest-body" />
      <rect x="51" y="22" width="8" height="66" rx="3" className="chest-sternum" />
      {[34, 46, 58, 70, 82].map((y) => (
        <path key={y} d={`M18 ${y} Q55 ${y - 6} 92 ${y}`} className="chest-rib" />
      ))}
      {/* Silueta del corazón */}
      <path d="M48 46 Q40 58 50 80 Q62 96 86 88 Q96 70 80 52 Q66 42 48 46 Z" className="chest-heart" />
      {(Object.keys(FOCO_POS) as Foco[]).map((f) => (
        <circle key={f} cx={FOCO_POS[f][0]} cy={FOCO_POS[f][1]} r={f === foco ? 6 : 3.2} className={f === foco ? 'foco on' : 'foco'} />
      ))}
    </svg>
  );
}

export function HeartSoundsPanel() {
  const soundId = useSim((s) => s.soundId);
  const setSound = useSim((s) => s.setSound);
  const audioOn = useSim((s) => s.audioOn);
  const setAudioOn = useSim((s) => s.setAudioOn);
  const setPathology = useSim((s) => s.setPathology);
  const pathologyId = useSim((s) => s.pathologyId);
  const def = getSound(soundId);
  const foco = FOCO_INFO[def.foco];
  const ecg = def.ecgAsociado ? getPathology(def.ecgAsociado) : null;

  return (
    <section className="card sounds-card" aria-labelledby="sounds-title">
      <div className="sounds-head">
        <h2 id="sounds-title">Ruidos cardíacos</h2>
        <button
          className={`btn listen-btn${audioOn ? ' is-on' : ''}`}
          onClick={() => {
            // Si suena una grabación real, se para: solo una cosa sonando a la vez
            if (!audioOn) document.querySelectorAll('audio').forEach((a) => a.pause());
            setAudioOn(!audioOn);
          }}
          aria-pressed={audioOn}
          title="Reproduce el sonido sintetizado, sincronizado con el ECG y el diagrama (pone la velocidad a 1×)"
        >
          {audioOn ? '🔊 Escuchando' : '🔈 Escuchar'}
        </button>
      </div>

      <div className="sound-groups">
        {SOUND_GROUPS.map((g) => {
          const items = HEART_SOUNDS.filter((s) => s.grupo === g);
          if (!items.length) return null;
          return (
            <div key={g} className="sound-group">
              <div className="sound-group-title">{g}</div>
              <div className="sound-chips">
                {items.map((s) => (
                  <button
                    key={s.id}
                    className={`sound-chip ${s.tipo}${s.id === soundId ? ' is-on' : ''}`}
                    onClick={() => setSound(s.id)}
                    title={s.patron}
                  >
                    {s.nombre}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="sound-detail" key={def.id}>
        <ChestMap foco={def.foco} />
        <div className="sound-text">
          <h3>{def.nombre}</h3>
          <div className="sound-badges">
            <span className={`badge ${def.tipo}`}>{def.tipo === 'fisiologico' ? 'Fisiológico' : 'Patológico'}</span>
            <span className="badge">{foco.nombre}</span>
            <span className="badge">{def.estetoscopio === 'campana' ? 'Campana (graves)' : 'Membrana (agudos)'}</span>
          </div>
          <p className="sound-pattern mono">{def.patron}</p>
          <p className="muted small">{foco.lugar}</p>
        </div>
      </div>
      <div className="explanation">
        {def.explicacion.map((t, i) => (
          <p key={i}>{t}</p>
        ))}
      </div>
      {def.grabaciones && def.grabaciones.length > 0 && <Recordings key={`rec-${def.id}`} items={def.grabaciones} />}
      {ecg && ecg.id !== pathologyId && (
        <button className="btn btn-small" onClick={() => setPathology(ecg.id)}>
          Ver el ECG asociado: {ecg.nombre}
        </button>
      )}
      <p className="sources small muted">
        «Escuchar» reproduce un sonido sintetizado con el modelo y sincronizado con la animación (mejor con auriculares). Contenido basado en el{' '}
        <a href="https://www.msdmanuals.com/es/professional/trastornos-cardiovasculares/abordaje-del-paciente-card%C3%ADaco/auscultaci%C3%B3n-card%C3%ADaca" target="_blank" rel="noreferrer">
          Manual MSD, «Auscultación cardíaca»
        </a>

        . Grabaciones reales: Judge R., Mangrulkar R.,{' '}
        <a href="https://hdl.handle.net/2027.42/120554" target="_blank" rel="noreferrer">
          Heart Sound and Murmur Library
        </a>{' '}
        (University of Michigan Medical School, 2015),{' '}
        <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.es" target="_blank" rel="noreferrer">
          CC BY‑SA 4.0
        </a>
        ; recortadas a 30 s y recodificadas.
      </p>
    </section>
  );
}
