/**
 * DIAGRAMA DE WIGGERS: presiones (VI, aorta y aurícula izquierda), volumen del
 * VI, ECG (II) y fonocardiograma de UN latido, con las fases del ciclo y los
 * cierres y aperturas valvulares. El cursor avanza con el reloj, sincronizado
 * con el ECG, el 3D y el sonido.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { mechPhaseAt, MECH_PHASE_LABEL, sampleCycle, type MechBeat } from '../engine/hemodynamics';
import { mod } from '../engine/math';
import { sampleSignal } from '../engine/simulate';
import { AUDIO_RATE, inspiration } from '../sounds/acoustics';
import { getCycleData } from '../sounds/cycleData';
import { clock } from '../store/clock';
import { useSim } from '../store/useSimStore';

const COL = { lv: '#e11d48', ao: '#2563eb', la: '#9333ea', vol: '#059669', ecg: '', pcg: '' };
const PHASES = [
  { k: 'civ', label: 'Contr. isovol.', c: 'rgba(225,29,72,0.22)' },
  { k: 'ey', label: 'Eyección', c: 'rgba(249,115,22,0.22)' },
  { k: 'riv', label: 'Relaj. isovol.', c: 'rgba(147,51,234,0.2)' },
  { k: 'll', label: 'Llenado rápido', c: 'rgba(37,99,235,0.18)' },
  { k: 'di', label: 'Diástasis', c: 'rgba(100,116,139,0.14)' },
  { k: 'sa', label: 'Sístole auric.', c: 'rgba(234,179,8,0.25)' },
] as const;

function css(el: Element, name: string) {
  return getComputedStyle(el).getPropertyValue(name).trim();
}

export function WiggersPanel() {
  const sim = useSim((s) => s.sim);
  const soundId = useSim((s) => s.soundId);
  const theme = useSim((s) => s.theme);
  const data = useMemo(() => getCycleData(sim, soundId), [sim, soundId]);
  const { cycle } = data;

  const wrapRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLCanvasElement>(null);
  const fgRef = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(600);
  const [beatIdx, setBeatIdx] = useState(0);
  const phaseRef = useRef<HTMLSpanElement>(null);
  const valsRef = useRef<HTMLSpanElement>(null);
  const respRef = useRef<HTMLSpanElement>(null);
  const H = 400;
  const dpr = Math.min(2, window.devicePixelRatio || 1);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const beat: MechBeat | undefined = cycle.beats[beatIdx] ?? cycle.beats[0];
  // Ventana: desde algo antes del QRS (para ver la sístole auricular) un ciclo completo
  const win = useMemo(() => {
    if (!beat) return { t0: 0, t1: 1000 };
    const t0 = beat.qrs - 200;
    return { t0, t1: t0 + (beat.end - beat.mc) };
  }, [beat]);

  // Geometría de los paneles
  const L = 46;
  const R = 10;
  const rows = { band: [0, 18], p: [24, 200], v: [210, 280], ecg: [290, 330], pcg: [338, 392] } as const;
  const X = (t: number) => L + ((t - win.t0) / (win.t1 - win.t0)) * (width - L - R);

  const prep = (c: HTMLCanvasElement | null) => {
    if (!c) return null;
    c.width = width * dpr;
    c.height = H * dpr;
    const ctx = c.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  };

  // ---------- Capa estática: curvas del latido ----------
  useEffect(() => {
    const ctx = prep(bgRef.current);
    if (!ctx || !beat || !wrapRef.current) return;
    const text = css(wrapRef.current, '--text');
    const muted = css(wrapRef.current, '--muted');
    const border = css(wrapRef.current, '--border');
    ctx.clearRect(0, 0, width, H);
    ctx.font = '600 10.5px system-ui, sans-serif';
    ctx.textBaseline = 'middle';

    // Escalas
    let pMax = 0;
    let vMin = Infinity;
    let vMax = 0;
    for (let t = win.t0; t <= win.t1; t += 4) {
      pMax = Math.max(pMax, sampleCycle(cycle, cycle.plv, t), sampleCycle(cycle, cycle.pla, t));
      const v = sampleCycle(cycle, cycle.vlv, t);
      vMin = Math.min(vMin, v);
      vMax = Math.max(vMax, v);
    }
    pMax = Math.max(140, Math.ceil((pMax + 10) / 20) * 20);
    vMin = Math.floor((vMin - 10) / 10) * 10;
    vMax = Math.ceil((vMax + 10) / 10) * 10;
    const Yp = (p: number) => rows.p[1] - (p / pMax) * (rows.p[1] - rows.p[0]);
    const Yv = (v: number) => rows.v[1] - ((v - vMin) / (vMax - vMin)) * (rows.v[1] - rows.v[0]);

    // Bandas de fase, sin solaparse: la sístole auricular "corta" la diástasis
    const cyc = beat.end - beat.mc;
    const atrialWins = [...beat.atrialInDiastole.map((x) => x - cyc), ...beat.atrialInDiastole].map((ta) => [ta - 80, ta + 60]);
    const raw: { a: number; b: number; i: number }[] = [
      { a: win.t0, b: beat.mc, i: 4 }, // final de la diástole anterior
      { a: beat.mc, b: beat.ao, i: 0 },
      { a: beat.ao, b: beat.ac, i: 1 },
      { a: beat.ac, b: beat.mo, i: 2 },
      { a: beat.mo, b: Math.min(beat.mo + 160, beat.end), i: 3 },
      { a: beat.mo + 160, b: beat.end, i: 4 },
    ];
    const phases: { a: number; b: number; i: number }[] = [];
    for (const r of raw) {
      if (r.i !== 4) {
        phases.push(r);
        continue;
      }
      let a = r.a;
      for (const [wa, wb] of atrialWins.filter(([wa, wb]) => wb > r.a && wa < r.b).sort((x, y) => x[0] - y[0])) {
        if (wa > a) phases.push({ a, b: wa, i: 4 });
        phases.push({ a: Math.max(wa, r.a), b: Math.min(wb, r.b), i: 5 });
        a = Math.min(wb, r.b);
      }
      if (a < r.b) phases.push({ a, b: r.b, i: 4 });
    }
    for (const ph of phases) {
      const a = Math.max(win.t0, ph.a);
      const b = Math.min(win.t1, ph.b);
      if (b <= a) continue;
      ctx.fillStyle = PHASES[ph.i].c;
      ctx.fillRect(X(a), rows.band[0], X(b) - X(a), rows.band[1] - rows.band[0]);
      ctx.fillRect(X(a), rows.p[0], X(b) - X(a), rows.p[1] - rows.p[0]);
      if (X(b) - X(a) > 46) {
        ctx.fillStyle = text;
        ctx.textAlign = 'center';
        ctx.fillText(PHASES[ph.i].label, (X(a) + X(b)) / 2, 9);
      }
    }

    // Ejes y cuadrícula
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.fillStyle = muted;
    ctx.textAlign = 'right';
    for (let p = 0; p <= pMax; p += 20) {
      ctx.beginPath();
      ctx.moveTo(L, Yp(p));
      ctx.lineTo(width - R, Yp(p));
      ctx.stroke();
      if (p % 40 === 0) ctx.fillText(String(p), L - 6, Yp(p));
    }
    for (const v of [vMin, (vMin + vMax) / 2, vMax]) ctx.fillText(String(Math.round(v)), L - 6, Yv(v));
    ctx.save();
    ctx.translate(11, (rows.p[0] + rows.p[1]) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Presión (mmHg)', 0, 0);
    ctx.restore();
    ctx.save();
    ctx.translate(11, (rows.v[0] + rows.v[1]) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Vol. VI (mL)', 0, 0);
    ctx.restore();
    ctx.textAlign = 'right';
    ctx.fillText('ECG II', L - 6, (rows.ecg[0] + rows.ecg[1]) / 2);
    ctx.fillText('Fono', L - 6, (rows.pcg[0] + rows.pcg[1]) / 2);

    // Curvas
    const curve = (arr: Float32Array, Y: (x: number) => number, color: string, w = 2.2, dash: number[] = []) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = w;
      ctx.setLineDash(dash);
      ctx.beginPath();
      for (let t = win.t0, first = true; t <= win.t1; t += 2) {
        const x = X(t);
        const y = Y(sampleCycle(cycle, arr, t));
        if (first) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        first = false;
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };
    curve(cycle.pla, Yp, COL.la, 1.8, [5, 3]);
    curve(cycle.pao, Yp, COL.ao, 2.4);
    curve(cycle.plv, Yp, COL.lv, 2.4);
    curve(cycle.vlv, Yv, COL.vol, 2.4);

    // Volúmenes VTD y VTS
    ctx.fillStyle = COL.vol;
    ctx.textAlign = 'left';
    ctx.fillText(`VTD ${Math.round(beat.edv)}`, X(beat.mc) + 4, Yv(beat.edv) - 8);
    ctx.fillText(`VTS ${Math.round(beat.esv)}  ·  FE ${Math.round(((beat.edv - beat.esv) / beat.edv) * 100)} %`, X(beat.ac) + 4, Yv(beat.esv) + 10);

    // ECG (II)
    ctx.strokeStyle = text;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    const ym = (rows.ecg[0] + rows.ecg[1]) / 2;
    for (let t = win.t0, first = true; t <= win.t1; t += 2) {
      const y = ym - sampleSignal(sim.leads.II, sim.sampleRate, t) * 14;
      if (first) ctx.moveTo(X(t), y);
      else ctx.lineTo(X(t), y);
      first = false;
    }
    ctx.stroke();

    // Fonocardiograma (envolvente del audio sintetizado)
    const audio = data.audio;
    const yc = (rows.pcg[0] + rows.pcg[1]) / 2;
    const hh = (rows.pcg[1] - rows.pcg[0]) / 2;
    ctx.fillStyle = muted;
    const cols = width - L - R;
    for (let px = 0; px < cols; px++) {
      const ta = win.t0 + (px / cols) * (win.t1 - win.t0);
      const tb = win.t0 + ((px + 1) / cols) * (win.t1 - win.t0);
      let mx = 0;
      for (let i = Math.floor((ta / 1000) * AUDIO_RATE); i < (tb / 1000) * AUDIO_RATE; i += 2)
        mx = Math.max(mx, Math.abs(audio[mod(i, audio.length)]));
      const h = Math.max(0.5, mx * hh);
      ctx.fillRect(L + px, yc - h, 1, 2 * h);
    }
    // Etiquetas de los ruidos
    ctx.fillStyle = text;
    ctx.textAlign = 'center';
    ctx.font = '700 10px system-ui, sans-serif';
    const placed: number[] = [];
    for (const e of data.events) {
      if (e.kind !== 'tono' || e.label === 'P2' || e.label === 'T1') continue;
      for (const k of [-1, 0, 1]) {
        const t = e.t + k * cycle.duration;
        if (t < win.t0 || t > win.t1) continue;
        const x = X(t) + 4;
        if (placed.some((p) => Math.abs(p - x) < 18)) continue;
        placed.push(x);
        ctx.fillText(e.label === 'A2' ? 'R2' : e.label, x, rows.pcg[0] - 1);
      }
    }

    // Eventos valvulares
    const ev = [
      { t: beat.mc, l: 'CM' },
      { t: beat.ao, l: 'AA' },
      { t: beat.ac, l: 'CA' },
      { t: beat.mo, l: 'AM' },
    ];
    ctx.font = '700 10px system-ui, sans-serif';
    for (const e of ev) {
      const x = X(e.t);
      ctx.strokeStyle = muted;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x, rows.p[0]);
      ctx.lineTo(x, rows.pcg[1]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = text;
      ctx.textAlign = 'center';
      ctx.fillText(e.l, x, rows.p[0] + 8);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycle, data, beat, win, width, theme, sim]);

  // ---------- Capa dinámica: cursor y valores ----------
  useEffect(() => {
    const ctx = prep(fgRef.current);
    if (!ctx || !wrapRef.current) return;
    const accent = css(wrapRef.current, '--accent');
    let lastBeat = beatIdx;
    // Latido cuya ventana [QRS − 200 ms, + un ciclo) contiene el instante t
    const windowBeat = (t: number) =>
      cycle.beats.findIndex((b) => mod(t - (b.qrs - 200), cycle.duration) < b.end - b.mc);
    return clock.subscribe((tAbs) => {
      // Cuando el cursor sale de la ventana, se pasa al latido siguiente
      let t = mod(tAbs, cycle.duration);
      const cand = [t, t + cycle.duration, t - cycle.duration].find((tt) => tt >= win.t0 && tt <= win.t1);
      if (cand === undefined) {
        const idx = windowBeat(t);
        if (idx >= 0 && idx !== lastBeat) {
          lastBeat = idx;
          setBeatIdx(idx);
        }
        return;
      }
      t = cand;
      ctx.clearRect(0, 0, width, H);
      const x = X(t);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, rows.band[0]);
      ctx.lineTo(x, rows.pcg[1]);
      ctx.stroke();

      const plv = sampleCycle(cycle, cycle.plv, t);
      const pao = sampleCycle(cycle, cycle.pao, t);
      const pla = sampleCycle(cycle, cycle.pla, t);
      const vol = sampleCycle(cycle, cycle.vlv, t);
      const ph = mechPhaseAt(cycle, t);
      if (phaseRef.current) phaseRef.current.textContent = ph ? MECH_PHASE_LABEL[ph] : '—';
      if (valsRef.current)
        valsRef.current.innerHTML = `<b style="color:${COL.lv}">VI ${Math.round(plv)}</b> · <b style="color:${COL.ao}">Ao ${Math.round(
          pao,
        )}</b> · <b style="color:${COL.la}">AI ${Math.round(pla)}</b> mmHg · <b style="color:${COL.vol}">${Math.round(vol)} mL</b>`;
      if (respRef.current) respRef.current.textContent = inspiration(t) > 0.05 ? 'Inspiración' : 'Espiración';
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycle, win, width, theme, beatIdx]);

  return (
    <section className="card wiggers-card" aria-label="Diagrama del ciclo cardíaco (Wiggers)">
      <div className="wiggers-head">
        <h2>Ciclo cardíaco (diagrama de Wiggers)</h2>
        <div className="wiggers-live">
          <span className="phase-chip" ref={phaseRef}>
            —
          </span>
          <span className="mono small" ref={valsRef} />
          <span className="resp-chip small" ref={respRef} title="La respiración (ciclo de 5 s) modifica el desdoblamiento del R2">
            —
          </span>
        </div>
      </div>
      <div className="wiggers-wrap" ref={wrapRef}>
        <canvas ref={bgRef} style={{ width, height: H }} />
        <canvas ref={fgRef} style={{ width, height: H }} />
      </div>
      <div className="wiggers-legend small">
        <span>
          <i style={{ background: COL.lv }} /> Presión VI
        </span>
        <span>
          <i style={{ background: COL.ao }} /> Presión aórtica
        </span>
        <span>
          <i className="dashed" style={{ borderColor: COL.la }} /> Presión aurícula izq.
        </span>
        <span>
          <i style={{ background: COL.vol }} /> Volumen VI
        </span>
        <span className="muted">CM/AM: cierre/apertura mitral · AA/CA: apertura/cierre aórtico</span>
      </div>
      <p className="sources small muted">
        Modelo hemodinámico de elaboración propia, simplificado, con las relaciones clásicas de la fisiología cardiovascular (Frank‑Starling, Windkessel, acoplamiento
        electromecánico). Valores orientativos.
      </p>
    </section>
  );
}
