/**
 * ============================================================================
 *  ELECTRODOS Y DERIVACIONES
 * ============================================================================
 *
 * HIPÓTESIS DEL DIPOLO: la actividad eléctrica del corazón en cada instante se
 * resume en un único vector H(t) (el "vector cardíaco"). El potencial que
 * registra un electrodo e es el producto escalar
 *
 *        φe(t) = Le · H(t)
 *
 * donde Le es el "vector de campo" del electrodo (hacia dónde está y cuánto
 * "ve"). Una derivación es la DIFERENCIA de potencial entre un polo positivo y
 * uno negativo (o una referencia), así que también es un producto escalar:
 *
 *        V_derivación(t) = L_derivación · H(t)
 *
 * Consecuencia didáctica: la onda es POSITIVA cuando H apunta hacia el polo
 * positivo de la derivación (el frente de despolarización se acerca al
 * electrodo) y NEGATIVA cuando se aleja. Si H es perpendicular al eje, la
 * derivación registra ~0 (onda isodifásica).
 *
 * Construimos las 12 derivaciones a partir de POTENCIALES DE ELECTRODO, no
 * dando un vector arbitrario a cada derivación. Así las leyes de Einthoven
 * (II = I + III) y Goldberger (aVR + aVL + aVF = 0) se cumplen EXACTAMENTE por
 * construcción, igual que en la realidad.
 */
import type { Vec3 } from '../engine/math';

export type LimbElectrode = 'R' | 'L' | 'F';
export type ChestElectrode = 'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6' | 'V3R' | 'V4R';
export type ElectrodeName = LimbElectrode | ChestElectrode;

export const LEAD_NAMES = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const;
/** Derivaciones derechas opcionales (útiles en el infarto de VD, fase 2). */
export const EXTRA_LEAD_NAMES = ['V3R', 'V4R'] as const;
export type StandardLead = (typeof LEAD_NAMES)[number];
export type LeadName = StandardLead | (typeof EXTRA_LEAD_NAMES)[number];

/**
 * "Ganancia" de las derivaciones de miembros. Las de miembros registran menos
 * voltaje que las precordiales porque sus electrodos están lejos del corazón.
 * 0,8 deja la R de II en ~1,2 mV y la de V4 en ~1,5–2 mV, como en un ECG real.
 */
export const LIMB_GAIN = 0.8;

/**
 * Electrodos de miembros: TRIÁNGULO DE EINTHOVEN equilátero en el plano frontal.
 *   R (brazo derecho) a −150°, L (brazo izquierdo) a −30°, F (pierna izq.) a +90°.
 * Los tres vectores suman cero → el terminal central de Wilson (media de los
 * tres) vale 0, lo que simplifica las precordiales.
 */
const kLimb = LIMB_GAIN / Math.sqrt(3);
const polarFrontal = (deg: number): Vec3 => [
  kLimb * Math.cos((deg * Math.PI) / 180),
  kLimb * Math.sin((deg * Math.PI) / 180),
  0,
];

/**
 * Electrodos precordiales: coeficientes derivados de la matriz INVERSA DE DOWER
 * (Dower, 1980), que transforma el vectocardiograma de Frank (X, Y, Z) en las
 * precordiales. Dos ajustes didácticos:
 *   1. Frank usa +Z hacia atrás; aquí +z es anterior → se invierte el signo de z.
 *   2. Se anula la pequeña componente vertical (y) para que las precordiales
 *      queden exactamente en el PLANO HORIZONTAL, como se enseñan.
 * V3R y V4R son las imágenes especulares de V3 y V4 en el hemitórax derecho.
 */
export const ELECTRODE_VECTORS: Record<ElectrodeName, Vec3> = {
  R: polarFrontal(-150),
  L: polarFrontal(-30),
  F: polarFrontal(90),
  V1: [-0.515, 0, 0.917],
  V2: [0.044, 0, 1.387],
  V3: [0.882, 0, 1.277],
  V4: [1.213, 0, 0.601],
  V5: [1.125, 0, 0.086],
  V6: [0.831, 0, -0.23],
  V3R: [-0.882, 0, 1.277],
  V4R: [-1.213, 0, 0.601],
};

