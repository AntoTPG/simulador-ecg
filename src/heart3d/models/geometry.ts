/** Construcción de superficies paramétricas del corazón procedural. */
import { BufferGeometry, Float32BufferAttribute, type Vector3 } from 'three';
import { RV_RANGE, rvSurface } from './anatomy';

/** Malla a partir de una función f(u, v) → punto, con u, v ∈ [0, 1]. */
export function parametricSurface(f: (u: number, v: number) => Vector3, nu: number, nv: number) {
  const pos: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= nv; j++)
    for (let i = 0; i <= nu; i++) {
      const p = f(i / nu, j / nv);
      pos.push(p.x, p.y, p.z);
    }
  const row = nu + 1;
  for (let j = 0; j < nv; j++)
    for (let i = 0; i < nu; i++) {
      const a = j * row + i;
      idx.push(a, a + 1, a + row, a + 1, a + row + 1, a + row);
    }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Pared libre del VD (media luna). `k` < 1 → superficie interna (cavidad). */
export function buildRvGeometry(k = 1, scaleOut = 1) {
  const [t0, t1] = RV_RANGE.theta;
  const [y0, y1] = RV_RANGE.y;
  return parametricSurface(
    (u, v) => {
      const p = rvSurface(y0 + (y1 - y0) * v, t0 + (t1 - t0) * u, k);
      return scaleOut === 1 ? p : p.multiplyScalar(scaleOut);
    },
    48,
    36,
  );
}
