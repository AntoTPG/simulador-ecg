/**
 * ============================================================================
 *  INTERCAMBIO CAPILAR DE LÍQUIDO: fuerzas de Starling y edema
 * ============================================================================
 * Modelo SIMPLIFICADO y educativo (Guyton y Hall, «La microcirculación y el
 * sistema linfático»; Levick).
 *
 *   Jv = Kf · [(Pc − Pi) − σ(πc − πi)]
 *
 *  - Pc: presión hidrostática capilar. Baja a lo largo del capilar, del extremo
 *    arterial (≈ 32 mmHg) al venoso (≈ 15 mmHg). Empuja el líquido hacia FUERA.
 *  - πc: presión oncótica (coloidosmótica) del plasma (≈ 25 mmHg), por las
 *    proteínas; constante a lo largo del capilar. Retiene el líquido DENTRO.
 *  - Pi y πi: presiones del intersticio, pequeñas (Pi ligeramente negativa por
 *    la succión de los linfáticos).
 *  - Kf: coeficiente de filtración (permeabilidad × superficie).
 *  - σ: coeficiente de reflexión a las proteínas (1 = no pasan; baja si el
 *    capilar se vuelve permeable, p. ej., con histamina).
 *  - Lo filtrado de más vuelve por los LINFÁTICOS (≈ 3 L/día). Si la filtración
 *    supera lo que pueden drenar, se acumula: EDEMA.
 */

export interface StarlingParams {
  /** Presión hidrostática capilar en el extremo arterial y en el venoso (mmHg). */
  pcArterial: number;
  pcVenoso: number;
  /** Presión hidrostática intersticial (mmHg). */
  pi: number;
  /** Presiones oncóticas del plasma y del intersticio (mmHg). */
  piC: number;
  piI: number;
  /** Coeficiente de filtración relativo (1 = normal). */
  kf: number;
  /** Coeficiente de reflexión a las proteínas (0–1). */
  sigma: number;
  /** Capacidad de drenaje linfático relativa (1 = normal). */
  linfa: number;
}

export const STARLING_NORMAL: StarlingParams = {
  pcArterial: 32,
  pcVenoso: 15,
  pi: -1,
  piC: 25,
  piI: 1,
  kf: 1,
  sigma: 1,
  linfa: 1,
};

/** Kf de todo el organismo (L/día por mmHg), para pasar de mmHg a volumen: orientativo. */
const KF_TOTAL = 6;
/** Flujo linfático máximo con el drenaje normal (L/día): puede multiplicarse por ~10 si hace falta. */
const LINFA_MAX = 30;

/** Presión neta de filtración en un punto del capilar (x de 0 = arterial a 1 = venoso). */
export function presionNeta(p: StarlingParams, x: number) {
  const pc = p.pcArterial + (p.pcVenoso - p.pcArterial) * x;
  return pc - p.pi - p.sigma * (p.piC - p.piI);
}

/** Punto del capilar donde se pasa de filtrar a absorber (0–1), o null si no cambia. */
export function puntoDeCambio(p: StarlingParams) {
  const a = presionNeta(p, 0);
  const b = presionNeta(p, 1);
  if (a > 0 && b < 0) return a / (a - b);
  return null;
}

export function balance(p: StarlingParams) {
  const N = 100;
  let filtrado = 0;
  let absorbido = 0;
  for (let i = 0; i < N; i++) {
    const v = presionNeta(p, (i + 0.5) / N) / N;
    if (v > 0) filtrado += v;
    else absorbido -= v;
  }
  const k = KF_TOTAL * p.kf;
  const filtracionNeta = (filtrado - absorbido) * k; // L/día (negativa = absorción neta)
  const capacidadLinfa = LINFA_MAX * p.linfa;
  const drenaje = Math.min(Math.max(0, filtracionNeta), capacidadLinfa);
  const acumulo = Math.max(0, filtracionNeta - capacidadLinfa); // L/día que se quedan en el intersticio
  return {
    presionMedia: (presionNeta(p, 0) + presionNeta(p, 1)) / 2,
    filtrado: filtrado * k,
    absorbido: absorbido * k,
    filtracionNeta,
    drenaje,
    capacidadLinfa,
    acumulo,
    edema: acumulo > 0,
  };
}

