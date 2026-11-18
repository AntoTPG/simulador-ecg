/**
 * Utilidades matemáticas del motor.
 *
 * SISTEMA DE COORDENADAS DEL PACIENTE (convención tipo Frank, usada en
 * vectocardiografía y en todo el motor):
 *   x → hacia la IZQUIERDA del paciente
 *   y → hacia ABAJO (inferior, hacia los pies)
 *   z → hacia DELANTE (anterior, hacia el esternón)
 *
 * Con este convenio los ángulos del plano frontal se miden desde +x (0° = lead I)
 * girando hacia +y (inferior), exactamente igual que en el sistema hexaxial:
 * +90° = aVF (abajo), −90° = arriba, ±180° = derecha del paciente.
 */

export type Vec3 = [number, number, number];

export const dot = (a: Readonly<Vec3>, b: Readonly<Vec3>): number =>
  a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export const add = (a: Readonly<Vec3>, b: Readonly<Vec3>): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

export const sub = (a: Readonly<Vec3>, b: Readonly<Vec3>): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

export const scale = (a: Readonly<Vec3>, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];

export const norm = (a: Readonly<Vec3>): number => Math.hypot(a[0], a[1], a[2]);

export const normalize = (a: Readonly<Vec3>): Vec3 => {
  const n = norm(a);
  return n === 0 ? [0, 0, 0] : scale(a, 1 / n);
};

export const deg2rad = (d: number) => (d * Math.PI) / 180;
export const rad2deg = (r: number) => (r * 180) / Math.PI;

/**
 * Gira un vector dentro del PLANO FRONTAL (alrededor del eje anteroposterior z).
 * Ángulo positivo = giro horario visto de frente (de I hacia aVF), que es como
 * se desplaza el eje eléctrico hacia la derecha (+90°… +180°).
 */
export function rotateFrontal(v: Readonly<Vec3>, deg: number): Vec3 {
  const c = Math.cos(deg2rad(deg));
  const s = Math.sin(deg2rad(deg));
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]];
}

/** Ángulo de un vector en el plano frontal (grados, −180…180). */
export const frontalAngle = (v: Readonly<Vec3>) => rad2deg(Math.atan2(v[1], v[0]));

/**
 * Gaussiana asimétrica (sigma distinta a cada lado del pico). Es la pieza con la
 * que se construyen todas las ondas: permite, p. ej., una onda T de subida lenta
 * y bajada más rápida, como la real.
 */
export function skewGauss(x: number, mu: number, sigmaL: number, sigmaR: number): number {
  const s = x < mu ? sigmaL : sigmaR;
  const d = (x - mu) / s;
  return Math.exp(-0.5 * d * d);
}

/** Transición suave 0→1 entre e0 y e1 (para segmentos ST/PR desplazados). */
export function smoothstep(e0: number, e1: number, x: number): number {
  if (e1 === e0) return x < e0 ? 0 : 1;
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/** Módulo siempre positivo (para indexar un búfer circular). */
export const mod = (a: number, n: number) => ((a % n) + n) % n;
