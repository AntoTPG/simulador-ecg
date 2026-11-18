/**
 * GRABACIONES REALES de la Heart Sound and Murmur Library (Universidad de
 * Michigan, CC BY‑SA 4.0). No están sincronizadas con la simulación (son de
 * pacientes reales, con su propia frecuencia), así que al reproducir una se
 * apaga el sonido sintetizado.
 */
import { useState } from 'react';
import type { Recording } from '../sounds/catalog';
import { useSim } from '../store/useSimStore';

const BASE = `${import.meta.env.BASE_URL}audio/michigan/`;

function RecordingItem({ r }: { r: Recording }) {
  const setAudioOn = useSim((s) => s.setAudioOn);
  const [showScheme, setShowScheme] = useState(false);
  const [error, setError] = useState(false);

  return (
    <li className="rec">
      <div className="rec-head">
        <b>{r.titulo}</b>
        <span className="muted small">{r.como}</span>
      </div>
      {error ? (
        <p className="small rec-error">
          No se pudo cargar el audio. En la versión de «un solo archivo» las grabaciones no van incluidas: abre la versión web.
        </p>
      ) : (
        <audio
          controls
          preload="none"
          src={BASE + r.archivo}
          onPlay={(e) => {
            // Solo una cosa sonando a la vez
            setAudioOn(false);
            document.querySelectorAll('audio').forEach((a) => a !== e.currentTarget && a.pause());
          }}
          onError={() => setError(true)}
        />
      )}
      {r.nota && <p className="small rec-note">{r.nota}</p>}
      {r.esquema && (
        <>
          <button className="link-btn small" onClick={() => setShowScheme((v) => !v)} aria-expanded={showScheme}>
            {showScheme ? 'Ocultar esquema' : 'Ver esquema fonocardiográfico original'}
          </button>
          {showScheme && <img className="rec-scheme" src={BASE + r.esquema} alt={`Esquema de ${r.titulo}`} loading="lazy" />}
        </>
      )}
    </li>
  );
}

export function Recordings({ items }: { items: Recording[] }) {
  return (
    <div className="recordings">
      <div className="recordings-title">
        🩺 Grabaciones reales <span className="muted small">· Heart Sound and Murmur Library, Univ. de Michigan (CC BY‑SA 4.0)</span>
      </div>
      <ul>
        {items.map((r) => (
          <RecordingItem key={r.archivo} r={r} />
        ))}
      </ul>
    </div>
  );
}
