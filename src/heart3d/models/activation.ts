/**
 * MAPA DE ACTIVACIÓN ELÉCTRICA
 * ============================
 * A cada vértice del miocardio le asignamos el MOMENTO en que lo alcanza el
 * frente de despolarización (fracción 0–1 de la onda P o del QRS). Durante la
 * animación, los vértices ya activados cambian de color y el FRENTE (la zona que
 * se está activando ahora mismo) brilla. Así se ve que el vector cardíaco apunta
 * hacia donde avanza, en promedio, ese frente.
 *
 * Orden de activación ventricular (Durrer et al., 1970, simplificado):
 *   1. Tabique medio, lado izquierdo (rama izquierda) → de izquierda a derecha.
 *   2. Zonas paraseptales del VI y endocardio del VD; ápex.
 *   3. Paredes libres, del endocardio al epicardio.
 *   4. Últimas: bases posterolaterales del VI y tracto de salida del VD.
 * La REPOLARIZACIÓN va aproximadamente en orden inverso (lo último en
 * despolarizarse, con potencial de acción más corto, se repolariza antes):
 * por eso la T es concordante con el QRS.
 */
import { BufferAttribute, type BufferGeometry, Color, type MeshStandardMaterial, Vector3 } from 'three';
import { CONDUCTION } from './anatomy';

/** Puntos de salida de la red de Purkinje: posición (marco local) y retraso (fracción del QRS). */
const VENTRICULAR_SITES: { p: Vector3; t0: number }[] = [
  { p: new Vector3(-0.05, 0.1, 0.08), t0: 0.0 }, // tabique medio izquierdo
  { p: new Vector3(0.25, -0.3, 0.45), t0: 0.08 }, // VI anterior paraseptal
  { p: new Vector3(0.3, -0.2, -0.55), t0: 0.1 }, // VI posterior paraseptal
  { p: new Vector3(-0.55, -0.45, 0.55), t0: 0.12 }, // VD (banda moderadora)
  { p: new Vector3(0.22, -1.45, 0.0), t0: 0.16 }, // ápex
];
/** "Velocidad" de propagación por el miocardio (unidades de escena por fracción de QRS). */
const V_SPEED = 2.0;
const A_SPEED = 2.4;

export function ventricularActivation(p: Vector3): number {
  let t = Infinity;
  for (const s of VENTRICULAR_SITES) t = Math.min(t, s.t0 + p.distanceTo(s.p) / V_SPEED);
  return Math.min(0.98, t);
}

export function atrialActivation(p: Vector3): number {
  return Math.min(0.98, p.distanceTo(CONDUCTION.sinusal) / A_SPEED);
}

/**
 * Añade a una geometría el atributo `aAct` (momento de activación de cada
 * vértice). `toLocal` transforma la posición del vértice al marco del corazón
 * (para mallas desplazadas o escaladas).
 */
export function addActivationAttribute(
  geo: BufferGeometry,
  fn: (p: Vector3) => number,
  toLocal: (p: Vector3) => Vector3 = (p) => p,
) {
  const pos = geo.getAttribute('position');
  const arr = new Float32Array(pos.count);
  const v = new Vector3();
  for (let i = 0; i < pos.count; i++) arr[i] = fn(toLocal(v.fromBufferAttribute(pos, i)));
  geo.setAttribute('aAct', new BufferAttribute(arr, 1));
  return geo;
}

export interface ActivationUniforms {
  /** Progreso del frente de despolarización (−1 = en reposo; > 1 = todo despolarizado). */
  uDep: { value: number };
  /** Progreso de la repolarización (0 = no ha empezado, > 1 = terminada). */
  uRep: { value: number };
  uRestColor: { value: Color };
  uDepColor: { value: Color };
  uFrontColor: { value: Color };
}

export const makeActivationUniforms = (rest: string): ActivationUniforms => ({
  uDep: { value: -1 },
  uRep: { value: 0 },
  uRestColor: { value: new Color(rest) },
  uDepColor: { value: new Color('#ffb347') },
  uFrontColor: { value: new Color('#fff6c2') },
});

/**
 * Modifica un MeshStandardMaterial para colorear según la activación:
 *  - reposo (polarizado): color del músculo;
 *  - despolarizado: ámbar;
 *  - frente de onda: banda luminosa;
 *  - repolarización: vuelve al color de reposo en orden inverso.
 */
export function patchActivationMaterial(mat: MeshStandardMaterial, u: ActivationUniforms) {
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aAct;\nvarying float vAct;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAct = aAct;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         varying float vAct;
         uniform float uDep; uniform float uRep;
         uniform vec3 uRestColor; uniform vec3 uDepColor; uniform vec3 uFrontColor;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         // ¿Despolarizado? (ya le llegó el frente)
         float dep = smoothstep(vAct - 0.02, vAct + 0.02, uDep);
         // ¿Repolarizado? (orden inverso: 1 − tiempo de activación)
         float rep = smoothstep((1.0 - vAct) - 0.05, (1.0 - vAct) + 0.05, uRep);
         float state = dep * (1.0 - rep);
         vec3 col = mix(uRestColor, uDepColor, state);
         // Banda luminosa del frente de despolarización
         float front = 1.0 - smoothstep(0.0, 0.06, abs(uDep - vAct));
         col = mix(col, uFrontColor, front * step(-0.5, uDep) * step(uDep, 1.05));
         diffuseColor.rgb = col;`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         totalEmissiveRadiance += uFrontColor * front * 0.9 * step(-0.5, uDep) * step(uDep, 1.05);
         totalEmissiveRadiance += uDepColor * state * 0.18;`,
      );
  };
  mat.customProgramCacheKey = () => 'activation';
  mat.needsUpdate = true;
}
