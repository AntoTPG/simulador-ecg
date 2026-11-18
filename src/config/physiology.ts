/**
 * ============================================================================
 *  PARÁMETROS FISIOLÓGICOS DEL CORAZÓN SANO (archivo único de configuración)
 * ============================================================================
 * Cambia aquí los valores por defecto del ritmo sinusal normal. Todo el motor
 * parte de estos números; las patologías (fase 2) los modifican encima.
 */

export const PHYSIOLOGY = {
  /** Frecuencia cardíaca en latidos por minuto. Normal en reposo: 60–100 lpm. */
  heartRate: 70,

  /**
   * Intervalo PR (inicio de la P → inicio del QRS), en ms. Normal: 120–200 ms.
   * Refleja la despolarización auricular + el retraso fisiológico en el nodo AV,
   * que da tiempo a que las aurículas terminen de llenar los ventrículos.
   */
  prInterval: 160,

  /** Duración de la onda P (despolarización auricular), en ms. Normal < 120 ms. */
  pDuration: 100,

  /**
   * Duración del QRS (despolarización ventricular), en ms. Normal < 120 ms
   * (habitualmente 80–100 ms). Es corto porque el impulso viaja por el sistema
   * His‑Purkinje, que conduce ~4 m/s, mucho más rápido que el miocardio común.
   */
  qrsDuration: 90,

  /**
   * QT corregido (Bazett: QTc = QT / √RR[s]), en ms. Normal < 450 ms (♂) / 460 ms (♀).
   * El QT real se obtiene a partir de este valor y de la FC: a más frecuencia,
   * potencial de acción más corto y QT más corto.
   */
  qtc: 410,

  /**
   * Eje eléctrico medio del QRS en el plano frontal, en grados.
   * Normal: −30° a +90°. 0° = lead I (izquierda), +90° = aVF (abajo).
   */
  qrsAxis: 50,
} as const;

/** Parámetros de la discretización numérica. */
export const SIMULATION = {
  /** Frecuencia de muestreo (Hz). 500 Hz es lo habitual en electrocardiógrafos. */
  sampleRate: 500,
  /** Duración aproximada del registro que se repite en bucle (ms), como un ECG de 10 s. */
  targetDuration: 10_000,
} as const;

/** Rangos de normalidad usados por los tests y por los avisos de la interfaz. */
export const NORMAL_RANGES = {
  heartRate: [60, 100],
  pr: [120, 200],
  qrs: [60, 120],
  qtc: [350, 460],
  axis: [-30, 90],
} as const;

/** Límites de los controles de la interfaz. */
export const UI_LIMITS = {
  heartRate: [30, 180],
  speeds: [0.1, 0.25, 0.5, 1],
} as const;
