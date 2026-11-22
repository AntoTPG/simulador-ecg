/**
 * ============================================================================
 *  PARED ARTERIAL: corte transversal normal y patológico
 * ============================================================================
 * Cada entrada es un objeto de DATOS. Los «rasgos» le dicen al dibujo qué
 * cambios tiene que pintar en cada capa (íntima, media, adventicia); el resto
 * es la explicación para estudiar.
 *
 * Fuentes:
 *  - Histología normal: Ross MH, Pawlina W. Histología, cap. 13 (sistema cardiovascular).
 *  - Manual MSD, versión para profesionales: «Arteriosclerosis no ateromatosa»,
 *    «Generalidades sobre los aneurismas aórticos», «Aneurismas de la aorta torácica»
 *    y capítulos de aterosclerosis, disección aórtica, vasculitis y sífilis.
 * Los esquemas son simplificados y no están a escala.
 */

export type Capa = 'intima' | 'media' | 'adventicia';
export type TipoVaso = 'muscular' | 'elastica' | 'arteriola';

/** Cambios que el dibujo representa. */
export interface Rasgos {
  /** Placa de ateroma: fase, grado de estenosis (0–1) y si hay trombo. */
  placa?: { fase: 'estria' | 'fibroateroma' | 'calcificada' | 'complicada'; estenosis: number };
  /** Arteriolosclerosis hialina: engrosamiento homogéneo y vítreo de la pared (0–1). */
  hialina?: number;
  /** Arteriolosclerosis hiperplásica: capas concéntricas «en bulbo de cebolla». */
  hiperplasica?: boolean;
  /** Necrosis fibrinoide (HTA maligna, PAN). */
  necrosisFibrinoide?: 'circunferencial' | 'segmentaria';
  /** Calcificación de la media (Mönckeberg). */
  calcioMedia?: boolean;
  /** Hipertrofia de la media (factor de grosor). */
  hipertrofiaMedia?: number;
  /** Aneurisma: dilatación con media adelgazada y trombo mural laminado. */
  aneurisma?: boolean;
  /** Disección: desgarro de la íntima y falsa luz dentro de la media. */
  diseccion?: boolean;
  /** Degeneración mucoide (quística) de la media. */
  degeneracionMucoide?: boolean;
  /** Arteritis granulomatosa (células gigantes) con rotura de la lámina elástica interna. */
  granulomas?: boolean;
  /** Engrosamiento concéntrico de la íntima (0–1), p. ej. en las vasculitis. */
  intimaEngrosada?: number;
  /** Infiltrado inflamatorio y dónde predomina. */
  inflamacion?: Capa[];
  /** Endarteritis obliterante de los vasa vasorum + cicatrices en la media (sífilis). */
  endarteritisVasa?: boolean;
  /** Superficie de la íntima arrugada («en corteza de árbol»). */
  cortezaArbol?: boolean;
}

export interface Nivel {
  id: string;
  etiqueta: string;
  detalle?: string;
  rasgos: Rasgos;
  explicacion?: string[];
  capas?: Partial<Record<Capa, string>>;
}

export interface PatologiaVaso {
  id: string;
  nombre: string;
  grupo: 'Referencia' | 'Aterosclerosis' | 'Arteriosclerosis no ateromatosa' | 'Aorta' | 'Vasculitis' | 'Infecciones';
  vaso: TipoVaso;
  resumen: string;
  explicacion: string[];
  /** Qué le pasa a cada capa (las que no aparecen, sin cambios relevantes). */
  capas: Partial<Record<Capa, string>>;
  clinica: string[];
  rasgos: Rasgos;
  niveles?: Nivel[];
  /** Índice del nivel inicial. */
  inicial?: number;
}

export const NOMBRE_VASO: Record<TipoVaso, string> = {
  muscular: 'Arteria muscular (p. ej., coronaria)',
  elastica: 'Arteria elástica (aorta)',
  arteriola: 'Arteriola',
};

