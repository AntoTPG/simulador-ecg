/**
 * ============================================================================
 *  CATÁLOGO DE RUIDOS CARDÍACOS
 * ============================================================================
 * Cada ruido es un objeto de DATOS:
 *  - qué elementos acústicos tiene (R3, R4, clics, soplos…) y su forma;
 *  - cómo se desdobla el R2;
 *  - qué cambia en la hemodinámica (para el diagrama de Wiggers);
 *  - explicación breve y foco de auscultación.
 *
 * Contenido elaborado a partir de:
 *  - Manual MSD (versión para profesionales), «Auscultación cardíaca»:
 *    https://www.msdmanuals.com/es/professional/trastornos-cardiovasculares/abordaje-del-paciente-cardíaco/auscultación-cardíaca
 *  - Heart Sound and Murmur Library, University of Michigan Medical School
 *    (Judge R., Mangrulkar R., 2015; CC BY‑SA 4.0), con grabaciones reales:
 *    https://hdl.handle.net/2027.42/120554
 * Los sonidos de la app son SINTETIZADOS a partir del modelo (no son grabaciones).
 */
import type { HemoParams } from '../engine/hemodynamics';

export type Foco = 'aortico' | 'pulmonar' | 'erb' | 'tricuspideo' | 'mitral';

export const FOCO_INFO: Record<Foco, { nombre: string; lugar: string }> = {
  aortico: { nombre: 'Foco aórtico', lugar: '2.º espacio intercostal, borde esternal derecho' },
  pulmonar: { nombre: 'Foco pulmonar', lugar: '2.º espacio intercostal, borde esternal izquierdo' },
  erb: { nombre: 'Foco de Erb', lugar: '3.er espacio intercostal, borde esternal izquierdo' },
  tricuspideo: { nombre: 'Foco tricuspídeo', lugar: '4.º–5.º espacio intercostal, borde esternal izquierdo' },
  mitral: { nombre: 'Foco mitral (ápex)', lugar: '5.º espacio intercostal, línea medioclavicular izquierda' },
};

export type MurmurShape =
  | 'romboidal' // creciente‑decreciente, mesosistólico (eyección)
  | 'eyectivoSuave' // breve, protomesosistólico (inocente)
  | 'holosistolico' // en meseta, de R1 a R2 (regurgitación)
  | 'telesistolico' // tras un clic mesosistólico (prolapso mitral)
  | 'decreciente' // protodiastólico decreciente (insuficiencia aórtica)
  | 'retumbo' // mesodiastólico grave con refuerzo presistólico (estenosis mitral)
  | 'continuo'; // "en maquinaria" a través del R2 (ductus)

export type SoundElement =
  | { tipo: 'R3' }
  | { tipo: 'R4' }
  | { tipo: 'clicEyeccion' }
  | { tipo: 'clicMesosistolico' }
  | { tipo: 'chasquidoApertura'; retraso: number }
  | { tipo: 'knock' }
  | { tipo: 'roce' }
  | { tipo: 'soplo'; forma: MurmurShape; tono: 'grave' | 'medio' | 'agudo'; intensidad: number };

export type Split = 'fisiologico' | 'amplio' | 'fijo' | 'paradojico' | 'unico';

export interface HeartSoundDef {
  id: string;
  nombre: string;
  tipo: 'fisiologico' | 'patologico';
  grupo: string;
  foco: Foco;
  /** Parte del estetoscopio con que se oye mejor. */
  estetoscopio: 'membrana' | 'campana';
  /** Resumen de una línea (onomatopeya o patrón). */
  patron: string;
  explicacion: string[];
  desdoblamiento: Split;
  /** Intensidad relativa del R1 (1 = normal) y del P2. */
  r1?: number;
  p2?: number;
  elementos: SoundElement[];
  hemo?: Partial<HemoParams>;
  /** Patología del ECG relacionada (id del desplegable de patologías). */
  ecgAsociado?: string;
}

