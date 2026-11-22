/**
 * CICLO RESPIRATORIO: volumen pulmonar, flujo, presión alveolar y presión
 * pleural de dos respiraciones, con el cursor sincronizado con el acino 3D.
 * Es el «diagrama de Wiggers» del aparato respiratorio (como la figura clásica
 * de West).
 */
import { useEffect, useRef, useState } from 'react';
import { useSim } from '../store/useSimStore';
import { sampleResp, type RespCycle } from './mechanics';
import { respClock } from './respClock';

const COL = { vol: '#059669', flow: '#2563eb', palv: '#e11d48', ppl: '#9333ea', ghost: '#94a3b8' };

interface Track {
  key: 'vol' | 'flow' | 'palv' | 'ppl';
  label: string;
  unit: string;
  color: string;
}
const TRACKS: Track[] = [
  { key: 'vol', label: 'Volumen pulmonar', unit: 'L', color: COL.vol },
  { key: 'flow', label: 'Flujo', unit: 'L/s', color: COL.flow },
  { key: 'palv', label: 'Presión alveolar', unit: 'cmH₂O', color: COL.palv },
  { key: 'ppl', label: 'Presión pleural', unit: 'cmH₂O', color: COL.ppl },
];

function css(el: Element, name: string) {
  return getComputedStyle(el).getPropertyValue(name).trim();
}

/** Escala «bonita» de un eje que contenga todos los valores. */
function range(arrs: ArrayLike<number>[], minSpan: number, includeZero: boolean): [number, number] {
  let a = Infinity;
  let b = -Infinity;
  for (const arr of arrs) for (let i = 0; i < arr.length; i++) (a = Math.min(a, arr[i])), (b = Math.max(b, arr[i]));
  if (includeZero) (a = Math.min(a, 0)), (b = Math.max(b, 0));
  if (b - a < minSpan) {
    const m = (a + b) / 2;
    a = m - minSpan / 2;
    b = m + minSpan / 2;
  }
  const pad = (b - a) * 0.12;
  return [a - pad, b + pad];
}

