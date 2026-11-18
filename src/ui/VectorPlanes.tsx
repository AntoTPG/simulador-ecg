/**
 * DIAGRAMAS 2D DEL VECTOR, como en los libros:
 *  - PLANO FRONTAL (sistema hexaxial): derivaciones de miembros. Visto de frente:
 *    la izquierda del paciente a la derecha de la pantalla, abajo = inferior.
 *  - PLANO HORIZONTAL (precordiales): visto desde los pies, con la cara anterior
 *    (el esternón) arriba y la izquierda del paciente a la derecha.
 * En cada uno se dibuja la proyección del bucle del latido, el vector actual y,
 * si la derivación seleccionada pertenece a ese plano, su "sombra" sobre el eje.
 */
import { useEffect, useMemo, useRef } from 'react';
import { LEAD_INFO, LEAD_NAMES, type LeadName } from '../config/leads';
import { LEAD_UNIT, leadVoltage } from '../engine/leads';
import { mod } from '../engine/math';
import { beatAt, sampleH, segmentAt } from '../engine/simulate';
import { PHASE_COLORS } from '../heart3d/frames';
import { clock } from '../store/clock';
import { useSim } from '../store/useSimStore';

type PlaneKind = 'frontal' | 'horizontal';

/** Proyección 2D (pantalla) de un vector del paciente en cada plano. */
const project = (plane: PlaneKind, v: readonly number[]): [number, number] =>
  plane === 'frontal' ? [v[0], v[1]] : [v[0], -v[2]];

const LEADS_OF: Record<PlaneKind, LeadName[]> = {
  frontal: LEAD_NAMES.filter((l) => LEAD_INFO[l].grupo === 'miembros'),
  horizontal: LEAD_NAMES.filter((l) => LEAD_INFO[l].grupo === 'precordial'),
};

function readVars(el: Element) {
  const cs = getComputedStyle(el);
  const v = (n: string) => cs.getPropertyValue(n).trim();
  return { text: v('--text'), muted: v('--muted'), border: v('--border'), accent: v('--accent'), pos: v('--pos'), neg: v('--neg'), surface: v('--surface-2') };
}

