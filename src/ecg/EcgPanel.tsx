import { useEffect, useMemo, useRef, useState } from 'react';
import { ECG_PAPER } from '../config/ecgPaper';
import { mod } from '../engine/math';
import { clock } from '../store/clock';
import { useSim } from '../store/useSimStore';
import { classicLayout, simultaneousLayout } from './layout';
import { cursorX, drawCalibration, drawLabel, drawPaper, drawTrace, readColors } from './render';
import { sampleSignal } from '../engine/simulate';
import { resolvePathology } from '../engine/applyPathology';
import { getPathology } from '../pathologies/registry';

/**
 * Altura máxima del papel en escritorio: la ventana menos la cabecera, la
 * cabecera del ECG y el panel de controles fijo. En móvil no se limita (la
 * pestaña ECG tiene su propio scroll).
 */
function useAvailableHeight() {
  const calc = () => (window.innerWidth <= 900 ? Infinity : Math.max(300, window.innerHeight - 310));
  const [h, setH] = useState(calc);
  useEffect(() => {
    const on = () => setH(calc());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return h;
}

/** ECG de 12 derivaciones sincronizado con el reloj de la simulación. */
export function EcgPanel() {
  const sim = useSim((s) => s.sim);
  const ecgLayout = useSim((s) => s.ecgLayout);
  const theme = useSim((s) => s.theme);
  const selectedLead = useSim((s) => s.selectedLead);
  const selectLead = useSim((s) => s.selectLead);
  const normalSim = useSim((s) => s.normalSim);
  const compare = useSim((s) => s.compare);
  const pathologyId = useSim((s) => s.pathologyId);
  const levelIndex = useSim((s) => s.levelIndex);
  const pathology = getPathology(pathologyId);
  const { afectadas, reciprocas } = resolvePathology(pathology, levelIndex);
  const roleKey = `${afectadas.join(',')}|${reciprocas.join(',')}`;

  const wrapRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLCanvasElement>(null);
  const inkRef = useRef<HTMLCanvasElement>(null);
  const curRef = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(800);
  const maxHeight = useAvailableHeight();
  const [windowIdx, setWindowIdx] = useState(0);

  const extra = pathology.derivacionesExtra;
  const layout = useMemo(
    () => (ecgLayout === 'clasico' ? classicLayout(sim.duration, extra) : simultaneousLayout(sim.duration, extra)),
    [ecgLayout, sim.duration, extra],
  );
  // Escala del papel: cabe a lo ancho y, en escritorio, también a lo alto, para
  // que el ECG no quede debajo del panel de controles (el formato simultáneo,
  // con solo dos columnas, es mucho más alto que ancho).
  const fitW = width / layout.widthMm;
  const fitH = maxHeight / layout.heightMm;
  const px = Math.max(ECG_PAPER.minPxPerMm, Math.floor(Math.min(fitW, fitH) * 100) / 100);
  const cssW = Math.round(layout.widthMm * px);
  const cssH = Math.round(layout.heightMm * px);
  const dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;

  // Ancho disponible
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth - 2));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Prepara los tres lienzos con la resolución del dispositivo
  const prep = (c: HTMLCanvasElement | null) => {
    if (!c) return null;
    if (c.width !== cssW * dpr || c.height !== cssH * dpr) {
      c.width = cssW * dpr;
      c.height = cssH * dpr;
    }
    const ctx = c.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    return ctx;
  };

  // 1) FONDO: papel, calibración, etiquetas y trazado tenue
  useEffect(() => {
    const ctx = prep(bgRef.current);
    if (!ctx || !wrapRef.current) return;
    const colors = readColors(wrapRef.current);
    drawPaper(ctx, layout, px, colors);
    for (const b of layout.calibrationRows) drawCalibration(ctx, b, px, colors.trace);
    const offset = layout.kind === 'simultaneo' ? windowIdx * layout.windowMs : 0;
    // «Comparar con normal»: trazado sano superpuesto en otro color
    if (compare && sim !== normalSim) {
      ctx.strokeStyle = colors.compare;
      ctx.lineWidth = Math.max(1, px * 0.3);
      for (const box of layout.boxes) drawTrace(ctx, normalSim, box, px, box.t0, box.t1, offset);
    }
    // Con la comparación activa, el trazado patológico "futuro" se ve más para no confundirse con el sano
    ctx.strokeStyle = compare && sim !== normalSim ? colors.label : colors.faded;
    ctx.lineWidth = Math.max(1, px * 0.28);
    for (const box of layout.boxes) drawTrace(ctx, sim, box, px, box.t0, box.t1, offset);
    for (const box of layout.boxes) {
      const role = afectadas.includes(box.lead) ? 'afectada' : reciprocas.includes(box.lead) ? 'reciproca' : null;
      drawLabel(ctx, box, px, colors.label, box.lead === selectedLead, colors.accent, role);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim, normalSim, compare, roleKey, layout, px, theme, selectedLead, windowIdx, cssW, cssH]);

  // 2) y 3) TINTA progresiva y CURSOR, enganchados al reloj
  useEffect(() => {
    const ink = prep(inkRef.current);
    const cur = prep(curRef.current);
    if (!ink || !cur || !wrapRef.current) return;
    const colors = readColors(wrapRef.current);
    let lastRel = -1;
    let lastWin = -1;

    const unsub = clock.subscribe((tAbs) => {
      const t = mod(tAbs, sim.duration);
      const win = layout.kind === 'simultaneo' ? Math.floor(t / layout.windowMs) : 0;
      const offset = win * layout.windowMs;
      const rel = t - offset;
      if (layout.kind === 'simultaneo' && win !== windowIdx) setWindowIdx(win);

      ink.strokeStyle = colors.trace;
      ink.lineWidth = Math.max(1.2, px * 0.38);
      if (win !== lastWin || rel < lastRel) {
        // Nueva vuelta o salto atrás: se redibuja la tinta desde el principio
        ink.clearRect(0, 0, cssW, cssH);
        for (const box of layout.boxes) drawTrace(ink, sim, box, px, 0, rel, offset);
      } else if (rel > lastRel) {
        const from = Math.max(0, lastRel - 4);
        for (const box of layout.boxes) drawTrace(ink, sim, box, px, from, rel, offset);
      }
      lastRel = rel;
      lastWin = win;

      // Cursor
      cur.clearRect(0, 0, cssW, cssH);
      cur.strokeStyle = colors.cursor;
      cur.fillStyle = colors.cursor;
      cur.lineWidth = 1.5;
      for (const box of layout.boxes) {
        const x = cursorX(box, rel, px);
        if (x === null) continue;
        cur.beginPath();
        cur.moveTo(x, box.y * px);
        cur.lineTo(x, (box.y + box.h) * px);
        cur.stroke();
        const v = sampleSignal(sim.leads[box.lead], sim.sampleRate, t);
        const y = (box.baseline - v * ECG_PAPER.gainMmPerMv) * px;
        cur.beginPath();
        cur.arc(x, y, Math.max(2.5, px * 0.8), 0, Math.PI * 2);
        cur.fill();
      }
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim, layout, px, theme, cssW, cssH, windowIdx]);

  // Pinchar una derivación la selecciona (y la resalta en el 3D)
  const onPointerDown = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const xMm = (e.clientX - r.left) / px;
    const yMm = (e.clientY - r.top) / px;
    const box = layout.boxes.find((b) => xMm >= b.x && xMm <= b.x + b.w && yMm >= b.y && yMm <= b.y + b.h);
    if (box) selectLead(box.lead);
  };

  return (
    <div className="ecg-wrap" ref={wrapRef}>
      <div
        className="ecg-stack"
        style={{ width: cssW, height: cssH }}
        onPointerDown={onPointerDown}
        role="img"
        aria-label="Electrocardiograma de 12 derivaciones. Pulsa una derivación para seleccionarla."
      >
        <canvas ref={bgRef} style={{ width: cssW, height: cssH }} />
        <canvas ref={inkRef} style={{ width: cssW, height: cssH }} />
        <canvas ref={curRef} style={{ width: cssW, height: cssH }} />
      </div>
    </div>
  );
}
