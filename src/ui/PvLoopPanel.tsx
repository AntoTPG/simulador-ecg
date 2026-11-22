/**
 * BUCLE PRESIÓN‑VOLUMEN del ventrículo izquierdo, sincronizado con el ECG, el
 * 3D y el diagrama de Wiggers. Se controla con los tres determinantes del
 * volumen de eyección (precarga, poscarga y contractilidad), la rigidez
 * diastólica y unos casos típicos (insuficiencia cardíaca, valvulopatías).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { mechPhaseAt, MECH_PHASE_LABEL, sampleCycle } from '../engine/hemodynamics';
import { computePvLoop, edpvr, PV_NORMAL, pvMetrics, V0, type PvInputs } from '../engine/pvLoop';
import { clock } from '../store/clock';
import { useSim } from '../store/useSimStore';

interface Caso {
  id: string;
  nombre: string;
  inputs: Partial<PvInputs>;
  texto: string;
}

/** Casos típicos. Valores orientativos; textos de elaboración propia. */
const CASOS: Caso[] = [
  {
    id: 'normal',
    nombre: 'Normal',
    inputs: {},
    texto:
      'Bucle de un adulto sano. Las cuatro esquinas son las cuatro válvulas: cierre mitral (abajo a la derecha), apertura aórtica, cierre aórtico (arriba a la izquierda) y apertura mitral. El ancho es el volumen de eyección y el área, el trabajo del latido.',
  },
  {
    id: 'precarga',
    nombre: '↑ Precarga',
    inputs: { edv: 165 },
    texto:
      'Llega más sangre (sueroterapia, ejercicio): el bucle se ensancha hacia la derecha. Con la misma contractilidad y poscarga el VTS apenas cambia, así que el volumen de eyección aumenta. Es la ley de Frank‑Starling.',
  },
  {
    id: 'poscarga',
    nombre: '↑ Poscarga',
    inputs: { ea: 2.5 },
    texto:
      'Más resistencia a la salida (hipertensión): la recta de Ea se empina, el ventrículo necesita más presión para abrir la aórtica y se vacía menos. El bucle se hace más alto y más estrecho: sube el VTS y baja el volumen de eyección.',
  },
  {
    id: 'contractilidad',
    nombre: '↑ Contractilidad',
    inputs: { ees: 4.2 },
    texto:
      'Inotrópicos positivos (estímulo simpático, dobutamina): la RPVTS se empina y el ventrículo se vacía más. El bucle se ensancha hacia la izquierda: baja el VTS y sube la fracción de eyección.',
  },
  {
    id: 'ic-sistolica',
    nombre: 'IC con FE reducida',
    inputs: { ees: 1.0, edv: 195, rigidez: 0.85 },
    texto:
      'Pérdida de contractilidad (cardiopatía isquémica, miocardiopatía dilatada): la RPVTS se aplana. Para mantener algo de volumen de eyección el ventrículo se dilata (y se remodela, por eso su RPVTD se aplana): bucle desplazado a la derecha, estrecho y con la presión telediastólica alta. La FE cae por debajo del 40 %.',
  },
  {
    id: 'ic-diastolica',
    nombre: 'IC con FE conservada',
    inputs: { rigidez: 1.6, edv: 112, ea: 1.8 },
    texto:
      'Ventrículo rígido (hipertrofia, hipertensión, edad): la RPVTD se empina. Con un volumen normal o pequeño la presión telediastólica es muy alta y se transmite a la aurícula y a los pulmones. La FE es normal.',
  },
  {
    id: 'ea',
    nombre: 'Estenosis aórtica',
    inputs: { valvula: 'ea', rigidez: 1.3, ees: 3 },
    texto:
      'El ventrículo tiene que vencer el gradiente de la válvula: la presión sistólica del VI sube muy por encima de la aórtica y el bucle se hace muy alto. Con el tiempo se hipertrofia (más rígido), y la presión telediastólica también sube.',
  },
  {
    id: 'ia',
    nombre: 'Insuficiencia aórtica',
    inputs: { valvula: 'ia', edv: 215, ea: 1.1, rigidez: 0.7 },
    texto:
      'Parte de la sangre vuelve desde la aorta en diástole: el VI se llena también durante la relajación (la fase isovolumétrica desaparece) y se dilata mucho; al ser crónica, se vuelve más distensible y la presión telediastólica no sube tanto. Bucle muy ancho, con un volumen de eyección total enorme.',
  },
  {
    id: 'im',
    nombre: 'Insuficiencia mitral',
    inputs: { valvula: 'im', edv: 170, rigidez: 0.8 },
    texto:
      'Desde el principio de la sístole la sangre escapa hacia la aurícula, a baja presión. No hay contracción isovolumétrica: el volumen ya baja antes de abrirse la aórtica. El volumen que sale por la aorta es solo una parte del total.',
  },
  {
    id: 'em',
    nombre: 'Estenosis mitral',
    inputs: { valvula: 'em', edv: 95 },
    texto:
      'El VI se llena poco y despacio porque la mitral no se abre bien: bucle pequeño y desplazado a la izquierda, con presiones del VI normales. Quien sufre es la aurícula, que trabaja a presión alta.',
  },
];

