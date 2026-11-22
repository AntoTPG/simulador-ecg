/**
 * Panel de ESPIROMETRÍA: curvas volumen‑tiempo y flujo‑volumen que se dibujan
 * como en el espirómetro (la maniobra se repite en bucle), tabla de valores con
 * el % del teórico, prueba broncodilatadora e interpretación paso a paso.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSim } from '../store/useSimStore';
import { CASOS_ESPIRO, GRUPOS_ESPIRO, getCasoEspiro } from './spiroCatalog';
import { interpretar, simulateSpirometry, SPIRO_NORMAL, type SpiroCurve, type SpiroMetrics } from './spirometry';

const COL = { pre: '#e11d48', post: '#059669', ghost: '#94a3b8' };

function css(el: Element, name: string) {
  return getComputedStyle(el).getPropertyValue(name).trim();
}

interface Serie {
  curve: SpiroCurve;
  color: string;
  dash?: number[];
  /** Si se dibuja con la animación de la maniobra. */
  animada?: boolean;
}

/** Lienzo con ejes; `draw` recibe las funciones de escala. */
function useCanvas(H: number) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLCanvasElement>(null);
  const [W, setW] = useState(420);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.max(260, el.clientWidth)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { wrapRef, ref, W, H };
}

function axes(
  ctx: CanvasRenderingContext2D,
  el: Element,
  W: number,
  H: number,
  pad: { l: number; r: number; t: number; b: number },
  xr: [number, number, number],
  yr: [number, number, number],
  xLabel: string,
  yLabel: string,
) {
  const X = (x: number) => pad.l + ((x - xr[0]) / (xr[1] - xr[0])) * (W - pad.l - pad.r);
  const Y = (y: number) => H - pad.b - ((y - yr[0]) / (yr[1] - yr[0])) * (H - pad.t - pad.b);
  const muted = css(el, '--muted');
  ctx.strokeStyle = css(el, '--border');
  ctx.fillStyle = muted;
  ctx.font = '11px system-ui, sans-serif';
  for (let x = xr[0]; x <= xr[1] + 1e-6; x += xr[2]) {
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(X(x), Y(yr[0]));
    ctx.lineTo(X(x), Y(yr[1]));
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillText(String(x), X(x), H - pad.b + 13);
  }
  for (let y = yr[0]; y <= yr[1] + 1e-6; y += yr[2]) {
    ctx.lineWidth = y === 0 ? 1.8 : 1;
    ctx.beginPath();
    ctx.moveTo(X(xr[0]), Y(y));
    ctx.lineTo(X(xr[1]), Y(y));
    ctx.stroke();
    ctx.textAlign = 'right';
    ctx.fillText(String(y), pad.l - 5, Y(y) + 4);
  }
  ctx.fillStyle = css(el, '--text');
  ctx.textAlign = 'center';
  ctx.fillText(xLabel, (pad.l + W - pad.r) / 2, H - 3);
  ctx.save();
  ctx.translate(11, (pad.t + H - pad.b) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(yLabel, 0, 0);
  ctx.restore();
  return { X, Y };
}

export function SpirometryPanel() {
  const theme = useSim((s) => s.theme);
  const [id, setId] = useState('normal');
  const [bd, setBd] = useState(false);
  const [comparar, setComparar] = useState(true);
  const caso = getCasoEspiro(id);
  const esNormal = caso.id === 'normal';

  const ref = useMemo(() => simulateSpirometry(SPIRO_NORMAL), []);
  const pre = useMemo(() => simulateSpirometry(caso.params), [caso]);
  const post = useMemo(() => (caso.postBd ? simulateSpirometry(caso.postBd) : null), [caso]);
  const verPost = bd && post;
  const interp = interpretar(pre.m, ref.m, verPost ? post.m : undefined, caso.escala);

  const vt = useCanvas(260);
  const fv = useCanvas(300);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const padVt = { l: 38, r: 10, t: 10, b: 30 };
  const padFv = { l: 38, r: 10, t: 10, b: 30 };

  // Animación de la maniobra: espiración forzada, inspiración forzada y pausa
  const prog = useRef(0);
  useEffect(() => {
    prog.current = 0;
  }, [caso]);

  useEffect(() => {
    const series: Serie[] = [
      ...(comparar && !esNormal ? [{ curve: ref.curve, color: COL.ghost, dash: [5, 4] }] : []),
      ...(verPost ? [{ curve: post.curve, color: COL.post }] : []),
      { curve: pre.curve, color: COL.pre, animada: true },
    ];
    const tIns = 1.6;
    const total = pre.curve.tEsp + tIns + 1.8;
    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      prog.current = (prog.current + Math.min(0.1, (now - last) / 1000)) % total;
      last = now;
      const u = prog.current;
      drawVt(u);
      drawFv(u, tIns);
      raf = requestAnimationFrame(frame);
    };

    const prep = (c: HTMLCanvasElement | null, W: number, H: number) => {
      if (!c) return null;
      if (c.width !== W * dpr) c.width = W * dpr;
      if (c.height !== H * dpr) c.height = H * dpr;
      const ctx = c.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.lineJoin = 'round';
      return ctx;
    };

    const drawVt = (u: number) => {
      const ctx = prep(vt.ref.current, vt.W, vt.H);
      const el = vt.wrapRef.current;
      if (!ctx || !el) return;
      const tMax = Math.max(8, Math.ceil(pre.curve.tEsp));
      const { X, Y } = axes(ctx, el, vt.W, vt.H, padVt, [0, tMax, tMax > 10 ? 2 : 1], [0, 6, 1], 'Tiempo (s)', 'Volumen (L)');
      // Línea del primer segundo
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = css(el, '--muted');
      ctx.beginPath();
      ctx.moveTo(X(1), Y(0));
      ctx.lineTo(X(1), Y(6));
      ctx.stroke();
      ctx.setLineDash([]);
      for (const s of series) {
        const c = s.curve;
        const lim = s.animada ? Math.min(u, c.tEsp) : c.tEsp;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.animada ? 2.6 : 1.8;
        ctx.setLineDash(s.dash ?? []);
        ctx.beginPath();
        for (let i = 0; i < c.t.length && c.t[i] <= lim; i += 4) {
          if (i === 0) ctx.moveTo(X(c.t[i]), Y(c.vEsp[i]));
          else ctx.lineTo(X(c.t[i]), Y(c.vEsp[i]));
        }
        ctx.stroke();
        ctx.setLineDash([]);
        if (s.animada && u >= 1) {
          // FEV1 y FVC del trazado principal
          const m = (s.curve === pre.curve ? pre : post!).m;
          ctx.fillStyle = s.color;
          ctx.beginPath();
          ctx.arc(X(1), Y(m.fev1), 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.font = '700 11px system-ui, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`FEV1 ${m.fev1.toFixed(2)} L`, X(1) + 7, Y(m.fev1) + 14);
          if (u >= c.tEsp) {
            ctx.textAlign = 'right';
            ctx.fillText(`FVC ${m.fvc.toFixed(2)} L`, X(tMax) - 4, Y(m.fvc) - 6);
          }
        }
      }
    };

    const drawFv = (u: number, tIns: number) => {
      const ctx = prep(fv.ref.current, fv.W, fv.H);
      const el = fv.wrapRef.current;
      if (!ctx || !el) return;
      const { X, Y } = axes(ctx, el, fv.W, fv.H, padFv, [0, 6, 1], [-8, 10, 2], 'Volumen espirado (L)', 'Flujo (L/s)');
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillStyle = css(el, '--muted');
      ctx.textAlign = 'left';
      ctx.fillText('espiración', X(0) + 4, Y(9.3));
      ctx.fillText('inspiración', X(0) + 4, Y(-7.3));
      for (const s of series) {
        const c = s.curve;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.animada ? 2.6 : 1.8;
        ctx.setLineDash(s.dash ?? []);
        ctx.beginPath();
        const limE = s.animada ? Math.min(u, c.tEsp) : c.tEsp;
        for (let i = 0; i < c.t.length && c.t[i] <= limE; i += 2) {
          if (i === 0) ctx.moveTo(X(c.vEsp[i]), Y(c.fEsp[i]));
          else ctx.lineTo(X(c.vEsp[i]), Y(c.fEsp[i]));
        }
        // Rama inspiratoria
        const fracI = s.animada ? Math.max(0, Math.min(1, (u - c.tEsp) / tIns)) : 1;
        const nI = Math.round(fracI * (c.vIns.length - 1));
        for (let i = 0; i <= nI; i++) ctx.lineTo(X(c.vIns[i]), Y(c.fIns[i]));
        ctx.stroke();
        ctx.setLineDash([]);
      }
      // Punto que recorre la curva
      const c = pre.curve;
      let px: number;
      let py: number;
      if (u <= c.tEsp) {
        const i = Math.min(c.t.length - 1, Math.floor(u / 0.005));
        px = c.vEsp[i];
        py = c.fEsp[i];
      } else {
        const i = Math.min(c.vIns.length - 1, Math.round(Math.min(1, (u - c.tEsp) / tIns) * (c.vIns.length - 1)));
        px = c.vIns[i];
        py = c.fIns[i];
      }
      ctx.fillStyle = COL.pre;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(X(px), Y(py), 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pre, post, verPost, comparar, esNormal, vt.W, fv.W, theme]);

  const filas: { k: keyof SpiroMetrics; label: string; unit: string; d: number; title?: string }[] = [
    { k: 'fvc', label: 'FVC', unit: 'L', d: 2, title: 'Capacidad vital forzada' },
    { k: 'fev1', label: 'FEV1', unit: 'L', d: 2, title: 'Volumen espirado en el primer segundo' },
    { k: 'ratio', label: 'FEV1/FVC', unit: '%', d: 0 },
    { k: 'pef', label: 'PEF', unit: 'L/s', d: 1, title: 'Pico de flujo espiratorio' },
    { k: 'fef2575', label: 'FEF25–75', unit: 'L/s', d: 1, title: 'Flujo medio entre el 25 y el 75 % de la FVC (poco específico)' },
    { k: 'pif', label: 'PIF', unit: 'L/s', d: 1, title: 'Pico de flujo inspiratorio' },
  ];
  const fmt = (m: SpiroMetrics, k: keyof SpiroMetrics, d: number) => (k === 'ratio' ? (m[k] * 100).toFixed(0) : m[k].toFixed(d));

  return (
    <section className="card resp-card" aria-labelledby="spiro-title">
      <div className="cg-head">
        <h2 id="spiro-title">Espirometría forzada</h2>
        <div className="vs-toggles">
          {post && (
            <label className="switch">
              <input type="checkbox" checked={bd} onChange={(e) => setBd(e.target.checked)} />
              <span className="switch-track" aria-hidden />
              Tras broncodilatador
            </label>
          )}
          {!esNormal && (
            <label className="switch">
              <input type="checkbox" checked={comparar} onChange={(e) => setComparar(e.target.checked)} />
              <span className="switch-track" aria-hidden />
              Comparar con normal
            </label>
          )}
        </div>
      </div>

      <div className="vs-groups">
        {GRUPOS_ESPIRO.map((g) => (
          <div key={g} className="sound-group">
            <div className="sound-group-title">{g}</div>
            <div className="sound-chips">
              {CASOS_ESPIRO.filter((x) => x.grupo === g).map((x) => (
                <button
                  key={x.id}
                  className={`sound-chip ${x.grupo === 'Referencia' ? 'fisiologico' : 'patologico'}${x.id === id ? ' is-on' : ''}`}
                  onClick={() => {
                    setId(x.id);
                    setBd(false);
                  }}
                >
                  {x.nombre}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="spiro-grid">
        <div>
          <h3 className="resp-h3">Volumen–tiempo</h3>
          <div ref={vt.wrapRef} className="spiro-canvas">
            <canvas ref={vt.ref} style={{ width: vt.W, height: vt.H }} role="img" aria-label="Curva volumen-tiempo de la espirometría" />
          </div>
        </div>
        <div>
          <h3 className="resp-h3">Flujo–volumen</h3>
          <div ref={fv.wrapRef} className="spiro-canvas">
            <canvas ref={fv.ref} style={{ width: fv.W, height: fv.H }} role="img" aria-label="Curva flujo-volumen de la espirometría" />
          </div>
        </div>
      </div>
      <div className="wiggers-legend small">
        <span>
          <i style={{ background: COL.pre }} /> {verPost ? 'Basal (antes del broncodilatador)' : 'Paciente'}
        </span>
        {verPost && (
          <span>
            <i style={{ background: COL.post }} /> Tras broncodilatador
          </span>
        )}
        {comparar && !esNormal && (
          <span>
            <i className="dashed" style={{ borderColor: COL.ghost }} /> Normal
          </span>
        )}
      </div>

      <div className="resp-grid resp-grid-2">
        <div>
          <table className="spiro-table">
            <thead>
              <tr>
                <th>Parámetro</th>
                <th>Medido</th>
                <th>Teórico</th>
                <th>% teór.</th>
                {verPost && (
                  <>
                    <th>Post‑BD</th>
                    <th>Cambio</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.k} title={f.title}>
                  <td>
                    <b>{f.label}</b> <span className="muted small">{f.unit}</span>
                  </td>
                  <td className="mono">{fmt(pre.m, f.k, f.d)}</td>
                  <td className="mono muted">{fmt(ref.m, f.k, f.d)}</td>
                  <td className="mono">{f.k === 'ratio' ? '—' : `${((100 * pre.m[f.k]) / ref.m[f.k]).toFixed(0)} %`}</td>
                  {verPost && (
                    <>
                      <td className="mono">{fmt(post.m, f.k, f.d)}</td>
                      <td className="mono">
                        {f.k === 'ratio'
                          ? `${((post.m.ratio - pre.m.ratio) * 100).toFixed(0)} puntos`
                          : `${post.m[f.k] >= pre.m[f.k] ? '+' : ''}${((100 * (post.m[f.k] - pre.m[f.k])) / pre.m[f.k]).toFixed(0)} %`}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="small muted resp-foot">
            «Teórico» = el adulto sano del modelo. En la práctica se usan ecuaciones de referencia (GLI) según edad, sexo, talla y etnia, y el límite inferior de la normalidad (LIN) en vez de cortes fijos.
          </p>
        </div>
        <div className="resp-side">
          <div className={`spiro-interp ${interp.patron}`}>
            <h3>{interp.titulo}</h3>
            <ol>
              {interp.pasos.map((p, i) => (
                <li key={i}>
                  <span aria-hidden className="spiro-ico">
                    {p.ok === null ? 'ℹ' : p.ok ? '✔' : '✘'}
                  </span>
                  {p.texto}
                </li>
              ))}
            </ol>
            {interp.gravedad && (
              <p className="small">
                <b>Gravedad de la obstrucción:</b> {interp.gravedad}.
              </p>
            )}
            {interp.pruebaBd && (
              <p className={`small spiro-bd ${interp.pruebaBd.positiva ? 'pos' : ''}`}>
                <b>Prueba broncodilatadora:</b> {interp.pruebaBd.texto}
              </p>
            )}
            {post && !verPost && <p className="small muted">Activa «Tras broncodilatador» para hacer la prueba broncodilatadora.</p>}
          </div>
          <ul className="quiz-explain">
            {caso.explicacion.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
          <p className="sources small muted">
            Fuentes: García‑Río F et al. Normativa SEPAR de espirometría (Arch Bronconeumol, 2013); Graham BL et al. Estandarización de la espirometría ATS/ERS (2019); Stanojevic S
            et al. Estrategias de interpretación ERS/ATS (2022); GOLD; Manual MSD. Modelo simplificado; valores orientativos.
          </p>
        </div>
      </div>
    </section>
  );
}
