/**
 * ============================================================================
 *  CARDIOPATÍAS CONGÉNITAS (anatomía y fisiopatología)
 * ============================================================================
 * Cada malformación es un objeto de DATOS que describe:
 *  - qué defectos anatómicos tiene (el esquema los dibuja a partir de ellos);
 *  - la saturación de O₂ y la presión de cada cavidad y gran vaso (valores
 *    típicos de libro: orientativos, varían con la edad y la gravedad);
 *  - la dirección de los cortocircuitos;
 *  - la clínica y la conexión con los soplos y ECG de la app.
 *
 * Fuente: Manual MSD, versión para profesionales, Pediatría › «Anomalías
 * cardiovasculares congénitas» (generalidades y capítulos de cada anomalía):
 * https://www.msdmanuals.com/es/professional/pediatr%C3%ADa/anomal%C3%ADas-cardiovasculares-cong%C3%A9nitas
 */

export type Flujo = 'izq-dcha' | 'dcha-izq' | 'bidireccional';

export interface Cavidad {
  /** Saturación de O₂ (%). */
  sat: number;
  /** Presión (mmHg): sistólica/diastólica o media. */
  pres: string;
}

export interface Defectos {
  /** Comunicación interauricular. */
  cia?: { flujo: Flujo; grande?: boolean };
  /** Comunicación interventricular. */
  civ?: { flujo: Flujo; grande?: boolean };
  /** Ductus arterioso persistente. */
  ductus?: { flujo: Flujo };
  /** Obstrucción del tracto de salida del VD / estenosis pulmonar (0–1). */
  estenosisPulmonar?: number;
  /** La aorta nace a caballo sobre la CIV. */
  aortaCabalgante?: boolean;
  /** Hipertrofia del VD o del VI. */
  hvd?: boolean;
  hvi?: boolean;
  /** Dilatación por sobrecarga de volumen. */
  dilatadas?: ('AD' | 'VD' | 'AI' | 'VI' | 'AP')[];
  /** Coartación de aorta (estrechamiento tras la subclavia izquierda). */
  coartacion?: boolean;
  /** Transposición: la aorta sale del VD y la pulmonar del VI. */
  transposicion?: boolean;
}

export interface Congenita {
  id: string;
  nombre: string;
  /** Cianógena (cortocircuito D→I o circulaciones en paralelo) o acianógena. */
  tipo: 'normal' | 'acianogena' | 'cianogena';
  /** Frecuencia aproximada entre las cardiopatías congénitas. */
  frecuencia?: string;
  resumen: string;
  explicacion: string[];
  defectos: Defectos;
  /** Valores por cavidad. AoInf = aorta por debajo de la coartación. */
  valores: Record<'AD' | 'VD' | 'AP' | 'AI' | 'VI' | 'Ao', Cavidad> & { AoInf?: Cavidad };
  /** Relación de flujos pulmonar/sistémico. */
  qpqs: string;
  hallazgos: { titulo: string; texto: string }[];
  /** Ruido de la sección de auscultación relacionado (id de src/sounds/catalog.ts). */
  sonido?: string;
  /** Patología del ECG relacionada (id del desplegable). */
  ecg?: string;
}

const NORMAL_VALUES: Congenita['valores'] = {
  AD: { sat: 70, pres: '3' },
  VD: { sat: 70, pres: '25/4' },
  AP: { sat: 70, pres: '25/10' },
  AI: { sat: 98, pres: '8' },
  VI: { sat: 98, pres: '120/8' },
  Ao: { sat: 98, pres: '120/80' },
};

