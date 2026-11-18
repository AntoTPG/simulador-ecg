/**
 * PROYECCIÓN DEL VECTOR SOBRE LA DERIVACIÓN SELECCIONADA
 * Lo que registra una derivación es la "sombra" de H sobre su eje:
 *   V = L · H = |L| · |H| · cos(ángulo)
 * Si la sombra cae sobre la mitad positiva (el vector "se acerca" al
 * electrodo) la onda es positiva; si cae sobre la negativa, es negativa.
 */
import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Mesh, Vector3 } from 'three';
import type { Line2 } from 'three-stdlib';
import { LEAD_UNIT } from '../engine/leads';
import { sampleH } from '../engine/simulate';
import { clock } from '../store/clock';
import { useSim } from '../store/useSimStore';
import { toThree, VECTOR_SCALE } from './frames';

export function ProjectionHelper() {
  const lead = useSim((s) => s.selectedLead);
  const shadow = useRef<Line2>(null);
  const drop = useRef<Line2>(null);
  const foot = useRef<Mesh>(null);
  const tmp = useMemo(() => ({ v: new Vector3(), u: new Vector3() }), []);

  useFrame(() => {
    if (!lead || !shadow.current || !drop.current || !foot.current) return;
    const sim = useSim.getState().sim;
    const v = toThree(sampleH(sim, clock.t), VECTOR_SCALE, tmp.v);
    const u = toThree(LEAD_UNIT[lead], 1, tmp.u);
    const d = v.dot(u);
    const f = u.clone().multiplyScalar(d);
    shadow.current.geometry.setPositions([0, 0, 0, f.x, f.y, f.z]);
    drop.current.geometry.setPositions([v.x, v.y, v.z, f.x, f.y, f.z]);
    drop.current.computeLineDistances();
    foot.current.position.copy(f);
    const col = d >= 0 ? '#16a34a' : '#dc2626';
    (shadow.current.material as unknown as { color: { set: (c: string) => void } }).color.set(col);
    (foot.current.material as unknown as { color: { set: (c: string) => void } }).color.set(col);
  });

  if (!lead) return null;
  return (
    <group renderOrder={11}>
      <Line ref={shadow} points={[[0, 0, 0], [0, 0, 0.001]]} color="#16a34a" lineWidth={7} depthTest={false} renderOrder={11} />
      <Line ref={drop} points={[[0, 0, 0], [0, 0, 0.001]]} color="#ffffff" lineWidth={1.2} dashed dashSize={0.08} gapSize={0.06} depthTest={false} renderOrder={11} />
      <mesh ref={foot} renderOrder={11}>
        <sphereGeometry args={[0.1, 14, 10]} />
        <meshBasicMaterial color="#16a34a" depthTest={false} />
      </mesh>
    </group>
  );
}
