/**
 * ============================================================================
 *  RETORNO VENOSO Y GASTO CARDÍACO: el análisis gráfico de Guyton
 * ============================================================================
 * Modelo SIMPLIFICADO y educativo (Guyton y Hall, Tratado de Fisiología
 * Médica, «Gasto cardíaco, retorno venoso y su regulación»; Levick,
 * Introduction to Cardiovascular Physiology).
 *
 *  - CURVA DE RETORNO VENOSO (función vascular): RV = (Pmll − PVC) / Rrv.
 *    · Pmll = presión media de llenado circulatorio (≈ presión venosa
 *      periférica): la presión que habría en todos los vasos con el corazón
 *      parado. Depende de la VOLEMIA y del TONO VENOSO: Pmll = (V − V0) / C.
 *    · Si la PVC baja de unos −4 mmHg, las grandes venas se colapsan al entrar
 *      en el tórax y el retorno venoso ya no aumenta (meseta).
 *    · Si la PVC sube hasta igualar la Pmll, el retorno venoso es cero.
 *  - CURVA DE GASTO CARDÍACO (función cardíaca, Frank‑Starling): el GC sube
 *    con la PVC (precarga) hasta una meseta, que depende de la contractilidad
 *    y de la frecuencia (simpático).
 *  - EQUILIBRIO: en estado estable GC = RV. La PVC toma sola el valor en el que
 *    se cortan las dos curvas; cualquier diferencia es transitoria: si GC ≠ RV,
 *    el volumen de la aurícula derecha cambia y lleva la PVC al equilibrio.
 *
 * Valores de referencia (adulto, reposo): GC = RV = 5 L/min con PVC = 0 mmHg y
 * Pmll = 7 mmHg. Unidades: L/min y mmHg.
 */

export interface GuytonParams {
  /** Volemia total (L). */
  volemia: number;
  /** Tono venoso (simpático, α1): 1 = normal; > 1 venoconstricción, < 1 venodilatación. */
  tonoVenoso: number;
  /** Resistencia al retorno venoso (mmHg·min/L). */
  rrv: number;
  /** Factor de la función cardíaca (contractilidad y frecuencia): 1 = normal. */
  funcionCardiaca: number;
  /** Resistencia periférica total (mmHg·min/L), para estimar la presión arterial media. */
  rpt: number;
  /** Presión intratorácica relativa a la normal (mmHg): negativa en la inspiración profunda. */
  intratoracica: number;
}

export const GUYTON_NORMAL: GuytonParams = {
  volemia: 5,
  tonoVenoso: 1,
  rrv: 1.4,
  funcionCardiaca: 1,
  rpt: 18.6,
  intratoracica: 0,
};

/** Distensibilidad (compliancia) de toda la circulación (L/mmHg): ~0,11 L por cada mmHg. */
export const COMPLIANCIA_SISTEMA = 0.11;
/** Volumen «no tensado» (L): la sangre que llena los vasos sin estirarlos. */
export const VOLUMEN_NO_TENSADO = 5 - 7 * COMPLIANCIA_SISTEMA;
/** PVC por debajo de la cual las grandes venas se colapsan al entrar en el tórax (mmHg). */
export const P_COLAPSO = -4;

/**
 * Presión media de llenado circulatorio (mmHg).
 * El tono venoso reduce el volumen no tensado y la compliancia (las venas
 * «aprietan» la sangre que contienen), por eso eleva la Pmll sin añadir volumen.
 */
export function pmll(p: GuytonParams) {
  const v0 = VOLUMEN_NO_TENSADO - 0.45 * (p.tonoVenoso - 1);
  const c = COMPLIANCIA_SISTEMA / (1 + 0.35 * (p.tonoVenoso - 1));
  return (p.volemia - v0) / c;
}

/** Retorno venoso (L/min) para una PVC dada. */
export function retornoVenoso(p: GuytonParams, pvc: number) {
  const pm = pmll(p);
  const pEfectiva = Math.max(pvc, P_COLAPSO + p.intratoracica);
  return Math.max(0, (pm - pEfectiva) / p.rrv);
}

/**
 * Gasto cardíaco (L/min) para una PVC dada: curva sigmoidea de Frank‑Starling
 * (≈ 5 L/min con PVC 0 y meseta ≈ 13 L/min a partir de unos 4 mmHg en el corazón normal).
 * La inspiración baja la presión fuera del corazón: con la misma PVC, la presión
 * transmural (de distensión) es mayor, y la curva se desplaza a la izquierda.
 */
export function gastoCardiaco(p: GuytonParams, pvc: number) {
  const transmural = pvc - p.intratoracica;
  return (13 * p.funcionCardiaca) / (1 + Math.exp(-(transmural - 0.634) / 1.354));
}

