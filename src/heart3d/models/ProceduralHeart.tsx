/**
 * Corazón estilizado y procedural. Implementa el "contrato" HeartModel
 * (ver HeartModel.ts).
 *
 * Novedades didácticas:
 *  - MAPA DE ACTIVACIÓN: el miocardio cambia de color a medida que lo alcanza
 *    el frente de despolarización y vuelve al reposo con la repolarización.
 *  - CONTRACCIÓN: la sístole mecánica sigue a la despolarización (acoplamiento
 *    excitación‑contracción): las aurículas se contraen tras la P y los
 *    ventrículos durante el ST‑T.
 */
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  BackSide,
  Color,
  DoubleSide,
  type Group,
  LatheGeometry,
  MeshStandardMaterial,
  type MeshStandardMaterialParameters,
  SphereGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import { mod } from '../../engine/math';
import { segmentAt } from '../../engine/simulate';
import { clock } from '../../store/clock';
import { useSim } from '../../store/useSimStore';
import { CLIP_PLANES } from '../clipping';
import {
  addActivationAttribute,
  atrialActivation,
  makeActivationUniforms,
  patchActivationMaterial,
  ventricularActivation,
} from './activation';
import { CONDUCTION, LA, LV_CENTER, LV_PROFILE, RA, VESSELS } from './anatomy';
import { Coronaries } from './Coronaries';
import { buildRvGeometry } from './geometry';
import { Territory } from './Territory';

