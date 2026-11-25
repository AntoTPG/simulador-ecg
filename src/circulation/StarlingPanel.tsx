/**
 * Panel «Intercambio capilar»: un capilar con las fuerzas de Starling a lo
 * largo de su recorrido, flechas de filtración y absorción, el drenaje
 * linfático y un indicador de edema.
 */
import { useState } from 'react';
import { balance, CASOS_STARLING, getCasoStarling, presionNeta, puntoDeCambio, STARLING_NORMAL, type StarlingParams } from './starling';

const W = 520;
const XA = 50;
const XB = 470;
const xAt = (f: number) => XA + (XB - XA) * f;
// Gráfica de presiones (arriba)
const GY0 = 20;
const GY1 = 120;
const gy = (mmHg: number) => GY1 - ((mmHg + 5) / 50) * (GY1 - GY0);

type Slider = { k: keyof StarlingParams; label: string; sub: string; min: number; max: number; step: number; unidad: string };
const SLIDERS: Slider[] = [
  { k: 'pcArterial', label: 'Pc arterial', sub: 'presión hidrostática al inicio', min: 15, max: 50, step: 1, unidad: 'mmHg' },
  { k: 'pcVenoso', label: 'Pc venosa', sub: 'presión hidrostática al final', min: 5, max: 40, step: 1, unidad: 'mmHg' },
  { k: 'piC', label: 'πc plasma', sub: 'presión oncótica (proteínas)', min: 5, max: 35, step: 1, unidad: 'mmHg' },
  { k: 'piI', label: 'πi intersticio', sub: 'proteínas en el intersticio', min: 0, max: 15, step: 1, unidad: 'mmHg' },
  { k: 'pi', label: 'Pi intersticio', sub: 'presión hidrostática', min: -5, max: 8, step: 0.5, unidad: 'mmHg' },
  { k: 'kf', label: 'Kf', sub: 'permeabilidad × superficie', min: 0.3, max: 4, step: 0.1, unidad: '×' },
  { k: 'sigma', label: 'σ', sub: 'retención de proteínas (1 = total)', min: 0.3, max: 1, step: 0.05, unidad: '' },
  { k: 'linfa', label: 'Drenaje linfático', sub: 'capacidad', min: 0.05, max: 2, step: 0.05, unidad: '×' },
];

