/**
 * ============================================================================
 *  PATOLOGÍAS RESPIRATORIAS (mecánica)
 * ============================================================================
 * Cada entrada cambia los parámetros del modelo (`mechanics.ts`) y describe qué
 * se ve en el acino 3D. Los números son orientativos: se han elegido para que
 * el modelo reproduzca los rasgos de libro (CRF, distensibilidad, resistencia,
 * patrón respiratorio), no para representar a un paciente concreto.
 *
 * Fuentes (redactado con palabras propias):
 *  - West JB, Luks AM. Fisiología respiratoria. Fundamentos (mecánica, valores normales).
 *  - West JB. Fisiopatología pulmonar (obstructivas y restrictivas).
 *  - Manual MSD, versión para profesionales: «Asma», «Enfermedad pulmonar
 *    obstructiva crónica», «Fibrosis pulmonar idiopática», «Síndrome de
 *    obesidad‑hipoventilación», «Generalidades sobre las pruebas de función pulmonar».
 */
import { RESP_NORMAL, type RespParams } from './mechanics';

export type GrupoResp = 'Referencia' | 'Obstructivas' | 'Restrictivas';

/** Qué se dibuja en el acino 3D. */
export interface AcinoVisual {
  /** Luz del bronquiolo (1 = normal). */
  luz: number;
  /** Grosor de la pared del bronquiolo (1 = normal). */
  pared: number;
  /** Grosor del músculo liso (1 = normal). */
  musculo: number;
  /** Tapones de moco en la luz. */
  moco: boolean;
  /** Alvéolos: normales, destruidos y fusionados (enfisema) o con tabiques gruesos (fibrosis). */
  alveolos: 'normal' | 'enfisema' | 'fibrosis';
  /** Infiltrado inflamatorio en la pared (eosinófilos en el asma). */
  inflamacion: boolean;
  /** El bronquiolo se colapsa en la espiración (pérdida de la tracción radial). */
  colapsoEspiratorio: boolean;
}

export interface PatologiaResp {
  id: string;
  nombre: string;
  grupo: GrupoResp;
  params: RespParams;
  acino: AcinoVisual;
  /** Dónde está el problema, en una frase. */
  donde: string;
  explicacion: string[];
  /** Lo que se observa en el modelo y en la clínica. */
  claves: string[];
}

const ACINO_NORMAL: AcinoVisual = {
  luz: 1,
  pared: 1,
  musculo: 1,
  moco: false,
  alveolos: 'normal',
  inflamacion: false,
  colapsoEspiratorio: false,
};

const def = (p: Omit<PatologiaResp, 'params' | 'acino'> & { params?: Partial<RespParams>; acino?: Partial<AcinoVisual> }): PatologiaResp => ({
  ...p,
  params: { ...RESP_NORMAL, ...p.params },
  acino: { ...ACINO_NORMAL, ...p.acino },
});

