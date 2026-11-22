/**
 * ============================================================================
 *  «ADIVINA EL ECG»: banco de preguntas
 * ============================================================================
 * Cada entrada es un DIAGNÓSTICO que se puede preguntar. Apunta a una patología
 * del simulador y a los niveles de su deslizador que la representan bien.
 *
 *  - Las respuestas son nombres cortos, como se diría en un examen.
 *  - Algunas patologías dan varias respuestas distintas (los bloqueos AV, el
 *    calcio, los hemibloqueos, la pericarditis…).
 *  - Algunos niveles se dejan fuera a propósito porque el ECG no basta para
 *    distinguirlos. Por ejemplo, la fase de T hiperaguda del infarto o la
 *    intoxicación digitálica (se confunde con un Mobitz I).
 *
 * Para añadir una pregunta basta con añadir una línea aquí. El test
 * `quiz.test.ts` comprueba que la patología y los niveles existen.
 */
import { CATEGORIES } from '../pathologies/schema';
import { getPathology, PATHOLOGIES } from '../pathologies/registry';

export interface EntradaQuiz {
  /** Identificador único de la respuesta. */
  id: string;
  /** Texto de la respuesta. */
  respuesta: string;
  /** Patología del simulador que genera el ECG. */
  patologia: string;
  /** Niveles del deslizador que se pueden usar (uno al azar). */
  niveles: number[];
}

export const BANCO: readonly EntradaQuiz[] = [
  { id: 'normal', respuesta: 'ECG normal (ritmo sinusal)', patologia: 'normal', niveles: [0] },
  // Isquemia e infarto (fase de lesión o de onda Q)
  { id: 'iam-anterior', respuesta: 'IAM anterior extenso (DA proximal)', patologia: 'iam-da-proximal', niveles: [1, 2] },
  { id: 'iam-apical', respuesta: 'IAM anteroapical (DA distal)', patologia: 'iam-da-distal', niveles: [1, 2] },
  { id: 'iam-inferior', respuesta: 'IAM inferior (coronaria derecha)', patologia: 'iam-cd-inferior', niveles: [1, 2] },
  { id: 'iam-vd', respuesta: 'IAM inferior con afectación del VD', patologia: 'iam-cd-vd', niveles: [1] },
  { id: 'iam-lateral', respuesta: 'IAM lateral (circunfleja)', patologia: 'iam-cx-lateral', niveles: [1, 2] },
  { id: 'iam-posterior', respuesta: 'IAM posterior', patologia: 'iam-cx-posterior', niveles: [1] },
  { id: 'subendocardica', respuesta: 'Isquemia subendocárdica (descenso del ST)', patologia: 'isquemia-subendocardica', niveles: [0, 1] },
  { id: 'tronco', respuesta: 'Lesión de tronco común / multivaso', patologia: 'isquemia-tronco-comun', niveles: [1, 2] },
  // Electrolitos
  { id: 'hiperk', respuesta: 'Hiperpotasemia', patologia: 'hiperpotasemia', niveles: [0, 1, 2, 3] },
  { id: 'hipok', respuesta: 'Hipopotasemia', patologia: 'hipopotasemia', niveles: [1, 2] },
  { id: 'hiperca', respuesta: 'Hipercalcemia', patologia: 'calcio', niveles: [0, 1] },
  { id: 'hipoca', respuesta: 'Hipocalcemia', patologia: 'calcio', niveles: [2, 3] },
  // Conducción
  { id: 'brd', respuesta: 'Bloqueo completo de rama derecha', patologia: 'bloqueo-rama-derecha', niveles: [1] },
  { id: 'bri', respuesta: 'Bloqueo completo de rama izquierda', patologia: 'bloqueo-rama-izquierda', niveles: [0] },
  { id: 'bav1', respuesta: 'BAV de 1.er grado', patologia: 'bloqueos-av', niveles: [0] },
  { id: 'mobitz1', respuesta: 'BAV de 2.º grado Mobitz I (Wenckebach)', patologia: 'bloqueos-av', niveles: [1] },
  { id: 'mobitz2', respuesta: 'BAV de 2.º grado Mobitz II', patologia: 'bloqueos-av', niveles: [2] },
  { id: 'bav21', respuesta: 'BAV 2:1', patologia: 'bloqueos-av', niveles: [3] },
  { id: 'bav3', respuesta: 'BAV completo (3.er grado)', patologia: 'bloqueos-av', niveles: [4, 5] },
  { id: 'hai', respuesta: 'Hemibloqueo anterior izquierdo', patologia: 'hemibloqueos', niveles: [0] },
  { id: 'hpi', respuesta: 'Hemibloqueo posterior izquierdo', patologia: 'hemibloqueos', niveles: [1] },
  { id: 'wpw', respuesta: 'Wolff-Parkinson-White (preexcitación)', patologia: 'wpw', niveles: [0] },
  // Hipertrofia y arritmias
  { id: 'hvi', respuesta: 'Hipertrofia ventricular izquierda', patologia: 'hvi', niveles: [0, 1] },
  { id: 'fa', respuesta: 'Fibrilación auricular', patologia: 'fibrilacion-auricular', niveles: [0, 1, 2] },
  { id: 'fluter', respuesta: 'Flúter auricular', patologia: 'fluter-auricular', niveles: [0, 1, 2] },
  // Otras
  { id: 'digital', respuesta: 'Efecto digitálico', patologia: 'digital', niveles: [0] },
  { id: 'miocarditis', respuesta: 'Miocarditis', patologia: 'miocarditis', niveles: [0, 1] },
  { id: 'pericarditis', respuesta: 'Pericarditis aguda', patologia: 'pericarditis', niveles: [0] },
  { id: 'derrame', respuesta: 'Derrame pericárdico (bajo voltaje)', patologia: 'pericarditis', niveles: [3] },
  { id: 'qt-largo', respuesta: 'QT largo', patologia: 'qt-largo', niveles: [1, 2] },
  { id: 'brugada', respuesta: 'Síndrome de Brugada (tipo 1)', patologia: 'brugada', niveles: [0] },
  { id: 'tep', respuesta: 'Tromboembolismo pulmonar (S1Q3T3)', patologia: 'tep', niveles: [1] },
];