export function RespCycleChart({ cycle, normal }: { cycle: RespCycle; normal: RespCycle | null }) {
  const theme = useSim((s) => s.theme);
  const wrapRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLCanvasElement>(null);
  const fgRef = useRef<HTMLCanvasElement>(null);
  const valsRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(600);
  const H = 380;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const pad = { l: 56, r: 10, t: 6, b: 22 };
  const nBreaths = 2;
  const span = cycle.period * nBreaths;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rowH = (H - pad.t - pad.b) / TRACKS.length;
  const X = (t: number) => pad.l + (t / span) * (W - pad.l - pad.r);

  const prep = (c: HTMLCanvasElement | null) => {
    if (!c) return null;
    c.width = W * dpr;
    c.height = H * dpr;
    const ctx = c.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineJoin = 'round';
    return ctx;
  };

  // Escalas de cada fila (comunes al ciclo actual y al normal superpuesto)
  const scales = TRACKS.map((tr) => {
    const arrs = [cycle[tr.key], ...(normal ? [normal[tr.key]] : [])];
    return range(arrs, tr.key === 'vol' ? 0.6 : tr.key === 'flow' ? 1 : 2, tr.key !== 'vol');
  });
  const Y = (row: number, v: number) => {
    const [a, b] = scales[row];
    return pad.t + row * rowH + rowH - ((v - a) / (b - a)) * rowH;
  };

  useEffect(() => {
    const ctx = prep(bgRef.current);
    const el = wrapRef.current;
    if (!ctx || !el) return;
    const text = css(el, '--text');
    const muted = css(el, '--muted');
    const border = css(el, '--border');

    // Fondo de las fases: inspiración (azul) y espiración (gris)
    for (let k = 0; k < nBreaths; k++) {
      const t0 = k * cycle.period;
      ctx.fillStyle = 'rgba(37,99,235,0.08)';
      ctx.fillRect(X(t0), pad.t, X(t0 + cycle.ti) - X(t0), H - pad.t - pad.b);
      ctx.fillStyle = 'rgba(100,116,139,0.06)';
      ctx.fillRect(X(t0 + cycle.ti), pad.t, X(t0 + cycle.period) - X(t0 + cycle.ti), H - pad.t - pad.b);
    }
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = muted;
    ctx.textAlign = 'center';
    for (let k = 0; k < nBreaths; k++) {
      const t0 = k * cycle.period;
      ctx.fillText('Inspiración', (X(t0) + X(t0 + cycle.ti)) / 2, H - 6);
      ctx.fillText('Espiración', (X(t0 + cycle.ti) + X(t0 + cycle.period)) / 2, H - 6);
    }

    TRACKS.forEach((tr, row) => {
      const [a, b] = scales[row];
      const y0 = pad.t + row * rowH;
      ctx.strokeStyle = border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad.l, y0 + rowH);
      ctx.lineTo(W - pad.r, y0 + rowH);
      ctx.stroke();
      // Línea de referencia: cero (presiones, flujo) o CRF (volumen)
      const ref = tr.key === 'vol' ? cycle.frcRelaxed : 0;
      if (ref >= a && ref <= b) {
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = muted;
        ctx.beginPath();
        ctx.moveTo(pad.l, Y(row, ref));
        ctx.lineTo(W - pad.r, Y(row, ref));
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = muted;
        ctx.textAlign = 'right';
        ctx.fillText(tr.key === 'vol' ? 'CRF' : '0', W - pad.r - 2, Y(row, ref) - 3);
      }
      // Etiqueta y escala
      ctx.textAlign = 'left';
      ctx.fillStyle = tr.color;
      ctx.font = '700 11px system-ui, sans-serif';
      ctx.fillText(tr.label, pad.l + 4, y0 + 12);
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillStyle = muted;
      ctx.textAlign = 'right';
      ctx.fillText(`${b.toFixed(1)}`, pad.l - 6, y0 + 10);
      ctx.fillText(`${a.toFixed(1)}`, pad.l - 6, y0 + rowH - 2);
      ctx.fillText(tr.unit, pad.l - 6, y0 + rowH / 2 + 3);

      const draw = (c: RespCycle, color: string, w: number) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = w;
        ctx.beginPath();
        const steps = Math.round(span / 0.02);
        for (let i = 0; i <= steps; i++) {
          const t = (i / steps) * span;
          const v = sampleResp(c, c[tr.key], t);
          if (i === 0) ctx.moveTo(X(t), Y(row, v));
          else ctx.lineTo(X(t), Y(row, v));
        }
        ctx.stroke();
      };
      if (normal) draw(normal, COL.ghost, 1.4);
      draw(cycle, tr.color, 2.2);
    });

    // Tramos con el flujo espiratorio limitado (colapso dinámico de la vía aérea)
    if (cycle.limited.some((x) => x)) {
      ctx.fillStyle = 'rgba(234,88,12,0.85)';
      for (let k = 0; k < nBreaths; k++)
        for (let i = 0; i < cycle.n; i++)
          if (cycle.limited[i]) ctx.fillRect(X(k * cycle.period + i * cycle.dt), Y(1, 0) - 1, Math.max(1, X(cycle.dt) - X(0) + 0.5), 3);
    }
    ctx.fillStyle = text;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycle, normal, W, theme]);

  // Cursor sincronizado
  useEffect(() => {
    const ctx = prep(fgRef.current);
    if (!ctx) return;
    return respClock.subscribe((tAbs) => {
      const t = tAbs % span;
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(X(t), pad.t);
      ctx.lineTo(X(t), H - pad.b);
      ctx.stroke();
      TRACKS.forEach((tr, row) => {
        const v = sampleResp(cycle, cycle[tr.key], t);
        ctx.fillStyle = tr.color;
        ctx.beginPath();
        ctx.arc(X(t), Y(row, v), 4, 0, Math.PI * 2);
        ctx.fill();
      });
      if (valsRef.current) {
        const v = (k: Track['key'], d: number) => sampleResp(cycle, cycle[k], t).toFixed(d);
        valsRef.current.textContent = `V ${v('vol', 2)} L · flujo ${v('flow', 2)} L/s · Palv ${v('palv', 1)} · Ppl ${v('ppl', 1)} cmH₂O`;
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycle, W, normal]);

  return (
    <div>
      <div className="resp-chart" ref={wrapRef} style={{ height: H }}>
        <canvas ref={bgRef} style={{ width: W, height: H }} />
        <canvas ref={fgRef} style={{ width: W, height: H }} role="img" aria-label="Volumen, flujo, presión alveolar y presión pleural durante el ciclo respiratorio" />
      </div>
      <div className="mono small muted resp-vals" ref={valsRef} />
      {cycle.limited.some((x) => x) && (
        <p className="small resp-note">
          <i className="resp-lim" /> Flujo espiratorio <b>limitado</b>: la vía aérea se comprime y, aunque se haga más fuerza, el aire no sale más rápido.
        </p>
      )}
    </div>
  );
}
