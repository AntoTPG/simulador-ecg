/**
 * Casos de espirometría. Los parámetros están elegidos para que el modelo dé
 * los patrones de libro; los textos están redactados con palabras propias a
 * partir de la normativa SEPAR de espirometría (2013), los estándares ATS/ERS
 * (2005, 2019 y 2022), GOLD y GINA, y el Manual MSD.
 */
import { SPIRO_NORMAL, type SpiroParams } from './spirometry';

export interface CasoEspiro {
  id: string;
  nombre: string;
  grupo: 'Referencia' | 'Obstrucción de vías pequeñas' | 'Restricción' | 'Vía aérea central';
  params: SpiroParams;
  /** Escala de gravedad de la obstrucción: GOLD (EPOC) o ATS/ERS (resto). */
  escala?: 'gold' | 'ats';
  /** Tras el broncodilatador (si tiene sentido hacer la prueba). */
  postBd?: SpiroParams;
  explicacion: string[];
}

const p = (x: Partial<SpiroParams>): SpiroParams => ({ ...SPIRO_NORMAL, ...x });

export const CASOS_ESPIRO: CasoEspiro[] = [
  {
    id: 'normal',
    nombre: 'Normal',
    grupo: 'Referencia',
    params: SPIRO_NORMAL,
    postBd: p({ fmaxCoef: 1.85 }),
    explicacion: [
      'El paciente llena los pulmones hasta la CPT y sopla lo más fuerte y rápido que puede hasta vaciarlos (VR). El volumen total es la capacidad vital forzada (FVC); lo que sale en el primer segundo, el FEV1.',
      'En un adulto sano sale en el primer segundo cerca del 80 % de la FVC. El pico de flujo (PEF) se alcanza enseguida y luego el flujo baja casi en línea recta.',
      'Esa caída no depende del esfuerzo: al soplar fuerte, la presión pleural comprime la vía aérea y limita el flujo. Por eso la forma de la curva informa del estado de la vía aérea y no de cuánto sople el paciente.',
    ],
  },
  {
    id: 'asma',
    nombre: 'Asma',
    grupo: 'Obstrucción de vías pequeñas',
    params: p({ tlc: 6.2, rv: 1.7, fmaxCoef: 0.75, fmaxExp: 1.4, fiMax: 5 }),
    postBd: p({ tlc: 6.2, rv: 1.4, fmaxCoef: 1.25, fmaxExp: 1.2, fiMax: 5.8 }),
    explicacion: [
      'La vía aérea está estrechada por broncoespasmo, edema e inflamación: el aire sale despacio, cae el FEV1 más que la FVC y el cociente FEV1/FVC baja del 70 %.',
      'La rama espiratoria se vuelve cóncava («excavada») porque los flujos a volúmenes bajos, que dependen de las vías pequeñas, caen mucho.',
      'Lo característico es la REVERSIBILIDAD: tras un broncodilatador (salbutamol), el FEV1 mejora claramente. Una prueba broncodilatadora negativa no descarta el asma (puede estar bien controlada en ese momento).',
    ],
  },
  {
    id: 'epoc',
    nombre: 'EPOC (enfisema)',
    grupo: 'Obstrucción de vías pequeñas',
    escala: 'gold',
    params: p({ tlc: 7.2, rv: 3, fmaxCoef: 0.5, fmaxExp: 1.5, fiMax: 4.5 }),
    postBd: p({ tlc: 7.2, rv: 2.95, fmaxCoef: 0.54, fmaxExp: 1.5, fiMax: 4.6 }),
    explicacion: [
      'El diagnóstico de EPOC exige un FEV1/FVC < 0,70 TRAS el broncodilatador (GOLD), en una persona con síntomas y exposición (sobre todo tabaco).',
      'Al perder la retracción elástica, la vía aérea se colapsa enseguida: el pico es bajo y la curva cae de golpe y se hace muy cóncava. La espiración se alarga mucho (más de 6 segundos).',
      'La obstrucción apenas mejora con el broncodilatador. La gravedad se gradúa con el FEV1 (% del teórico): GOLD 1 a 4. El VR alto (atrapamiento aéreo) hace que la FVC también baje algo.',
    ],
  },
  {
    id: 'fibrosis',
    nombre: 'Fibrosis pulmonar',
    grupo: 'Restricción',
    params: p({ tlc: 4, rv: 0.9, fmaxCoef: 2.6, fiMax: 4.5 }),
    explicacion: [
      'Los pulmones son pequeños y rígidos: la FVC baja, y el FEV1 baja en proporción, así que el cociente FEV1/FVC es normal o incluso alto.',
      'La curva flujo‑volumen es una «versión en miniatura» de la normal, estrecha y alta: el pulmón fibrótico tira con fuerza de la vía aérea y la mantiene abierta, de modo que los flujos son altos para ese volumen.',
      'La espirometría solo sugiere restricción. Para confirmarla hay que medir la CPT (pletismografía); la difusión (DLCO) suele estar baja.',
    ],
  },
  {
    id: 'neuromuscular',
    nombre: 'Enfermedad neuromuscular',
    grupo: 'Restricción',
    params: p({ tlc: 4.2, rv: 1.5, esfuerzo: 4.5, fiMax: 2.8 }),
    explicacion: [
      'Los músculos débiles no permiten llenar del todo el pulmón ni vaciarlo bien: la FVC baja y el VR sube. El cociente FEV1/FVC es normal.',
      'A diferencia de la fibrosis, el PICO de flujo (que sí depende del esfuerzo) es bajo y la curva tiene un pico redondeado. La rama inspiratoria también es pequeña.',
      'Es útil comparar la FVC sentado y tumbado: si cae mucho en decúbito, sugiere debilidad del diafragma.',
    ],
  },
  {
    id: 'mixto',
    nombre: 'Mixto (obstrucción + restricción)',
    grupo: 'Restricción',
    params: p({ tlc: 4.8, rv: 1.8, fmaxCoef: 0.65, fmaxExp: 1.4, fiMax: 4 }),
    explicacion: [
      'Cociente FEV1/FVC bajo (obstrucción) con una FVC muy reducida. Puede haber una restricción añadida… o solo atrapamiento aéreo, que también reduce la FVC.',
      'La espirometría no puede distinguirlos: el patrón mixto se confirma cuando la CPT medida está baja (pletismografía).',
    ],
  },
  {
    id: 'fija',
    nombre: 'Obstrucción fija (estenosis traqueal)',
    grupo: 'Vía aérea central',
    params: p({ techoEsp: 2.6, techoInsp: 2.4 }),
    explicacion: [
      'Una estrechez rígida de la vía aérea grande (estenosis tras intubación, bocio que comprime) limita el flujo por igual al soplar y al inspirar, porque su calibre no cambia con la presión.',
      'Resultado: MESETAS en las dos ramas de la curva flujo‑volumen. El FEV1 baja y el PEF baja mucho más, así que el índice de Empey (FEV1 en mL / PEF en L/min) sube por encima de 10.',
      'Por eso es importante mirar la curva y no solo los números: un cociente FEV1/FVC bajo puede deberse a la vía aérea central y no a un asma o una EPOC.',
    ],
  },
  {
    id: 'extratoracica',
    nombre: 'Obstrucción variable extratorácica',
    grupo: 'Vía aérea central',
    params: p({ techoInsp: 1.8 }),
    explicacion: [
      'La lesión está FUERA del tórax (parálisis de cuerdas vocales, laringe) y su calibre cambia con la presión.',
      'Al inspirar, la presión dentro de la vía es menor que la atmosférica que la rodea: la estrechez se cierra y aparece una meseta en la rama INSPIRATORIA. Al espirar, la presión interna la abre y la rama espiratoria es normal.',
      'Clínicamente: estridor inspiratorio. El FEV1 y el cociente pueden ser normales; solo la curva lo delata.',
    ],
  },
  {
    id: 'intratoracica',
    nombre: 'Obstrucción variable intratorácica',
    grupo: 'Vía aérea central',
    params: p({ techoEsp: 2.4 }),
    explicacion: [
      'La lesión está DENTRO del tórax (tumor de la tráquea torácica o de un bronquio principal, traqueomalacia).',
      'Al espirar con fuerza, la presión pleural positiva comprime la estrechez: meseta en la rama ESPIRATORIA. Al inspirar, la presión pleural negativa la abre y la rama inspiratoria es normal.',
      'El FEV1/FVC puede salir bajo y confundirse con una obstrucción de vías pequeñas, pero la forma de la curva (meseta y no concavidad) la diferencia.',
    ],
  },
];

export const GRUPOS_ESPIRO = ['Referencia', 'Obstrucción de vías pequeñas', 'Restricción', 'Vía aérea central'] as const;
export const getCasoEspiro = (id: string) => CASOS_ESPIRO.find((c) => c.id === id) ?? CASOS_ESPIRO[0];
