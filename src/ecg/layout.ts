/**
 * Disposición de las derivaciones sobre el papel (todas las medidas en mm y ms).
 *
 *  - CLÁSICO (3×4 + tira de ritmo): como un ECG impreso. Cada columna muestra
 *    un cuarto consecutivo del registro (~2,5 s): I‑II‑III, aVR‑aVL‑aVF,
 *    V1‑V2‑V3, V4‑V5‑V6, y debajo II durante los ~10 s completos.
 *  - SIMULTÁNEO (misma rejilla): las 12 derivaciones muestran a la vez la MISMA
 *    ventana de tiempo. Más cómodo para comparar derivaciones latido a latido.
 */
import { ECG_PAPER } from '../config/ecgPaper';
import type { LeadName } from '../config/leads';

export interface LeadBox {
  lead: LeadName;
  /** Esquina superior izquierda y tamaño (mm). */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Línea de base (mm). */
  baseline: number;
  /** Ventana de tiempo que representa (ms, relativa a la ventana actual). */
  t0: number;
  t1: number;
  /** Si es la tira de ritmo larga. */
  rhythm?: boolean;
  /**
   * Si la caja muestra la VENTANA ACTUAL (modo simultáneo): sus tiempos son
   * relativos al inicio de la ventana, que avanza con el reloj.
   */
  windowed?: boolean;
}

export interface EcgLayoutSpec {
  kind: 'clasico' | 'simultaneo';
  widthMm: number;
  heightMm: number;
  boxes: LeadBox[];
  /** Líneas de base donde se dibuja la calibración de 1 mV. */
  calibrationRows: number[];
  /** Duración de la ventana dinámica (cajas `windowed`). */
  windowMs: number;
}


const msToMm = (ms: number) => (ms / 1000) * ECG_PAPER.speedMmPerS;

/**
 * Añade una fila con derivaciones extra (p. ej. V3R y V4R) al final. Cada una
 * ocupa una columna, igual que las precordiales.
 */
function addExtraRow(l: EcgLayoutSpec, extra: readonly LeadName[], colW: number, colMs: number, rowH: number, gap = 0) {
  if (!extra.length) return l;
  const y = l.heightMm - 2;
  extra.forEach((lead, c) =>
    l.boxes.push({
      lead,
      x: ECG_PAPER.marginLeftMm + c * (colW + gap),
      y,
      w: colW,
      h: rowH,
      baseline: y + rowH / 2,
      t0: l.kind === 'clasico' ? c * colMs : 0,
      t1: l.kind === 'clasico' ? (c + 1) * colMs : colMs,
    }),
  );
  l.calibrationRows.push(y + rowH / 2);
  l.heightMm += rowH;
  return l;
}

export function classicLayout(durationMs: number, extra: readonly LeadName[] = []): EcgLayoutSpec {
  const colMs = durationMs / 4;
  const colW = msToMm(colMs);
  const rowH = 30;
  const top = 2;
  const left = ECG_PAPER.marginLeftMm;
  const groups: LeadName[][] = [
    ['I', 'II', 'III'],
    ['aVR', 'aVL', 'aVF'],
    ['V1', 'V2', 'V3'],
    ['V4', 'V5', 'V6'],
  ];
  const boxes: LeadBox[] = [];
  groups.forEach((g, c) =>
    g.forEach((lead, r) =>
      boxes.push({
        lead,
        x: left + c * colW,
        y: top + r * rowH,
        w: colW,
        h: rowH,
        baseline: top + r * rowH + rowH / 2,
        t0: c * colMs,
        t1: (c + 1) * colMs,
      }),
    ),
  );
  boxes.push({
    lead: 'II',
    x: left,
    y: top + 3 * rowH,
    w: colW * 4,
    h: rowH,
    baseline: top + 3 * rowH + rowH / 2,
    t0: 0,
    t1: durationMs,
    rhythm: true,
  });
  return addExtraRow(
    {
      kind: 'clasico',
      widthMm: left + 4 * colW + 2,
      heightMm: top + 4 * rowH + 2,
      boxes,
      calibrationRows: [0, 1, 2, 3].map((r) => top + r * rowH + rowH / 2),
      windowMs: durationMs,
    },
    extra,
    colW,
    colMs,
    rowH,
  );
}

/**
 * SIMULTÁNEO: misma rejilla que el clásico (3×4 + tira de ritmo), pero las 12
 * derivaciones muestran la MISMA ventana de ~2,5 s, que avanza con el reloj.
 * Así se ve todo el corazón en el mismo instante, como en los electrocardiógrafos
 * que registran las 12 derivaciones a la vez. La tira de ritmo (II) sigue
 * mostrando los ~10 s completos.
 */
export function simultaneousLayout(durationMs: number, extra: readonly LeadName[] = []): EcgLayoutSpec {
  const base = classicLayout(durationMs, extra);
  const windowMs = durationMs / 4;
  return {
    ...base,
    kind: 'simultaneo',
    windowMs,
    boxes: base.boxes.map((b) => (b.rhythm ? b : { ...b, t0: 0, t1: windowMs, windowed: true })),
  };
}
