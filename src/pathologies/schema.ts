/**
 * ============================================================================
 *  ESQUEMA DE UNA PATOLOGÍA (validado con Zod)
 * ============================================================================
 * Cada patología es un archivo .ts en esta carpeta que exporta por defecto un
 * objeto de DATOS PUROS (sin funciones) con este formato. Al arrancar, Zod lo
 * valida: si falta un campo o un valor no tiene sentido, el desplegable muestra
 * el error indicando el archivo y el campo.
 *
 * Todas las direcciones son vectores en coordenadas del PACIENTE:
 *   x = izquierda, y = inferior (pies), z = anterior (esternón).
 */
import { z } from 'zod';
import { EXTRA_LEAD_NAMES, LEAD_NAMES } from '../config/leads';

const vec3 = z.tuple([z.number(), z.number(), z.number()]);
const leadName = z.enum([...LEAD_NAMES, ...EXTRA_LEAD_NAMES]);

/** Un lóbulo de un bucle vectorial (ver src/engine/waves.ts). */
const lobe = z.object({
  at: z.number().min(-0.5).max(1.5),
  wl: z.number().positive().max(1),
  wr: z.number().positive().max(1),
  v: vec3,
});

export const ISCHEMIA_PHASES = ['hiperaguda', 'lesion', 'necrosis', 'cronica'] as const;

/** Desplazamiento de un segmento (ST o PR): dirección y magnitud en mV. */
const segmentShift = z.object({
  /** Dirección del vector (no hace falta que sea unitario). */
  direccion: vec3,
  /** Magnitud del vector de lesión (mV). */
  mv: z.number().min(0).max(1.5),
});

/**
 * Modificaciones que una patología (o uno de sus niveles) aplica al corazón sano.
 * Todos los campos son opcionales; un nivel se combina con las de la patología.
 */
export const modificationsSchema = z
  .object({
    /** Valores ABSOLUTOS de los intervalos (ms) — sustituyen a los normales. */
    intervalos: z
      .object({
        prInterval: z.number().min(40).max(500),
        pDuration: z.number().min(40).max(200),
        qrsDuration: z.number().min(50).max(320),
        qtc: z.number().min(250).max(700),
      })
      .partial(),
    /** Multiplicadores de amplitud de cada onda (1 = normal, 0 = desaparece). */
    amplitud: z
      .object({ P: z.number().min(0).max(5), QRS: z.number().min(0).max(5), T: z.number().min(-3).max(5), U: z.number().min(0).max(20) })
      .partial(),
    /** Multiplicador de la ANCHURA de la onda T (< 1 = T estrecha y picuda). */
    anchuraT: z.number().min(0.2).max(3),
    /** Desplazamiento del segmento ST (vector de lesión). */
    st: segmentShift,
    /** Desplazamiento del segmento PR (lesión auricular, p. ej. pericarditis). */
    pr: segmentShift,
    /** Lóbulos que se AÑADEN a los bucles normales. */
    lobulosExtra: z.object({ P: z.array(lobe), QRS: z.array(lobe), T: z.array(lobe), U: z.array(lobe) }).partial(),
    /**
     * Isquemia/infarto de un territorio. El motor traduce la fase en:
     *  - hiperaguda: T altas y anchas hacia el territorio;
     *  - lesion: vector de lesión (ST) hacia el territorio (transmural) o hacia
     *    la cavidad (subendocárdica);
     *  - necrosis: pérdida de fuerzas del territorio → ondas Q (el QRS se aleja);
     *  - cronica: Q establecida y T invertida, ST ya normalizado.
     */
    //  (La patología suele dar el territorio y cada nivel la fase; se combinan.)
    isquemia: z
      .object({
        /** Dirección del territorio: del centro del corazón hacia su epicardio. */
        territorio: vec3,
        fase: z.enum(ISCHEMIA_PHASES),
        tipo: z.enum(['transmural', 'subendocardica']),
        /** Escala global del efecto (1 = típico). */
        intensidad: z.number().min(0).max(3),
      })
      .partial(),
  })
  .partial();

export type Modifications = z.infer<typeof modificationsSchema>;

/** Un nivel del control deslizante (gravedad o fase). */
const levelSchema = z.object({
  id: z.string().min(1),
  /** Texto corto del deslizador, p. ej. "Elevación del ST". */
  etiqueta: z.string().min(1),
  /** Dato complementario, p. ej. "K⁺ 6,5–7,5 mEq/L" o "minutos". */
  detalle: z.string().optional(),
  /** Explicación específica de este nivel (se añade a la general). */
  explicacion: z.array(z.string()).optional(),
  derivacionesAfectadas: z.array(leadName).optional(),
  reciprocas: z.array(leadName).optional(),
  modificaciones: modificationsSchema.default({}),
});

export const CATEGORIES = [
  'Referencia',
  'Isquemia e infarto',
  'Alteraciones electrolíticas',
  'Trastornos de la conducción',
  'Hipertrofia',
  'Arritmias',
  'Otras',
] as const;

/** Claves de las arterias del modelo 3D (ver heart3d/models/anatomy.ts). */
export const ARTERY_KEYS = ['tci', 'da', 'diagonal', 'cx', 'marginalObtusa', 'cd', 'marginalAguda', 'dp'] as const;

export const pathologySchema = z.object({
  /** Identificador único (minúsculas y guiones). */
  id: z.string().regex(/^[a-z0-9-]+$/, 'solo minúsculas, números y guiones'),
  nombre: z.string().min(1),
  categoria: z.enum(CATEGORIES),
  /** 3–5 frases de fisiopatología. */
  explicacion: z.array(z.string().min(1)).min(1).max(8),
  derivacionesAfectadas: z.array(leadName).default([]),
  reciprocas: z.array(leadName).default([]),
  /** Derivaciones extra que se añaden al ECG (p. ej. V4R en el infarto de VD). */
  derivacionesExtra: z.array(z.enum(EXTRA_LEAD_NAMES)).default([]),
  /** Modificaciones comunes a todos los niveles. */
  modificaciones: modificationsSchema.default({}),
  /** Qué iluminar en el corazón 3D. */
  territorio3D: z
    .object({
      arterias: z.array(z.enum(ARTERY_KEYS)).default([]),
      /** Punto de oclusión: arteria y posición a lo largo de ella (0 = origen, 1 = final). */
      oclusion: z.object({ arteria: z.enum(ARTERY_KEYS), t: z.number().min(0).max(1) }).optional(),
      /** Segmentos del VI según el modelo AHA de 17 segmentos. */
      segmentos: z.array(z.number().int().min(1).max(17)).default([]),
      /** Estructuras completas: 'vd' (ventrículo derecho), 'auriculas', 'difuso' (todo el miocardio). */
      estructuras: z.array(z.enum(['vd', 'auriculas', 'difuso'])).default([]),
    })
    .optional(),
  /** Deslizador de gravedad o de fase. */
  control: z
    .object({
      tipo: z.enum(['gravedad', 'fase']),
      etiqueta: z.string(),
      niveles: z.array(levelSchema).min(2),
      /** Índice del nivel inicial. */
      inicial: z.number().int().min(0).default(0),
    })
    .optional(),
});

export type Pathology = z.infer<typeof pathologySchema>;
export type PathologyInput = z.input<typeof pathologySchema>;
export type PathologyLevel = z.infer<typeof levelSchema>;
export type LevelInput = z.input<typeof levelSchema>;

/**
 * Ayuda para escribir patologías con autocompletado. No transforma nada:
 * devuelve el mismo objeto de datos.
 */
export const definePathology = (p: PathologyInput): PathologyInput => p;
