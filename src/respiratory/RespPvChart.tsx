/**
 * CURVAS PRESIÓN‑VOLUMEN ESTÁTICAS (diagrama de Rahn): pulmón, pared torácica
 * y sistema respiratorio completo. La CRF es el volumen en el que la curva del
 * sistema cruza el cero: ahí el pulmón tira hacia dentro tanto como la pared
 * hacia fuera. Los puntos se mueven con el volumen de cada instante.
 */
import { useEffect, useRef, useState } from 'react';
import { useSim } from '../store/useSimStore';
import { chestWallRecoil, lungRecoil, sampleResp, type RespCycle, type RespParams } from './mechanics';
import { respClock } from './respClock';

const COL = { lung: '#e11d48', cw: '#2563eb', rs: '#0f766e', ghost: '#94a3b8' };

function css(el: Element, name: string) {
  return getComputedStyle(el).getPropertyValue(name).trim();
}

export function RespPvChart({ p, cycle, normal }: { p: RespParams; cycle: RespCycle; normal: RespParams | null }) {
  const theme = useSim((s) => s.theme);
  const wrapRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLCanvasElement>(null);
  const fgRef = useRef<HTMLCanvasElement>(null);
  const [W, setW] = useState(420);
  const H = Math.round(Math.min(360, W * 0.8));
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const pad = { l: 40, r: 10, t: 10, b: 32 };
  const pMin = -30;
  const pMax = 40;
  const vMax = 8;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.min(520, el.clientWidth)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const X = (pr: number) => pad.l + ((pr - pMin) / (pMax - pMin)) * (W - pad.l - pad.r);
  const Y = (v: number) => H - pad.b - (v / vMax) * (H - pad.t - pad.b);

  const prep = (c: HTMLCanvasElement | null) => {
    if (!c) return null;
    c.width = W * dpr;
    c.height = H * dpr;
    const ctx = c.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineJoin = 'round';
    return ctx;
  };

  useEffect(() => {
    const ctx = prep(bgRef.current);
    const el = wrapRef.current;
    if (!ctx || !el) return;
    const text = css(el, '--text');
    const muted = css(el, '--muted');
    const border = css(el, '--border');
    ctx.font = '11px system-ui, sans-serif';

    // Rejilla
    ctx.strokeStyle = border;
    ctx.fillStyle = muted;
    for (let pr = pMin; pr <= pMax; pr += 10) {
      ctx.lineWidth = pr === 0 ? 1.6 : 1;
      ctx.beginPath();
      ctx.moveTo(X(pr), Y(0));
      ctx.lineTo(X(pr), Y(vMax));
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillText(String(pr), X(pr), H - pad.b + 13);
    }
    ctx.lineWidth = 1;
    for (let v = 0; v <= vMax; v += 2) {
      ctx.beginPath();
      ctx.moveTo(X(pMin), Y(v));
      ctx.lineTo(X(pMax), Y(v));
      ctx.stroke();
      ctx.textAlign = 'right';
      ctx.fillText(String(v), pad.l - 5, Y(v) + 4);
    }
    ctx.fillStyle = text;
    ctx.textAlign = 'center';
    ctx.fillText('Presión de retracción (cmH₂O)', (pad.l + W - pad.r) / 2, H - 4);
    ctx.save();
    ctx.translate(11, (pad.t + H - pad.b) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Volumen pulmonar (L)', 0, 0);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(pad.l, pad.t, W - pad.l - pad.r, H - pad.t - pad.b);
    ctx.clip();
    const curve = (q: RespParams, f: (q: RespParams, v: number) => number, color: string, w: number, dash: number[] = []) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = w;
      ctx.setLineDash(dash);
      ctx.beginPath();
      let first = true;
      for (let v = q.rv + 0.02; v <= q.tlc - 0.02; v += 0.02) {
        const pr = f(q, v);
        if (first) ctx.moveTo(X(pr), Y(v));
        else ctx.lineTo(X(pr), Y(v));
        first = false;
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };
    const rs = (q: RespParams, v: number) => lungRecoil(q, v) + chestWallRecoil(q, v);
    if (normal) curve(normal, lungRecoil, COL.ghost, 1.4, [5, 4]);
    curve(p, chestWallRecoil, COL.cw, 2);
    curve(p, rs, COL.rs, 2);
    curve(p, lungRecoil, COL.lung, 2.4);

    // CRF, VR y CPT
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = muted;
    ctx.fillStyle = muted;
    ctx.textAlign = 'left';
    for (const [v, lab] of [
      [cycle.frcRelaxed, 'CRF'],
      [p.rv, 'VR'],
      [p.tlc, 'CPT'],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(X(pMin), Y(v));
      ctx.lineTo(X(pMax), Y(v));
      ctx.stroke();
      ctx.fillText(`${lab} ${v.toFixed(1)} L`, X(pMin) + 4, Y(v) - 3);
    }
    ctx.setLineDash([]);
    ctx.restore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p, cycle, normal, W, H, theme]);

  useEffect(() => {
    const ctx = prep(fgRef.current);
    if (!ctx) return;
    return respClock.subscribe((t) => {
      ctx.clearRect(0, 0, W, H);
      const v = sampleResp(cycle, cycle.vol, t);
      const pts: [number, string][] = [
        [lungRecoil(p, v), COL.lung],
        [chestWallRecoil(p, v), COL.cw],
        [lungRecoil(p, v) + chestWallRecoil(p, v), COL.rs],
      ];
      for (const [pr, c] of pts) {
        ctx.fillStyle = c;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(X(pr), Y(v), 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p, cycle, W, H]);

  return (
    <div>
      <div className="resp-pv" ref={wrapRef}>
        <div style={{ position: 'relative', width: W, height: H }}>
          <canvas ref={bgRef} style={{ width: W, height: H }} />
          <canvas ref={fgRef} style={{ width: W, height: H }} role="img" aria-label="Curvas presión-volumen del pulmón, la pared torácica y el sistema respiratorio" />
        </div>
      </div>
      <div className="wiggers-legend small">
        <span>
          <i style={{ background: COL.lung }} /> Pulmón
        </span>
        <span>
          <i style={{ background: COL.cw }} /> Pared torácica
        </span>
        <span>
          <i style={{ background: COL.rs }} /> Sistema respiratorio
        </span>
        {normal && (
          <span>
            <i className="dashed" style={{ borderColor: COL.ghost }} /> Pulmón normal
          </span>
        )}
      </div>
    </div>
  );
}