export const PATOLOGIAS_RESP: PatologiaResp[] = [
  def({
    id: 'normal',
    nombre: 'Normal',
    grupo: 'Referencia',
    donde: 'Respiración tranquila de un adulto sano.',
    explicacion: [
      'En reposo, el pulmón tiende a colapsarse y la pared torácica a expandirse. En la capacidad residual funcional (CRF) las dos fuerzas se equilibran y la presión pleural queda en unos −5 cmH₂O.',
      'Al inspirar, el diafragma se contrae: la presión pleural baja hasta unos −8 cmH₂O, el pulmón se distiende y la presión alveolar cae por debajo de la atmosférica (≈ −1 cmH₂O). Esa pequeña diferencia basta para que entre el aire.',
      'La espiración tranquila es pasiva: los músculos se relajan, la retracción elástica del pulmón comprime el aire alveolar (≈ +1 cmH₂O) y este sale.',
      'Los alvéolos se mantienen abiertos gracias al surfactante y a la tracción de los tabiques vecinos, que también tiran de los bronquiolos y los mantienen abiertos.',
    ],
    claves: ['CRF ≈ 2,4 L, volumen corriente ≈ 0,5 L, 12–15 rpm', 'Distensibilidad pulmonar ≈ 0,2 L/cmH₂O', 'Resistencia de la vía aérea ≈ 2 cmH₂O·s/L'],
  }),
  def({
    id: 'asma',
    nombre: 'Asma (crisis)',
    grupo: 'Obstructivas',
    params: { rInsp: 9, rExp: 14, fmaxCoef: 0.7, fmaxExp: 1.3, fr: 22, tiFrac: 0.38, pmus: 14 },
    acino: { luz: 0.45, pared: 1.7, musculo: 2.4, moco: true, inflamacion: true },
    donde: 'En la VÍA AÉREA: los alvéolos son normales.',
    explicacion: [
      'Inflamación crónica de la vía aérea (eosinófilos, mastocitos, linfocitos Th2) que la hace hiperreactiva. En una crisis, el músculo liso se contrae (broncoespasmo), la pared se engruesa por edema e inflamación y la luz se llena de moco.',
      'La resistencia sube mucho y, como el radio cuenta elevado a la cuarta potencia, un estrechamiento moderado multiplica la resistencia. Respirar cuesta más: la presión pleural oscila mucho más que en reposo.',
      'La espiración necesita más tiempo del que hay, y el pulmón no llega a vaciarse antes de la siguiente inspiración: atrapamiento aéreo e hiperinsuflación dinámica, con PEEP intrínseca.',
      'Es REVERSIBLE: con broncodilatadores la obstrucción mejora de forma clara, algo que se comprueba en la espirometría.',
    ],
    claves: ['↑↑ resistencia, distensibilidad pulmonar normal', 'Atrapamiento aéreo: el volumen al final de la espiración sube sobre la CRF', 'Taquipnea y gran esfuerzo inspiratorio; sibilancias'],
  }),
  def({
    id: 'enfisema',
    nombre: 'EPOC: enfisema',
    grupo: 'Obstructivas',
    params: { tlc: 7.2, rv: 3, kLung: 0.11, rInsp: 3, rExp: 6, fmaxCoef: 0.5, fmaxExp: 1.5, fr: 18, pmus: 7 },
    acino: { luz: 0.9, pared: 0.8, alveolos: 'enfisema', colapsoEspiratorio: true },
    donde: 'En los ALVÉOLOS, y por eso también en los bronquiolos.',
    explicacion: [
      'Destrucción de las paredes alveolares (sobre todo por el tabaco: desequilibrio proteasas–antiproteasas), sin fibrosis. Los alvéolos se fusionan en espacios aéreos grandes y se pierde superficie de intercambio y lecho capilar.',
      'Al perder tejido elástico, el pulmón se vuelve MÁS distensible y tira menos hacia dentro. La pared torácica gana el pulso: la CRF, el volumen residual y la capacidad pulmonar total aumentan (tórax en tonel).',
      'Los bronquiolos pequeños no tienen cartílago: se mantienen abiertos porque los tabiques alveolares tiran de ellos. Sin esa tracción radial, se colapsan al espirar (compresión dinámica) y el flujo espiratorio queda limitado aunque se haga más fuerza.',
      'Resultado: atrapamiento aéreo, PEEP intrínseca y diafragma aplanado que trabaja en desventaja. La obstrucción NO es reversible del todo.',
    ],
    claves: ['↑ distensibilidad, ↓ retracción elástica', '↑ CRF, ↑ VR y ↑ CPT (hiperinsuflación)', 'Flujo espiratorio limitado por colapso de la vía aérea'],
  }),
  def({
    id: 'fibrosis',
    nombre: 'Fibrosis pulmonar',
    grupo: 'Restrictivas',
    params: { tlc: 4, rv: 0.9, kLung: 0.025, vcwRest: 3.2, fr: 24, tiFrac: 0.42, pmus: 10 },
    acino: { alveolos: 'fibrosis', luz: 1.05 },
    donde: 'En el INTERSTICIO: los tabiques alveolares.',
    explicacion: [
      'Depósito de colágeno y fibroblastos en los tabiques alveolares (por ejemplo, la fibrosis pulmonar idiopática). Los tabiques se engruesan y el pulmón se vuelve rígido.',
      'La distensibilidad cae: hace falta mucha más presión para meter el mismo volumen. El pulmón tira más hacia dentro y la CRF y la CPT bajan (volúmenes pequeños).',
      'La vía aérea es normal o incluso más ancha, porque el pulmón rígido tira con fuerza de los bronquiolos: la resistencia no sube y los flujos se conservan.',
      'Para gastar menos energía en distender un pulmón rígido, el paciente respira rápido y superficial. Además, el tabique grueso dificulta la difusión del O₂: desaturación con el esfuerzo.',
    ],
    claves: ['↓↓ distensibilidad pulmonar', '↓ CRF, ↓ CPT, ↓ VR (restricción)', 'Respiración rápida y superficial; crepitantes «tipo velcro»'],
  }),
  def({
    id: 'obesidad',
    nombre: 'Obesidad',
    grupo: 'Restrictivas',
    params: { ccw: 0.08, vcwRest: 2.2, tlc: 5.4, fr: 18, pmus: 9 },
    donde: 'FUERA del pulmón: en la pared torácica y el abdomen.',
    explicacion: [
      'El pulmón es normal. El peso del tórax y del abdomen hace la pared torácica menos distensible y empuja el diafragma hacia arriba.',
      'El equilibrio entre pulmón y pared se desplaza a un volumen menor: baja la CRF (sobre todo a costa del volumen de reserva espiratorio), más aún en decúbito.',
      'Respirar cerca del volumen residual favorece que se cierren vías aéreas pequeñas en las bases: zonas mal ventiladas e hipoxemia leve.',
      'En casos graves puede aparecer hipoventilación con hipercapnia (síndrome de obesidad‑hipoventilación).',
    ],
    claves: ['Pulmón normal, ↓ distensibilidad de la pared', '↓ CRF y ↓ volumen de reserva espiratorio', 'Más trabajo respiratorio'],
  }),
  def({
    id: 'neuromuscular',
    nombre: 'Enfermedad neuromuscular',
    grupo: 'Restrictivas',
    params: { tlc: 4.2, fr: 24, pmus: 3 },
    acino: { luz: 0.95 },
    donde: 'FUERA del pulmón: en la «bomba» (nervios y músculos).',
    explicacion: [
      'En la ELA, la miastenia, el Guillain‑Barré o las distrofias musculares, los músculos respiratorios no generan suficiente fuerza. El pulmón y la vía aérea son normales.',
      'Cada respiración mueve poco aire, así que el paciente respira rápido y superficial. Con el tiempo aparecen microatelectasias y la distensibilidad baja un poco.',
      'No puede llegar a la CPT (inspiración débil) ni vaciar bien el pulmón (espiración débil): la capacidad vital cae. La tos es ineficaz y se acumulan secreciones.',
      'El riesgo es la hipoventilación con hipercapnia, que empeora en decúbito y durante el sueño.',
    ],
    claves: ['Pulmón normal, ↓ fuerza muscular', 'Volumen corriente pequeño, taquipnea', '↓ CPT y ↓ capacidad vital'],
  }),
];

export const GRUPOS_RESP: GrupoResp[] = ['Referencia', 'Obstructivas', 'Restrictivas'];

export const getPatologiaResp = (id: string) => PATOLOGIAS_RESP.find((p) => p.id === id) ?? PATOLOGIAS_RESP[0];
