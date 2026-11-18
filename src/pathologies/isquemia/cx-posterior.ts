import { definePathology } from '../schema';
import { FASES_IAM, FASE_INICIAL } from './_fases';

export default definePathology({
  id: 'iam-cx-posterior',
  nombre: 'IAM posterior (inferobasal) — circunfleja',
  categoria: 'Isquemia e infarto',
  explicacion: [
    'La pared posterior (inferobasal) del VI suele depender de la circunfleja o de la descendente posterior. Ninguna derivación estándar la mira directamente: habría que colocar V7–V9 en la espalda.',
    'El vector de lesión apunta hacia ATRÁS, así que V1–V3, que están delante, ven su "imagen en espejo": DESCENSO del ST en lugar de elevación.',
    'En fase de necrosis se pierden las fuerzas posteriores y predominan las anteriores, sin oposición: aparece una R alta y ancha en V1–V2 (el equivalente en espejo de la onda Q), con T positivas altas.',
    'Truco clásico: da la vuelta al ECG y míralo a contraluz; V1–V3 parecen un IAM con elevación del ST.',
  ],
  derivacionesAfectadas: ['V5', 'V6'],
  reciprocas: ['V1', 'V2', 'V3'],
  // Territorio: posterior (z−) y algo a la izquierda e inferior
  modificaciones: { isquemia: { territorio: [0.3, 0.2, -0.95] } },
  territorio3D: {
    arterias: ['cx', 'marginalObtusa'],
    oclusion: { arteria: 'cx', t: 0.6 },
    segmentos: [4, 5, 10, 11],
  },
  control: { tipo: 'fase', etiqueta: 'Fase evolutiva', niveles: [...FASES_IAM], inicial: FASE_INICIAL },
});
