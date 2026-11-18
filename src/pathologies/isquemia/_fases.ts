/**
 * Fases evolutivas del infarto con elevación del ST, compartidas por todas las
 * arterias. Son DATOS (no funciones): cada archivo de arteria los reutiliza en
 * su `control.niveles`. El motor traduce cada fase en cambios del vector
 * (ver engine/applyPathology.ts → applyIschemia).
 *
 * (Los archivos que empiezan por "_" no son patologías: el registro los ignora.)
 */
import type { LevelInput } from '../schema';

export const FASES_IAM: LevelInput[] = [
  {
    id: 'hiperaguda',
    etiqueta: 'T hiperaguda',
    detalle: 'primeros minutos',
    explicacion: [
      'Fase hiperaguda: la isquemia acorta el potencial de acción de la zona afectada, que se repolariza antes que el resto. Aparecen ondas T altas, anchas y de base amplia en las derivaciones que miran al territorio, a menudo antes de que se eleve el ST.',
    ],
    modificaciones: { isquemia: { fase: 'hiperaguda' } },
  },
  {
    id: 'lesion',
    etiqueta: 'Elevación del ST',
    detalle: 'minutos–horas',
    explicacion: [
      'Lesión transmural: las células lesionadas tienen un potencial de reposo menos negativo y una meseta más baja, y entre el tejido sano y el lesionado fluye una "corriente de lesión". El vector de lesión apunta HACIA el epicardio lesionado: el ST se eleva en las derivaciones que lo miran y desciende en espejo (cambios recíprocos) en las opuestas.',
    ],
    modificaciones: { isquemia: { fase: 'lesion' } },
  },
  {
    id: 'necrosis',
    etiqueta: 'Onda Q',
    detalle: 'horas–días',
    explicacion: [
      'Necrosis: el miocardio muerto ya no genera fuerzas eléctricas. El vector del QRS se ALEJA del infarto, y el electrodo que lo mira "ve a través de una ventana eléctrica" la pared opuesta alejándose: aparecen ondas Q patológicas (≥ 40 ms o > 25 % de la R) y se pierde voltaje de la R. El ST empieza a bajar y la T a invertirse.',
    ],
    modificaciones: { isquemia: { fase: 'necrosis' } },
  },
  {
    id: 'cronica',
    etiqueta: 'T invertida',
    detalle: 'días–semanas',
    explicacion: [
      'Fase evolucionada: el ST vuelve a la línea de base, persiste la Q (cicatriz) y la T se invierte de forma simétrica y profunda, porque la repolarización de la zona isquémica se retrasa y el vector T se aleja del territorio. Una elevación del ST que persiste semanas sugiere aneurisma ventricular.',
    ],
    modificaciones: { isquemia: { fase: 'cronica' } },
  },
];

/** Nivel inicial del deslizador de fase: la elevación del ST (lo más didáctico). */
export const FASE_INICIAL = 1;