export const CONGENITAS: Congenita[] = [
  {
    id: 'normal',
    nombre: 'Corazón normal (referencia)',
    tipo: 'normal',
    resumen: 'Dos circulaciones EN SERIE: la sangre pasa por los pulmones y después por el cuerpo.',
    explicacion: [
      'La sangre desoxigenada (azul, ~70 % de saturación) vuelve del cuerpo por las cavas a la aurícula derecha, pasa al VD y este la impulsa por la arteria pulmonar a los pulmones.',
      'Oxigenada (roja, ~98 %), vuelve por las venas pulmonares a la aurícula izquierda, pasa al VI y sale por la aorta al cuerpo. Los tabiques interauricular e interventricular separan ambas circulaciones.',
      'Las presiones del lado izquierdo (sistémico) son mucho mayores que las del derecho (pulmonar). Por eso, si existe un orificio, la sangre pasa de izquierda a derecha.',
    ],
    defectos: {},
    valores: NORMAL_VALUES,
    qpqs: '1 : 1',
    hallazgos: [
      { titulo: 'Circulación fetal', texto: 'En el feto el foramen oval y el ductus permiten saltarse los pulmones; ambos se cierran tras el nacimiento al caer la resistencia pulmonar.' },
    ],
  },
  {
    id: 'cia',
    nombre: 'Comunicación interauricular (CIA)',
    tipo: 'acianogena',
    frecuencia: '~6–10 %',
    resumen: 'Orificio en el tabique interauricular (sobre todo ostium secundum) con cortocircuito izquierda → derecha.',
    explicacion: [
      'La aurícula izquierda tiene algo más de presión y, sobre todo, el VD es más distensible: la sangre oxigenada pasa de la AI a la AD durante la diástole.',
      'El corazón DERECHO soporta una sobrecarga de VOLUMEN (AD, VD y arteria pulmonar dilatadas) y los pulmones reciben más flujo del normal (Qp/Qs > 1,5 en las significativas). Fíjate en el "salto" de saturación en la AD (70 → 82 %).',
      'Suele dar pocos síntomas en la infancia; puede detectarse en adultos por disnea, arritmias auriculares o hipertensión pulmonar tardía.',
    ],
    defectos: { cia: { flujo: 'izq-dcha', grande: true }, dilatadas: ['AD', 'VD', 'AP'] },
    valores: { ...NORMAL_VALUES, AD: { sat: 82, pres: '4' }, VD: { sat: 82, pres: '30/4' }, AP: { sat: 82, pres: '30/12' } },
    qpqs: '≈ 2 : 1',
    hallazgos: [
      { titulo: 'Auscultación', texto: 'Desdoblamiento AMPLIO y FIJO del R2 y soplo sistólico eyectivo pulmonar por hiperaflujo (no por el paso de sangre a través de la CIA).' },
      { titulo: 'ECG', texto: 'Bloqueo incompleto de rama derecha y eje derecho (ostium secundum); eje izquierdo en el ostium primum.' },
      { titulo: 'Tratamiento', texto: 'Cierre percutáneo con dispositivo (secundum) o quirúrgico si hay repercusión (Qp/Qs > 1,5 o dilatación del VD).' },
    ],
    sonido: 'desdoblamiento-fijo',
    ecg: 'bloqueo-rama-derecha',
  },
  {
    id: 'civ',
    nombre: 'Comunicación interventricular (CIV)',
    tipo: 'acianogena',
    frecuencia: '~25–30 % (la más frecuente)',
    resumen: 'Orificio en el tabique interventricular (sobre todo perimembranoso) con cortocircuito izquierda → derecha en sístole.',
    explicacion: [
      'En sístole el VI (120 mmHg) empuja sangre oxigenada al VD (25 mmHg) y de ahí a la pulmonar: "salto" de saturación en el VD.',
      'Esa sangre da una vuelta extra por los pulmones y vuelve a la AI y al VI: la sobrecarga de VOLUMEN es del corazón IZQUIERDO (AI y VI dilatadas). Las CIV grandes producen insuficiencia cardíaca en los primeros meses e hipertensión pulmonar.',
      'Muchas CIV pequeñas (musculares) se cierran solas. Si una CIV grande no se corrige, la hipertensión pulmonar se hace irreversible y el cortocircuito se invierte (síndrome de Eisenmenger).',
    ],
    defectos: { civ: { flujo: 'izq-dcha', grande: true }, dilatadas: ['AI', 'VI', 'AP'] },
    valores: { ...NORMAL_VALUES, VD: { sat: 84, pres: '60/5' }, AP: { sat: 84, pres: '60/25' }, AI: { sat: 98, pres: '12' } },
    qpqs: '≈ 2–3 : 1',
    hallazgos: [
      { titulo: 'Auscultación', texto: 'Soplo HOLOSISTÓLICO rudo en el borde esternal izquierdo bajo, a menudo con frémito. Las pequeñas suenan más (chorro de alta velocidad).' },
      { titulo: 'ECG', texto: 'Normal si es pequeña; hipertrofia del VI o biventricular si es grande.' },
      { titulo: 'Tratamiento', texto: 'Vigilancia en las pequeñas; cierre quirúrgico (o percutáneo) en las grandes antes de que se establezca la hipertensión pulmonar.' },
    ],
    sonido: 'civ',
    ecg: 'hvi',
  },
  {
    id: 'eisenmenger',
    nombre: 'Síndrome de Eisenmenger (CIV evolucionada)',
    tipo: 'cianogena',
    resumen: 'La hipertensión pulmonar irreversible invierte el cortocircuito: ahora pasa sangre desoxigenada de derecha a izquierda.',
    explicacion: [
      'El hiperaflujo pulmonar mantenido durante años lesiona las arteriolas pulmonares (hipertrofia de la media, fibrosis de la íntima): la resistencia pulmonar llega a superar a la sistémica.',
      'La presión del VD iguala o supera a la del VI y el cortocircuito se hace DERECHA → IZQUIERDA: sangre azul pasa a la aorta (cianosis, policitemia, acropaquias).',
      'Por eso hay que cerrar los cortocircuitos grandes a tiempo: con Eisenmenger el cierre del defecto está contraindicado (el VD se quedaría sin "válvula de escape").',
    ],
    defectos: { civ: { flujo: 'dcha-izq', grande: true }, hvd: true },
    valores: { ...NORMAL_VALUES, VD: { sat: 70, pres: '120/8' }, AP: { sat: 70, pres: '120/70' }, VI: { sat: 88, pres: '120/8' }, Ao: { sat: 85, pres: '120/80' } },
    qpqs: '< 1 : 1',
    hallazgos: [
      { titulo: 'Clínica', texto: 'Cianosis, disnea, hemoptisis, policitemia y acropaquias; riesgo de embolias paradójicas.' },
      { titulo: 'Auscultación', texto: 'El soplo de la CIV se suaviza o desaparece (sin gradiente) y el P2 es muy intenso.' },
    ],
    sonido: 'r2-unico',
  },
  {
    id: 'ductus',
    nombre: 'Ductus arterioso persistente (DAP)',
    tipo: 'acianogena',
    frecuencia: '~5–10 % (más en prematuros)',
    resumen: 'El conducto que une la aorta con la arteria pulmonar no se cierra tras el nacimiento.',
    explicacion: [
      'Tras nacer, la presión aórtica supera a la pulmonar durante TODO el ciclo: pasa sangre de la aorta a la pulmonar en sístole y en diástole (cortocircuito izquierda → derecha).',
      'Los pulmones reciben flujo extra que vuelve a la AI y al VI: sobrecarga de volumen del corazón izquierdo. La "fuga" diastólica de la aorta amplía la presión diferencial (pulsos saltones).',
      'Es frecuente en prematuros, por inmadurez de la respuesta del ductus al aumento de oxígeno, y en la rubéola congénita.',
    ],
    defectos: { ductus: { flujo: 'izq-dcha' }, dilatadas: ['AI', 'VI', 'AP'] },
    valores: { ...NORMAL_VALUES, AP: { sat: 85, pres: '35/15' }, AI: { sat: 98, pres: '10' }, Ao: { sat: 98, pres: '120/45' } },
    qpqs: '≈ 2 : 1',
    hallazgos: [
      { titulo: 'Auscultación', texto: 'Soplo CONTINUO "en maquinaria" en la región infraclavicular izquierda, máximo alrededor del R2.' },
      { titulo: 'Exploración', texto: 'Pulsos saltones y presión diferencial amplia.' },
      { titulo: 'Tratamiento', texto: 'En prematuros, inhibidores de la ciclooxigenasa (ibuprofeno, indometacina) o paracetamol. Si no, cierre percutáneo o quirúrgico.' },
    ],
    sonido: 'ductus',
  },
  {
    id: 'fallot',
    nombre: 'Tetralogía de Fallot',
    tipo: 'cianogena',
    frecuencia: '~7–10 % (la cianógena más frecuente)',
    resumen: 'CIV grande + obstrucción del tracto de salida del VD + aorta cabalgante + hipertrofia del VD.',
    explicacion: [
      'Un desplazamiento anterior del tabique infundibular produce a la vez la CIV, la estenosis del tracto de salida del VD y la aorta "a caballo" sobre la CIV; la hipertrofia del VD es la consecuencia.',
      'Como la salida pulmonar está estrecha, al VD le cuesta más mandar sangre a los pulmones que a la aorta: parte de la sangre AZUL pasa por la CIV a la aorta (cortocircuito derecha → izquierda) → cianosis. Cuanto más grave la estenosis, más cianosis.',
      'Crisis hipóxicas: el llanto o el ejercicio aumentan el cortocircuito D→I. Los niños se ponen en cuclillas porque así aumenta la resistencia sistémica y se fuerza la sangre hacia los pulmones.',
    ],
    defectos: { civ: { flujo: 'dcha-izq', grande: true }, estenosisPulmonar: 0.7, aortaCabalgante: true, hvd: true },
    valores: { ...NORMAL_VALUES, VD: { sat: 70, pres: '110/6' }, AP: { sat: 70, pres: '15/8' }, VI: { sat: 95, pres: '110/6' }, Ao: { sat: 82, pres: '110/70' } },
    qpqs: '< 1 : 1',
    hallazgos: [
      { titulo: 'Auscultación', texto: 'Soplo sistólico eyectivo en el borde esternal izquierdo alto (por la ESTENOSIS pulmonar, no por la CIV) y R2 único. En las crisis el soplo se acorta o desaparece.' },
      { titulo: 'ECG y Rx', texto: 'Hipertrofia del VD y eje derecho. Radiografía: corazón "en forma de bota" (ápex levantado) con campos pulmonares oligohémicos.' },
      { titulo: 'Tratamiento', texto: 'Crisis: posición genupectoral, oxígeno, morfina, volumen, betabloqueante. Corrección completa en el primer año (cierre de la CIV y ampliación del tracto de salida).' },
    ],
    sonido: 'r2-unico',
  },
  {
    id: 'coartacion',
    nombre: 'Coartación de aorta',
    tipo: 'acianogena',
    frecuencia: '~6–8 %',
    resumen: 'Estrechamiento de la aorta, casi siempre justo después de la subclavia izquierda (zona del ductus).',
    explicacion: [
      'El VI tiene que vencer el estrechamiento: HIPERTENSIÓN en los brazos y la cabeza (por encima de la coartación) e hipoperfusión en el abdomen y las piernas (por debajo). El VI se hipertrofia.',
      'Con el tiempo se desarrolla circulación colateral a través de las arterias intercostales, que rodean el estrechamiento. Su dilatación erosiona el borde inferior de las costillas.',
      'Las formas graves debutan en el recién nacido al cerrarse el ductus (shock, pulsos femorales ausentes). Se asocia a la válvula aórtica bicúspide y al síndrome de Turner.',
    ],
    defectos: { coartacion: true, hvi: true },
    valores: { ...NORMAL_VALUES, VI: { sat: 98, pres: '160/10' }, Ao: { sat: 98, pres: '160/90' }, AoInf: { sat: 98, pres: '100/70' } },
    qpqs: '1 : 1',
    hallazgos: [
      { titulo: 'Exploración', texto: 'Pulsos femorales débiles y retrasados respecto a los radiales; TA en brazos > TA en piernas (diferencia > 20 mmHg).' },
      { titulo: 'Auscultación', texto: 'Soplo sistólico en la región interescapular (espalda); clic de eyección si hay válvula bicúspide.' },
      { titulo: 'Rx y tratamiento', texto: 'Muescas costales (signo de Roesler) y signo del "3". Angioplastia con stent o reparación quirúrgica; en neonatos, prostaglandina E1 para reabrir el ductus.' },
    ],
    sonido: 'clic-eyeccion',
    ecg: 'hvi',
  },
  {
    id: 'tga',
    nombre: 'Transposición de grandes arterias (d‑TGA)',
    tipo: 'cianogena',
    frecuencia: '~5–7 % (la cianógena más frecuente en el recién nacido)',
    resumen: 'La aorta sale del VD y la pulmonar del VI: dos circulaciones EN PARALELO en lugar de en serie.',
    explicacion: [
      'La sangre azul que vuelve del cuerpo va AD → VD → AORTA y vuelve al cuerpo sin pasar por los pulmones. La roja va AI → VI → PULMONAR y vuelve a los pulmones.',
      'Sin una comunicación entre ambos circuitos (foramen oval, CIA, CIV o ductus) es incompatible con la vida: solo la MEZCLA permite que algo de oxígeno llegue al cuerpo. Aquí se muestra la mezcla por una CIA.',
      'Cianosis intensa desde las primeras horas de vida, que no mejora con oxígeno. Es una urgencia neonatal.',
    ],
    defectos: { transposicion: true, cia: { flujo: 'bidireccional', grande: true } },
    valores: {
      AD: { sat: 60, pres: '4' },
      VD: { sat: 62, pres: '80/4' },
      AP: { sat: 92, pres: '25/10' },
      AI: { sat: 92, pres: '6' },
      VI: { sat: 92, pres: '25/6' },
      Ao: { sat: 65, pres: '80/50' },
    },
    qpqs: 'circuitos en paralelo',
    hallazgos: [
      { titulo: 'Rx', texto: 'Silueta cardíaca "en huevo colgado de un hilo" (pedículo vascular estrecho).' },
      { titulo: 'Urgencia', texto: 'Prostaglandina E1 para mantener abierto el ductus y atrioseptostomía con balón (Rashkind) para mejorar la mezcla.' },
      { titulo: 'Cirugía', texto: 'Corrección anatómica (switch arterial de Jatene) en las primeras semanas de vida.' },
    ],
  },
];

export const getCongenita = (id: string) => CONGENITAS.find((c) => c.id === id) ?? CONGENITAS[0];
