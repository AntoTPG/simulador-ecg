import { definePathology } from '../schema';

export default definePathology({
  id: 'isquemia-tronco-comun',
  nombre: 'Lesión de tronco común / multivaso',
  categoria: 'Isquemia e infarto',
  explicacion: [
    'Una estenosis crítica del tronco común izquierdo (o una enfermedad de tres vasos) produce isquemia SUBENDOCÁRDICA difusa de casi todo el VI.',
    'En la isquemia subendocárdica el vector de lesión apunta desde el epicardio sano hacia la CAVIDAD. Sumando todas las paredes, el vector resultante apunta hacia arriba y a la derecha, hacia la base del corazón y el tracto de salida.',
    'Por eso hay descenso del ST difuso (I, II, aVF, V4–V6) y ELEVACIÓN del ST en aVR (que mira desde el hombro derecho justo en esa dirección), a menudo también en V1, siendo aVR > V1.',
    'Este patrón (ST ↓ en ≥ 6 derivaciones + ST ↑ en aVR) indica gran cantidad de miocardio en riesgo y obliga a una coronariografía urgente.',
  ],
  derivacionesAfectadas: ['aVR', 'V1'],
  reciprocas: ['I', 'II', 'aVF', 'V4', 'V5', 'V6'],
  // Territorio "medio" del VI (apical, lateral, inferior); al ser subendocárdica, el vector va en sentido contrario.
  modificaciones: { isquemia: { territorio: [0.6, 0.75, -0.2], tipo: 'subendocardica', fase: 'lesion' } },
  territorio3D: {
    arterias: ['tci', 'da', 'cx', 'diagonal', 'marginalObtusa'],
    oclusion: { arteria: 'tci', t: 0.5 },
    segmentos: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
  },
  control: {
    tipo: 'gravedad',
    etiqueta: 'Gravedad',
    inicial: 1,
    niveles: [
      { id: 'moderada', etiqueta: 'Moderada', detalle: 'angina', modificaciones: { isquemia: { intensidad: 0.8 } } },
      { id: 'grave', etiqueta: 'Grave', detalle: 'isquemia extensa', modificaciones: { isquemia: { intensidad: 1.5 } } },
      { id: 'critica', etiqueta: 'Crítica', detalle: 'shock inminente', modificaciones: { isquemia: { intensidad: 2.2 } } },
    ],
  },
});