function useMat(color: string, opts: MeshStandardMaterialParameters = {}) {
  return useMemo(
    () =>
      new MeshStandardMaterial({
        color,
        roughness: 0.45,
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

/** Centro de la contracción ventricular (marco local). */
const V_CENTER = new Vector3(0, -0.2, 0);
const A_CENTER = new Vector3(-0.2, 1.15, -0.3);

export function ProceduralHeart() {
  const opacity = useSim((s) => s.heartOpacity);
  const layers = useSim((s) => s.layers);

  const vU = useMemo(() => makeActivationUniforms('#b83a46'), []);
  const aU = useMemo(() => makeActivationUniforms('#c9606a'), []);

  const geo = useMemo(() => {
    const toLV = (p: Vector3) => p.clone().add(LV_CENTER);
    const lv = addActivationAttribute(new LatheGeometry(LV_PROFILE, 72), ventricularActivation, toLV);
    const rv = addActivationAttribute(buildRvGeometry(1), ventricularActivation);
    const la = addActivationAttribute(new SphereGeometry(1, 40, 28), atrialActivation, (p) =>
      p.clone().multiplyScalar(LA.r).add(LA.center),
    );
    const ra = addActivationAttribute(new SphereGeometry(1, 40, 28), atrialActivation, (p) =>
      p.clone().multiply(new Vector3(RA.r, RA.r * 1.15, RA.r)).add(RA.center),
    );
    return {
      lv,
      rv,
      la,
      ra,
      // Cavidades: el VI tiene una pared ~3 veces más gruesa que el VD
      lvCavity: new LatheGeometry(LV_PROFILE.map((p) => new Vector2(p.x * 0.68, p.y * 0.86)), 40),
      rvCavity: buildRvGeometry(0.55),
      aorta: new TubeGeometry(VESSELS.aorta.curve, 48, VESSELS.aorta.r, 20),
      pulmonar: new TubeGeometry(VESSELS.pulmonar.curve, 40, VESSELS.pulmonar.r, 20),
      vcs: new TubeGeometry(VESSELS.venaCavaSup.curve, 16, VESSELS.venaCavaSup.r, 16),
      vci: new TubeGeometry(VESSELS.venaCavaInf.curve, 16, VESSELS.venaCavaInf.r, 16),
      his: new TubeGeometry(CONDUCTION.his, 12, 0.035, 8),
      internodal: new TubeGeometry(CONDUCTION.internodal, 16, 0.02, 6),
      ramaIzq: new TubeGeometry(CONDUCTION.ramaIzq, 24, 0.03, 8),
      ramaDcha: new TubeGeometry(CONDUCTION.ramaDcha, 24, 0.03, 8),
      node: new SphereGeometry(0.075, 16, 12),
    };
  }, []);

  const ventricleMat = useMemo(() => {
    const m = new MeshStandardMaterial({
      color: '#b83a46',
      roughness: 0.42,
      metalness: 0.04,
      transparent: true,
      side: DoubleSide,
      clippingPlanes: CLIP_PLANES,
    });
    patchActivationMaterial(m, vU);
    return m;
  }, [vU]);
  const atriaMat = useMemo(() => {
    const m = new MeshStandardMaterial({
      color: '#c9606a',
      roughness: 0.5,
      transparent: true,
      side: DoubleSide,
      clippingPlanes: CLIP_PLANES,
    });
    patchActivationMaterial(m, aU);
    return m;
  }, [aU]);
  const cavityMat = useMat('#4a0f16', { side: BackSide });
  const aortaMat = useMat('#d0505c');
  const pulmMat = useMat('#5b7bd0');
  const veinMat = useMat('#4a5fa8');
  const condMat = useMat('#ffe08a', { emissive: new Color('#ffcf4a'), emissiveIntensity: 0.2, transparent: false });
  const saMat = useMat('#ffe08a', { emissive: new Color('#ffcf4a'), emissiveIntensity: 0.2, transparent: false });
  const avMat = useMat('#ffe08a', { emissive: new Color('#ffcf4a'), emissiveIntensity: 0.2, transparent: false });

  // Opacidad (transparente para ver el vector y la conducción dentro)
  for (const m of [ventricleMat, atriaMat, aortaMat, pulmMat, veinMat]) {
    m.opacity = opacity;
    m.depthWrite = opacity > 0.7;
  }
  cavityMat.opacity = Math.min(1, opacity * 1.2);
  cavityMat.depthWrite = false;

  const ventricles = useRef<Group>(null);
  const atria = useRef<Group>(null);
  const glow = useRef({ sa: 0, av: 0, his: 0 });

  useFrame(() => {
    const sim = useSim.getState().sim;
    const t = mod(clock.t, sim.duration);
    const seg = segmentAt(sim, t);
    const k = seg?.kind;
    const frac = seg ? (t - seg.start) / Math.max(1, seg.end - seg.start) : 0;

    // --- Estado eléctrico ventricular ---
    if (k === 'QRS') {
      vU.uDep.value = frac;
      vU.uRep.value = 0;
    } else if (k === 'ST') {
      vU.uDep.value = 2;
      vU.uRep.value = 0;
    } else if (k === 'T') {
      vU.uDep.value = 2;
      vU.uRep.value = frac * 1.1;
    } else {
      vU.uDep.value = -1;
      vU.uRep.value = 0;
    }
    // --- Estado eléctrico auricular (la repolarización auricular queda oculta en el QRS) ---
    if (k === 'P') aU.uDep.value = frac;
    else if (k === 'PR') aU.uDep.value = 2;
    else if (k === 'QRS') {
      aU.uDep.value = 2;
      aU.uRep.value = frac * 1.1;
    } else {
      aU.uDep.value = -1;
      aU.uRep.value = 0;
    }
    if (k !== 'QRS' && k !== 'PR' && k !== 'P') aU.uRep.value = 0;

    // --- Contracción (sístole) ---
    let vs = 0; // 0 = relajado, 1 = máxima contracción
    if (k === 'ST') vs = Math.min(1, frac * 2 + 0.3);
    else if (k === 'T') vs = 1 - Math.max(0, frac - 0.4) / 0.6;
    let as = 0;
    if (k === 'PR') as = Math.sin(Math.PI * frac);
    const sv = 1 - 0.06 * vs;
    ventricles.current?.scale.set(sv, 1 - 0.03 * vs, sv);
    const sa = 1 - 0.07 * as;
    atria.current?.scale.set(sa, sa, sa);

    // --- Sistema de conducción ---
    const target = {
      sa: k === 'P' && frac < 0.3 ? 1 : 0,
      av: k === 'PR' || (k === 'P' && frac > 0.6) ? 1 : 0,
      his: (k === 'QRS' && frac < 0.4) || (k === 'PR' && frac > 0.6) ? 1 : 0,
    };
    const g = glow.current;
    g.sa += (target.sa - g.sa) * 0.3;
    g.av += (target.av - g.av) * 0.3;
    g.his += (target.his - g.his) * 0.3;
    saMat.emissiveIntensity = 0.2 + 3 * g.sa;
    avMat.emissiveIntensity = 0.2 + 3 * g.av;
    condMat.emissiveIntensity = 0.2 + 2.5 * g.his;
  });

  return (
    <group>
      {/* Ventrículos (se contraen juntos alrededor de su centro) */}
      <group position={V_CENTER}>
        <group ref={ventricles}>
          <group position={V_CENTER.clone().negate()}>
            {/* VI: pared gruesa (mayor presión → más masa → domina el QRS) */}
            <mesh geometry={geo.lv} material={ventricleMat} position={LV_CENTER} renderOrder={2} />
            <mesh geometry={geo.lvCavity} material={cavityMat} position={LV_CENTER} renderOrder={1} />
            {/* VD: media luna de pared fina que abraza al VI */}
            <mesh geometry={geo.rv} material={ventricleMat} renderOrder={2} />
            <mesh geometry={geo.rvCavity} material={cavityMat} renderOrder={1} />
            {layers.coronarias && <Coronaries />}
            <Territory />
          </group>
        </group>
      </group>

      {/* Aurículas */}
      <group position={A_CENTER}>
        <group ref={atria}>
          <group position={A_CENTER.clone().negate()}>
            <mesh geometry={geo.la} material={atriaMat} position={LA.center} scale={LA.r} renderOrder={2} />
            <mesh geometry={geo.ra} material={atriaMat} position={RA.center} scale={[RA.r, RA.r * 1.15, RA.r]} renderOrder={2} />
          </group>
        </group>
      </group>

      {/* Grandes vasos */}
      <mesh geometry={geo.aorta} material={aortaMat} renderOrder={2} />
      <mesh geometry={geo.pulmonar} material={pulmMat} renderOrder={2} />
      <mesh geometry={geo.vcs} material={veinMat} renderOrder={2} />
      <mesh geometry={geo.vci} material={veinMat} renderOrder={2} />

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