export function StarlingPanel() {
  const [casoId, setCasoId] = useState('normal');
  const [p, setP] = useState<StarlingParams>(STARLING_NORMAL);
  const [manual, setManual] = useState(false);
  const caso = getCasoStarling(casoId);
  const b = balance(p);
  const cambio = puntoDeCambio(p);
  const piEf = p.pi + p.sigma * (p.piC - p.piI); // lo que se opone a la salida

  const elegir = (id: string) => {
    setCasoId(id);
    setP(getCasoStarling(id).params);
    setManual(false);
  };
  const ajustar = (k: keyof StarlingParams, v: number) => {
    setP((s) => ({ ...s, [k]: v }));
    setManual(true);
  };

  const flechas = Array.from({ length: 11 }, (_, i) => {
    const f = (i + 0.5) / 11;
    const n = presionNeta(p, f) * p.kf;
    return { x: xAt(f), n };
  });
  const hinchazon = Math.min(1, b.acumulo / 15); // 0–1
  const f1 = (x: number) => (Math.abs(x) < 0.05 ? 0 : x).toFixed(1).replace('.', ',');

  return (
    <section className="card circ-card" aria-labelledby="starling-title">
      <div className="cg-head">
        <h2 id="starling-title">Intercambio capilar · fuerzas de Starling y edema</h2>
      </div>
      <div className="sound-chips">
        {CASOS_STARLING.map((c) => (
          <button key={c.id} className={`sound-chip ${c.id === 'normal' ? 'fisiologico' : 'patologico'}${c.id === casoId && !manual ? ' is-on' : ''}`} onClick={() => elegir(c.id)}>
            {c.nombre}
          </button>
        ))}
      </div>

      <div className="circ-grid">
        <div>
          <svg viewBox={`0 0 ${W} 330`} className="circ-svg" role="img" aria-label="Capilar con la presión hidrostática y la oncótica a lo largo de su recorrido, y flechas de filtración y absorción">
            {/* Gráfica de presiones */}
            {[0, 10, 20, 30, 40].map((v) => (
              <g key={v}>
                <line x1={XA} x2={XB} y1={gy(v)} y2={gy(v)} className="circ-grid" />
                <text x={XA - 6} y={gy(v) + 4} textAnchor="end" className="circ-tick">
                  {v}
                </text>
              </g>
            ))}
            <line x1={xAt(0)} x2={xAt(1)} y1={gy(p.pcArterial)} y2={gy(p.pcVenoso)} stroke="#2563eb" strokeWidth={3} />
            <line x1={xAt(0)} x2={xAt(1)} y1={gy(piEf)} y2={gy(piEf)} stroke="#e11d48" strokeWidth={3} />
            <text x={xAt(0)} y={gy(p.pcArterial) - 6} className="circ-note" fill="#2563eb">
              Pc {p.pcArterial}
            </text>
            <text x={xAt(1)} y={gy(p.pcVenoso) - 6} textAnchor="end" className="circ-note" fill="#2563eb">
              Pc {p.pcVenoso}
            </text>
            <text x={xAt(0.5)} y={gy(piEf) + 14} textAnchor="middle" className="circ-note" fill="#e11d48">
              fuerzas que retienen el agua (≈ π) {f1(piEf)}
            </text>
            {cambio !== null && (
              <>
                <line x1={xAt(cambio)} x2={xAt(cambio)} y1={GY0} y2={250} stroke="#64748b" strokeDasharray="3 4" />
                <text x={xAt(cambio)} y={GY0 - 4} textAnchor="middle" className="circ-note">
                  filtra ← → absorbe
                </text>
              </>
            )}

            {/* Intersticio (se hincha con el edema) */}
            <rect x={XA - 10} y={150 - 22 * hinchazon} width={XB - XA + 20} height={120 + 44 * hinchazon} rx={18} fill={hinchazon > 0 ? '#fde68a' : '#fef3c7'} opacity={0.55 + 0.35 * hinchazon} />
            <text x={XB + 6} y={160 - 22 * hinchazon} textAnchor="end" className="circ-note">
              intersticio{b.edema ? ' · EDEMA' : ''}
            </text>
            {/* Capilar */}
            <rect x={XA} y={185} width={XB - XA} height={38} rx={19} fill="url(#grad-cap)" />
            <defs>
              <linearGradient id="grad-cap" x1="0" x2="1">
                <stop offset="0" stopColor="#f87171" />
                <stop offset="1" stopColor="#a78bfa" />
              </linearGradient>
              <marker id="flecha" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M0 0 L10 5 L0 10 z" fill="context-stroke" />
              </marker>
            </defs>
            <text x={XA + 10} y={209} className="circ-tank-t" fill="#fff">
              extremo arterial
            </text>
            <text x={XB - 10} y={209} textAnchor="end" className="circ-tank-t" fill="#fff">
              extremo venoso
            </text>
            {/* Flechas: hacia fuera (filtración, azul) o hacia dentro (absorción, roja) */}
            {flechas.map((f) => {
              const len = Math.min(40, Math.abs(f.n) * 2.2);
              if (len < 2) return null;
              const fuera = f.n > 0;
              return (
                <g key={f.x}>
                  <line x1={f.x} x2={f.x} y1={fuera ? 185 : 185 - len} y2={fuera ? 185 - len : 183} stroke={fuera ? '#2563eb' : '#e11d48'} strokeWidth={3} markerEnd="url(#flecha)" />
                  <line x1={f.x} x2={f.x} y1={fuera ? 223 : 223 + len} y2={fuera ? 223 + len : 225} stroke={fuera ? '#2563eb' : '#e11d48'} strokeWidth={3} markerEnd="url(#flecha)" />
                </g>
              );
            })}
            {/* Linfático */}
            <path d={`M${XA + 40} 300 H${XB - 40}`} stroke="#a3e635" strokeWidth={10} strokeLinecap="round" opacity={0.35 + 0.5 * Math.min(1, b.drenaje / 10)} />
            <path d={`M${XA + 40} 300 H${XB - 40}`} className="circ-pipe linfa" style={{ animationDuration: `${2.5 / Math.max(0.2, Math.min(3, b.drenaje / 3))}s` }} />
            <text x={(XA + XB) / 2} y={322} textAnchor="middle" className="circ-note">
              linfático: drena {f1(b.drenaje)} de {f1(b.capacidadLinfa)} L/día posibles
            </text>
          </svg>
        </div>

        <div className="circ-side">
          <div className="pv-metrics">
            <div>
              <span>Neta arterial</span>
              <b>{f1(presionNeta(p, 0))}</b> mmHg
            </div>
            <div>
              <span>Neta venosa</span>
              <b>{f1(presionNeta(p, 1))}</b> mmHg
            </div>
            <div>
              <span>Filtrado</span>
              <b>{f1(b.filtrado)}</b> L/día
            </div>
            <div>
              <span>Absorbido</span>
              <b>{f1(b.absorbido)}</b> L/día
            </div>
            <div title="Filtrado − absorbido: lo que tienen que recoger los linfáticos">
              <span>Neto</span>
              <b>{f1(b.filtracionNeta)}</b> L/día
            </div>
            <div title="Lo que se queda en el intersticio cada día">
              <span>Se acumula</span>
              <b>{f1(b.acumulo)}</b> L/día
            </div>
          </div>
          <div className={`circ-veredicto ${b.edema ? 'mal' : b.filtracionNeta < 0 ? 'abs' : 'ok'}`}>
            {b.edema
              ? 'Edema: se filtra más de lo que los linfáticos pueden devolver.'
              : b.filtracionNeta < 0
                ? 'Absorción neta: entra líquido del intersticio a la sangre.'
                : 'Equilibrio: lo que se filtra de más lo devuelve la linfa.'}
          </div>
          <p className="pv-text">{manual ? 'Ajuste manual. Presión neta = (Pc − Pi) − σ·(πc − πi). Positiva: sale líquido (filtración). Negativa: entra (absorción).' : caso.texto}</p>
          <p className="small muted pv-text">
            Recuerda: la <b>difusión</b> (gases, glucosa, iones) es la forma de intercambio más importante y no depende de estas fuerzas; las fuerzas de Starling mueven el <b>agua en bloque</b>{' '}
            (convección) y deciden cuánto líquido hay en el intersticio.
          </p>
        </div>
      </div>

      <div className="pv-sliders">
        {SLIDERS.map((s) => (
          <label key={s.k} className="pv-slider">
            <span className="pv-slider-head">
              <b>{s.label}</b> <span className="muted small">{s.sub}</span>
              <span className="mono small pv-val">
                {s.unidad === '×' ? `×${f1(p[s.k])}` : `${f1(p[s.k])} ${s.unidad}`}
              </span>
            </span>
            <input type="range" min={s.min} max={s.max} step={s.step} value={p[s.k]} onChange={(e) => ajustar(s.k, Number(e.target.value))} />
          </label>
        ))}
      </div>
    </section>
  );
}
