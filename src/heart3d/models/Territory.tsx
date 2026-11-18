/**
 * TERRITORIO AFECTADO por la patología activa: segmentos AHA del VI, ventrículo
 * derecho o afectación difusa. Late suavemente para llamar la atención.
 */
import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import { DoubleSide, LatheGeometry, MeshBasicMaterial, Vector2 } from 'three';
import { getPathology } from '../../pathologies/registry';
import { useSim } from '../../store/useSimStore';
import { CLIP_PLANES } from '../clipping';
import { LV_CENTER, LV_PROFILE, lvRadius, RV_CENTER, RV_FLATTEN, RV_PROFILE, RV_ROT_Y } from './anatomy';
import { AHA_SEGMENTS } from './segments';

const deg = Math.PI / 180;

/** Trozo de la superficie del VI entre dos alturas y dos ángulos (un segmento AHA). */
function segmentGeometry(y: [number, number], theta: [number, number]) {
  const N = 10;
  const pts: Vector2[] = [];
  for (let i = 0; i <= N; i++) {
    const yy = y[0] + ((y[1] - y[0]) * i) / N;
    pts.push(new Vector2(lvRadius(yy) * 1.025 + 0.015, yy));
  }
  // LatheGeometry mide φ desde +z hacia +x; nuestro θ va desde +x hacia +z → φ = 90° − θ
  const phiStart = (90 - theta[1]) * deg;
  const phiLength = (theta[1] - theta[0]) * deg;
  return new LatheGeometry(pts, 16, phiStart, phiLength);
}

export function Territory() {
  const pathologyId = useSim((s) => s.pathologyId);
  const t3d = getPathology(pathologyId).territorio3D;

  const mat = useMemo(
    () =>
      new MeshBasicMaterial({
        color: '#ff2020',
        transparent: true,
        opacity: 0.55,
        side: DoubleSide,
        depthWrite: false,
        clippingPlanes: CLIP_PLANES,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
    [],
  );
  const diffuseMat = useMemo(
    () =>
      new MeshBasicMaterial({
        color: '#a855f7',
        transparent: true,
        opacity: 0.3,
        side: DoubleSide,
        depthWrite: false,
        clippingPlanes: CLIP_PLANES,
      }),
    [],
  );

  const geos = useMemo(() => {
    const segs = new Set(t3d?.segmentos ?? []);
    return AHA_SEGMENTS.filter((s) => segs.has(s.id)).map((s) => ({ id: s.id, g: segmentGeometry(s.y, s.theta) }));
  }, [t3d]);
  const rvGeo = useMemo(() => new LatheGeometry(RV_PROFILE.map((p) => new Vector2(p.x * 1.03 + 0.01, p.y)), 40), []);
  const lvGeo = useMemo(() => new LatheGeometry(LV_PROFILE.map((p) => new Vector2(p.x * 1.02 + 0.01, p.y)), 48), []);

  // Latido luminoso del territorio
  useFrame(({ clock }) => {
    const s = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 3);
    mat.opacity = 0.35 + 0.35 * s;
    diffuseMat.opacity = 0.15 + 0.15 * s;
  });

  if (!t3d) return null;
  const est = new Set(t3d.estructuras);
  return (
    <group>
      <group position={LV_CENTER}>
        {geos.map(({ id, g }) => (
          <mesh key={id} geometry={g} material={mat} renderOrder={4} />
        ))}
        {est.has('difuso') && <mesh geometry={lvGeo} material={diffuseMat} renderOrder={4} />}
      </group>
      {(est.has('vd') || est.has('difuso')) && (
        <group position={RV_CENTER} rotation={[0, RV_ROT_Y, 0]} scale={[1, 1, RV_FLATTEN]}>
          <mesh geometry={rvGeo} material={est.has('vd') ? mat : diffuseMat} renderOrder={4} />
        </group>
      )}
    </group>
  );
}
