/**
 * ÁRBOL CORONARIO. Si la patología activa afecta a unas arterias, estas se
 * resaltan; si hay una oclusión, se marca el trombo y el tramo distal aparece
 * oscuro (sin flujo), que es lo que deja sin riego al territorio.
 */
import { Html } from '@react-three/drei';
import { useMemo } from 'react';
import { CatmullRomCurve3, Color, MeshStandardMaterial, TubeGeometry } from 'three';
import { getPathology } from '../../pathologies/registry';
import { useSim } from '../../store/useSimStore';
import { CLIP_PLANES } from '../clipping';
import { CORONARIES } from './anatomy';

const mat = (color: string, emissive: string, intensity: number) =>
  new MeshStandardMaterial({ color, emissive: new Color(emissive), emissiveIntensity: intensity, roughness: 0.4, clippingPlanes: CLIP_PLANES });

/** Tramo de una curva entre t0 y t1 como curva nueva. */
function subCurve(c: CatmullRomCurve3, t0: number, t1: number) {
  const pts = Array.from({ length: 16 }, (_, i) => c.getPointAt(t0 + ((t1 - t0) * i) / 15));
  return new CatmullRomCurve3(pts);
}

export function Coronaries() {
  const pathologyId = useSim((s) => s.pathologyId);
  const t3d = getPathology(pathologyId).territorio3D;
  const mats = useMemo(
    () => ({
      normal: mat('#ff4436', '#a01208', 0.5),
      afectada: mat('#ffb020', '#ff7a00', 0.9),
      sinFlujo: mat('#3b3438', '#000000', 0),
      trombo: mat('#1a1a1a', '#550000', 0.6),
    }),
    [],
  );

  const parts = useMemo(() => {
    const affected = new Set<string>(t3d?.arterias ?? []);
    const occ = t3d?.oclusion;
    return Object.entries(CORONARIES).flatMap(([k, c]) => {
      const m = affected.has(k) ? mats.afectada : mats.normal;
      if (occ && occ.arteria === k) {
        const t = Math.max(0.02, Math.min(0.98, occ.t));
        return [
          { key: `${k}-a`, g: new TubeGeometry(subCurve(c.curve, 0, t), 24, c.r, 10), m },
          { key: `${k}-b`, g: new TubeGeometry(subCurve(c.curve, t, 1), 48, c.r * 0.85, 10), m: mats.sinFlujo },
        ];
      }
      return [{ key: k, g: new TubeGeometry(c.curve, 64, c.r, 10), m }];
    });
  }, [t3d, mats]);

  const occ = t3d?.oclusion;
  const occPos = occ ? CORONARIES[occ.arteria].curve.getPointAt(occ.t) : null;

  return (
    <group>
      {parts.map((p) => (
        <mesh key={p.key} geometry={p.g} material={p.m} renderOrder={3} />
      ))}
      {occPos && occ && (
        <group position={occPos}>
          <mesh material={mats.trombo} renderOrder={5}>
            <sphereGeometry args={[CORONARIES[occ.arteria].r * 2.3, 16, 12]} />
          </mesh>
          <Html center position={[0, 0.3, 0]} zIndexRange={[15, 0]}>
            <span className="occlusion-label">Oclusión · {CORONARIES[occ.arteria].label}</span>
          </Html>
        </group>
      )}
    </group>
  );
}
