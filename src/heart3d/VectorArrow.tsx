/**
 * Flecha del VECTOR CARDÍACO H(t). Sale del centro eléctrico del corazón y
 * cambia de dirección y longitud en cada instante: su longitud es el voltaje
 * instantáneo total y su dirección indica hacia dónde avanza, en promedio,
 * el frente de despolarización (o de repolarización).
 * Lleva un halo luminoso para que se distinga sobre el corazón.
 */
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, ConeGeometry, CylinderGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Quaternion, Vector3 } from 'three';
import { sampleH, segmentAt } from '../engine/simulate';
import { clock } from '../store/clock';
import { useSim } from '../store/useSimStore';
import { PHASE_COLORS, toThree, VECTOR_SCALE } from './frames';

const UP = new Vector3(0, 1, 0);
const HEAD = 0.36;

export function VectorArrow() {
  const group = useRef<Group>(null);
  const shaft = useRef<Mesh>(null);
  const head = useRef<Mesh>(null);
  const halo = useRef<Mesh>(null);
  const geo = useMemo(() => {
    const s = new CylinderGeometry(0.07, 0.07, 1, 16);
    s.translate(0, 0.5, 0); // la base del cilindro en el origen
    const hl = new CylinderGeometry(0.17, 0.17, 1, 16, 1, true);
    hl.translate(0, 0.5, 0);
    const h = new ConeGeometry(0.2, HEAD, 24);
    h.translate(0, HEAD / 2, 0);
    return { s, h, hl };
  }, []);
  const mat = useMemo(
    () => new MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.55, depthTest: false, transparent: true }),
    [],
  );
  const haloMat = useMemo(
    () => new MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.22, depthTest: false, blending: AdditiveBlending }),
    [],
  );
  const tmp = useMemo(() => ({ v: new Vector3(), d: new Vector3(), q: new Quaternion() }), []);

  useFrame(() => {
    const sim = useSim.getState().sim;
    const h = sampleH(sim, clock.t);
    const v = toThree(h, VECTOR_SCALE, tmp.v);
    const len = v.length();
    const g = group.current!;
    if (len < 0.03) {
      g.visible = false;
      return;
    }
    g.visible = true;
    tmp.q.setFromUnitVectors(UP, tmp.d.copy(v).normalize());
    g.quaternion.copy(tmp.q);
    const headLen = Math.min(HEAD, len * 0.45);
    const sLen = Math.max(0.001, len - headLen);
    shaft.current!.scale.set(1, sLen, 1);
    halo.current!.scale.set(1, sLen, 1);
    head.current!.position.set(0, sLen, 0);
    const hs = headLen / HEAD;
    head.current!.scale.set(Math.max(0.5, hs), hs, Math.max(0.5, hs));
    // Color de la fase actual
    const kind = segmentAt(sim, clock.t)?.kind;
    const col = kind ? PHASE_COLORS[kind] : '#ffffff';
    mat.color.set(col);
    mat.emissive.set(col);
    haloMat.color.set(col);
  });

  return (
    <group ref={group} renderOrder={10}>
      <mesh ref={halo} geometry={geo.hl} material={haloMat} renderOrder={10} />
      <mesh ref={shaft} geometry={geo.s} material={mat} renderOrder={11} />
      <mesh ref={head} geometry={geo.h} material={mat} renderOrder={11} />
      <mesh renderOrder={11}>
        <sphereGeometry args={[0.12, 16, 12]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.4} depthTest={false} />
      </mesh>
    </group>
  );
}
