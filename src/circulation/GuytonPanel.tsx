/**
 * Panel «Retorno venoso y gasto cardíaco»: el gráfico de Guyton interactivo
 * (curvas de gasto cardíaco y de retorno venoso frente a la PVC) y un esquema
 * del circuito con los compartimentos llenándose y vaciándose.
 *
 * La PVC no salta al nuevo equilibrio: evoluciona en el tiempo según la
 * diferencia entre lo que entra en la aurícula (RV) y lo que sale (GC), como en
 * la realidad. Así se ve por qué el sistema se autorregula.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { CASOS_GUYTON, equilibrio, gastoCardiaco, getCasoGuyton, GUYTON_NORMAL, P_COLAPSO, pasoPvc, pmll, retornoVenoso, type GuytonParams } from './guyton';

const X0 = -6;
const X1 = 16;
const Y1 = 24;
const W = 520;
const H = 340;
const pad = { l: 46, r: 14, t: 12, b: 40 };
const X = (v: number) => pad.l + ((v - X0) / (X1 - X0)) * (W - pad.l - pad.r);
const Y = (v: number) => H - pad.b - (v / Y1) * (H - pad.t - pad.b);
const COL = { gc: '#e11d48', rv: '#2563eb', eq: '#f97316' };

function curva(f: (pvc: number) => number) {
  const pts: string[] = [];
  for (let v = X0; v <= X1; v += 0.1) pts.push(`${X(v).toFixed(1)},${Y(Math.min(Y1, f(v))).toFixed(1)}`);
  return 'M' + pts.join(' L');
}

type Slider = { k: keyof GuytonParams; label: string; sub: string; min: number; max: number; step: number; fmt: (x: number) => string };
const SLIDERS: Slider[] = [
  { k: 'volemia', label: 'Volemia', sub: 'transfusión ↔ hemorragia', min: 3.8, max: 6.5, step: 0.05, fmt: (x) => `${x.toFixed(2).replace('.', ',')} L` },
  { k: 'tonoVenoso', label: 'Tono venoso', sub: 'simpático (α1)', min: 0.5, max: 3, step: 0.05, fmt: (x) => `×${x.toFixed(2).replace('.', ',')}` },
  { k: 'funcionCardiaca', label: 'Función cardíaca', sub: 'contractilidad y FC', min: 0.15, max: 2.5, step: 0.01, fmt: (x) => `×${x.toFixed(2).replace('.', ',')}` },
  { k: 'rrv', label: 'Resistencia venosa', sub: 'al retorno venoso', min: 0.5, max: 2.5, step: 0.02, fmt: (x) => `${x.toFixed(2).replace('.', ',')}` },
  { k: 'intratoracica', label: 'Presión intratorácica', sub: 'inspiración ↔ espiración', min: -4, max: 4, step: 0.5, fmt: (x) => `${x > 0 ? '+' : ''}${x} mmHg` },
];

export function GuytonPanel() {
  const [casoId, setCasoId] = useState('normal');
  const [etapa, setEtapa] = useState(0);
  const caso = getCasoGuyton(casoId);
  const [p, setP] = useState<GuytonParams>(GUYTON_NORMAL);
  const [manual, setManual] = useState(false);
  const eq = useMemo(() => equilibrio(p), [p]);
  const esNormal = JSON.stringify(p) === JSON.stringify(GUYTON_NORMAL);

  // PVC «dinámica»: evoluciona hacia el equilibrio
  const [pvc, setPvc] = useState(0);
  const pvcRef = useRef(0);
  const pRef = useRef(p);
  pRef.current = p;
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      // Ritmo de la animación: 1 s real ≈ 1,5 s de fisiología
      let v = pvcRef.current;
      for (let i = 0; i < 6; i++) v = pasoPvc(pRef.current, v, (dt * 1.5) / 6);
      v = Math.max(X0 + 0.5, Math.min(X1 - 0.5, v));
      pvcRef.current = v;
      setPvc(v);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const elegir = (id: string, i = 0) => {
    const c = getCasoGuyton(id);
    setCasoId(id);
    setEtapa(i);
    setP(c.etapas[i].params);
    setManual(false);
  };
  const ajustar = (k: keyof GuytonParams, v: number) => {
    setP((s) => ({ ...s, [k]: v }));
    setManual(true);
  };
  const empujar = (d: number) => (pvcRef.current += d);

  const gcAhora = gastoCardiaco(p, pvc);
  const rvAhora = retornoVenoso(p, pvc);
  const diferencia = rvAhora - gcAhora;
  const enEquilibrio = Math.abs(diferencia) < 0.15;
  const pm = pmll(p);

  // Niveles del esquema (0–1)
  const nivelArt = Math.min(1, Math.max(0.05, eq.pam / 160));
  const nivelVen = Math.min(1, Math.max(0.05, (pm + 2) / 24));
  const nivelCen = Math.min(1, Math.max(0.06, (pvc + 5) / 16));
  const vel = Math.max(0.3, eq.gc / 5); // velocidad del flujo en el esquema
  /** Grosor de las flechas de flujo (px), proporcional a los L/min. */
  const anchoFlujo = (q: number) => Math.min(20, 2 + 1.5 * Math.max(0, q));

  const f1 = (x: number) => (Math.abs(x) < 0.05 ? 0 : x).toFixed(1).replace('.', ',');
  const etapaActual = caso.etapas[etapa];

  return (
    <section className="card circ-card" aria-labelledby="guyton-title">
      <div className="cg-head">
        <h2 id="guyton-title">Retorno venoso y gasto cardíaco · gráfico de Guyton</h2>
      </div>

      <div className="sound-chips">
        {CASOS_GUYTON.map((c) => (
          <button key={c.id} className={`sound-chip ${c.id === 'normal' ? 'fisiologico' : 'patologico'}${c.id === casoId && !manual ? ' is-on' : ''}`} onClick={() => elegir(c.id)}>
            {c.nombre}
          </button>
        ))}
      </div>
      {caso.etapas.length > 1 && !manual && (
        <div className="circ-etapas" role="group" aria-label="Etapas">
          {caso.etapas.map((e, i) => (
            <button key={e.etiqueta} className={`btn-seg${i === etapa ? ' is-on' : ''}`} onClick={() => elegir(casoId, i)}>
              {e.etiqueta}
            </button>
          ))}
          {etapa < caso.etapas.length - 1 && (
            <button className="btn btn-small" onClick={() => elegir(casoId, etapa + 1)}>
              Siguiente etapa →
            </button>
          )}
        </div>
      )}

      <div className="circ-grid">
        <div>
          <svg viewBox={`0 0 ${W} ${H}`} className="circ-svg" role="img" aria-label="Curvas de gasto cardíaco y retorno venoso frente a la presión venosa central">
            {Array.from({ length: (X1 - X0) / 2 + 1 }, (_, i) => X0 + i * 2).map((v) => (
              <g key={v}>
                <line x1={X(v)} x2={X(v)} y1={Y(0)} y2={Y(Y1)} className={v === 0 ? 'circ-axis0' : 'circ-grid'} />
                <text x={X(v)} y={H - pad.b + 15} textAnchor="middle" className="circ-tick">
                  {v}
                </text>
              </g>
            ))}
            {[0, 4, 8, 12, 16, 20, 24].map((v) => (
              <g key={v}>
                <line x1={X(X0)} x2={X(X1)} y1={Y(v)} y2={Y(v)} className="circ-grid" />
                <text x={pad.l - 6} y={Y(v) + 4} textAnchor="end" className="circ-tick">
                  {v}
                </text>
              </g>
            ))}
            <text x={(pad.l + W - pad.r) / 2} y={H - 6} textAnchor="middle" className="circ-label">
              Presión en la aurícula derecha = PVC (mmHg)
            </text>
            <text transform={`translate(12 ${(pad.t + H - pad.b) / 2}) rotate(-90)`} textAnchor="middle" className="circ-label">
              Gasto cardíaco y retorno venoso (L/min)
            </text>

            {!esNormal && (
              <>
                <path d={curva((v) => gastoCardiaco(GUYTON_NORMAL, v))} className="circ-ghost" />
                <path d={curva((v) => retornoVenoso(GUYTON_NORMAL, v))} className="circ-ghost" />
              </>
            )}
            <path d={curva((v) => gastoCardiaco(p, v))} stroke={COL.gc} className="circ-curve" />
            <path d={curva((v) => retornoVenoso(p, v))} stroke={COL.rv} className="circ-curve" />

            {/* Presión media de llenado y colapso venoso */}
            <line x1={X(pm)} x2={X(pm)} y1={Y(0)} y2={Y(1.2)} stroke={COL.rv} strokeWidth={2} />
            <text x={X(pm)} y={Y(1.6)} textAnchor="middle" className="circ-note" fill={COL.rv}>
              Pmll {f1(pm)}
            </text>
            <text x={X(P_COLAPSO + p.intratoracica) + 3} y={Y(Math.min(Y1, retornoVenoso(p, -10))) + 16} className="circ-note">
              colapso venoso
            </text>

            {/* Equilibrio */}
            <circle cx={X(eq.pvc)} cy={Y(eq.gc)} r={7} fill="none" stroke={COL.eq} strokeWidth={2.5} />
            {/* Estado actual: RV y GC con la PVC de este instante */}
            {!enEquilibrio && (
              <line x1={X(pvc)} x2={X(pvc)} y1={Y(Math.min(Y1, gcAhora))} y2={Y(Math.min(Y1, rvAhora))} stroke="#64748b" strokeWidth={2} strokeDasharray="3 3" />
            )}
            <circle cx={X(pvc)} cy={Y(Math.min(Y1, rvAhora))} r={5.5} fill={COL.rv} stroke="#fff" strokeWidth={1.5} />
            <circle cx={X(pvc)} cy={Y(Math.min(Y1, gcAhora))} r={5.5} fill={COL.gc} stroke="#fff" strokeWidth={1.5} />

            <text x={X(X1) - 4} y={Y(gastoCardiaco(p, X1)) - 6} textAnchor="end" className="circ-note" fill={COL.gc}>
              Gasto cardíaco (Starling)
            </text>
            <text x={X(X0) + 4} y={Y(Math.min(Y1 - 1, retornoVenoso(p, X0))) - 8} className="circ-note" fill={COL.rv}>
              Retorno venoso
            </text>
          </svg>
          <div className="circ-estado" aria-live="polite">
            {enEquilibrio ? (
              <span>
                ● <b>Equilibrio:</b> GC = RV = {f1(eq.gc)} L/min con PVC = {f1(eq.pvc)} mmHg
              </span>
            ) : diferencia > 0 ? (
              <span>
                ↑ Entra más de lo que sale (RV {f1(rvAhora)} &gt; GC {f1(gcAhora)}): la aurícula se llena y <b>sube la PVC</b>
              </span>
            ) : (
              <span>
                ↓ Sale más de lo que entra (GC {f1(gcAhora)} &gt; RV {f1(rvAhora)}): la aurícula se vacía y <b>baja la PVC</b>
              </span>
            )}
          </div>
          <div className="circ-empujar">
            <span className="small muted">Aparta la PVC del equilibrio y mira cómo vuelve sola:</span>
            <button className="btn btn-small" onClick={() => empujar(-3)}>
              PVC −3
            </button>
            <button className="btn btn-small" onClick={() => empujar(3)}>
              PVC +3
            </button>
          </div>
        </div>

        <div className="circ-side">
          <svg viewBox="0 0 400 300" className="circ-svg circ-circuito" role="img" aria-label="Esquema del circuito: el compartimento venoso central (venas cavas y aurícula derecha) dentro del tórax, los ventrículos, las arterias, los capilares y las venas periféricas, con el retorno venoso que entra y el gasto cardíaco que sale">
            <defs>
              <clipPath id="tq-cen">
                <path d="M48 40 H116 Q130 40 130 54 V78 Q130 92 116 92 H70 V130 Q70 136 64 136 H46 Q40 136 40 130 V92 Q34 92 34 80 V54 Q34 40 48 40 Z" />
              </clipPath>
              <clipPath id="tq-art">
                <rect x="302" y="34" width="84" height="64" rx="12" />
              </clipPath>
              <clipPath id="tq-ven">
                <rect x="150" y="196" width="150" height="76" rx="14" />
              </clipPath>
            </defs>
            {/* Tórax */}
            <rect x="12" y="12" width="262" height="134" rx="18" className="circ-torax" />
            <text x="264" y="28" textAnchor="end" className="circ-note">
              tórax
            </text>
            <text x="22" y="30" className="circ-tank-t" fill="#4f46e5">
              Compartimento venoso central
            </text>

            {/* Flujos: el grosor es proporcional a cada flujo */}
            {/* Retorno venoso: de las venas periféricas a las venas cavas y la AD */}
            <path d="M150 232 H55 V136" className="circ-pipe ven" style={{ strokeWidth: anchoFlujo(rvAhora), animationDuration: `${1.6 / Math.max(0.3, rvAhora / 5)}s` }} />
            {/* Gasto cardíaco: de la AD al ventrículo y del ventrículo a las arterias */}
            <path d="M130 66 H162" className="circ-pipe cen" style={{ strokeWidth: anchoFlujo(gcAhora), animationDuration: `${1.6 / Math.max(0.3, gcAhora / 5)}s` }} />
            <path d="M238 66 H302" className="circ-pipe art" style={{ strokeWidth: anchoFlujo(gcAhora), animationDuration: `${1.6 / Math.max(0.3, gcAhora / 5)}s` }} />
            {/* Arterias → capilares → venas periféricas */}
            <path d="M378 98 V190 Q378 232 300 232" className="circ-pipe art" style={{ animationDuration: `${1.6 / vel}s` }} />

            {/* Compartimento central: venas cavas + AD, una sola pieza y un solo nivel */}
            <path d="M48 40 H116 Q130 40 130 54 V78 Q130 92 116 92 H70 V130 Q70 136 64 136 H46 Q40 136 40 130 V92 Q34 92 34 80 V54 Q34 40 48 40 Z" className="circ-tank cen" />
            <rect x="34" y={136 - 96 * nivelCen} width="96" height={96 * nivelCen} fill="#6366f1" opacity={0.8} clipPath="url(#tq-cen)" />
            <line x1="40" x2="70" y1="92" y2="92" stroke="#4f46e5" strokeDasharray="3 3" />
            <text x="102" y="60" textAnchor="middle" className="circ-tank-t">
              AD
            </text>
            <text x="102" y="78" textAnchor="middle" className="circ-tank-v">
              PVC {f1(pvc)}
            </text>
            <text x="76" y="132" className="circ-note">
              venas cavas
            </text>
            {!enEquilibrio && (
              <text x="76" y="112" className="circ-tank-t" fill={diferencia > 0 ? '#4f46e5' : '#b45309'}>
                {diferencia > 0 ? '▲ se llena' : '▼ se vacía'}
              </text>
            )}

            {/* Ventrículos (bomba) */}
            <rect x="162" y="42" width="76" height="50" rx="14" fill="#fb7185" className="circ-heart" style={{ animationDuration: `${60 / (70 * Math.max(0.6, Math.sqrt(p.funcionCardiaca)))}s` }} />
            <text x="200" y="63" textAnchor="middle" className="circ-tank-t" fill="#fff">
              Ventrículos
            </text>
            <text x="200" y="80" textAnchor="middle" className="circ-note" fill="#fff">
              bomba
            </text>
            <text x="200" y="112" textAnchor="middle" className="circ-note">
              VD → pulmones → VI
            </text>

            {/* Arterias */}
            <rect x="302" y="34" width="84" height="64" rx="12" className="circ-tank" />
            <rect x="302" y={34 + 64 * (1 - nivelArt)} width="84" height={64 * nivelArt} fill="#e11d48" opacity={0.75} clipPath="url(#tq-art)" />
            <text x="344" y="26" textAnchor="middle" className="circ-tank-t">
              Arterias
            </text>
            <text x="344" y="114" textAnchor="middle" className="circ-tank-v">
              PAM {Math.round(eq.pam)}
            </text>

            {/* Capilares */}
            <path d="M330 170 q4 -7 8 0 t8 0 t8 0 t8 0" className="circ-cap" />
            <text x="346" y="188" textAnchor="middle" className="circ-note">
              capilares
            </text>

            {/* Venas periféricas */}
            <rect x="150" y="196" width="150" height="76" rx="14" className="circ-tank" />
            <rect x="150" y={196 + 76 * (1 - nivelVen)} width="150" height={76 * nivelVen} fill="#2563eb" opacity={0.7} clipPath="url(#tq-ven)" />
            <text x="225" y="226" textAnchor="middle" className="circ-tank-v">
              Pvp ≈ Pmll {f1(pm)}
            </text>
            <text x="225" y="290" textAnchor="middle" className="circ-tank-t">
              Venas periféricas (~3 L)
            </text>

            {/* Rótulos de los flujos */}
            <text x="270" y="56" textAnchor="middle" className="circ-flujo-t" fill="#e11d48">
              GC {f1(gcAhora)}
            </text>
            <text x="96" y="256" textAnchor="middle" className="circ-flujo-t" fill="#2563eb">
              RV {f1(rvAhora)}
            </text>
            <text x="76" y="288" textAnchor="middle" className="circ-note">
              RV = (Pvp − PVC) / R
            </text>
          </svg>
          <div className="pv-metrics">
            <div>
              <span>Gasto cardíaco</span>
              <b>{f1(gcAhora)}</b> L/min
            </div>
            <div>
              <span>Retorno venoso</span>
              <b>{f1(rvAhora)}</b> L/min
            </div>
            <div>
              <span>PVC</span>
              <b>{f1(pvc)}</b> mmHg
            </div>
            <div title="Presión media de llenado circulatorio">
              <span>Pmll</span>
              <b>{f1(pm)}</b> mmHg
            </div>
            <div title="Presión arterial media (estimada)">
              <span>PAM</span>
              <b>{Math.round(eq.pam)}</b> mmHg
            </div>
          </div>
        </div>
      </div>

      <div className="pv-sliders">
        {SLIDERS.map((s) => (
          <label key={s.k} className="pv-slider">
            <span className="pv-slider-head">
              <b>{s.label}</b> <span className="muted small">{s.sub}</span>
              <span className="mono small pv-val">{s.fmt(p[s.k])}</span>
            </span>
            <input type="range" min={s.min} max={s.max} step={s.step} value={p[s.k]} onChange={(e) => ajustar(s.k, Number(e.target.value))} />
          </label>
        ))}
      </div>

      <p className="pv-text">
        {manual
          ? 'Ajuste manual. Recuerda: la volemia y el tono venoso mueven la curva de retorno venoso (cambian la presión media de llenado); la contractilidad mueve la de gasto cardíaco. La PVC acaba siempre donde se cortan.'
          : etapaActual.texto}
      </p>
      <details className="circ-details">
        <summary>Cómo leer el gráfico</summary>
        <ul className="quiz-explain">
          <li>
            <b>Curva roja (función cardíaca):</b> cuanto más se llena el corazón (más PVC = más precarga), más bombea, hasta una meseta (Frank‑Starling).
          </li>
          <li>
            <b>Curva azul (retorno venoso):</b> la sangre vuelve al corazón por la diferencia entre la presión de las venas periféricas (≈ presión media de llenado) y la PVC: RV = (Pmll − PVC) / R. Si la PVC sube, vuelve menos sangre.
          </li>
          <li>
            <b>El corte (círculo naranja)</b> es el único punto en el que entra en la aurícula lo mismo que sale. La PVC no la «elige» nadie: se coloca sola ahí.
          </li>
          <li>
            Es la PVC, y no el retorno venoso, la que determina el volumen sistólico: el retorno venoso es simplemente el gasto cardíaco visto desde las venas.
          </li>
        </ul>
      </details>
    </section>
  );
}
