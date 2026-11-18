/**
 * Paso de coordenadas del PACIENTE (x izquierda, y inferior, z anterior) a las
 * de three.js (x derecha de la pantalla, y arriba, z hacia el observador).
 *
 * Miramos al paciente de frente (como en el plano frontal de los libros):
 *   - su izquierda queda a NUESTRA derecha  → x_three =  x
 *   - lo inferior queda abajo               → y_three = −y
 *   - lo anterior viene hacia nosotros      → z_three =  z
 */
import { Vector3 } from 'three';
import type { Vec3 } from '../engine/math';

export const toThree = (v: Readonly<Vec3>, k = 1, out = new Vector3()) => out.set(v[0] * k, -v[1] * k, v[2] * k);

/** Unidades de escena por mV del vector cardíaco. */
export const VECTOR_SCALE = 1.7;
/** Radio de los ejes de las derivaciones de miembros (plano frontal). */
export const LIMB_AXIS_R = 4.4;
/** Radio de los ejes precordiales (plano horizontal) y posición de los electrodos V. */
export const CHEST_AXIS_R = 3.4;
/** Radio de los electrodos de miembros (vértices del triángulo de Einthoven). */
export const LIMB_ELECTRODE_R = 5.1;

/** Colores de cada fase, compartidos entre el ECG, la línea de tiempo y el 3D. */
export const PHASE_COLORS = {
  P: '#e09a1a',
  PR: '#9aa0a6',
  QRS: '#d6336c',
  ST: '#9aa0a6',
  T: '#2f80ed',
  U: '#8e44ad',
} as const;
