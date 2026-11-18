import { definePathology } from '../schema';
import { FASES_IAM, FASE_INICIAL } from './_fases';

export default definePathology({
  id: 'iam-cx-lateral',
  nombre: 'IAM lateral — circunfleja',
  categoria: 'Isquemia e infarto',
  explicacion: [
    'La circunfleja (Cx) recorre el surco auriculoventricular izquierdo y, con sus ramas marginales obtusas, irriga la pared lateral del VI.',
    'El vector de lesión apunta a la IZQUIERDA (y algo hacia arriba y atrás): el ST se eleva en I, aVL, V5 y V6, las derivaciones "laterales".',
    'Los cambios recíprocos aparecen en III y aVF, que miran en sentido contrario, y a veces en V1.',
    'Es el infarto que más pasa desapercibido: la pared lateral está lejos de las precordiales habituales y la elevación puede ser discreta.',
  ],
  derivacionesAfectadas: ['I', 'aVL', 'V5', 'V6'],
  reciprocas: ['III', 'aVF', 'V1'],
  modificaciones: { isquemia: { territorio: [0.9, -0.3, -0.3] } },
  territorio3D: {
    arterias: ['tci', 'cx', 'marginalObtusa'],
    oclusion: { arteria: 'cx', t: 0.25 },
    segmentos: [5, 6, 11, 12, 16],
  },
  control: { tipo: 'fase', etiqueta: 'Fase evolutiva', niveles: [...FASES_IAM], inicial: FASE_INICIAL },
});
