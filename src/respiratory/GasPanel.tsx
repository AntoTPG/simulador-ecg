/**
 * Panel de GASOMETRÍA ARTERIAL: introduces los valores (o eliges un caso) y se
 * interpreta paso a paso. Incluye un diagrama ácido‑base (pH frente a HCO₃⁻,
 * con las isóbaras de PaCO₂ y las bandas de compensación esperada) en el que
 * se sitúa al paciente.
 */
import { useMemo, useState } from 'react';
import { GAS_NORMAL, hco3HH, interpretarGas, phHH, type GasInput } from './gas';
import { CASOS_GAS } from './gasCases';

type Campo = { k: keyof GasInput; label: string; unit: string; step: number; min: number; max: number };
const CAMPOS: Campo[] = [
  { k: 'ph', label: 'pH', unit: '', step: 0.01, min: 6.8, max: 7.8 },
  { k: 'paco2', label: 'PaCO₂', unit: 'mmHg', step: 1, min: 10, max: 120 },
  { k: 'hco3', label: 'HCO₃⁻', unit: 'mEq/L', step: 1, min: 2, max: 60 },
  { k: 'pao2', label: 'PaO₂', unit: 'mmHg', step: 1, min: 20, max: 600 },
  { k: 'fio2', label: 'FiO₂', unit: '', step: 0.01, min: 0.21, max: 1 },
  { k: 'na', label: 'Na⁺', unit: 'mEq/L', step: 1, min: 100, max: 180 },
  { k: 'cl', label: 'Cl⁻', unit: 'mEq/L', step: 1, min: 70, max: 140 },
  { k: 'albumina', label: 'Albúmina', unit: 'g/dL', step: 0.1, min: 1, max: 6 },
  { k: 'edad', label: 'Edad', unit: 'años', step: 1, min: 1, max: 100 },
];

/** Diagrama ácido‑base (tipo Davenport). */
function AcidBaseDiagram({ ph, hco3 }: { ph: number; hco3: number }) {
  const W = 440;
  const H = 330;
  const pad = { l: 42, r: 12, t: 12, b: 34 };
  const [x0, x1] = [6.9, 7.7];
  const [y0, y1] = [0, 50];
  const X = (v: number) => pad.l + ((v - x0) / (x1 - x0)) * (W - pad.l - pad.r);
  const Y = (v: number) => H - pad.b - ((v - y0) / (y1 - y0)) * (H - pad.t - pad.b);
  const path = (pts: [number, number][]) =>
    pts
      .filter(([a, b]) => a >= x0 - 0.05 && a <= x1 + 0.05 && b >= y0 && b <= y1 + 5)
      .map(([a, b], i) => `${i ? 'L' : 'M'}${X(a).toFixed(1)},${Y(b).toFixed(1)}`)
      .join(' ');
  const range = (a: number, b: number, n = 40) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);

  // Isóbaras de PaCO₂
  const isobaras = [20, 30, 40, 60, 80].map((p) => ({ p, d: path(range(x0, x1).map((x) => [x, hco3HH(x, p)])) }));
  // Bandas de compensación esperada (trastornos simples)
  const bandas = [
    { k: 'Acidosis metabólica', c: '#e11d48', pts: range(5, 24).map((h): [number, number] => [phHH(h, 1.5 * h + 8), h]) },
    { k: 'Alcalosis metabólica', c: '#2563eb', pts: range(24, 48).map((h): [number, number] => [phHH(h, 0.7 * h + 21), h]) },
    { k: 'Acidosis resp. aguda', c: '#9333ea', pts: range(40, 100).map((p): [number, number] => [phHH(24 + (p - 40) / 10, p), 24 + (p - 40) / 10]) },
    { k: 'Acidosis resp. crónica', c: '#c026d3', pts: range(40, 100).map((p): [number, number] => [phHH(24 + 0.35 * (p - 40), p), 24 + 0.35 * (p - 40)]) },
    { k: 'Alcalosis resp. aguda', c: '#059669', pts: range(40, 15).map((p): [number, number] => [phHH(24 - 0.2 * (40 - p), p), 24 - 0.2 * (40 - p)]) },
    { k: 'Alcalosis resp. crónica', c: '#0d9488', pts: range(40, 15).map((p): [number, number] => [phHH(24 - 0.45 * (40 - p), p), 24 - 0.45 * (40 - p)]) },
  ];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="gas-diagram" role="img" aria-label="Diagrama ácido-base: pH frente a bicarbonato">
        {range(x0, x1, 8).map((x) => (
          <g key={x}>
            <line x1={X(x)} x2={X(x)} y1={Y(y0)} y2={Y(y1)} className="gas-grid" />
            <text x={X(x)} y={H - pad.b + 14} textAnchor="middle" className="gas-tick">
              {x.toFixed(1).replace('.', ',')}
            </text>
          </g>
        ))}
        {range(y0, y1, 5).map((y) => (
          <g key={y}>
            <line x1={X(x0)} x2={X(x1)} y1={Y(y)} y2={Y(y)} className="gas-grid" />
            <text x={pad.l - 5} y={Y(y) + 4} textAnchor="end" className="gas-tick">
              {y}
            </text>
          </g>
        ))}
        {/* Zona normal */}
        <rect x={X(7.35)} y={Y(26)} width={X(7.45) - X(7.35)} height={Y(22) - Y(26)} className="gas-normal" />
        {isobaras.map((i) => (
          <g key={i.p}>
            <path d={i.d} className="gas-iso" />
            <text x={X(x1) - 2} y={Math.max(pad.t + 10, Math.min(H - pad.b - 4, Y(hco3HH(x1 - 0.02, i.p)) - 3))} textAnchor="end" className="gas-iso-label">
              {i.p}
            </text>
          </g>
        ))}
        {bandas.map((b) => (
          <path key={b.k} d={path(b.pts)} stroke={b.c} className="gas-band">
            <title>{b.k}</title>
          </path>
        ))}
        <circle cx={X(Math.min(x1, Math.max(x0, ph)))} cy={Y(Math.min(y1, Math.max(y0, hco3)))} r={7} className="gas-patient" />
        <text x={X(x0) + 4} y={pad.t + 10} className="gas-tick">
          líneas finas: PaCO₂ (mmHg)
        </text>
        <text x={(pad.l + W - pad.r) / 2} y={H - 4} textAnchor="middle" className="gas-axis">
          pH
        </text>
        <text transform={`translate(11 ${(pad.t + H - pad.b) / 2}) rotate(-90)`} textAnchor="middle" className="gas-axis">
          HCO₃⁻ (mEq/L)
        </text>
      </svg>
      <div className="wiggers-legend small">
        {bandas.map((b) => (
          <span key={b.k}>
            <i style={{ background: b.c }} /> {b.k}
          </span>
        ))}
        <span>
          <i className="gas-dot" /> Paciente
        </span>
      </div>
    </div>
  );
}