function PlaneCanvas({ plane, title, subtitle }: { plane: PlaneKind; title: string; subtitle: string }) {
  const sim = useSim((s) => s.sim);
  const selected = useSim((s) => s.selectedLead);
  const select = useSim((s) => s.selectLead);
  const theme = useSim((s) => s.theme);
  const ref = useRef<HTMLCanvasElement>(null);
  const labels = useRef<{ lead: LeadName; x: number; y: number }[]>([]);

  // Bucles de cada latido proyectados (se calculan una vez por simulación)
  const loops = useMemo(
    () =>
      sim.beats.map((b) => {
        const pts: { p: [number, number]; c: string }[] = [];
        for (let t = b.start; t <= b.end; t += 2) {
          const k = segmentAt(sim, t)?.kind;
          pts.push({ p: project(plane, sampleH(sim, t)), c: k && k !== 'PR' && k !== 'ST' ? PHASE_COLORS[k] : '#9aa0a6' });
        }
        return pts;
      }),
    [sim, plane],
  );

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d')!;
    const c = readVars(cv);
    let size = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      size = cv.clientWidth;
      cv.width = size * dpr;
      cv.height = size * dpr;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);

    const draw = (tAbs: number) => {
      if (!size) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      const cx = size / 2;
      const cy = size / 2;
      const R = size / 2 - 22;
      const K = R * 0.52; // px por mV
      const P = (x: number, y: number): [number, number] => [cx + x * K, cy + y * K];

      // Fondo: anillos
      ctx.strokeStyle = c.border;
      ctx.lineWidth = 1;
      for (const f of [0.5, 1]) {
        ctx.beginPath();
        ctx.arc(cx, cy, R * f, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Ejes de las derivaciones
      labels.current = [];
      ctx.font = '600 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const lead of LEADS_OF[plane]) {
        const [ux, uy] = project(plane, LEAD_UNIT[lead]);
        const n = Math.hypot(ux, uy) || 1;
        const dx = ux / n;
        const dy = uy / n;
        const isSel = lead === selected;
        ctx.strokeStyle = isSel ? c.accent : c.muted;
        ctx.globalAlpha = isSel ? 1 : 0.55;
        ctx.lineWidth = isSel ? 2.5 : 1;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + dx * R, cy + dy * R);
        ctx.stroke();
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx - dx * R, cy - dy * R);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        const lx = cx + dx * (R + 12);
        const ly = cy + dy * (R + 12);
        ctx.fillStyle = isSel ? c.accent : c.text;
        ctx.fillText(lead, lx, ly);
        labels.current.push({ lead, x: lx, y: ly });
      }

      // Bucle del latido actual (tenue completo + intenso hasta ahora)
      const sim = useSim.getState().sim;
      const beat = beatAt(sim, tAbs);
      const loop = loops[beat.index] ?? loops[0];
      const rel = mod(tAbs - beat.start, sim.duration);
      const nNow = Math.min(loop.length - 1, Math.floor(rel / 2));
      ctx.lineCap = 'round';
      for (let i = 1; i < loop.length; i++) {
        const a = P(...loop[i - 1].p);
        const b = P(...loop[i].p);
        ctx.strokeStyle = loop[i].c;
        ctx.globalAlpha = i <= nNow ? 0.95 : 0.2;
        ctx.lineWidth = i <= nNow ? 2.2 : 1.2;
        ctx.beginPath();
        ctx.moveTo(...a);
        ctx.lineTo(...b);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Vector actual
      const h = sampleH(sim, tAbs);
      const [hx, hy] = project(plane, h);
      const [tx, ty] = P(hx, hy);
      const kind = segmentAt(sim, tAbs)?.kind;
      const col = kind ? PHASE_COLORS[kind] : c.text;

      // Proyección sobre la derivación seleccionada (si es de este plano)
      if (selected && LEADS_OF[plane].includes(selected)) {
        const [ux, uy] = project(plane, LEAD_UNIT[selected]);
        const n = Math.hypot(ux, uy) || 1;
        const dx = ux / n;
        const dy = uy / n;
        const d = hx * dx + hy * dy; // longitud de la sombra (mV en el plano)
        const [fx, fy] = P(d * dx, d * dy);
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = c.muted;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(fx, fy);
        ctx.stroke();
        ctx.setLineDash([]);
        const v = leadVoltage(selected, h);
        ctx.strokeStyle = v >= 0 ? c.pos : c.neg;
        ctx.lineWidth = 6;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(fx, fy);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Flecha
      const len = Math.hypot(tx - cx, ty - cy);
      if (len > 2) {
        const ang = Math.atan2(ty - cy, tx - cx);
        ctx.strokeStyle = col;
        ctx.fillStyle = col;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(tx - Math.cos(ang) * 6, ty - Math.sin(ang) * 6);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx - Math.cos(ang - 0.4) * 11, ty - Math.sin(ang - 0.4) * 11);
        ctx.lineTo(tx - Math.cos(ang + 0.4) * 11, ty - Math.sin(ang + 0.4) * 11);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = c.text;
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();
    };

    const unsub = clock.subscribe(draw);
    return () => {
      unsub();
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loops, selected, theme, plane]);

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    let best: { lead: LeadName; d: number } | null = null;
    for (const l of labels.current) {
      const d = Math.hypot(l.x - x, l.y - y);
      if (d < 22 && (!best || d < best.d)) best = { lead: l.lead, d };
    }
    if (best) select(best.lead);
  };

  return (
    <figure className="plane-card">
      <figcaption>
        <b>{title}</b>
        <span>{subtitle}</span>
      </figcaption>
      <canvas ref={ref} className="plane-canvas" onClick={onClick} aria-label={`Diagrama del ${title}. Pulsa una derivación para seleccionarla.`} />
    </figure>
  );
}

export function VectorPlanes() {
  return (
    <div className="planes">
      <PlaneCanvas plane="frontal" title="Plano frontal" subtitle="derivaciones de miembros · de frente" />
      <PlaneCanvas plane="horizontal" title="Plano horizontal" subtitle="precordiales · desde los pies" />
    </div>
  );
}
