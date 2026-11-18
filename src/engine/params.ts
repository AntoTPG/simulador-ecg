/**
 * Parámetros completos de una simulación. Las patologías (fase 2) se aplicarán
 * como modificaciones sobre los parámetros por defecto que se construyen aquí.
 */
import { PHYSIOLOGY, SIMULATION } from '../config/physiology';
import type { Vec3 } from './math';
import { NORMAL_WAVES } from './normalWaves';
import type { Lobe, WaveKind } from './waves';

/** Tipo de ritmo. En la fase 1 solo el sinusal; el planificador ya admite más. */
export type RhythmSpec = { kind: 'sinusal' };

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

export function defaultParams(overrides: Partial<SimParams> = {}): SimParams {
  return {
    heartRate: PHYSIOLOGY.heartRate,
    prInterval: PHYSIOLOGY.prInterval,
    pDuration: PHYSIOLOGY.pDuration,
    qrsDuration: PHYSIOLOGY.qrsDuration,
    qtc: PHYSIOLOGY.qtc,
    qrsAxis: PHYSIOLOGY.qrsAxis,
    waves: {
      P: NORMAL_WAVES.P.map((l) => ({ ...l })),
      QRS: NORMAL_WAVES.QRS.map((l) => ({ ...l })),
      T: NORMAL_WAVES.T.map((l) => ({ ...l })),
      U: NORMAL_WAVES.U.map((l) => ({ ...l })),
    },
    stVector: [0, 0, 0],
    prSegmentVector: [0, 0, 0],
    rhythm: { kind: 'sinusal' },
    sampleRate: SIMULATION.sampleRate,
    targetDuration: SIMULATION.targetDuration,
    ...overrides,
  };
}

/**
 * QT real a partir del QTc y la FC (fórmula de Bazett invertida):
 *   QT = QTc · √RR   (RR en segundos)
 */
export const qtFromQtc = (qtc: number, heartRate: number) => qtc * Math.sqrt(60 / heartRate);
