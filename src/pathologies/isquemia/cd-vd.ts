import { definePathology } from '../schema';
import { FASES_IAM, FASE_INICIAL } from './_fases';

export default definePathology({
  id: 'iam-cd-vd',
  nombre: 'IAM inferior con afectación del VD — CD proximal',
  categoria: 'Isquemia e infarto',
  explicacion: [
    'Si la coronaria derecha se ocluye ANTES de sus ramas ventriculares derechas (marginal aguda), al infarto inferior se suma el del ventrículo derecho.',
    'El vector de lesión apunta abajo y a la DERECHA: III se eleva mucho más que II, y el ST sube en V1 (la precordial que mira al VD) y sobre todo en las precordiales derechas V3R–V4R. Un ST ↑ ≥ 1 mm en V4R es el signo más útil.',
    'Por eso, ante todo IAM inferior hay que registrar V4R. Se han añadido V3R y V4R debajo del ECG.',
    'Clínica: hipotensión con pulmones limpios e ingurgitación yugular. El VD depende de la precarga: se tratan con volumen y se evitan los nitratos y los diuréticos.',
  ],
  derivacionesAfectadas: ['II', 'III', 'aVF', 'V1', 'V3R', 'V4R'],
  reciprocas: ['I', 'aVL'],
  derivacionesExtra: ['V3R', 'V4R'],
  // Suma de los territorios inferior (−0,25; 0,95; −0,1) y del VD (−0,9; 0,2; 0,4)
  modificaciones: { isquemia: { territorio: [-0.65, 0.74, 0.15] } },
  territorio3D: {
    arterias: ['cd', 'marginalAguda', 'dp'],
    oclusion: { arteria: 'cd', t: 0.12 },
    segmentos: [3, 4, 9, 10, 15],
    estructuras: ['vd'],
  },
  control: { tipo: 'fase', etiqueta: 'Fase evolutiva', niveles: [...FASES_IAM], inicial: FASE_INICIAL },
});