export const CAPAS_NORMALES: Record<Capa, { nombre: string; texto: string }> = {
  intima: {
    nombre: 'Íntima',
    texto:
      'Endotelio (una sola capa de células planas sobre su membrana basal), una fina capa subendotelial de tejido conjuntivo y la lámina elástica interna, que en el corte se ve ondulada («festoneada»).',
  },
  media: {
    nombre: 'Media',
    texto:
      'Capas concéntricas de células musculares lisas. En las arterias musculares la separan de la adventicia la lámina elástica externa; en las elásticas (aorta) hay decenas de láminas elásticas fenestradas que amortiguan cada sístole.',
  },
  adventicia: {
    nombre: 'Adventicia',
    texto:
      'Tejido conjuntivo laxo con fibras de colágeno, nervios y, en los vasos grandes, los «vasa vasorum»: pequeños vasos que nutren la parte externa de la pared.',
  },
};

export const PATOLOGIAS_VASO: PatologiaVaso[] = [
  // ------------------------------------------------------------- REFERENCIA
  {
    id: 'normal-muscular',
    nombre: 'Arteria muscular normal',
    grupo: 'Referencia',
    vaso: 'muscular',
    resumen: 'Tres capas o túnicas: íntima, media y adventicia, separadas por las láminas elásticas interna y externa.',
    explicacion: [
      'Las arterias musculares (coronarias, radiales, femorales…) regulan cuánta sangre llega a cada órgano contrayendo o relajando su gruesa capa media de músculo liso.',
      'La lámina elástica interna se ve ondulada porque, al fijar el tejido, la arteria se contrae y la lámina se pliega.',
      'El endotelio no es un simple revestimiento: produce óxido nítrico (vasodilatador), evita la coagulación y controla qué pasa a la pared. Su lesión es el primer paso de la aterosclerosis.',
    ],
    capas: {},
    clinica: [],
    rasgos: {},
  },
  {
    id: 'normal-elastica',
    nombre: 'Aorta normal (arteria elástica)',
    grupo: 'Referencia',
    vaso: 'elastica',
    resumen: 'La media está formada por muchas láminas elásticas concéntricas con músculo liso entre ellas.',
    explicacion: [
      'En la sístole, la aorta se distiende y almacena parte de la energía; en la diástole, sus láminas elásticas recuperan su forma y siguen empujando la sangre (efecto Windkessel). Por eso el flujo periférico es continuo.',
      'Su pared es tan gruesa que la parte externa no se nutre desde la luz: la riegan los vasa vasorum de la adventicia.',
    ],
    capas: {},
    clinica: [],
    rasgos: {},
  },
  {
    id: 'normal-arteriola',
    nombre: 'Arteriola normal',
    grupo: 'Referencia',
    vaso: 'arteriola',
    resumen: 'Una o dos capas de músculo liso: son las «llaves de paso» de la resistencia vascular.',
    explicacion: [
      'Las arteriolas determinan la mayor parte de la resistencia periférica y, con ella, la presión arterial. Su capa media es fina (1–2 capas de células musculares) y la lámina elástica interna es delgada.',
    ],
    capas: {},
    clinica: [],
    rasgos: {},
  },

  // ------------------------------------------------------------- ATEROSCLEROSIS
  {
    id: 'aterosclerosis',
    nombre: 'Aterosclerosis (placa de ateroma)',
    grupo: 'Aterosclerosis',
    vaso: 'muscular',
    resumen: 'Enfermedad de la ÍNTIMA: placas de lípidos, células inflamatorias y fibrosis que estrechan la luz.',
    explicacion: [
      'Empieza con una disfunción endotelial (tabaco, hipertensión, LDL alto, diabetes): las LDL pasan a la íntima, se oxidan y atraen monocitos que se convierten en macrófagos cargados de lípidos («células espumosas»).',
      'Las células musculares lisas migran desde la media a la íntima y fabrican colágeno: así se forma una cápsula fibrosa que recubre un núcleo de lípidos y restos necróticos. La placa es excéntrica: ocupa solo una parte de la circunferencia.',
      'Al principio la arteria crece hacia fuera y conserva la luz (remodelado positivo); cuando la placa supera ~40 % del área, la luz empieza a estrecharse.',
    ],
    capas: {
      intima: 'Es la capa afectada: células espumosas, núcleo lipídico necrótico con cristales de colesterol, cápsula fibrosa y, en fases avanzadas, calcio y trombo.',
      media: 'Se adelgaza bajo la placa por la atrofia del músculo liso.',
      adventicia: 'Inflamación crónica y neovascularización de los vasa vasorum en placas avanzadas.',
    },
    clinica: [
      'Estenosis estable → angina de esfuerzo, claudicación intermitente.',
      'Rotura o erosión de la placa + trombo → síndrome coronario agudo, ictus isquémico.',
    ],
    rasgos: { placa: { fase: 'fibroateroma', estenosis: 0.45 } },
    inicial: 1,
    niveles: [
      {
        id: 'estria',
        etiqueta: 'Estría grasa',
        detalle: 'desde la infancia',
        rasgos: { placa: { fase: 'estria', estenosis: 0.06 } },
        explicacion: ['Lesión inicial: acúmulos de células espumosas bajo el endotelio. No estrecha la luz ni da síntomas, y puede ser reversible.'],
      },
      {
        id: 'fibroateroma',
        etiqueta: 'Placa fibroateromatosa',
        detalle: 'estenosis ~45 %',
        rasgos: { placa: { fase: 'fibroateroma', estenosis: 0.45 } },
        explicacion: ['Núcleo lipídico necrótico (con cristales de colesterol) cubierto por una cápsula fibrosa. Las placas con cápsula fina y núcleo grande son las más «vulnerables» a romperse.'],
      },
      {
        id: 'calcificada',
        etiqueta: 'Placa calcificada',
        detalle: 'estenosis ~70 %',
        rasgos: { placa: { fase: 'calcificada', estenosis: 0.7 } },
        explicacion: ['Placa avanzada con depósitos de calcio. Estrecha mucho la luz (angina de esfuerzo), aunque suele ser más estable. El calcio se ve en el TAC (índice de calcio coronario).'],
      },
      {
        id: 'complicada',
        etiqueta: 'Placa complicada (trombo)',
        detalle: 'oclusión casi total',
        rasgos: { placa: { fase: 'complicada', estenosis: 0.55 } },
        explicacion: ['La cápsula fibrosa se rompe y el núcleo lipídico, muy trombogénico, entra en contacto con la sangre: se forma un TROMBO que ocluye la luz en minutos. Es el mecanismo del infarto agudo de miocardio (ver la sección de infartos del ECG).'],
        capas: { intima: 'Rotura de la cápsula fibrosa y trombo de plaquetas y fibrina que ocupa la luz.' },
      },
    ],
  },

  // ------------------------------------------------------------- NO ATEROMATOSA
  {
    id: 'arteriolosclerosis',
    nombre: 'Arteriolosclerosis (hialina e hiperplásica)',
    grupo: 'Arteriosclerosis no ateromatosa',
    vaso: 'arteriola',
    resumen: 'Engrosamiento de la pared de las arteriolas por hipertensión o diabetes, que estrecha su luz.',
    explicacion: [
      'Afecta a los vasos pequeños de todo el cuerpo, pero sobre todo a los del riñón, la retina y el cerebro. Explica en parte la nefropatía y la retinopatía hipertensiva y diabética.',
    ],
    capas: {},
    clinica: ['Nefroangiosclerosis (riñón), retinopatía hipertensiva, infartos lacunares cerebrales.'],
    rasgos: { hialina: 0.7 },
    inicial: 0,
    niveles: [
      {
        id: 'hialina',
        etiqueta: 'Hialina',
        detalle: 'HTA crónica, diabetes, edad',
        rasgos: { hialina: 0.75 },
        explicacion: ['Proteínas del plasma atraviesan un endotelio dañado y se depositan en la pared junto con más membrana basal: la pared se vuelve homogénea, rosada y «vítrea» (hialina), y la luz se estrecha.'],
        capas: {
          intima: 'Depósito homogéneo de material hialino (proteínas plasmáticas) bajo el endotelio.',
          media: 'Sustituida en parte por el material hialino; se pierden células musculares.',
        },
      },
      {
        id: 'hiperplasica',
        etiqueta: 'Hiperplásica',
        detalle: 'HTA maligna (> 180/120)',
        rasgos: { hiperplasica: true, necrosisFibrinoide: 'circunferencial' },
        explicacion: ['Ante presiones muy altas, el músculo liso prolifera en capas concéntricas «en bulbo de cebolla» que casi ocluyen la luz. A menudo se acompaña de necrosis fibrinoide (arteriolitis necrosante). Es una urgencia: daña el riñón en días.'],
        capas: {
          intima: 'Capas concéntricas de células musculares lisas y membrana basal duplicada («bulbo de cebolla»).',
          media: 'Necrosis fibrinoide: depósito de fibrina y muerte celular en la pared.',
        },
      },
    ],
  },
  {
    id: 'monckeberg',
    nombre: 'Esclerosis de Mönckeberg (calcificación de la media)',
    grupo: 'Arteriosclerosis no ateromatosa',
    vaso: 'muscular',
    resumen: 'Calcificación en anillos de la capa MEDIA, sin estrechar la luz.',
    explicacion: [
      'Depósitos de calcio en la media de las arterias musculares, sobre todo en personas mayores, diabéticas o con enfermedad renal crónica. No hay inflamación ni placa en la íntima.',
      'La luz se conserva, así que por sí misma no produce isquemia; pero la arteria se convierte en un tubo rígido.',
    ],
    capas: {
      media: 'Depósitos de calcio en anillos o placas dentro de la media; la arteria se endurece («tubería»).',
    },
    clinica: [
      'Las arterias rígidas no se colapsan con el manguito: el índice tobillo‑brazo sale falsamente alto (> 1,3) y no es fiable.',
      'Se ve en la radiografía simple como arterias en «raíl de tren».',
    ],
    rasgos: { calcioMedia: true },
  },
  {
    id: 'hipertension',
    nombre: 'Hipertensión crónica (hipertrofia de la media)',
    grupo: 'Arteriosclerosis no ateromatosa',
    vaso: 'muscular',
    resumen: 'La media se engruesa para soportar más presión, a costa de reducir la luz.',
    explicacion: [
      'Igual que el ventrículo izquierdo se hipertrofia ante la HTA, el músculo liso de las arterias pequeñas y medianas también lo hace: aumenta la relación pared/luz.',
      'Esa luz más estrecha aumenta todavía más la resistencia periférica: un círculo vicioso que mantiene la hipertensión.',
    ],
    capas: {
      media: 'Hipertrofia e hiperplasia del músculo liso; más colágeno entre sus células.',
      intima: 'Engrosamiento fibroso leve; la HTA acelera además la aterosclerosis.',
    },
    clinica: ['Contribuye a la HTA mantenida y al daño de órganos diana (corazón, riñón, cerebro, retina).'],
    rasgos: { hipertrofiaMedia: 1.55, intimaEngrosada: 0.25 },
  },

  // ------------------------------------------------------------- AORTA
  {
    id: 'aneurisma',
    nombre: 'Aneurisma aórtico',
    grupo: 'Aorta',
    vaso: 'elastica',
    resumen: 'Dilatación permanente (≥ 50 % del diámetro normal) por debilitamiento de la MEDIA.',
    explicacion: [
      'La degradación de las láminas elásticas y del colágeno de la media (por aterosclerosis, inflamación con enzimas que degradan la matriz, o enfermedades del tejido conectivo) debilita la pared, que cede y se dilata.',
      'Según la ley de Laplace, cuanto mayor es el radio, mayor es la tensión de la pared: el aneurisma tiende a crecer cada vez más rápido.',
      'Dentro se forma a menudo un trombo mural con capas (líneas de Zahn) que puede soltar émbolos.',
    ],
    capas: {
      media: 'Adelgazada, con pérdida y fragmentación de las láminas elásticas y del músculo liso.',
      intima: 'Aterosclerosis y trombo mural laminado sobre ella.',
      adventicia: 'Fibrosis e inflamación crónica.',
    },
    clinica: [
      'Suele ser asintomático hasta que se complica.',
      'Complicaciones: rotura (muy mortal), disección, embolias distales.',
      'El aneurisma de aorta abdominal es típico de varones mayores fumadores (cribado con ecografía).',
    ],
    rasgos: { aneurisma: true },
  },
  {
    id: 'diseccion',
    nombre: 'Disección aórtica',
    grupo: 'Aorta',
    vaso: 'elastica',
    resumen: 'Un desgarro de la íntima deja entrar sangre en la MEDIA y crea una falsa luz.',
    explicacion: [
      'La sangre entra por un desgarro de la íntima y avanza disecando la media, separando sus capas: aparece una FALSA LUZ que comprime la verdadera. Entre ambas queda el «colgajo» (flap) de íntima y media interna.',
      'El terreno suele ser una media debilitada (degeneración mucoide o «necrosis quística de la media»), por hipertensión, edad, síndrome de Marfan, Ehlers‑Danlos, válvula aórtica bicúspide o embarazo.',
      'Las disecciones de la aorta ascendente (tipo A de Stanford) son una emergencia quirúrgica.',
    ],
    capas: {
      intima: 'Desgarro (puerta de entrada) y colgajo de íntima que separa la luz verdadera de la falsa.',
      media: 'Se separa en dos por un hematoma que crea la falsa luz; degeneración mucoide de base.',
    },
    clinica: [
      'Dolor torácico súbito, desgarrador, que irradia a la espalda (entre las escápulas).',
      'Diferencia de pulsos o de presión entre ambos brazos, ensanchamiento mediastínico; puede obstruir ramas (coronarias, carótidas, renales).',
    ],
    rasgos: { diseccion: true, degeneracionMucoide: true },
  },

  // ------------------------------------------------------------- VASCULITIS
  {
    id: 'celulas-gigantes',
    nombre: 'Arteritis de células gigantes (de Horton)',
    grupo: 'Vasculitis',
    vaso: 'muscular',
    resumen: 'Inflamación granulomatosa de la MEDIA con rotura de la lámina elástica interna.',
    explicacion: [
      'Vasculitis de vasos grandes y medianos de personas mayores de 50 años, sobre todo de las ramas de la carótida externa (arteria temporal) y de la aorta.',
      'Los linfocitos T y los macrófagos forman granulomas con células gigantes multinucleadas alrededor de la lámina elástica interna, que se fragmenta. La íntima se engruesa y estrecha la luz.',
      'Las lesiones son segmentarias («a saltos»): una biopsia de un trozo sano no la descarta.',
    ],
    capas: {
      media: 'Granulomas con células gigantes multinucleadas, linfocitos y macrófagos; destrucción de la lámina elástica interna.',
      intima: 'Engrosamiento fibroso que estrecha la luz.',
      adventicia: 'Infiltrado inflamatorio.',
    },
    clinica: [
      'Cefalea temporal, claudicación mandibular, arteria temporal engrosada y dolorosa; VSG/PCR muy elevadas.',
      'Riesgo de ceguera por isquemia del nervio óptico: tratar con corticoides sin esperar a la biopsia. Se asocia a la polimialgia reumática.',
    ],
    rasgos: { granulomas: true, intimaEngrosada: 0.55, inflamacion: ['media', 'adventicia'] },
  },
  {
    id: 'pan',
    nombre: 'Poliarteritis nudosa (PAN)',
    grupo: 'Vasculitis',
    vaso: 'muscular',
    resumen: 'Necrosis fibrinoide transmural y segmentaria de arterias medianas.',
    explicacion: [
      'Vasculitis necrosante de arterias medianas (renales, mesentéricas, coronarias) que respeta las arteriolas y capilares (no da glomerulonefritis) y típicamente no se asocia a ANCA. Una parte de los casos se relaciona con el virus de la hepatitis B.',
      'La lesión afecta a un SECTOR de la pared, de dentro afuera: necrosis fibrinoide con neutrófilos. La pared debilitada forma pequeños aneurismas («nudos»), y pueden formarse trombos.',
      'En una misma arteria conviven lesiones agudas y cicatrices de distinta antigüedad.',
    ],
    capas: {
      intima: 'Afectada por la necrosis; puede haber trombo.',
      media: 'Necrosis fibrinoide segmentaria con infiltrado de neutrófilos.',
      adventicia: 'Inflamación que se extiende desde la media; microaneurismas.',
    },
    clinica: [
      'Fiebre, pérdida de peso, mononeuritis múltiple, HTA por afectación renal, dolor abdominal (isquemia intestinal), lesiones cutáneas.',
      'La angiografía muestra microaneurismas «en rosario».',
    ],
    rasgos: { necrosisFibrinoide: 'segmentaria', inflamacion: ['intima', 'media', 'adventicia'] },
  },

  // ------------------------------------------------------------- INFECCIONES
  {
    id: 'sifilis',
    nombre: 'Aortitis sifilítica',
    grupo: 'Infecciones',
    vaso: 'elastica',
    resumen: 'Empieza en la ADVENTICIA: la sífilis terciaria inflama y obstruye los vasa vasorum.',
    explicacion: [
      'En la sífilis terciaria, años después de la infección, el treponema causa una endarteritis obliterante de los vasa vasorum: sus paredes se engruesan, su luz se cierra y se rodean de linfocitos y células plasmáticas.',
      'Sin riego, la parte externa de la media se necrosa y cicatriza en parches: se pierden láminas elásticas y la aorta ascendente se debilita y se dilata (aneurisma).',
      'La retracción de esas cicatrices arruga la íntima, que adopta un aspecto de «corteza de árbol».',
    ],
    capas: {
      adventicia: 'Endarteritis obliterante de los vasa vasorum con manguitos de células plasmáticas y linfocitos.',
      media: 'Necrosis isquémica y cicatrices en parches con pérdida de láminas elásticas.',
      intima: 'Arrugada, «en corteza de árbol», con aterosclerosis sobreañadida.',
    },
    clinica: [
      'Aneurisma de la aorta ascendente e insuficiencia aórtica por dilatación del anillo valvular; estenosis de los orificios coronarios.',
      'Hoy es rara gracias a la penicilina.',
    ],
    rasgos: { endarteritisVasa: true, cortezaArbol: true, inflamacion: ['adventicia'] },
  },
];

export const GRUPOS_VASO = ['Referencia', 'Aterosclerosis', 'Arteriosclerosis no ateromatosa', 'Aorta', 'Vasculitis', 'Infecciones'] as const;

export const getPatologiaVaso = (id: string) => PATOLOGIAS_VASO.find((p) => p.id === id) ?? PATOLOGIAS_VASO[0];

/** Patología normal de referencia del mismo tipo de vaso. */
export const normalDe = (vaso: TipoVaso) => PATOLOGIAS_VASO.find((p) => p.grupo === 'Referencia' && p.vaso === vaso)!;
