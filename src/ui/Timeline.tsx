/**
 * Línea de tiempo del registro completo con las ondas marcadas (P, QRS, T…).
 * Arrastra para moverte por el ciclo: el ECG y el 3D se mueven a la vez.
 */
import { useEffect, useRef } from 'react';
import { PHASE_COLORS } from '../heart3d/frames';
import { clock } from '../store/clock';
import { useSim } from '../store/useSimStore';

export function Timeline() {
  const sim = useSim((s) => s.sim);
  const setPlaying = useSim((s) => s.setPlaying);
  const barRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);

  useEffect(
    () =>
      clock.subscribe((t) => {
        const f = (t % sim.duration) / sim.duration;
        if (cursorRef.current) cursorRef.current.style.left = `${f * 100}%`;
        if (timeRef.current) timeRef.current.textContent = `${((t % sim.duration) / 1000).toFixed(2).replace('.', ',')} s`;
      }),
    [sim],
  );

  const seekFromEvent = (e: React.PointerEvent) => {
    const r = barRef.current!.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    clock.seek(f * sim.duration);
  };

  return (
    <div className="timeline">
      <div
        ref={barRef}
        className="timeline-bar"
        role="slider"
        aria-label="Línea de tiempo del ciclo cardíaco"
        aria-valuemin={0}
        aria-valuemax={Math.round(sim.duration)}
        tabIndex={0}
        onPointerDown={(e) => {
          setPlaying(false);
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          seekFromEvent(e);
        }}
        onPointerMove={(e) => {
          if (e.buttons) seekFromEvent(e);
        }}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 100 : 10;
          if (e.key === 'ArrowRight') clock.seek((clock.t + step) % sim.duration);
          if (e.key === 'ArrowLeft') clock.seek((clock.t - step + sim.duration) % sim.duration);
        }}
      >
        {sim.segments
          .filter((s) => s.kind === 'P' || s.kind === 'QRS' || s.kind === 'T')
          .map((s, i) => (
            <div
              key={i}
              className={`tl-seg tl-${s.kind}`}
              style={{
                left: `${(s.start / sim.duration) * 100}%`,
                width: `${((s.end - s.start) / sim.duration) * 100}%`,
                background: PHASE_COLORS[s.kind],
              }}
            >
              <span>{s.kind}</span>
            </div>
          ))}
        <div ref={cursorRef} className="tl-cursor" />
      </div>
      <span ref={timeRef} className="tl-time mono">
        0,00 s
      </span>
    </div>
  );
}
