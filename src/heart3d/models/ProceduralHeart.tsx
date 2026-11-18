/**
 * Corazón estilizado y procedural. Implementa el "contrato" HeartModel
 * (ver HeartModel.ts): recibe opacidad, plano de corte y nivel de actividad
 * eléctrica de cada estructura, y se ilumina en consecuencia.
 */
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { BackSide, Color, DoubleSide, LatheGeometry, MeshStandardMaterial, type MeshStandardMaterialParameters, SphereGeometry, TubeGeometry, Vector2 } from 'three';
import { clock } from '../../store/clock';
import { useSim } from '../../store/useSimStore';
import { segmentAt } from '../../engine/simulate';
import { CLIP_PLANES } from '../clipping';
import { Coronaries } from './Coronaries';
import { Territory } from './Territory';
import { CONDUCTION, LA, LV_CENTER, LV_PROFILE, RA, RV_CENTER, RV_FLATTEN, RV_PROFILE, RV_ROT_Y, VESSELS } from './anatomy';

const DEPOL = new Color('#ffcf4a'); // brillo de despolarización
const REPOL = new Color('#6fb6ff'); // brillo de repolarización

function useMat(color: string, opts: MeshStandardMaterialParameters = {}) {
  return useMemo(
    () =>
      new MeshStandardMaterial({
        color,
        roughness: 0.55,
        metalness: 0.05,
        transparent: true,
        side: DoubleSide,
        clippingPlanes: CLIP_PLANES,
        ...opts,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
}

export function ProceduralHeart() {
  const opacity = useSim((s) => s.heartOpacity);
  const layers = useSim((s) => s.layers);

  const geo = useMemo(
    () => ({
      lv: new LatheGeometry(LV_PROFILE, 56),
      // Cavidades: el VI tiene una pared ~3 veces más gruesa que el VD
      lvCavity: new LatheGeometry(LV_PROFILE.map((p) => new Vector2(p.x * 0.68, p.y * 0.86)), 40),
      rv: new LatheGeometry(RV_PROFILE, 48),
      rvCavity: new LatheGeometry(RV_PROFILE.map((p) => new Vector2(p.x * 0.82, p.y * 0.9)), 40),
      sphere: new SphereGeometry(1, 40, 28),
      aorta: new TubeGeometry(VESSELS.aorta.curve, 48, VESSELS.aorta.r, 20),
      pulmonar: new TubeGeometry(VESSELS.pulmonar.curve, 40, VESSELS.pulmonar.r, 20),
      vcs: new TubeGeometry(VESSELS.venaCavaSup.curve, 16, VESSELS.venaCavaSup.r, 16),
      vci: new TubeGeometry(VESSELS.venaCavaInf.curve, 16, VESSELS.venaCavaInf.r, 16),
      his: new TubeGeometry(CONDUCTION.his, 12, 0.035, 8),
      internodal: new TubeGeometry(CONDUCTION.internodal, 16, 0.02, 6),
      ramaIzq: new TubeGeometry(CONDUCTION.ramaIzq, 24, 0.03, 8),
      ramaDcha: new TubeGeometry(CONDUCTION.ramaDcha, 24, 0.03, 8),
      node: new SphereGeometry(0.075, 16, 12),
    }),
    [],
  );

  const ventricleMat = useMat('#b8404a');
  const atriaMat = useMat('#cf6a70');
  const cavityMat = useMat('#5a1218', { side: BackSide });
  const aortaMat = useMat('#c94550');
  const pulmMat = useMat('#5875c4');
  const veinMat = useMat('#4a5fa8');
  const condMat = useMat('#ffe08a', { emissive: new Color('#ffcf4a'), emissiveIntensity: 0.2, transparent: false });
  const saMat = useMat('#ffe08a', { emissive: new Color('#ffcf4a'), emissiveIntensity: 0.2, transparent: false });
  const avMat = useMat('#ffe08a', { emissive: new Color('#ffcf4a'), emissiveIntensity: 0.2, transparent: false });

  // Opacidad del miocardio (transparente para ver el vector dentro)
  for (const m of [ventricleMat, atriaMat, aortaMat, pulmMat, veinMat]) {
    m.opacity = opacity;
    m.depthWrite = opacity > 0.95;
  }
  cavityMat.opacity = Math.min(1, opacity * 1.2);
  cavityMat.depthWrite = false;

  // Iluminación según la fase eléctrica: aurículas en la P, ventrículos en el
  // QRS (despolarización, amarillo) y en la T (repolarización, azul).
  const smooth = useRef({ a: 0, v: 0, r: 0, sa: 0, av: 0, his: 0 });
  useFrame(() => {
    const sim = useSim.getState().sim;
    const seg = segmentAt(sim, clock.t);
    const k = seg?.kind;
    let frac = 0;
    if (seg) frac = (((clock.t % sim.duration) - seg.start) / Math.max(1, seg.end - seg.start));
    const target = {
      a: k === 'P' ? 1 : 0,
      v: k === 'QRS' ? 1 : 0,
      r: k === 'T' ? 1 : 0,
      sa: k === 'P' && frac < 0.3 ? 1 : 0,
      av: k === 'PR' || (k === 'P' && frac > 0.6) ? 1 : 0,
      his: k === 'QRS' && frac < 0.45 ? 1 : k === 'PR' && frac > 0.6 ? 1 : 0,
    };
    const s = smooth.current;
    const a = 0.25;
    (Object.keys(s) as (keyof typeof s)[]).forEach((key) => (s[key] += (target[key] - s[key]) * a));

    atriaMat.emissive.copy(DEPOL);
    atriaMat.emissiveIntensity = 0.55 * s.a;
    if (s.r > s.v) {
      ventricleMat.emissive.copy(REPOL);
      ventricleMat.emissiveIntensity = 0.3 * s.r;
    } else {
      ventricleMat.emissive.copy(DEPOL);
      ventricleMat.emissiveIntensity = 0.5 * s.v;
    }
    saMat.emissiveIntensity = 0.2 + 2.5 * s.sa;
    avMat.emissiveIntensity = 0.2 + 2.5 * s.av;
    condMat.emissiveIntensity = 0.2 + 2.0 * s.his;
  });

  return (
    <group>
      {/* Ventrículo izquierdo: pared gruesa (mayor presión → más masa → domina el QRS) */}
      <mesh geometry={geo.lv} material={ventricleMat} position={LV_CENTER} renderOrder={2} />
      <mesh geometry={geo.lvCavity} material={cavityMat} position={LV_CENTER} renderOrder={1} />
      {/* Ventrículo derecho: pared fina, por delante y a la derecha */}
      <group position={RV_CENTER} rotation={[0, RV_ROT_Y, 0]} scale={[1, 1, RV_FLATTEN]}>
        <mesh geometry={geo.rv} material={ventricleMat} renderOrder={2} />
        <mesh geometry={geo.rvCavity} material={cavityMat} renderOrder={1} />
      </group>
      {/* Aurículas */}
      <mesh geometry={geo.sphere} material={atriaMat} position={LA.center} scale={LA.r} renderOrder={2} />
      <mesh geometry={geo.sphere} material={atriaMat} position={RA.center} scale={[RA.r, RA.r * 1.15, RA.r]} renderOrder={2} />
      {/* Grandes vasos */}
      <mesh geometry={geo.aorta} material={aortaMat} renderOrder={2} />
      <mesh geometry={geo.pulmonar} material={pulmMat} renderOrder={2} />
      <mesh geometry={geo.vcs} material={veinMat} renderOrder={2} />
      <mesh geometry={geo.vci} material={veinMat} renderOrder={2} />

      {layers.coronarias && <Coronaries />}
      <Territory />

      {layers.conduccion && (
        <group>
          <mesh geometry={geo.node} material={saMat} position={CONDUCTION.sinusal} scale={1.3} />
          <mesh geometry={geo.node} material={avMat} position={CONDUCTION.av} />
          <mesh geometry={geo.internodal} material={saMat} />
          <mesh geometry={geo.his} material={condMat} />
          <mesh geometry={geo.ramaIzq} material={condMat} />
          <mesh geometry={geo.ramaDcha} material={condMat} />
        </group>
      )}
    </group>
  );
}
