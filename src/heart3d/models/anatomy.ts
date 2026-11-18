/**
 * GEOMETRÍA DEL CORAZÓN PROCEDURAL (marco local del corazón)
 * ---------------------------------------------------------
 * Marco local: +y = base (hacia los grandes vasos), −y = ápex,
 * +z = cara anterior (esternocostal), −x = lado derecho del paciente.
 * Después todo el corazón se gira para colocarlo en su posición anatómica
 * (ver HEART_QUATERNION): el eje largo apunta hacia ABAJO, a la IZQUIERDA y
 * hacia DELANTE — por eso el ápex late en el 5.º espacio intercostal izquierdo.
 *
 * Los nombres de estructuras y territorios son los que usará el sistema de
 * patologías; un modelo glTF futuro solo tendrá que exponer los mismos nombres.
 */
import { CatmullRomCurve3, Quaternion, Vector2, Vector3 } from 'three';
import { toThree } from '../frames';

/** Perfil del VI (radio, altura) para LatheGeometry: forma de "bala" con el ápex abajo. */
export const LV_PROFILE = [
  [0, -1.75],
  [0.3, -1.62],
  [0.62, -1.3],
  [0.86, -0.8],
  [0.98, -0.25],
  [1.0, 0.2],
  [0.93, 0.6],
  [0.75, 0.88],
  [0.45, 1.02],
  [0, 1.06],
].map(([r, y]) => new Vector2(r, y));

/** Perfil del VD: más corto (no llega al ápex) y aplanado contra el VI. */
export const RV_PROFILE = [
  [0, -1.15],
  [0.35, -1.0],
  [0.62, -0.6],
  [0.78, -0.1],
  [0.8, 0.35],
  [0.7, 0.72],
  [0.45, 0.95],
  [0, 1.0],
].map(([r, y]) => new Vector2(r, y));

export const LV_CENTER = new Vector3(0.28, 0, -0.18);
export const RV_CENTER = new Vector3(-0.52, 0.12, 0.42);
/** El VD se aplana (escala z) y se gira para "abrazar" al VI por delante y a la derecha. */
export const RV_ROT_Y = Math.atan2(-0.8, 0.6);
export const RV_FLATTEN = 0.62;

export const LA = { center: new Vector3(0.4, 1.25, -0.62), r: 0.55 };
export const RA = { center: new Vector3(-0.8, 1.05, -0.05), r: 0.6 };

const v = (x: number, y: number, z: number) => new Vector3(x, y, z);
const curve = (pts: Vector3[]) => new CatmullRomCurve3(pts);

export const VESSELS = {
  aorta: { r: 0.24, curve: curve([v(0.05, 0.85, 0), v(0, 1.5, 0.05), v(0.1, 2.15, -0.05), v(0.5, 2.45, -0.45), v(0.85, 2.1, -0.85), v(0.9, 1.3, -0.95)]) },
  pulmonar: { r: 0.21, curve: curve([v(-0.35, 0.95, 0.55), v(-0.15, 1.6, 0.55), v(0.2, 2.0, 0.3), v(0.6, 2.0, -0.05), v(0.95, 1.85, -0.3)]) },
  venaCavaSup: { r: 0.18, curve: curve([v(-0.82, 1.5, -0.08), v(-0.82, 2.0, -0.1), v(-0.8, 2.55, -0.12)]) },
  venaCavaInf: { r: 0.2, curve: curve([v(-0.75, 0.6, -0.3), v(-0.7, 0.0, -0.45), v(-0.62, -0.5, -0.5)]) },
};

/** Radio del VI a la altura y (interpolando el perfil). */
function lvRadius(y: number): number {
  const p = LV_PROFILE;
  if (y <= p[0].y) return 0;
  for (let i = 1; i < p.length; i++) {
    if (y <= p[i].y) {
      const f = (y - p[i - 1].y) / (p[i].y - p[i - 1].y);
      return p[i - 1].x + f * (p[i].x - p[i - 1].x);
    }
  }
  return 0;
}

/**
 * Punto sobre la superficie del VI: altura y, ángulo θ (grados) alrededor del
 * eje largo (0° = izquierda/lateral, 90° = anterior, 180° = derecha/septo,
 * 270° = posterior/inferior) y separación `lift` sobre el epicardio.
 */
export function lvSurface(y: number, thetaDeg: number, lift = 0.07): Vector3 {
  const r = lvRadius(y) + lift;
  const t = (thetaDeg * Math.PI) / 180;
  return new Vector3(LV_CENTER.x + r * Math.cos(t), y, LV_CENTER.z + r * Math.sin(t));
}

