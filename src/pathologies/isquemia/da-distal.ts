import { definePathology } from '../schema';
import { FASES_IAM, FASE_INICIAL } from './_fases';

export default definePathology({
  id: 'iam-da-distal',
  nombre: 'IAM anteroapical — DA distal',
  categoria: 'Isquemia e infarto',
  explicacion: [
    'Si la DA se ocluye DESPUÉS de la 1.ª septal y la 1.ª diagonal, se respetan el tabique basal y la pared lateral alta: el territorio es la cara anterior media y el ápex.',
    'El vector de lesión apunta hacia delante, a la izquierda y algo hacia abajo (el ápex): el ST sube sobre todo en V3–V6, menos en V1–V2, y no hay elevación en aVL.',
    'Como la DA suele rodear el ápex ("DA envolvente"), puede elevarse también ligeramente el ST en II y aVF, sin el descenso recíproco inferior típico de la oclusión proximal.',
  ],
  derivacionesAfectadas: ['V3', 'V4', 'V5', 'V6'],
  reciprocas: ['aVR'],
  // Territorio: anteroapical → anterior, izquierda y algo inferior
  modificaciones: { isquemia: { territorio: [0.6, 0.3, 0.7] } },
  territorio3D: {
    arterias: ['da'],
    oclusion: { arteria: 'da', t: 0.5 },
    segmentos: [13, 14, 15, 16, 17],
  },
  control: { tipo: 'fase', etiqueta: 'Fase evolutiva', niveles: [...FASES_IAM], inicial: FASE_INICIAL },
});