// ---------------------------------------------------------------------------
//  Reparto del volumen entre compartimentos
// ---------------------------------------------------------------------------
// El volumen total y la Pmll no cambian con la función cardíaca, la resistencia
// venosa o la presión intratorácica, pero SÍ cambia dónde está la sangre:
//  - las arterias son ~50 veces menos distensibles que las venas: con muy poco
//    volumen su presión sube mucho (PAM ≈ 93 mmHg con ~0,17 L «tensados»);
//  - las venas periféricas son el gran depósito (~3 L): un cambio de 100–200 mL
//    apenas mueve su presión (≈ 7 mmHg, cerca de la Pmll);
//  - el compartimento venoso central (venas cavas del tórax + AD, ~100 mL)
//    cambia de volumen con la PVC y con la presión intratorácica (lo que cuenta
//    es la presión de distensión = PVC − presión intratorácica).
// Volumen tensado total = Ca·PAM + Cv·Pvp + Cc·(PVC − Pit)  →  se despeja la Pvp.
// El resto de la sangre (~1,2 L en pulmones y cavidades cardíacas) se supone constante.

/** Compliancias de cada compartimento (L/mmHg). La suma es la de todo el sistema. */
export const C_ARTERIAL = 0.0018;
export const C_CENTRAL = 0.016;
/** Volúmenes «no tensados» de referencia (L): arterias, venas periféricas y centrales. */
const V0_ART = 0.58;
const V0_CEN = 0.1;

export interface Distribucion {
  /** Presión venosa periférica real (mmHg): próxima a la Pmll, pero no idéntica. */
  pvp: number;
  /** Volúmenes (L). */
  vArterial: number;
  vPeriferico: number;
  vCentral: number;
}

/** Reparto del volumen para unas PVC y PAM dadas (en equilibrio o durante una transición). */
export function distribucion(p: GuytonParams, pvc: number, pam: number): Distribucion {
  const cTotal = COMPLIANCIA_SISTEMA / (1 + 0.35 * (p.tonoVenoso - 1));
  const cVenosa = cTotal - C_ARTERIAL - C_CENTRAL; // el tono venoso actúa sobre las venas periféricas
  const tensado = pmll(p) * cTotal;
  const transmuralCentral = pvc - p.intratoracica;
  const pvp = (tensado - C_ARTERIAL * pam - C_CENTRAL * transmuralCentral) / cVenosa;
  const vArterial = V0_ART + C_ARTERIAL * pam;
  const vCentral = V0_CEN + C_CENTRAL * transmuralCentral;
  // Lo que no está en arterias ni en venas centrales está en las periféricas (≈ 3 L en reposo)
  const vPeriferico = p.volemia - 1.2 - vArterial - vCentral;
  return { pvp, vArterial, vPeriferico, vCentral };
}

/** Presión arterial media para un gasto y una PVC: PAM = GC × RPT + PVC. */
export const pamDe = (p: GuytonParams, gc: number, pvc: number) => gc * p.rpt + pvc;

/** Punto de equilibrio (GC = RV) por bisección. */
export function equilibrio(p: GuytonParams) {
  let a = -8;
  let b = 30;
  for (let i = 0; i < 80; i++) {
    const m = (a + b) / 2;
    if (gastoCardiaco(p, m) - retornoVenoso(p, m) > 0) b = m;
    else a = m;
  }
  const pvc = (a + b) / 2;
  const gc = gastoCardiaco(p, pvc);
  return { pvc, gc, pmll: pmll(p), pam: gc * p.rpt + pvc };
}

/**
 * Evolución en el tiempo de la PVC cuando GC ≠ RV: la aurícula derecha (y las
 * venas centrales, ~100 mL) gana o pierde volumen hasta que ambos se igualan.
 * Devuelve la nueva PVC tras `dt` segundos.
 */
export function pasoPvc(p: GuytonParams, pvc: number, dt: number) {
  const C_CENTRAL = 0.05; // L/mmHg (venas centrales + AD)
  const dV = ((retornoVenoso(p, pvc) - gastoCardiaco(p, pvc)) / 60) * dt; // L
  return pvc + dV / C_CENTRAL;
}

// ---------------------------------------------------------------------------
//  Casos (números de referencia de Guyton y Hall; orientativos)
// ---------------------------------------------------------------------------
export interface CasoGuyton {
  id: string;
  nombre: string;
  /** Etapas sucesivas (p. ej., la evolución de la insuficiencia cardíaca). */
  etapas: { etiqueta: string; params: GuytonParams; texto: string }[];
}

const g = (x: Partial<GuytonParams>): GuytonParams => ({ ...GUYTON_NORMAL, ...x });