export const HEART_SOUNDS: HeartSoundDef[] = [
  // ======================= FISIOLÓGICOS =======================
  {
    id: 'normal',
    nombre: 'R1 y R2 normales',
    tipo: 'fisiologico',
    grupo: 'Ruidos normales',
    foco: 'mitral',
    estetoscopio: 'membrana',
    patron: '«lub‑dub»: R1 · sístole · R2 · diástole (más larga)',
    explicacion: [
      'El R1 ("lub") se produce al cerrarse las válvulas mitral y tricúspide al comienzo de la sístole; coincide aproximadamente con el final del QRS y con el latido de la punta. Se oye mejor en el ápex.',
      'El R2 ("dub") corresponde al cierre de las válvulas aórtica (A2) y pulmonar (P2) al terminar la eyección, hacia el final de la onda T. Es más agudo y breve, y se oye mejor en la base.',
      'La sístole (de R1 a R2) es más corta que la diástole; con la taquicardia la diástole se acorta y ambos silencios se igualan.',
    ],
    desdoblamiento: 'fisiologico',
    p2: 0.35,
    elementos: [],
  },
  {
    id: 'desdoblamiento-fisiologico',
    nombre: 'Desdoblamiento fisiológico del R2',
    tipo: 'fisiologico',
    grupo: 'Ruidos normales',
    foco: 'pulmonar',
    estetoscopio: 'membrana',
    patron: 'R2 único en espiración · «R2 doble» (A2‑P2) en inspiración',
    explicacion: [
      'En la inspiración la presión intratorácica negativa aumenta el retorno venoso al corazón derecho: el VD tarda más en vaciarse y la válvula pulmonar se cierra más tarde (P2 se retrasa).',
      'A la vez, se acumula sangre en los pulmones, llega menos al corazón izquierdo y la aórtica se cierra algo antes. Resultado: A2 y P2 se separan y se oyen dos componentes; en la espiración vuelven a fusionarse.',
      'Se oye mejor en el foco pulmonar. En la app la respiración dura 5 s: fíjate en el R2 del fonocardiograma durante la fase de «inspiración».',
    ],
    desdoblamiento: 'fisiologico',
    p2: 0.85,
    elementos: [],
  },
  {
    id: 'r3-fisiologico',
    nombre: 'R3 fisiológico',
    tipo: 'fisiologico',
    grupo: 'Ruidos normales',
    foco: 'mitral',
    estetoscopio: 'campana',
    patron: 'R1 · R2‑R3 («Ken‑tuc‑ky»)',
    explicacion: [
      'Ruido grave protodiastólico, al final del llenado rápido, cuando la sangre que entra choca con un ventrículo que se distiende con rapidez.',
      'Es normal en niños, adultos jóvenes (hasta ~40 años), deportistas y embarazadas, porque tienen un llenado ventricular muy rápido.',
      'Se oye con la campana en el ápex, con el paciente en decúbito lateral izquierdo.',
    ],
    desdoblamiento: 'fisiologico',
    p2: 0.35,
    elementos: [{ tipo: 'R3' }],
    hemo: { tauFill: 65 },
  },
  {
    id: 'soplo-inocente',
    nombre: 'Soplo inocente (funcional)',
    tipo: 'fisiologico',
    grupo: 'Soplos sistólicos',
    foco: 'erb',
    estetoscopio: 'membrana',
    patron: 'Soplo sistólico suave, breve y precoz (grado 1–2/6)',
    explicacion: [
      'Ligera turbulencia del flujo al salir por válvulas y tractos de salida NORMALES. Es muy frecuente en niños, y también en embarazadas, fiebre, anemia o hipertiroidismo (aumento del gasto cardíaco).',
      'Es protomesosistólico, de baja intensidad, no irradia, cambia con la postura y nunca es diastólico. Los ruidos R1 y R2 son normales.',
      'Un soplo diastólico, continuo, intenso (≥ 3/6) o con frémito NO es inocente y debe estudiarse con ecocardiografía.',
    ],
    desdoblamiento: 'fisiologico',
    p2: 0.4,
    elementos: [{ tipo: 'soplo', forma: 'eyectivoSuave', tono: 'medio', intensidad: 0.35 }],
  },

  // ======================= GALOPES =======================
  {
    id: 'r3-patologico',
    nombre: 'R3 patológico (galope ventricular)',
    tipo: 'patologico',
    grupo: 'Galopes',
    foco: 'mitral',
    estetoscopio: 'campana',
    patron: 'R1 · R2‑R3 («Ken‑tuc‑ky») en un adulto',
    explicacion: [
      'En adultos mayores de 40 años, un R3 indica sobrecarga de volumen o disfunción sistólica: un ventrículo dilatado, con presión de llenado alta, recibe la sangre de golpe al abrirse la mitral.',
      'Fíjate en el diagrama: volumen telediastólico alto, fracción de eyección baja y presión telediastólica elevada. Aparece en la insuficiencia cardíaca y en la insuficiencia mitral grave.',
      'Es grave y de baja frecuencia: se oye con la campana en el ápex, en decúbito lateral izquierdo y en espiración.',
    ],
    desdoblamiento: 'fisiologico',
    p2: 0.4,
    elementos: [{ tipo: 'R3' }],
    hemo: { esv: 125, fillVol: 70, edpRef: 22, psys: 105, tauFill: 60 },
  },
  {
    id: 'r4',
    nombre: 'R4 (galope auricular)',
    tipo: 'patologico',
    grupo: 'Galopes',
    foco: 'mitral',
    estetoscopio: 'campana',
    patron: 'R4‑R1 · R2 («Ten‑nes‑see»)',
    explicacion: [
      'Ruido grave telediastólico (presistólico): la aurícula se contrae con fuerza contra un ventrículo RÍGIDO, poco distensible.',
      'Típico de la hipertrofia ventricular (hipertensión, estenosis aórtica, miocardiopatía hipertrófica) y de la isquemia aguda. A diferencia del R3, el R4 siempre es patológico.',
      'Necesita una contracción auricular eficaz: NO existe en la fibrilación auricular. Compruébalo eligiendo «Fibrilación auricular» en el ECG: el R4 desaparece.',
    ],
    desdoblamiento: 'fisiologico',
    p2: 0.4,
    elementos: [{ tipo: 'R4' }],
    hemo: { edpRef: 22, kickVol: 24, aWave: 9, esv: 45, fillVol: 45 },
    ecgAsociado: 'hvi',
  },
  {
    id: 'galope-suma',
    nombre: 'Galope de suma (R3 + R4)',
    tipo: 'patologico',
    grupo: 'Galopes',
    foco: 'mitral',
    estetoscopio: 'campana',
    patron: 'R4‑R1 · R2‑R3; con taquicardia se fusionan en un solo ruido',
    explicacion: [
      'Coexisten R3 (llenado rápido de un ventrículo dilatado) y R4 (contracción auricular contra un ventrículo rígido). Indica insuficiencia cardíaca avanzada.',
      'Cuando la frecuencia sube, la diástole se acorta y ambos ruidos coinciden en mesodiástole: «galope de suma». Sube la FC en los controles y observa cómo se acercan en el fonocardiograma.',
    ],
    desdoblamiento: 'fisiologico',
    p2: 0.4,
    elementos: [{ tipo: 'R3' }, { tipo: 'R4' }],
    hemo: { esv: 120, fillVol: 60, edpRef: 24, kickVol: 18, aWave: 8, psys: 105, tauFill: 60 },
  },

  // ======================= DESDOBLAMIENTOS DEL R2 =======================
  {
    id: 'desdoblamiento-amplio',
    nombre: 'Desdoblamiento amplio del R2',
    tipo: 'patologico',
    grupo: 'Desdoblamientos del R2',
    foco: 'pulmonar',
    estetoscopio: 'membrana',
    patron: 'A2‑P2 separados en espiración y aún más en inspiración',
    explicacion: [
      'El cierre pulmonar (P2) se retrasa siempre, pero conserva la variación respiratoria.',
      'Causas: bloqueo de rama derecha (el VD se activa tarde), estenosis pulmonar, hipertensión pulmonar o TEP.',
    ],
    desdoblamiento: 'amplio',
    p2: 0.9,
    elementos: [],
    ecgAsociado: 'bloqueo-rama-derecha',
  },
  {
    id: 'desdoblamiento-fijo',
    nombre: 'Desdoblamiento fijo del R2',
    tipo: 'patologico',
    grupo: 'Desdoblamientos del R2',
    foco: 'pulmonar',
    estetoscopio: 'membrana',
    patron: 'A2‑P2 separados igual en inspiración y espiración',
    explicacion: [
      'Signo característico de la comunicación interauricular (CIA tipo ostium secundum).',
      'El cortocircuito izquierda‑derecha mantiene el VD con sobrecarga de volumen en todo momento: su vaciado se prolonga y P2 se retrasa. Como las aurículas están comunicadas, la respiración ya no modifica el desfase.',
      'Suele acompañarse de un soplo sistólico pulmonar por hiperaflujo (no del paso de sangre por la propia CIA).',
    ],
    desdoblamiento: 'fijo',
    p2: 0.9,
    elementos: [{ tipo: 'soplo', forma: 'eyectivoSuave', tono: 'medio', intensidad: 0.4 }],
  },
  {
    id: 'desdoblamiento-paradojico',
    nombre: 'Desdoblamiento paradójico (invertido) del R2',
    tipo: 'patologico',
    grupo: 'Desdoblamientos del R2',
    foco: 'pulmonar',
    estetoscopio: 'membrana',
    patron: 'P2‑A2 separados en espiración · R2 único en inspiración',
    explicacion: [
      'El cierre AÓRTICO se retrasa tanto que P2 ocurre antes que A2. En la inspiración P2 se retrasa y se superpone a A2, así que el desdoblamiento desaparece: al revés de lo normal.',
      'Causas: bloqueo de rama izquierda (el VI se activa tarde), estenosis aórtica grave, miocardiopatía hipertrófica obstructiva o marcapasos en el VD.',
    ],
    desdoblamiento: 'paradojico',
    p2: 0.9,
    elementos: [],
    ecgAsociado: 'bloqueo-rama-izquierda',
  },

  // ======================= CLICS Y CHASQUIDOS =======================
  {
    id: 'clic-eyeccion',
    nombre: 'Clic de eyección',
    tipo: 'patologico',
    grupo: 'Clics y chasquidos',
    foco: 'aortico',
    estetoscopio: 'membrana',
    patron: 'R1‑clic (muy agudo, justo tras el R1) · R2',
    explicacion: [
      'Ruido muy agudo y breve al comienzo de la sístole, cuando una válvula semilunar deformada pero móvil se abre bruscamente y "se tensa".',
      'Típico de la válvula aórtica bicúspide y de la estenosis aórtica o pulmonar congénita; también de la dilatación de la raíz aórtica o la hipertensión pulmonar.',
      'Su momento no cambia con las maniobras (a diferencia del clic del prolapso mitral).',
    ],
    desdoblamiento: 'fisiologico',
    p2: 0.4,
    elementos: [{ tipo: 'clicEyeccion' }, { tipo: 'soplo', forma: 'romboidal', tono: 'medio', intensidad: 0.3 }],
  },
  {
    id: 'prolapso-mitral',
    nombre: 'Prolapso mitral (clic mesosistólico + soplo telesistólico)',
    tipo: 'patologico',
    grupo: 'Clics y chasquidos',
    foco: 'mitral',
    estetoscopio: 'membrana',
    patron: 'R1 · · clic ‑ shhh R2',
    explicacion: [
      'Los velos mitrales, redundantes (degeneración mixomatosa), se abomban hacia la aurícula en mitad de la sístole. Al tensarse bruscamente las cuerdas tendinosas aparece un CLIC mesosistólico agudo.',
      'Si después el cierre no es hermético, sigue un soplo telesistólico de insuficiencia mitral.',
      'Al ponerse de pie o con Valsalva el ventrículo se llena menos: el prolapso ocurre antes y el clic se acerca al R1. En cuclillas ocurre lo contrario.',
    ],
    desdoblamiento: 'fisiologico',
    p2: 0.4,
    elementos: [{ tipo: 'clicMesosistolico' }, { tipo: 'soplo', forma: 'telesistolico', tono: 'agudo', intensidad: 0.5 }],
    hemo: { mrFrac: 0.12, vWave: 10 },
  },

  // ======================= SOPLOS SISTÓLICOS =======================
  {
    id: 'estenosis-aortica',
    nombre: 'Estenosis aórtica',
    tipo: 'patologico',
    grupo: 'Soplos sistólicos',
    foco: 'aortico',
    estetoscopio: 'membrana',
    patron: 'Soplo sistólico de eyección, rudo, creciente‑decreciente; irradia a carótidas',
    explicacion: [
      'La válvula aórtica estrecha obliga al VI a generar mucha más presión que la aorta: mira en el diagrama el GRADIENTE entre la curva del VI (roja) y la aórtica (azul) durante la eyección.',
      'El flujo turbulento produce un soplo mesosistólico romboidal (creciente‑decreciente), rudo, en el foco aórtico, que irradia a las carótidas. Cuanto más grave, más tarde alcanza el máximo.',
      'En la estenosis grave el A2 se debilita y puede haber desdoblamiento paradójico; el pulso es débil y tardío (parvus et tardus) y el VI se hipertrofia (R4, HVI en el ECG).',
    ],
    desdoblamiento: 'paradojico',
    p2: 0.6,
    elementos: [{ tipo: 'soplo', forma: 'romboidal', tono: 'medio', intensidad: 0.85 }, { tipo: 'R4' }],
    hemo: { aoGrad: 65, psys: 108, edpRef: 15, kickVol: 20, aWave: 7 },
    ecgAsociado: 'hvi',
  },
  {
    id: 'insuficiencia-mitral',
    nombre: 'Insuficiencia mitral',
    tipo: 'patologico',
    grupo: 'Soplos sistólicos',
    foco: 'mitral',
    estetoscopio: 'membrana',
    patron: 'Soplo holosistólico en meseta, agudo, en el ápex; irradia a la axila',
    explicacion: [
      'Durante TODA la sístole parte de la sangre vuelve del VI a la aurícula izquierda: soplo holosistólico (de R1 a R2), de tono agudo y en meseta, que irradia a la axila.',
      'No hay verdadera contracción isovolumétrica (el volumen ya baja antes de abrirse la aórtica) y la presión de la aurícula izquierda muestra una onda v gigante.',
      'El R1 puede ser débil; en la insuficiencia grave el gran volumen que vuelve en diástole produce un R3.',
    ],
    desdoblamiento: 'fisiologico',
    r1: 0.6,
    p2: 0.4,
    elementos: [{ tipo: 'soplo', forma: 'holosistolico', tono: 'agudo', intensidad: 0.75 }, { tipo: 'R3' }],
    hemo: { mrFrac: 0.4, esv: 45, fillVol: 85, edpRef: 12, tauFill: 70 },
  },
  {
    id: 'civ',
    nombre: 'Comunicación interventricular (CIV)',
    tipo: 'patologico',
    grupo: 'Soplos sistólicos',
    foco: 'tricuspideo',
    estetoscopio: 'membrana',
    patron: 'Soplo holosistólico rudo e intenso en el borde esternal izquierdo, con frémito',
    explicacion: [
      'La sangre pasa del VI al VD a través del tabique durante toda la sístole, porque la presión del VI es mucho mayor.',
      'Produce un soplo holosistólico rudo en el borde esternal izquierdo bajo, a menudo con frémito. Paradójicamente, las CIV pequeñas suenan más fuerte (chorro de alta velocidad).',
      'Si aparece hipertensión pulmonar, el gradiente disminuye y el soplo se suaviza (síndrome de Eisenmenger).',
    ],
    desdoblamiento: 'fisiologico',
    p2: 0.6,
    elementos: [{ tipo: 'soplo', forma: 'holosistolico', tono: 'medio', intensidad: 0.95 }],
    hemo: { mrFrac: 0.25, fillVol: 75 },
  },

  // ======================= SOPLOS DIASTÓLICOS =======================
  {
    id: 'insuficiencia-aortica',
    nombre: 'Insuficiencia aórtica',
    tipo: 'patologico',
    grupo: 'Soplos diastólicos',
    foco: 'erb',
    estetoscopio: 'membrana',
    patron: 'Soplo protodiastólico decreciente, agudo y aspirativo, tras el R2',
    explicacion: [
      'En diástole parte de la sangre de la aorta vuelve al VI: soplo que empieza justo tras el R2 y va disminuyendo a medida que se igualan las presiones. Es agudo y suave ("aspirativo").',
      'Se oye mejor en el foco de Erb o el aórtico, con el paciente sentado, inclinado hacia delante y en espiración.',
      'Mira el diagrama: la presión aórtica cae mucho en diástole (presión diferencial muy amplia → pulso "saltón", signos de Musset, Quincke, Corrigan) y el VI se dilata por la sobrecarga de volumen.',
    ],
    desdoblamiento: 'fisiologico',
    p2: 0.4,
    elementos: [{ tipo: 'soplo', forma: 'decreciente', tono: 'agudo', intensidad: 0.6 }, { tipo: 'soplo', forma: 'eyectivoSuave', tono: 'medio', intensidad: 0.35 }],
    hemo: { tau: 600, pInf: 0, arLeak: 60, psys: 160, edpRef: 14 },
  },
  {
    id: 'estenosis-mitral',
    nombre: 'Estenosis mitral',
    tipo: 'patologico',
    grupo: 'Soplos diastólicos',
    foco: 'mitral',
    estetoscopio: 'campana',
    patron: 'R1 intenso · R2‑chasquido de apertura‑retumbo grave con refuerzo presistólico',
    explicacion: [
      'La mitral estrecha (casi siempre por fiebre reumática) frena el paso de la sangre de la aurícula al ventrículo: la presión de la AI sube (diagrama, curva morada) y el VI se llena despacio.',
      'Al abrirse la válvula rígida se oye un CHASQUIDO DE APERTURA agudo tras el R2; cuanto más grave la estenosis, más cerca está del R2. Después, un RETUMBO grave mesodiastólico (campana, ápex, decúbito lateral izquierdo) que se refuerza con la contracción auricular (presistólico).',
      'El R1 es fuerte. Con frecuencia aparece fibrilación auricular, que hace desaparecer el refuerzo presistólico: pruébalo eligiendo FA en el ECG.',
    ],
    desdoblamiento: 'fisiologico',
    r1: 1.6,
    p2: 0.6,
    elementos: [
      { tipo: 'chasquidoApertura', retraso: 70 },
      { tipo: 'soplo', forma: 'retumbo', tono: 'grave', intensidad: 0.85 },
    ],
    hemo: { mvGrad: 12, tauFill: 280, laBase: 18, fillVol: 55, aWave: 7, kickVol: 16 },
    ecgAsociado: 'fibrilacion-auricular',
  },

  // ======================= SOPLOS CONTINUOS =======================
  {
    id: 'ductus',
    nombre: 'Ductus arterioso persistente',
    tipo: 'patologico',
    grupo: 'Soplos continuos',
    foco: 'pulmonar',
    estetoscopio: 'membrana',
    patron: 'Soplo continuo «en maquinaria» que envuelve al R2',
    explicacion: [
      'El conducto arterioso, que en el feto comunica la aorta con la arteria pulmonar, no se cierra tras el nacimiento.',
      'Como la presión aórtica supera a la pulmonar tanto en sístole como en diástole, hay flujo durante todo el ciclo: soplo CONTINUO, máximo alrededor del R2 ("en maquinaria"), en la región infraclavicular izquierda.',
      'Los soplos continuos siempre son patológicos. La fuga diastólica hacia la pulmonar amplía la presión diferencial.',
    ],
    desdoblamiento: 'fisiologico',
    p2: 0.5,
    elementos: [{ tipo: 'soplo', forma: 'continuo', tono: 'medio', intensidad: 0.75 }],
    hemo: { tau: 900, pInf: 10, fillVol: 70, psys: 135 },
  },

  // ======================= PERICARDIO =======================
  {
    id: 'roce-pericardico',
    nombre: 'Roce pericárdico',
    tipo: 'patologico',
    grupo: 'Pericardio',
    foco: 'tricuspideo',
    estetoscopio: 'membrana',
    patron: 'Ruido áspero «de cuero» con 3 componentes por latido',
    explicacion: [
      'Las hojas del pericardio inflamadas rozan entre sí con el movimiento del corazón: ruido áspero, rasposo y superficial, "como pisar nieve" o frotar cuero.',
      'Puede tener tres componentes: sístole auricular, sístole ventricular y llenado diastólico rápido. Se oye mejor en el borde esternal izquierdo, sentado e inclinado hacia delante y en espiración.',
      'Es variable de un momento a otro y puede desaparecer si aparece un derrame que separa las hojas. Acompaña al ECG de la pericarditis.',
    ],
    desdoblamiento: 'fisiologico',
    p2: 0.4,
    elementos: [{ tipo: 'roce' }],
    ecgAsociado: 'pericarditis',
  },
  {
    id: 'knock-pericardico',
    nombre: 'Golpe (knock) pericárdico',
    tipo: 'patologico',
    grupo: 'Pericardio',
    foco: 'tricuspideo',
    estetoscopio: 'membrana',
    patron: 'R1 · R2‑knock (más precoz y agudo que un R3)',
    explicacion: [
      'En la pericarditis CONSTRICTIVA, un pericardio rígido y engrosado frena de golpe el llenado ventricular al principio de la diástole.',
      'Ese frenazo brusco produce un ruido protodiastólico seco, más precoz y agudo que un R3. En el diagrama, el volumen del VI deja de aumentar muy pronto y la presión diastólica es alta (signo de la "raíz cuadrada").',
    ],
    desdoblamiento: 'fisiologico',
    p2: 0.4,
    elementos: [{ tipo: 'knock' }],
    hemo: { tauFill: 45, fillVol: 42, edpRef: 20, kickVol: 4 },
  },
];

export const SOUND_GROUPS = [
  'Ruidos normales',
  'Galopes',
  'Desdoblamientos del R2',
  'Clics y chasquidos',
  'Soplos sistólicos',
  'Soplos diastólicos',
  'Soplos continuos',
  'Pericardio',
];

export const getSound = (id: string) => HEART_SOUNDS.find((s) => s.id === id) ?? HEART_SOUNDS[0];
