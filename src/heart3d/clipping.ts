/**
 * Plano de corte FRONTAL compartido por todos los materiales del corazón.
 * Se recortan los puntos con  −z + c < 0, es decir, los que están por delante
 * de la profundidad c: así se "levanta" la pared anterior y se ve el interior.
 */
import { Plane, Vector3 } from 'three';

export const CUT_PLANE = new Plane(new Vector3(0, 0, -1), 100);
export const CLIP_PLANES = [CUT_PLANE];

export function setCut(depth: number | null) {
  CUT_PLANE.constant = depth === null ? 100 : depth;
}