export const CASOS_GUYTON: CasoGuyton[] = [
  {
    id: 'normal',
    nombre: 'Normal',
    etapas: [
      {
        etiqueta: 'Reposo',
        params: GUYTON_NORMAL,
        texto:
          'Las curvas se cortan con GC = RV ≈ 5 L/min y PVC ≈ 0 mmHg. El retorno venoso se anula cuando la PVC iguala la presión media de llenado circulatorio (≈ 7 mmHg); por debajo de unos −4 mmHg las venas se colapsan al entrar en el tórax y el retorno ya no aumenta.',
      },
    ],
  },
  {
    id: 'transfusion',
    nombre: 'Transfusión de 1 L',
    etapas: [
      {
        etiqueta: 'Recién transfundido',
        params: g({ volemia: 6, rrv: 0.62, rpt: 9.5 }),
        texto:
          'Más volumen en un continente igual: sube la presión media de llenado y la curva de retorno venoso se desplaza a la derecha y hacia arriba; además, las venas distendidas ofrecen menos resistencia. El nuevo equilibrio tiene un gasto de ≈ 13 L/min con una PVC de ≈ 8 mmHg. En unos 30 minutos se normaliza: parte del líquido pasa al intersticio por filtración capilar y actúan reflejos vasculares.',
      },
    ],
  },
  {
    id: 'hemorragia',
    nombre: 'Hemorragia (−0,6 L)',
    etapas: [
      {
        etiqueta: 'Sin reflejos (teórico)',
        params: g({ volemia: 4.4 }),
        texto:
          'Menos volumen: baja la presión media de llenado y la curva de retorno venoso se desplaza a la izquierda. Bajan la PVC y el gasto cardíaco (y con ellos la presión arterial).',
      },
      {
        etiqueta: 'Con reflejos simpáticos',
        params: g({ volemia: 4.55, tonoVenoso: 1.35, funcionCardiaca: 1.1, rpt: 23 }),
        texto:
          'El reflejo barorreceptor contrae las venas (sube la presión media de llenado sin añadir volumen), aumenta la contractilidad y la frecuencia y contrae las arteriolas. Además, al bajar la presión capilar entra líquido del intersticio a la sangre. El gasto y la presión arterial se recuperan en parte.',
      },
    ],
  },
  {
    id: 'ejercicio',
    nombre: 'Ejercicio intenso',
    etapas: [
      {
        etiqueta: 'Ejercicio',
        params: g({ tonoVenoso: 2.5, funcionCardiaca: 2.2, rrv: 0.86, rpt: 5.2 }),
        texto:
          'El simpático duplica la contractilidad y sube la frecuencia (la curva de gasto cardíaco se eleva). La venoconstricción, la bomba muscular y la prensa abdominal elevan la presión media de llenado hasta ≈ 20 mmHg, y la vasodilatación muscular reduce la resistencia. GC = RV ≈ 21 L/min con una PVC que apenas cambia (≈ 2 mmHg).',
      },
    ],
  },
  {
    id: 'ic',
    nombre: 'Insuficiencia cardíaca (evolución)',
    etapas: [
      {
        etiqueta: 'A · Normal',
        params: GUYTON_NORMAL,
        texto: 'Punto de partida: GC = RV = 5 L/min y PVC = 0 mmHg.',
      },
      {
        etiqueta: 'B · Segundos tras el infarto',
        params: g({ funcionCardiaca: 0.17 }),
        texto:
          'La curva de función cardíaca se hunde (menos contractilidad). La de retorno venoso aún es la normal: el gasto cae a ≈ 2 L/min y la PVC sube a ≈ 4 mmHg (la sangre se queda en las venas).',
      },
      {
        etiqueta: 'C · 30 segundos (reflejos)',
        params: g({ funcionCardiaca: 0.32, tonoVenoso: 1.5 }),
        texto:
          'Los reflejos simpáticos mejoran algo la función cardíaca y contraen las venas: sube la presión media de llenado. El gasto se recupera a ≈ 4 L/min, con una PVC de ≈ 5 mmHg.',
      },
      {
        etiqueta: 'D · Semanas después',
        params: g({ funcionCardiaca: 0.39, volemia: 5.55, rrv: 1.2 }),
        texto:
          'El corazón se recupera en parte y el riñón retiene sodio y agua (sistema renina‑angiotensina‑aldosterona): la volemia y la presión media de llenado (≈ 12 mmHg) aumentan. El gasto es casi normal, pero a costa de una PVC alta (≈ 6 mmHg): se verá ingurgitación yugular. La PVC es un buen indicador del estado cardiovascular.',
      },
    ],
  },
  {
    id: 'vasodilatacion',
    nombre: 'Venodilatación (sepsis, calor)',
    etapas: [
      {
        etiqueta: 'Venodilatación',
        params: g({ tonoVenoso: 0.55, rpt: 15 }),
        texto:
          'Las venas se relajan y aumenta su compliancia: el mismo volumen ejerce menos presión, baja la presión media de llenado y con ella el retorno venoso, la PVC y el gasto, aunque no se haya perdido sangre.',
      },
    ],
  },
  {
    id: 'inspiracion',
    nombre: 'Inspiración profunda',
    etapas: [
      {
        etiqueta: 'Inspiración',
        params: g({ intratoracica: -2 }),
        texto:
          'Al bajar la presión intratorácica, la presión fuera de la aurícula y el ventrículo derechos es menor: con la misma PVC están más distendidos (más precarga), y la curva de gasto se desplaza a la izquierda. Es la «bomba respiratoria», que favorece el llenado del corazón derecho.',
      },
    ],
  },
];

export const getCasoGuyton = (id: string) => CASOS_GUYTON.find((c) => c.id === id) ?? CASOS_GUYTON[0];
