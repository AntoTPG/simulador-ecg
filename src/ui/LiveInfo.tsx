/**
 * Elementos que se actualizan con el reloj sin re-renderizar React
 * (se escribe directamente en el DOM con refs).
 */
import { useEffect, useRef } from 'react';
import { LEAD_INFO } from '../config/leads';
import { LEAD_UNIT, leadVoltage } from '../engine/leads';
import { dot, mod, norm } from '../engine/math';
import { beatAt, sampleH, segmentAt, type SegmentKind } from '../engine/simulate';
import { PHASE_COLORS } from '../heart3d/frames';
import { ventricularRate } from '../engine/measure';
import { clock } from '../store/clock';
import { useSim } from '../store/useSimStore';

type Phase = SegmentKind | 'TP';

const STEPS: { k: Phase; label: string; desc: string }[] = [
  { k: 'P', label: 'P', desc: 'Despolarización auricular: el impulso sale del nodo sinusal y recorre las aurículas.' },
  { k: 'PR', label: 'PR', desc: 'Retraso en el nodo AV: las aurículas terminan de llenar los ventrículos.' },
  { k: 'QRS', label: 'QRS', desc: 'Despolarización ventricular: septo → ápex → paredes libres → bases.' },
  { k: 'ST', label: 'ST', desc: 'Meseta: todo el ventrículo está despolarizado y no hay diferencias de potencial.' },
  { k: 'T', label: 'T', desc: 'Repolarización ventricular: del epicardio al endocardio (por eso la T es positiva).' },
  { k: 'TP', label: 'TP', desc: 'Reposo eléctrico (diástole): el corazón se llena.' },
];

/** Línea de fases P → PR → QRS → ST → T → TP con la activa resaltada. */
export function PhaseStepper() {
  const sim = useSim((s) => s.sim);
  const rootRef = useRef<HTMLDivElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    let last = '';
    const lesion = norm(sim.params.stVector) > 0.02;
    return clock.subscribe((t) => {
      let k: Phase = segmentAt(sim, t)?.kind ?? 'TP';
      if (k === 'U') k = 'TP';
      if (k === last || !rootRef.current) return;
      last = k;
      rootRef.current.querySelectorAll<HTMLElement>('.step').forEach((el) => {
        const on = el.dataset.k === k;
        el.classList.toggle('is-on', on);
        el.style.setProperty('--c', k === 'TP' || k === 'PR' || k === 'ST' ? 'var(--muted)' : PHASE_COLORS[k as 'P']);
      });
      const step = STEPS.find((s) => s.k === k)!;
      if (descRef.current)
        descRef.current.textContent =
          k === 'ST' && lesion
            ? 'ST desplazado: la flecha que ves ahora es el VECTOR DE LESIÓN.'
            : step.desc;
    });
  }, [sim]);

  /** Lleva el reloj al inicio de esa fase en el latido actual (o el siguiente) y pausa. */
  const goTo = (k: Phase) => {
    const s = useSim.getState();
    const t = mod(clock.t, sim.duration);
    const beat = beatAt(sim, t).index;
    let target: number | null = null;
    if (k === 'TP') {
      const tSeg = sim.segments.find((x) => x.kind === 'T' && x.beat === beat) ?? sim.segments.find((x) => x.kind === 'T');
      if (tSeg) target = tSeg.end + 30;
    } else {
      const seg =
        sim.segments.find((x) => x.kind === k && x.beat === beat) ??
        sim.segments.find((x) => x.kind === k && x.start > t) ??
        sim.segments.find((x) => x.kind === k);
      if (seg) target = seg.start + Math.min(8, (seg.end - seg.start) / 3);
    }
    if (target === null) return;
    s.setPlaying(false);
    clock.seek(mod(target, sim.duration));
  };

  return (
    <div className="phase-stepper" ref={rootRef}>
      <div className="steps">
        {STEPS.map((s) => (
          <button key={s.k} className="step" data-k={s.k} onClick={() => goTo(s.k)} title={`Ir a ${s.label} (pausa)`}>
            {s.label}
          </button>
        ))}
      </div>
      <p ref={descRef} className="step-desc" />
    </div>
  );
}

/** Frecuencia cardíaca con un corazón que late en cada QRS. */
export function HeartRateBadge() {
  const sim = useSim((s) => s.sim);
  const hr = ventricularRate(sim);
  const heartRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let wasQrs = false;
    return clock.subscribe((t) => {
      const isQrs = segmentAt(sim, t)?.kind === 'QRS';
      if (isQrs && !wasQrs && heartRef.current) {
        const el = heartRef.current;
        el.classList.remove('beat');
        void el.offsetWidth; // reinicia la animación
        el.classList.add('beat');
      }
      wasQrs = isQrs;
    });
  }, [sim]);
  return (
    <div className="hr-badge" title="Frecuencia cardíaca">
      <span ref={heartRef} className="hr-heart" aria-hidden>
        ♥
      </span>
      <b className="mono">{hr}</b>
      <span className="muted small">lpm</span>
    </div>
  );
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
  const barRef = useRef<HTMLDivElement>(null);
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
      if (barRef.current) {
        const f = Math.max(-1, Math.min(1, v / 2));
        barRef.current.style.left = f >= 0 ? '50%' : `${50 + f * 50}%`;
        barRef.current.style.width = `${Math.abs(f) * 50}%`;
        barRef.current.className = `gauge-fill ${v >= 0 ? 'pos' : 'neg'}`;
      }
      if (angRef.current) angRef.current.textContent = mag < 0.03 ? '—' : `${ang.toFixed(0)}°`;
      if (msgRef.current) {
        let msg: string;
        if (mag < 0.03) msg = 'Vector casi nulo (línea de base): no hay diferencias de potencial que registrar.';
        else if (v > 0.03) msg = `El vector apunta hacia el polo + de ${lead} (ángulo < 90°): el frente se ACERCA al electrodo → onda POSITIVA.`;
        else if (v < -0.03) msg = `El vector apunta hacia el polo − de ${lead} (ángulo > 90°): el frente se ALEJA del electrodo → onda NEGATIVA.`;
        else msg = `El vector es casi perpendicular al eje de ${lead} (≈ 90°): proyección ~0 → onda isodifásica o plana.`;
        msgRef.current.textContent = msg;
      }
    });
  }, [lead, sim]);

  if (!lead) {
    return (
      <div className="lead-info card">
        <p className="muted">Pulsa una derivación (en el ECG, en los diagramas o en el 3D) para ver por qué su onda es positiva o negativa.</p>
      </div>
    );
  }
  const info = LEAD_INFO[lead];
  return (
    <div className="lead-info card">
      <div className="lead-info-head">
        <strong className="lead-name">{lead}</strong>
        <div className="lead-meta">
          <span>{info.tipo}</span>
          <span className="muted">
            {info.formula}
            {info.angulo !== undefined ? ` · ${info.angulo > 0 ? '+' : ''}${info.angulo}°` : ''} · mira la cara {info.cara}
          </span>
        </div>
        <button className="icon-btn" onClick={() => select(null)} aria-label="Quitar selección">
          ✕
        </button>
      </div>
      <div className="gauge" aria-hidden>
        <div className="gauge-mid" />
        <div ref={barRef} className="gauge-fill" />
      </div>
      <div className="lead-info-live">
        <span>
          Voltaje <span ref={vRef} className="mono volt" />
        </span>
        <span>
          Ángulo vector–eje <span ref={angRef} className="mono" />
        </span>
      </div>
      <p ref={msgRef} className="lead-msg" />
    </div>
  );
}
