/**
 * ECG de 12 derivaciones ESTÁTICO, como uno impreso: el registro entero de una
 * vez, sin cursor ni animación. Es el formato en que se ven los ECG en los
 * exámenes. Usa las mismas funciones de dibujo que el ECG del simulador.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { LeadName } from '../config/leads';
import { ECG_PAPER } from '../config/ecgPaper';
import type { SimResult } from '../engine/simulate';
import { classicLayout } from '../ecg/layout';
import { drawCalibration, drawLabel, drawPaper, drawTrace, readColors } from '../ecg/render';
import { useSim } from '../store/useSimStore';

interface Props {
  sim: SimResult;
  /** Derivaciones extra (V3R, V4R) que lleva esta patología. */
  extra?: readonly LeadName[];
  /** Trazado sano que se superpone en otro color (tras responder). */
  compareSim?: SimResult | null;
  /** Derivaciones marcadas en rojo (afectadas) y azul (recíprocas). */
  afectadas?: readonly string[];
  reciprocas?: readonly string[];
}

export function StaticEcg({ sim, extra = [], compareSim = null, afectadas = [], reciprocas = [] }: Props) {
  const theme = useSim((s) => s.theme);
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(800);

  const layout = useMemo(() => classicLayout(sim.duration, extra), [sim.duration, extra]);
  const px = Math.max(ECG_PAPER.minPxPerMm, Math.floor((width / layout.widthMm) * 100) / 100);
  const cssW = Math.round(layout.widthMm * px);
  const cssH = Math.round(layout.heightMm * px);
  const roles = `${afectadas.join(',')}|${reciprocas.join(',')}`;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth - 2));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !wrapRef.current) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = cssW * dpr;
    c.height = cssH * dpr;
    const ctx = c.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const colors = readColors(wrapRef.current);
    drawPaper(ctx, layout, px, colors);
    for (const b of layout.calibrationRows) drawCalibration(ctx, b, px, colors.trace);
    if (compareSim) {
      ctx.strokeStyle = colors.compare;
      ctx.lineWidth = Math.max(1, px * 0.3);
      for (const box of layout.boxes) drawTrace(ctx, compareSim, box, px, box.t0, box.t1, 0);
    }
    ctx.strokeStyle = colors.trace;
    ctx.lineWidth = Math.max(1.2, px * 0.36);
    for (const box of layout.boxes) drawTrace(ctx, sim, box, px, box.t0, box.t1, 0);
    for (const box of layout.boxes) {
      const role = afectadas.includes(box.lead) ? 'afectada' : reciprocas.includes(box.lead) ? 'reciproca' : null;
      drawLabel(ctx, box, px, colors.label, false, colors.accent, role);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim, compareSim, layout, px, cssW, cssH, theme, roles]);

  return (
    <div className="ecg-wrap quiz-ecg" ref={wrapRef}>
      <canvas ref={canvasRef} style={{ width: cssW, height: cssH }} role="img" aria-label="Electrocardiograma de 12 derivaciones de la pregunta" />
    </div>
  );
}
