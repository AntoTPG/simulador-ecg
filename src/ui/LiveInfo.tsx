/**
 * Paneles que se actualizan con el reloj sin re-renderizar React
 * (se escribe directamente en el DOM con refs).
 */
import { useEffect, useRef } from 'react';
import { LEAD_INFO } from '../config/leads';
import { LEAD_UNIT, leadVoltage } from '../engine/leads';
import { dot, norm } from '../engine/math';
import { sampleH, segmentAt, type SegmentKind } from '../engine/simulate';
import { PHASE_COLORS } from '../heart3d/frames';
import { clock } from '../store/clock';
import { useSim } from '../store/useSimStore';

const PHASE_TEXT: Record<SegmentKind | 'TP', string> = {
  P: 'Onda P · despolarización auricular',
  PR: 'Segmento PR · retraso en el nodo AV',
  QRS: 'QRS · despolarización ventricular',
  ST: 'Segmento ST · meseta: todo el ventrículo despolarizado',
  T: 'Onda T · repolarización ventricular',
  U: 'Onda U · repolarización tardía',
  TP: 'Segmento TP · diástole eléctrica (reposo)',
};

/** Etiqueta con la fase eléctrica actual (sobre el 3D). */
export function PhaseBadge() {
  const ref = useRef<HTMLDivElement>(null);
  const sim = useSim((s) => s.sim);
  useEffect(() => {
    let last = '';
    const lesion = norm(sim.params.stVector) > 0.02;
    return clock.subscribe((t) => {
      const k = segmentAt(sim, t)?.kind ?? 'TP';
      if (k === last || !ref.current) return;
      last = k;
      ref.current.textContent =
        k === 'ST' && lesion ? 'Segmento ST · la flecha es el VECTOR DE LESIÓN (ST desplazado)' : PHASE_TEXT[k];
      ref.current.style.borderColor = k === 'TP' ? 'var(--border)' : PHASE_COLORS[k];
    });
  }, [sim]);
  return <div ref={ref} className="phase-badge" aria-live="off" />;
}

/**
 * Explica, en tiempo real, por qué la derivación seleccionada registra una
 * onda positiva, negativa o isoeléctrica.
 */
export function LeadInfoPanel() {
  const lead = useSim((s) => s.selectedLead);
  const sim = useSim((s) => s.sim);
  const select = useSim((s) => s.selectLead);
  const vRef = useRef<HTMLSpanElement>(null);
  const angRef = useRef<HTMLSpanElement>(null);
  const msgRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!lead) return;
    return clock.subscribe((t) => {
      const h = sampleH(sim, t);
      const v = leadVoltage(lead, h);
      const mag = norm(h);
      const cos = mag > 1e-6 ? dot(h, LEAD_UNIT[lead]) / mag : 0;
      const ang = (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
      if (vRef.current) {
        vRef.current.textContent = `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(2).replace('.', ',')} mV`;
        vRef.current.className = `mono volt ${v > 0.03 ? 'pos' : v < -0.03 ? 'neg' : ''}`;
      }
      if (angRef.current) angRef.current.textContent = mag < 0.03 ? '—' : `${ang.toFixed(0)}°`;
      if (msgRef.current) {
        let msg: string;
        if (mag < 0.03) msg = 'El vector es casi nulo (línea de base): no hay diferencias de potencial que registrar.';
        else if (v > 0.03)
          msg = `El vector apunta hacia el polo positivo de ${lead} (ángulo < 90°): el frente eléctrico se ACERCA al electrodo → deflexión POSITIVA.`;
        else if (v < -0.03)
          msg = `El vector apunta hacia el polo negativo de ${lead} (ángulo > 90°): el frente eléctrico se ALEJA del electrodo → deflexión NEGATIVA.`;
        else msg = `El vector es casi perpendicular al eje de ${lead} (≈ 90°): su proyección es ~0 → onda isodifásica o plana.`;
        msgRef.current.textContent = msg;
      }
    });
  }, [lead, sim]);

  if (!lead) {
    return (
      <div className="lead-info">
        <p className="muted">Pulsa una derivación en el ECG o una etiqueta del 3D para ver su proyección.</p>
      </div>
    );
  }
  const info = LEAD_INFO[lead];
  return (
    <div className="lead-info">
      <div className="lead-info-head">
        <strong className="lead-name">{lead}</strong>
        <span className="muted">
          {info.tipo} · {info.formula}
          {info.angulo !== undefined ? ` · ${info.angulo > 0 ? '+' : ''}${info.angulo}°` : ''}
        </span>
        <button className="btn btn-small" onClick={() => select(null)} aria-label="Quitar selección">
          ✕
        </button>
      </div>
      <div className="lead-info-live">
        <span>
          Voltaje: <span ref={vRef} className="mono volt" />
        </span>
        <span>
          Ángulo H–eje: <span ref={angRef} className="mono" />
        </span>
        <span className="muted">Mira la cara {info.cara}</span>
      </div>
      <p ref={msgRef} className="lead-msg" />
    </div>
  );
}
