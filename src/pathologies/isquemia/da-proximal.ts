import { definePathology } from '../schema';
import { FASES_IAM, FASE_INICIAL } from './_fases';

export default definePathology({
  id: 'iam-da-proximal',
  nombre: 'IAM anterior extenso — DA proximal',
  categoria: 'Isquemia e infarto',
  explicacion: [
    'La descendente anterior (DA) irriga la cara anterior del VI, los 2/3 anteriores del tabique (ramas septales), el ápex y, mediante las diagonales, la pared anterolateral.',
    'Una oclusión PROXIMAL (antes de la 1.ª septal y la 1.ª diagonal) afecta a todo ese territorio: el vector de lesión apunta hacia delante, a la izquierda y algo hacia arriba.',
    'Por eso el ST se eleva en V1–V4 (anteroseptal) y en I y aVL (lateral alta, por la diagonal), con descenso recíproco en II, III y aVF, que miran justo al lado opuesto.',
    'Es el infarto de peor pronóstico por la cantidad de miocardio en riesgo (insuficiencia cardíaca, shock, bloqueos de rama por afectación septal).',
  ],
  derivacionesAfectadas: ['V1', 'V2', 'V3', 'V4', 'I', 'aVL'],
  reciprocas: ['II', 'III', 'aVF'],
  // Territorio: anterior (z+), algo a la izquierda (x+) y superior (y−)
  modificaciones: { isquemia: { territorio: [0.35, -0.35, 0.87] } },
  territorio3D: {
    arterias: ['tci', 'da', 'diagonal'],
    oclusion: { arteria: 'da', t: 0.06 },
    segmentos: [1, 2, 6, 7, 8, 12, 13, 14, 16, 17],
  },
  control: { tipo: 'fase', etiqueta: 'Fase evolutiva', niveles: [...FASES_IAM], inicial: FASE_INICIAL },
});
