/**
 * BUCLES VECTOCARDIOGRÁFICOS: el recorrido que hace la punta del vector durante
 * un latido. Bucle P (pequeño, naranja), bucle QRS (grande, rosa) y bucle T
 * (azul). Un ECG es, literalmente, la "sombra" de estos bucles proyectada sobre
 * el eje de cada derivación.
 *
 * Se dibujan dos capas: el bucle completo del latido, tenue, y encima el tramo
 * ya recorrido, intenso, que crece a la vez que avanza la flecha.
 */
import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Color } from 'three';
import type { Line2 } from 'three-stdlib';
import { mod } from '../engine/math';
import { beatAt, sampleH, segmentAt } from '../engine/simulate';
import { clock } from '../store/clock';
import { useSim } from '../store/useSimStore';
import { PHASE_COLORS, toThree, VECTOR_SCALE } from './frames';

const STEP = 2; // ms entre puntos del bucle

export function LoopTrail() {
  const sim = useSim((s) => s.sim);
  const [beatIdx, setBeatIdx] = useState(0);
  const progress = useRef<Line2>(null);

  // Solo cambiamos de estado cuando empieza otro latido (no en cada fotograma)
  useEffect(() => {
    let current = -1;
    return clock.subscribe((t) => {
      const b = beatAt(sim, t).index;
      if (b !== current) {
        current = b;
        setBeatIdx(b);
      }
    });
  }, [sim]);

  const beat = sim.beats[beatIdx] ?? sim.beats[0];
  const { points, colors } = useMemo(() => {
    const pts: [number, number, number][] = [];
    const cols: Color[] = [];
    const base = new Color('#9aa0a6');
    for (let t = beat.start; t <= beat.end; t += STEP) {
      const v = toThree(sampleH(sim, t), VECTOR_SCALE);
      pts.push([v.x, v.y, v.z]);
      const k = segmentAt(sim, t)?.kind;
      cols.push(k && k !== 'PR' && k !== 'ST' ? new Color(PHASE_COLORS[k]) : base);
    }
    return { points: pts, colors: cols };
  }, [sim, beat]);

  // El tramo intenso solo dibuja los segmentos hasta el instante actual
  useFrame(() => {
    const l = progress.current;
    if (!l) return;
    const rel = mod(clock.t - beat.start, sim.duration);
    const n = Math.max(0, Math.min(points.length - 1, Math.floor(rel / STEP)));
    (l.geometry as unknown as { instanceCount: number }).instanceCount = n;
  });

  return (
    <group>
      <Line points={points} vertexColors={colors} lineWidth={1.4} transparent opacity={0.28} depthTest={false} renderOrder={8} />
      <Line ref={progress} points={points} vertexColors={colors} lineWidth={3.2} depthTest={false} renderOrder={9} />
    </group>
  );
}
