/**
 * Flecha del VECTOR CARDÍACO H(t). Sale del centro eléctrico del corazón y
 * cambia de dirección y longitud en cada instante: su longitud es el voltaje
 * instantáneo total y su dirección indica hacia dónde avanza, en promedio,
 * el frente de despolarización (o de repolarización).
 */
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { ConeGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, Quaternion, Vector3 } from 'three';
import { sampleH, segmentAt } from '../engine/simulate';
import { clock } from '../store/clock';
import { useSim } from '../store/useSimStore';
import { PHASE_COLORS, toThree, VECTOR_SCALE } from './frames';

const UP = new Vector3(0, 1, 0);
const HEAD = 0.28;

export function VectorArrow() {
  const group = useRef<Group>(null);
  const shaft = useRef<Mesh>(null);
  const head = useRef<Mesh>(null);
  const geo = useMemo(() => {
    const s = new CylinderGeometry(0.05, 0.05, 1, 14);
    s.translate(0, 0.5, 0); // la base del cilindro en el origen
    const h = new ConeGeometry(0.13, HEAD, 18);
    h.translate(0, HEAD / 2, 0);
    return { s, h };
  }, []);
  const mat = useMemo(() => new MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.35, depthTest: false }), []);
  const tmp = useMemo(() => ({ v: new Vector3(), q: new Quaternion() }), []);

  useFrame(() => {
    const sim = useSim.getState().sim;
    const h = sampleH(sim, clock.t);
    const v = toThree(h, VECTOR_SCALE, tmp.v);
    const len = v.length();
    const g = group.current!;
    if (len < 0.02) {
      g.visible = false;
      return;
    }
    g.visible = true;
    tmp.q.setFromUnitVectors(UP, v.clone().normalize());
    g.quaternion.copy(tmp.q);
    const headLen = Math.min(HEAD, len * 0.5);
    shaft.current!.scale.set(1, Math.max(0.001, len - headLen), 1);
    head.current!.position.set(0, len - headLen, 0);
    head.current!.scale.set(headLen / HEAD, headLen / HEAD, headLen / HEAD);
    // Color de la fase actual
    const kind = segmentAt(sim, clock.t)?.kind;
    const col = kind ? PHASE_COLORS[kind] : '#ffffff';
    mat.color.set(col);
    mat.emissive.set(col);
  });

  return (
    <group ref={group} renderOrder={10}>
      <mesh ref={shaft} geometry={geo.s} material={mat} renderOrder={10} />
      <mesh ref={head} geometry={geo.h} material={mat} renderOrder={10} />
      <mesh renderOrder={10}>
        <sphereGeometry args={[0.09, 16, 12]} />
        <meshStandardMaterial color="#ffffff" depthTest={false} />
      </mesh>
    </group>
  );
}
