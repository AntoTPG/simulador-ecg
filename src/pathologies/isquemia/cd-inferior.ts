import { definePathology } from '../schema';
import { FASES_IAM, FASE_INICIAL } from './_fases';

export default definePathology({
  id: 'iam-cd-inferior',
  nombre: 'IAM inferior — coronaria derecha',
  categoria: 'Isquemia e infarto',
  explicacion: [
    'En la dominancia derecha (~80 %), la coronaria derecha (CD) da la descendente posterior, que irriga la cara inferior (diafragmática) del VI y el 1/3 posterior del tabique.',
    'El vector de lesión apunta hacia ABAJO: el ST se eleva en II, III y aVF. Como el territorio de la CD está algo a la derecha, la elevación es mayor en III (+120°) que en II (+60°), lo que la distingue de la oclusión de una circunfleja dominante.',
    'aVL (−30°) mira casi en sentido opuesto a III: el descenso recíproco del ST en aVL es muy sensible y a veces aparece antes que la propia elevación.',
    'La CD irriga también el nodo sinusal y el nodo AV: son frecuentes la bradicardia sinusal y los bloqueos AV (suelen ser transitorios).',
  ],
  derivacionesAfectadas: ['II', 'III', 'aVF'],
  reciprocas: ['aVL', 'I'],
  // Territorio: inferior (y+), algo a la derecha (x−) y posterior
  modificaciones: { isquemia: { territorio: [-0.25, 0.95, -0.1] } },
  territorio3D: {
    arterias: ['cd', 'dp'],
    oclusion: { arteria: 'cd', t: 0.55 },
    segmentos: [3, 4, 9, 10, 15],
  },
  control: { tipo: 'fase', etiqueta: 'Fase evolutiva', niveles: [...FASES_IAM], inicial: FASE_INICIAL },
});
