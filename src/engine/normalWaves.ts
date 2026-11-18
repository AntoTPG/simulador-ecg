/**
 * BUCLES VECTOCARDIOGRÁFICOS DEL CORAZÓN SANO
 * ===========================================
 * Coordenadas del paciente: x = izquierda, y = inferior, z = anterior (mV).
 * Los tiempos (`at`, `wl`, `wr`) son fracciones de la duración de cada onda.
 */
import { frontalAngle } from './math';
import { meanVector, type Lobe, type WaveKind } from './waves';

/**
 * ONDA P — despolarización auricular.
 * El nodo sinusal está arriba y a la derecha (en la aurícula derecha), así que
 * la activación auricular avanza hacia ABAJO y a la IZQUIERDA (eje de P ≈ +60°):
 * P positiva en I, II y aVF, y negativa en aVR.
 *  1.º la aurícula derecha (anterior) → componente inicial anterior;
 *  2.º la aurícula izquierda (posterior) → componente final posterior.
 * Por eso la P de V1 suele ser bifásica (+/−).
 */
const P: Lobe[] = [
  { at: 0.38, wl: 0.17, wr: 0.15, v: [0.04, 0.15, 0.07] }, // aurícula derecha
  { at: 0.62, wl: 0.15, wr: 0.16, v: [0.1, 0.08, -0.04] }, // aurícula izquierda
];

/**
 * COMPLEJO QRS — despolarización ventricular (bucle en sentido antihorario visto
 * desde arriba en el plano horizontal):
 *  1. SEPTO (0–20 ms): la rama izquierda llega antes, el tabique se despolariza
 *     de IZQUIERDA a DERECHA y hacia delante → "q septal" pequeña en I, aVL,
 *     V5–V6 y "r" inicial en V1.
 *  2. PAREDES LIBRES / ÁPEX (20–40 ms): el frente avanza hacia delante, la
 *     izquierda y abajo → la R crece de V1 a V4 (progresión de la R).
 *  3. PARED LIBRE DEL VI (pico ~45 ms): domina el VI, mucho más grueso que el
 *     VD → gran vector hacia IZQUIERDA, ABAJO y ATRÁS: R alta en II, V5–V6 y
 *     S profunda en V1–V2.
 *  4. BASES (60–80 ms): las últimas zonas son posterobasales y del tracto de
 *     salida → pequeño vector terminal hacia ARRIBA, DERECHA y ATRÁS (s en V6).
 */
const QRS: Lobe[] = [
  { at: 0.15, wl: 0.07, wr: 0.07, v: [-0.12, 0.06, 0.22] }, // septo (izq → dcha)
  { at: 0.36, wl: 0.09, wr: 0.09, v: [0.55, 0.55, 0.45] }, // ápex y paredes anteriores
  { at: 0.52, wl: 0.1, wr: 0.1, v: [1.05, 1.15, -0.55] }, // pared libre del VI
  { at: 0.74, wl: 0.08, wr: 0.08, v: [-0.15, -0.1, -0.55] }, // bases (terminal)
];

/**
 * ONDA T — repolarización ventricular.
 * La repolarización va en sentido CONTRARIO a la despolarización (de epicardio a
 * endocardio, porque el potencial de acción del epicardio es más corto). Pero
 * como un frente de REPOLARIZACIÓN que se aleja equivale eléctricamente a uno de
 * despolarización que se acerca, el vector T apunta en la MISMA dirección que el
 * QRS: T "concordante", positiva en I, II, V2–V6.
 * Es asimétrica: rama ascendente lenta y descendente más rápida.
 * Empieza en el punto J (fin del QRS) y la parte inicial, plana, forma el ST.
 */
const T: Lobe[] = [{ at: 0.66, wl: 0.18, wr: 0.11, v: [0.38, 0.33, 0.22] }];

/**
 * ONDA U — pequeña deflexión tras la T (origen discutido: repolarización tardía
 * de fibras de Purkinje o de células M, o fenómenos mecanoeléctricos).
 * Normalmente casi invisible; crece en la hipopotasemia (fase 2).
 */
const U: Lobe[] = [{ at: 0.5, wl: 0.2, wr: 0.2, v: [0.02, 0.018, 0.02] }];

export const NORMAL_WAVES: Record<WaveKind, Lobe[]> = { P, QRS, T, U };

/** Duración de la onda U (ms) y separación respecto al final de la T. */
export const U_WAVE = { duration: 170, gapAfterT: 10 } as const;

/**
 * Eje "natural" de los lóbulos del QRS sano. El motor gira el QRS y la T la
 * diferencia entre el eje configurado y este valor, de modo que el eje del
 * ECG simulado coincide con `PHYSIOLOGY.qrsAxis`.
 */
export const NORMAL_QRS_AXIS = frontalAngle(meanVector(QRS));