/** Colores de los electrodos según la norma IEC (la que se usa en España). */
export const ELECTRODE_COLORS: Record<ElectrodeName, string> = {
  R: '#d62828', // rojo — brazo derecho
  L: '#f4c430', // amarillo — brazo izquierdo
  F: '#2a9d4b', // verde — pierna izquierda
  V1: '#d62828',
  V2: '#f4c430',
  V3: '#2a9d4b',
  V4: '#8b5a2b',
  V5: '#222222',
  V6: '#7b3fb5',
  V3R: '#2a9d4b',
  V4R: '#8b5a2b',
};

export interface LeadInfo {
  name: LeadName;
  grupo: 'miembros' | 'precordial';
  tipo: string;
  /** Cómo se calcula a partir de los electrodos. */
  formula: string;
  /** Cara del corazón que "mira" la derivación. */
  cara: string;
  /** Ángulo en el sistema hexaxial (solo derivaciones de miembros). */
  angulo?: number;
}

export const LEAD_INFO: Record<LeadName, LeadInfo> = {
  I: { name: 'I', grupo: 'miembros', tipo: 'Bipolar (Einthoven)', formula: 'φL − φR', cara: 'lateral alta del VI', angulo: 0 },
  II: { name: 'II', grupo: 'miembros', tipo: 'Bipolar (Einthoven)', formula: 'φF − φR', cara: 'inferior', angulo: 60 },
  III: { name: 'III', grupo: 'miembros', tipo: 'Bipolar (Einthoven)', formula: 'φF − φL', cara: 'inferior', angulo: 120 },
  aVR: { name: 'aVR', grupo: 'miembros', tipo: 'Monopolar aumentada (Goldberger)', formula: 'φR − (φL + φF)/2', cara: 'cavidades derechas / "desde el hombro derecho"', angulo: -150 },
  aVL: { name: 'aVL', grupo: 'miembros', tipo: 'Monopolar aumentada (Goldberger)', formula: 'φL − (φR + φF)/2', cara: 'lateral alta', angulo: -30 },
  aVF: { name: 'aVF', grupo: 'miembros', tipo: 'Monopolar aumentada (Goldberger)', formula: 'φF − (φR + φL)/2', cara: 'inferior', angulo: 90 },
  V1: { name: 'V1', grupo: 'precordial', tipo: 'Monopolar precordial (Wilson)', formula: 'φV1 − TCW', cara: 'septal / VD (4.º EIC paraesternal dcho.)' },
  V2: { name: 'V2', grupo: 'precordial', tipo: 'Monopolar precordial (Wilson)', formula: 'φV2 − TCW', cara: 'septal (4.º EIC paraesternal izq.)' },
  V3: { name: 'V3', grupo: 'precordial', tipo: 'Monopolar precordial (Wilson)', formula: 'φV3 − TCW', cara: 'anterior (entre V2 y V4)' },
  V4: { name: 'V4', grupo: 'precordial', tipo: 'Monopolar precordial (Wilson)', formula: 'φV4 − TCW', cara: 'anterior / apical (5.º EIC línea medioclavicular)' },
  V5: { name: 'V5', grupo: 'precordial', tipo: 'Monopolar precordial (Wilson)', formula: 'φV5 − TCW', cara: 'lateral baja (línea axilar anterior)' },
  V6: { name: 'V6', grupo: 'precordial', tipo: 'Monopolar precordial (Wilson)', formula: 'φV6 − TCW', cara: 'lateral baja (línea axilar media)' },
  V3R: { name: 'V3R', grupo: 'precordial', tipo: 'Precordial derecha', formula: 'φV3R − TCW', cara: 'ventrículo derecho' },
  V4R: { name: 'V4R', grupo: 'precordial', tipo: 'Precordial derecha', formula: 'φV4R − TCW', cara: 'ventrículo derecho' },
};