export function GasPanel() {
  const [v, setV] = useState<GasInput>(GAS_NORMAL);
  const [casoId, setCasoId] = useState<string | null>('normal');
  const caso = CASOS_GAS.find((c) => c.id === casoId);
  const r = useMemo(() => interpretarGas(v), [v]);

  const set = (k: keyof GasInput, val: number | string) => {
    setV((s) => ({ ...s, [k]: val }));
    setCasoId(null);
  };
  const ajustarPh = () => setV((s) => ({ ...s, ph: Math.round(phHH(s.hco3, s.paco2) * 100) / 100 }));

  return (
    <section className="card resp-card" aria-labelledby="gas-title">
      <div className="cg-head">
        <h2 id="gas-title">Gasometría arterial · interpretación paso a paso</h2>
      </div>

      <div className="sound-group">
        <div className="sound-group-title">Casos clínicos</div>
        <div className="sound-chips">
          {CASOS_GAS.map((c) => (
            <button
              key={c.id}
              className={`sound-chip ${c.id === 'normal' ? 'fisiologico' : 'patologico'}${c.id === casoId ? ' is-on' : ''}`}
              onClick={() => {
                setV(c.valores);
                setCasoId(c.id);
              }}
            >
              {c.nombre}
            </button>
          ))}
        </div>
      </div>
      {caso && (
        <p className="gas-historia">
          <b>Caso:</b> {caso.historia}
        </p>
      )}

      <div className="gas-inputs">
        {CAMPOS.map((c) => (
          <label key={c.k} className="gas-field">
            <span>
              {c.label} {c.unit && <span className="muted small">{c.unit}</span>}
            </span>
            <input
              type="number"
              inputMode="decimal"
              step={c.step}
              min={c.min}
              max={c.max}
              value={v[c.k] as number}
              onChange={(e) => {
                const n = Number(e.target.value.replace(',', '.'));
                if (Number.isFinite(n)) set(c.k, n);
              }}
            />
          </label>
        ))}
        <label className="gas-field">
          <span>Evolución</span>
          <select value={v.evolucion} onChange={(e) => set('evolucion', e.target.value)}>
            <option value="desconocida">No se sabe</option>
            <option value="aguda">Aguda</option>
            <option value="cronica">Crónica</option>
          </select>
        </label>
      </div>
      {Math.abs(r.phCalc - v.ph) > 0.05 && (
        <p className="small gas-warn">
          ⚠️ El pH no cuadra con el PaCO₂ y el HCO₃⁻ (debería ser {r.phCalc.toFixed(2).replace('.', ',')}).{' '}
          <button className="btn btn-small" onClick={ajustarPh}>
            Ajustar el pH
          </button>
        </p>
      )}

      <div className="resp-grid resp-grid-2">
        <div>
          <h3 className="resp-h3">Diagrama ácido‑base</h3>
          <AcidBaseDiagram ph={v.ph} hco3={v.hco3} />
          <p className="small muted resp-foot">
            Cada banda de color es donde cae un trastorno SIMPLE bien compensado. Si el punto del paciente cae fuera de todas, sospecha un trastorno mixto.
          </p>
        </div>
        <div className="resp-side">
          <div className="gas-dx">
            <span className="muted small">Conclusión</span>
            {r.diagnostico.map((d, i) => (
              <b key={i}>{d.charAt(0).toUpperCase() + d.slice(1)}</b>
            ))}
          </div>
          <ol className="gas-steps">
            {r.pasos.map((p) => (
              <li key={p.titulo} className={p.estado}>
                <b>{p.titulo}</b>
                <span>{p.texto}</span>
              </li>
            ))}
          </ol>
          {caso && caso.id !== 'normal' && (
            <p className="small gas-clave">
              <b>Para recordar:</b> {caso.clave}
            </p>
          )}
          <p className="sources small muted">
            Fuentes: Manual MSD (versión para profesionales), «Regulación del equilibrio ácido‑base», «Acidosis metabólica», «Alcalosis metabólica», «Acidosis respiratoria»,
            «Alcalosis respiratoria»; West JB, <i>Fisiología respiratoria</i>. Casos de elaboración propia. Herramienta educativa: no sustituye el juicio clínico.
          </p>
        </div>
      </div>
    </section>
  );
}
