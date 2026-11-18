/**
 * Papel milimetrado estándar del ECG.
 *  - 25 mm/s → 1 mm (cuadrito pequeño) = 40 ms; 5 mm (cuadro grande) = 200 ms.
 *  - 10 mm/mV → 1 mm = 0,1 mV; la señal de calibración de 1 mV mide 10 mm.
 */
export const ECG_PAPER = {
  speedMmPerS: 25,
  gainMmPerMv: 10,
  /** Anchura del pulso de calibración (mm). */
  calibrationWidthMm: 5,
  /** Margen izquierdo donde se dibuja la calibración (mm). */
  marginLeftMm: 9,
  /** Mínimo de píxeles por mm: por debajo el papel no se lee y se activa scroll horizontal. */
  minPxPerMm: 2.6,
} as const;