/**
 * Temas para filtrar: las categorías del simulador, sin «Referencia». La HVI
 * (única de «Hipertrofia») se pregunta dentro de «Otras».
 */
type Categoria = (typeof CATEGORIES)[number];
export type Tema = 'todos' | Exclude<Categoria, 'Referencia' | 'Hipertrofia'>;
export const TEMAS: { k: Tema; label: string }[] = [
  { k: 'todos', label: 'Todo' },
  { k: 'Isquemia e infarto', label: 'Isquemia e infarto' },
  { k: 'Alteraciones electrolíticas', label: 'Electrolitos' },
  { k: 'Trastornos de la conducción', label: 'Conducción' },
  { k: 'Arritmias', label: 'Arritmias' },
  { k: 'Otras', label: 'Otras (HVI, pericarditis…)' },
];

export const temaDe = (e: EntradaQuiz): Categoria => {
  const c = getPathology(e.patologia).categoria;
  return c === 'Hipertrofia' ? 'Otras' : c;
};

/** Entradas que entran en un tema. El ECG normal solo sale en «Todo». */
export const entradasDe = (tema: Tema) => (tema === 'todos' ? [...BANCO] : BANCO.filter((e) => temaDe(e) === tema));

export interface Pregunta {
  entrada: EntradaQuiz;
  nivel: number;
  /** Frecuencia sinusal de base, variada para que no se aprenda de memoria. */
  fc: number;
  /** Cuatro opciones (ids del banco), barajadas; una es la correcta. */
  opciones: string[];
}

type Rng = () => number;
const pick = <T,>(arr: readonly T[], rng: Rng) => arr[Math.floor(rng() * arr.length)];
function shuffle<T>(arr: T[], rng: Rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Crea una pregunta del tema elegido, sin repetir la anterior.
 * Las opciones falsas salen sobre todo del mismo tema (2 de 3), para que haya
 * que pensar, y se completan con otras si el tema tiene pocas.
 */
export function nuevaPregunta(tema: Tema, anteriorId: string | null = null, rng: Rng = Math.random, nOpciones = 4): Pregunta {
  const pool = entradasDe(tema);
  const candidatas = pool.length > 1 ? pool.filter((e) => e.id !== anteriorId) : pool;
  const entrada = pick(candidatas, rng);
  const mismoTema = shuffle(BANCO.filter((e) => e.id !== entrada.id && temaDe(e) === temaDe(entrada)), rng);
  const otras = shuffle(BANCO.filter((e) => e.id !== entrada.id && temaDe(e) !== temaDe(entrada)), rng);
  const nMismo = tema === 'todos' ? 2 : nOpciones - 1;
  const falsas = [...mismoTema.slice(0, nMismo), ...otras, ...mismoTema.slice(nMismo)].slice(0, nOpciones - 1);
  return {
    entrada,
    nivel: pick(entrada.niveles, rng),
    fc: 60 + Math.round(rng() * 30),
    opciones: shuffle([entrada.id, ...falsas.map((e) => e.id)], rng),
  };
}

export const getEntrada = (id: string) => BANCO.find((e) => e.id === id)!;

/** Para los tests: ids de patologías que existen en el simulador. */
export const PATOLOGIAS_IDS = new Set(PATHOLOGIES.map((p) => p.id));
