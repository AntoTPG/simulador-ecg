/**
 * Dibujo del ECG en Canvas 2D.
 * Se usan tres lienzos superpuestos para no redibujarlo todo en cada fotograma:
 *   1. fondo: papel milimetrado + trazado tenue completo (cambia poco);
 *   2. tinta: trazado "impreso" hasta el instante actual (se añade por trozos);
 *   3. cursor: línea vertical del instante actual (se borra en cada fotograma).
 */
import { ECG_PAPER } from '../config/ecgPaper';
import type { SimResult } from '../engine/simulate';
import { mod } from '../engine/math';
import type { EcgLayoutSpec, LeadBox } from './layout';

export interface EcgColors {
  bg: string;
  minor: string;
  major: string;
  trace: string;
  faded: string;
  compare: string;
  cursor: string;
  accent: string;
  label: string;
}

export function readColors(el: Element): EcgColors {
  const cs = getComputedStyle(el);
  const v = (n: string) => cs.getPropertyValue(n).trim();
  return {
    bg: v('--ecg-bg'),
    minor: v('--ecg-minor'),
    major: v('--ecg-major'),
    trace: v('--ecg-trace'),
    faded: v('--ecg-faded'),
    compare: v('--ecg-compare'),
    cursor: v('--ecg-cursor'),
    accent: v('--accent'),
    label: v('--ecg-label'),
  };
}

const S = ECG_PAPER.speedMmPerS / 1000; // mm por ms
const G = ECG_PAPER.gainMmPerMv; // mm por mV

export function drawPaper(ctx: CanvasRenderingContext2D, layout: EcgLayoutSpec, px: number, c: EcgColors) {
  const W = layout.widthMm * px;
  const H = layout.heightMm * px;
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, W, H);
  const lines = (step: number, color: string, width: number) => {
    ctx.beginPath();
    for (let x = 0; x <= layout.widthMm + 1e-6; x += step) {
      const X = Math.round(x * px) + 0.5;
      ctx.moveTo(X, 0);
      ctx.lineTo(X, H);
    }
    for (let y = 0; y <= layout.heightMm + 1e-6; y += step) {
      const Y = Math.round(y * px) + 0.5;
      ctx.moveTo(0, Y);
      ctx.lineTo(W, Y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  };
  if (px >= 2) lines(1, c.minor, 1); // cuadritos de 1 mm = 40 ms / 0,1 mV
  lines(5, c.major, 1); // cuadros de 5 mm = 200 ms / 0,5 mV
}

/** Pulso de calibración: 1 mV = 10 mm de alto, 5 mm (200 ms) de ancho. */
export function drawCalibration(ctx: CanvasRenderingContext2D, baseline: number, px: number, color: string) {
  const x0 = 1.5;
  const w = ECG_PAPER.calibrationWidthMm;
  ctx.beginPath();
  ctx.moveTo(x0 * px, baseline * px);
  ctx.lineTo((x0 + 1) * px, baseline * px);
  ctx.lineTo((x0 + 1) * px, (baseline - G) * px);
  ctx.lineTo((x0 + 1 + w) * px, (baseline - G) * px);
  ctx.lineTo((x0 + 1 + w) * px, baseline * px);
  ctx.lineTo((x0 + 2 + w) * px, baseline * px);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, px * 0.3);
  ctx.stroke();
}

/**
 * Dibuja el trazado de `box` entre los instantes relativos tFrom y tTo (ms
 * dentro de la caja). `offset` desplaza la ventana (modo simultáneo).
 */
export function drawTrace(
  ctx: CanvasRenderingContext2D,
  sim: SimResult,
  box: LeadBox,
  px: number,
  tFrom: number,
  tTo: number,
  offset: number,
) {
  const a = Math.max(box.t0, tFrom);
  const b = Math.min(box.t1, tTo);
  if (b <= a) return;
  const sig = sim.leads[box.lead];
  const fs = sim.sampleRate;
  const dt = 1000 / fs;
  const yMin = box.y - 4; // permitimos invadir un poco la fila vecina, como en el papel
  const yMax = box.y + box.h + 4;
  ctx.beginPath();
  let first = true;
  const i0 = Math.floor(a / dt);
  const i1 = Math.ceil(b / dt);
  for (let i = i0; i <= i1; i++) {
    const t = Math.min(b, Math.max(a, i * dt));
    const v = sig[mod(Math.round((t + offset) / dt), sim.n)];
    const x = (box.x + (t - box.t0) * S) * px;
    const y = Math.min(yMax, Math.max(yMin, box.baseline - v * G)) * px;
    if (first) {
      ctx.moveTo(x, y);
      first = false;
    } else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

export type LeadRole = 'afectada' | 'reciproca' | null;

export function drawLabel(
  ctx: CanvasRenderingContext2D,
  box: LeadBox,
  px: number,
  color: string,
  selected: boolean,
  accent: string,
  role: LeadRole = null,
) {
  const fs = Math.max(10, px * 3.2);
  ctx.font = `${selected || role ? 700 : 600} ${fs}px system-ui, sans-serif`;
  ctx.textBaseline = 'top';
  const text = box.rhythm ? `${box.lead} (ritmo)` : box.lead;
  const x = (box.x + 1) * px;
  const y = (box.y + 1) * px;
  // Derivaciones afectadas (rojo) y con cambios recíprocos (azul): etiqueta con fondo
  if (role && !box.rhythm) {
    const w = ctx.measureText(text).width;
    ctx.fillStyle = role === 'afectada' ? '#dc2626' : '#2563eb';
    ctx.fillRect(x - 3, y - 2, w + 6, fs + 3);
    ctx.fillStyle = '#ffffff';
  } else ctx.fillStyle = selected ? accent : color;
  ctx.fillText(text, x, y);
  if (selected) {
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(box.x * px + 1, box.y * px + 1, box.w * px - 2, box.h * px - 2);
  }
  // Marca de separación entre columnas (como en el papel impreso)
  if (!box.rhythm && box.t0 > 0) {
    ctx.beginPath();
    ctx.moveTo(box.x * px, (box.baseline - 3) * px);
    ctx.lineTo(box.x * px, (box.baseline + 3) * px);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

/** Posición x (px) del cursor en una caja para el instante relativo t, o null si no está en ella. */
export function cursorX(box: LeadBox, t: number, px: number): number | null {
  if (t < box.t0 || t > box.t1) return null;
  return (box.x + (t - box.t0) * S) * px;
}
