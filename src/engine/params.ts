/**
 * Parámetros completos de una simulación. Las patologías (fase 2) se aplicarán
 * como modificaciones sobre los parámetros por defecto que se construyen aquí.
 */
import { PHYSIOLOGY, SIMULATION } from '../config/physiology';
import type { Vec3 } from './math';
import { NORMAL_QRS_AXIS, NORMAL_WAVES } from './normalWaves';
import { rotateLobes, type Lobe, type WaveKind } from './waves';

/** Tipo de ritmo (ver engine/rhythm.ts). */
export type RhythmSpec =
  | { kind: 'sinusal' }
  /** BAV 2.º grado Mobitz I: `conducidos` P conducidas por grupo; `incremento` del PR (ms). */
  | { kind: 'wenckebach'; conducidos: number; incremento: number }
  /** BAV 2.º grado Mobitz II: `relacion` P por grupo (la última bloqueada). */
  | { kind: 'mobitz2'; relacion: number }
  /** BAV completo con escape a `fcVentricular`. */
  | { kind: 'bav3'; fcVentricular: number }
  /** Fibrilación auricular con respuesta ventricular media `fcVentricular`. */
  | { kind: 'fa'; fcVentricular: number }
  /** Flúter auricular con conducción fija (2:1, 3:1, 4:1) o variable. */
  | { kind: 'fluter'; conduccion: 2 | 3 | 4 | 'variable' };

export interface SimParams {
  heartRate: number;
  prInterval: number;
  pDuration: number;
  qrsDuration: number;
  qtc: number;
  qrsAxis: number;
  waves: Record<WaveKind, Lobe[]>;
  /**
   * Vector de LESIÓN durante el segmento ST (mV). En un corazón sano es 0: tras
   * el QRS todas las células están en la meseta (fase 2 del potencial de acción)
   * al mismo potencial, no hay diferencias de voltaje y el ST es isoeléctrico.
   */
  stVector: Vec3;
  /** Desplazamiento del segmento PR (lesión auricular, p. ej. pericarditis). */
  prSegmentVector: Vec3;
  rhythm: RhythmSpec;
  sampleRate: number;
  targetDuration: number;
}

/**
 * Parámetros del corazón sano. El EJE se aplica aquí, girando en el plano
 * frontal los bucles QRS, T y U normales: así el eje medio del QRS coincide
 * con `qrsAxis`. Lo hacemos ANTES de aplicar las patologías para que los
 * vectores anatómicos que estas añaden (lesión, necrosis…) no giren con el eje.
 */
export function defaultParams(overrides: Partial<SimParams> = {}): SimParams {
  const qrsAxis = overrides.qrsAxis ?? PHYSIOLOGY.qrsAxis;
  const rot = qrsAxis - NORMAL_QRS_AXIS;
  return {
    heartRate: PHYSIOLOGY.heartRate,
    prInterval: PHYSIOLOGY.prInterval,
    pDuration: PHYSIOLOGY.pDuration,
    qrsDuration: PHYSIOLOGY.qrsDuration,
    qtc: PHYSIOLOGY.qtc,
    waves: {
      P: NORMAL_WAVES.P.map((l) => ({ ...l })),
      QRS: rotateLobes(NORMAL_WAVES.QRS, rot),
      T: rotateLobes(NORMAL_WAVES.T, rot),
      U: rotateLobes(NORMAL_WAVES.U, rot),
    },
    stVector: [0, 0, 0],
    prSegmentVector: [0, 0, 0],
    rhythm: { kind: 'sinusal' },
    sampleRate: SIMULATION.sampleRate,
    targetDuration: SIMULATION.targetDuration,
    ...overrides,
    qrsAxis,
  };
}

/**
 * QT real a partir del QTc y la FC (fórmula de Bazett invertida):
 *   QT = QTc · √RR   (RR en segundos)
 */
export const qtFromQtc = (qtc: number, heartRate: number) => qtc * Math.sqrt(60 / heartRate);