const along = (pts: [number, number][]) => curve(pts.map(([y, th]) => lvSurface(y, th)));

/**
 * ÁRBOL CORONARIO (dominancia derecha, la más frecuente ~70–80 %).
 *  - Tronco común izquierdo (TCI) → DA + Cx.
 *  - DA (descendente anterior): surco interventricular anterior hasta el ápex;
 *    da diagonales (cara anterolateral) y septales (2/3 anteriores del tabique).
 *  - Cx (circunfleja): surco AV izquierdo hacia atrás; ramas marginales obtusas
 *    (cara lateral).
 *  - CD (coronaria derecha): surco AV derecho; marginal aguda (VD) y, en
 *    dominancia derecha, la descendente posterior (cara inferior, 1/3 posterior
 *    del tabique) y la arteria del nodo AV.
 */
export const CORONARIES: Record<string, { label: string; r: number; curve: CatmullRomCurve3 }> = {
  tci: { label: 'Tronco común izquierdo', r: 0.07, curve: curve([v(0.12, 0.95, -0.02), v(0.3, 1.0, 0.12), lvSurface(0.95, 70)]) },
  da: {
    label: 'Descendente anterior (DA)',
    r: 0.06,
    curve: along([[0.95, 70], [0.6, 88], [0.2, 92], [-0.3, 92], [-0.8, 88], [-1.25, 80], [-1.6, 60]]),
  },
  diagonal: { label: '1.ª diagonal', r: 0.04, curve: along([[0.35, 90], [0.0, 70], [-0.4, 50], [-0.8, 40]]) },
  cx: {
    label: 'Circunfleja (Cx)',
    r: 0.055,
    curve: along([[0.95, 70], [0.82, 40], [0.78, 0], [0.75, -40], [0.7, -80], [0.62, -110]]),
  },
  marginalObtusa: { label: 'Marginal obtusa', r: 0.04, curve: along([[0.78, 5], [0.3, 0], [-0.3, -5], [-0.9, -10]]) },
  cd: {
    label: 'Coronaria derecha (CD)',
    r: 0.06,
    curve: curve([
      v(-0.08, 0.88, 0.25),
      v(-0.45, 0.85, 0.72),
      v(-1.0, 0.72, 0.6),
      v(-1.32, 0.55, 0.05),
      v(-1.05, 0.45, -0.5),
      v(-0.55, 0.42, -0.85),
      lvSurface(0.42, 225),
    ]),
  },
  marginalAguda: { label: 'Marginal aguda', r: 0.04, curve: curve([v(-1.3, 0.58, 0.15), v(-1.25, 0.0, 0.3), v(-1.05, -0.6, 0.35)]) },
  dp: { label: 'Descendente posterior (DP)', r: 0.05, curve: along([[0.42, 225], [0.0, 215], [-0.5, 212], [-1.0, 215], [-1.4, 230]]) },
};

/**
 * SISTEMA DE CONDUCCIÓN: nodo sinusal → vías internodales → nodo AV → haz de
 * His → ramas derecha e izquierda → red de Purkinje (subendocárdica).
 */
export const CONDUCTION = {
  sinusal: v(-0.62, 1.55, 0.18),
  av: v(-0.15, 0.62, -0.05),
  his: curve([v(-0.15, 0.62, -0.05), v(-0.1, 0.45, 0.05), v(-0.08, 0.3, 0.08)]),
  ramaIzq: curve([v(-0.08, 0.3, 0.08), v(0.05, -0.3, 0.1), v(0.18, -1.0, 0.05), v(0.25, -1.45, -0.05)]),
  ramaDcha: curve([v(-0.08, 0.3, 0.08), v(-0.22, -0.2, 0.28), v(-0.35, -0.8, 0.35)]),
  internodal: curve([v(-0.62, 1.55, 0.18), v(-0.45, 1.05, 0.05), v(-0.15, 0.62, -0.05)]),
};

/**
 * Orientación anatómica: el eje largo (base→ápex) apunta a la izquierda,
 * abajo y adelante. En coordenadas del paciente ≈ (0,60; 0,55; 0,55).
 */
export const APEX_DIRECTION: [number, number, number] = [0.6, 0.55, 0.55];
export const HEART_QUATERNION = new Quaternion().setFromUnitVectors(
  new Vector3(0, -1, 0),
  toThree(APEX_DIRECTION).normalize(),
);