export interface CasoStarling {
  id: string;
  nombre: string;
  params: StarlingParams;
  texto: string;
}

const s = (x: Partial<StarlingParams>): StarlingParams => ({ ...STARLING_NORMAL, ...x });

export const CASOS_STARLING: CasoStarling[] = [
  {
    id: 'normal',
    nombre: 'Normal',
    params: STARLING_NORMAL,
    texto:
      'En el extremo arterial la presión hidrostática supera a la oncótica y el líquido sale (filtración); en el venoso ocurre lo contrario y vuelve a entrar (absorción). Se filtra algo más de lo que se absorbe: esa diferencia (≈ 3 L/día) la recogen los linfáticos y la devuelven a la sangre.',
  },
  {
    id: 'ic',
    nombre: 'Insuficiencia cardíaca (↑ presión venosa)',
    params: s({ pcArterial: 40, pcVenoso: 30 }),
    texto:
      'Si sube la presión venosa (insuficiencia cardíaca, trombosis venosa, exceso de volumen), sube la presión hidrostática en todo el capilar: se filtra mucho más y casi no se absorbe. Cuando la linfa no da abasto, aparece edema (en las piernas, por la gravedad). Un aumento de la presión arterial se nota menos, porque las arteriolas lo amortiguan (autorregulación).',
  },
  {
    id: 'proteinas',
    nombre: 'Pocas proteínas (nefrótico, desnutrición)',
    params: s({ piC: 11 }),
    texto:
      'La presión oncótica del plasma es la única fuerza que retiene el agua dentro de los vasos. Si faltan proteínas (síndrome nefrótico, insuficiencia hepática, desnutrición grave), apenas hay absorción y el líquido escapa al intersticio: edema generalizado y ascitis.',
  },
  {
    id: 'histamina',
    nombre: 'Inflamación o alergia (histamina)',
    params: s({ kf: 3, sigma: 0.6, piI: 8 }),
    texto:
      'La histamina abre los espacios entre las células endoteliales: aumenta el coeficiente de filtración y salen proteínas al intersticio. Así sube la presión oncótica intersticial y baja el gradiente que retiene el agua: se filtra mucho más. Es el edema local de una picadura o de una reacción alérgica.',
  },
  {
    id: 'linfedema',
    nombre: 'Linfedema (obstrucción linfática)',
    params: s({ linfa: 0.08 }),
    texto:
      'Las fuerzas de Starling son normales, pero lo que se filtra de más no puede volver: los linfáticos están obstruidos o se han extirpado (cáncer de mama, filariasis o elefantiasis). El líquido y las proteínas se acumulan en el intersticio.',
  },
  {
    id: 'hemorragia',
    nombre: 'Hemorragia (↓ presión capilar)',
    params: s({ pcArterial: 22, pcVenoso: 9 }),
    texto:
      'Al perder volumen y contraerse las arteriolas, baja la presión hidrostática capilar: predomina la absorción y entra líquido del intersticio a la sangre («autotransfusión»), lo que ayuda a recuperar la volemia.',
  },
  {
    id: 'vasoconstriccion',
    nombre: 'Vasoconstricción arteriolar',
    params: s({ pcArterial: 25, pcVenoso: 13 }),
    texto:
      'La contracción de las arteriolas de un órgano disminuye la presión en sus capilares: se filtra menos. La vasodilatación hace lo contrario y aumenta la filtración.',
  },
];

export const getCasoStarling = (id: string) => CASOS_STARLING.find((c) => c.id === id) ?? CASOS_STARLING[0];