const COL = { loop: '#e11d48', ghost: '#94a3b8', espvr: '#dc2626', edpvr: '#2563eb', ea: '#059669' };

function css(el: Element, name: string) {
  return getComputedStyle(el).getPropertyValue(name).trim();
}

export function PvLoopPanel() {
  const sim = useSim((s) => s.sim);
  const theme = useSim((s) => s.theme);
  const [inp, setInp] = useState<PvInputs>(PV_NORMAL);
  const [casoId, setCasoId] = useState('normal');
  const caso = CASOS.find((c) => c.id === casoId);

  const res = useMemo(() => computePvLoop(sim, inp), [sim, inp]);
  const normal = useMemo(() => computePvLoop(sim, PV_NORMAL), [sim]);
  const m = useMemo(() => pvMetrics(res), [res]);
  const esNormal = JSON.stringify(inp) === JSON.stringify(PV_NORMAL);

  const wrapRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLCanvasElement>(null);
  const fgRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState(420);
  const dpr = Math.min(2, window.devicePixelRatio || 1);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize(Math.min(520, el.clientWidth)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Escalas: volumen 0–250 mL; presión 0–200 mmHg (más si hace falta)
  const W = size;
  const H = Math.round(size * 0.82);
  const pad = { l: 44, r: 12, t: 12, b: 34 };
  const vMax = 250;
  const pTop = Math.max(200, Math.ceil((m.pMax + 15) / 50) * 50);
  const X = (v: number) => pad.l + (v / vMax) * (W - pad.l - pad.r);
  const Y = (p: number) => H - pad.b - (p / pTop) * (H - pad.t - pad.b);

  const prep = (c: HTMLCanvasElement | null) => {
    if (!c) return null;
    c.width = W * dpr;
    c.height = H * dpr;
    const ctx = c.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    return ctx;
  };

  // Fondo: ejes, relaciones presión‑volumen y bucles
  useEffect(() => {
    const ctx = prep(bgRef.current);
    const el = wrapRef.current;
    if (!ctx || !el) return;
    const text = css(el, '--text');
    const muted = css(el, '--muted');
    const border = css(el, '--border');
    ctx.font = '11px system-ui, sans-serif';

    // Rejilla y ejes
    ctx.strokeStyle = border;
    ctx.fillStyle = muted;
    ctx.lineWidth = 1;
    for (let v = 0; v <= vMax; v += 50) {
      ctx.beginPath();
      ctx.moveTo(X(v), Y(0));
      ctx.lineTo(X(v), Y(pTop));
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillText(String(v), X(v), H - pad.b + 14);
    }
    for (let p = 0; p <= pTop; p += 50) {
      ctx.beginPath();
      ctx.moveTo(X(0), Y(p));
      ctx.lineTo(X(vMax), Y(p));
      ctx.stroke();
      ctx.textAlign = 'right';
      ctx.fillText(String(p), pad.l - 6, Y(p) + 4);
    }
    ctx.fillStyle = text;
    ctx.textAlign = 'center';
    ctx.fillText('Volumen del VI (mL)', (pad.l + W - pad.r) / 2, H - 4);
    ctx.save();
    ctx.translate(12, (pad.t + H - pad.b) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Presión del VI (mmHg)', 0, 0);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(pad.l, pad.t, W - pad.l - pad.r, H - pad.t - pad.b);
    ctx.clip();

    // RPVTD (curva de llenado pasivo)
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = COL.edpvr;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let v = V0; v <= vMax; v += 2) {
      const p = edpvr(v, inp.rigidez);
      if (v === V0) ctx.moveTo(X(v), Y(p));
      else ctx.lineTo(X(v), Y(p));
    }
    ctx.stroke();
    // RPVTS (contractilidad)
    ctx.strokeStyle = COL.espvr;
    ctx.beginPath();
    ctx.moveTo(X(V0), Y(0));
    ctx.lineTo(X(vMax), Y(inp.ees * (vMax - V0)));
    ctx.stroke();
    // Ea (poscarga): de (VTD, 0) al punto de fin de sístole
    ctx.setLineDash([2, 4]);
    ctx.strokeStyle = COL.ea;
    ctx.beginPath();
    ctx.moveTo(X(inp.edv), Y(0));
    ctx.lineTo(X(res.esv), Y(res.pes));
    ctx.stroke();
    ctx.setLineDash([]);

    // Bucle normal de referencia
    const drawLoop = (c: typeof res.cycle, color: string, w: number) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = w;
      ctx.beginPath();
      for (let i = 0; i <= c.n; i++) {
        const k = i % c.n;
        if (i === 0) ctx.moveTo(X(c.vlv[k]), Y(c.plv[k]));
        else ctx.lineTo(X(c.vlv[k]), Y(c.plv[k]));
      }
      ctx.stroke();
    };
    if (!esNormal) drawLoop(normal.cycle, COL.ghost, 1.5);
    drawLoop(res.cycle, COL.loop, 2.6);

    // Las cuatro válvulas en un latido
    const b = res.cycle.beats[Math.min(1, res.cycle.beats.length - 1)];
    const pts: [number, string][] = [
      [b.mc, 'CM'],
      [b.ao, 'AA'],
      [b.ac, 'CA'],
      [b.mo, 'AM'],
    ];
    ctx.font = '700 11px system-ui, sans-serif';
    for (const [t, lab] of pts) {
      const v = sampleCycle(res.cycle, res.cycle.vlv, t);
      const p = sampleCycle(res.cycle, res.cycle.plv, t);
      ctx.fillStyle = text;
      ctx.beginPath();
      ctx.arc(X(v), Y(p), 3.5, 0, Math.PI * 2);
      ctx.fill();
      const dx = lab === 'CM' || lab === 'AA' ? 7 : -7;
      const dy = lab === 'CM' || lab === 'AM' ? 14 : -7;
      ctx.textAlign = dx > 0 ? 'left' : 'right';
      ctx.fillText(lab, X(v) + dx, Y(p) + dy);
    }
    ctx.restore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [res, normal, esNormal, W, H, pTop, theme]);

  // Punto que recorre el bucle con el reloj
  useEffect(() => {
    const ctx = prep(fgRef.current);
    if (!ctx) return;
    const c = res.cycle;
    return clock.subscribe((t) => {
      ctx.clearRect(0, 0, W, H);
      const v = sampleCycle(c, c.vlv, t);
      const p = sampleCycle(c, c.plv, t);
      ctx.fillStyle = COL.loop;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(X(v), Y(p), 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      const ph = mechPhaseAt(c, t);
      if (phaseRef.current) phaseRef.current.textContent = ph ? MECH_PHASE_LABEL[ph] : '—';
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [res, W, H, pTop]);

  const set = (k: keyof PvInputs, val: number) => {
    setInp((s) => ({ ...s, [k]: val }));
    setCasoId('');
  };
  const elegirCaso = (c: Caso) => {
    setInp({ ...PV_NORMAL, ...c.inputs });
    setCasoId(c.id);
  };

  const sliders: { k: keyof PvInputs; label: string; sub: string; min: number; max: number; step: number; fmt: (x: number) => string }[] = [
    { k: 'edv', label: 'Precarga', sub: 'volumen telediastólico', min: 80, max: 220, step: 1, fmt: (x) => `${x} mL` },
    { k: 'ea', label: 'Poscarga', sub: 'elastancia arterial (Ea)', min: 0.7, max: 3, step: 0.05, fmt: (x) => `${x.toFixed(2)} mmHg/mL` },
    { k: 'ees', label: 'Contractilidad', sub: 'pendiente de la RPVTS (Ees)', min: 0.8, max: 5, step: 0.05, fmt: (x) => `${x.toFixed(2)} mmHg/mL` },
    { k: 'rigidez', label: 'Rigidez diastólica', sub: 'pendiente de la RPVTD', min: 0.7, max: 2, step: 0.05, fmt: (x) => `×${x.toFixed(2)}` },
  ];

  const fmt = (x: number) => Math.round(x).toString();
  return (
    <section className="card pv-card" aria-labelledby="pv-title">
      <div className="wiggers-head">
        <h2 id="pv-title">Bucle presión‑volumen (VI)</h2>
        <div className="wiggers-live">
          <span className="phase-chip" ref={phaseRef}>
            —
          </span>
        </div>
      </div>

      <div className="pv-grid">
        <div>
          <div className="pv-wrap" ref={wrapRef}>
            <div className="pv-stack" style={{ width: W, height: H }}>
              <canvas ref={bgRef} style={{ width: W, height: H }} />
              <canvas ref={fgRef} style={{ width: W, height: H }} aria-label="Bucle presión-volumen del ventrículo izquierdo" role="img" />
            </div>
          </div>
          <div className="wiggers-legend small">
            <span>
              <i style={{ background: COL.loop }} /> Bucle actual
            </span>
            {!esNormal && (
              <span>
                <i style={{ background: COL.ghost }} /> Normal
              </span>
            )}
            <span>
              <i className="dashed" style={{ borderColor: COL.espvr }} /> RPVTS
            </span>
            <span>
              <i className="dashed" style={{ borderColor: COL.edpvr }} /> RPVTD
            </span>
            <span>
              <i className="dashed" style={{ borderColor: COL.ea }} /> Ea
            </span>
            <span className="muted">CM/AM: cierre/apertura mitral · AA/CA: apertura/cierre aórtico</span>
          </div>
        </div>

        <div className="pv-side">
          <div className="pv-metrics">
            <div>
              <span>VTD</span>
              <b>{fmt(m.vtd)}</b> mL
            </div>
            <div>
              <span>VTS</span>
              <b>{fmt(m.vts)}</b> mL
            </div>
            <div>
              <span>VS</span>
              <b>{fmt(m.vs)}</b> mL
            </div>
            <div>
              <span>FE</span>
              <b>{fmt(m.fe * 100)}</b> %
            </div>
            <div>
              <span>PTD</span>
              <b>{fmt(res.edp)}</b> mmHg
            </div>
            <div>
              <span>P máx</span>
              <b>{fmt(m.pMax)}</b> mmHg
            </div>
            <div title="Área del bucle: trabajo externo del latido">
              <span>Trabajo</span>
              <b>{(m.trabajo * 1.333e-4).toFixed(2)}</b> J
            </div>
            {inp.valvula === 'im' && (
              <div title="Lo que sale por la aorta; el resto vuelve a la aurícula">
                <span>VS a la aorta</span>
                <b>{fmt(m.vsAnterogrado)}</b> mL
              </div>
            )}
          </div>

          <div className="sound-chips pv-casos">
            {CASOS.map((c) => (
              <button key={c.id} className={`sound-chip ${c.id === 'normal' ? 'fisiologico' : 'patologico'}${c.id === casoId ? ' is-on' : ''}`} onClick={() => elegirCaso(c)}>
                {c.nombre}
              </button>
            ))}
          </div>

          <div className="pv-sliders">
            {sliders.map((s) => (
              <label key={s.k} className="pv-slider">
                <span className="pv-slider-head">
                  <b>{s.label}</b> <span className="muted small">{s.sub}</span>
                  <span className="mono small pv-val">{s.fmt(inp[s.k] as number)}</span>
                </span>
                <input type="range" min={s.min} max={s.max} step={s.step} value={inp[s.k] as number} onChange={(e) => set(s.k, Number(e.target.value))} />
              </label>
            ))}
          </div>

          <p className="small pv-text">
            {caso
              ? caso.texto
              : 'Ajuste manual. Recuerda: la precarga mueve la esquina derecha, la contractilidad gira la RPVTS (roja) y la poscarga gira la recta de Ea (verde). El punto de fin de sístole está donde se cruzan las dos.'}
          </p>
          <p className="small muted pv-text">
            La frecuencia y el ritmo son los del simulador: en una FA cada latido dibuja un bucle distinto. Modelo de elastancias (Suga y Sagawa), simplificado; valores orientativos.
          </p>
        </div>
      </div>
    </section>
  );
}
