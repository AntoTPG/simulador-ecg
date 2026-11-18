/**
 * BUCLES VECTOCARDIOGRÁFICOS: el recorrido que hace la punta del vector durante
 * un latido. Bucle P (pequeño, naranja), bucle QRS (grande, rosa) y bucle T
 * (azul). Un ECG es, literalmente, la "sombra" de estos bucles proyectada sobre
 * el eje de cada derivación.
 */
import { Line } from '@react-three/drei';
import { useEffect, useMemo, useState } from 'react';
import { Color } from 'three';
import { beatAt, sampleH, segmentAt } from '../engine/simulate';
import { clock } from '../store/clock';
import { useSim } from '../store/useSimStore';
import { PHASE_COLORS, toThree, VECTOR_SCALE } from './frames';

export function LoopTrail() {
  const sim = useSim((s) => s.sim);
  const [beatIdx, setBeatIdx] = useState(0);

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

  const { points, colors } = useMemo(() => {
    const beat = sim.beats[beatIdx] ?? sim.beats[0];
    const pts: [number, number, number][] = [];
    const cols: Color[] = [];
    const base = new Color('#888888');
    for (let t = beat.start; t <= beat.end; t += 2) {
      const v = toThree(sampleH(sim, t), VECTOR_SCALE);
      pts.push([v.x, v.y, v.z]);
      const k = segmentAt(sim, t)?.kind;
      cols.push(k && k !== 'PR' && k !== 'ST' ? new Color(PHASE_COLORS[k]) : base);
    }
    return { points: pts, colors: cols };
  }, [sim, beatIdx]);

  return <Line points={points} vertexColors={colors} lineWidth={2.2} transparent opacity={0.9} depthTest={false} renderOrder={9} />;
}
