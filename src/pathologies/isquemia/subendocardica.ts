import { definePathology } from '../schema';

export default definePathology({
  id: 'isquemia-subendocardica',
  nombre: 'Isquemia subendocárdica frente a transmural (vector de lesión)',
  categoria: 'Isquemia e infarto',
  explicacion: [
    'El SUBENDOCARDIO es la capa más vulnerable: soporta la mayor presión de la pared, se perfunde solo en diástole y es el final del recorrido de las coronarias, que van del epicardio hacia dentro.',
    'La zona lesionada queda menos polarizada que la sana y aparece una "corriente de lesión". El VECTOR DE LESIÓN apunta siempre de lo sano hacia lo lesionado.',
    'Si la lesión es SUBENDOCÁRDICA, el vector apunta hacia la cavidad y se aleja de los electrodos que miran esa pared: el ST DESCIENDE (angina, prueba de esfuerzo, SCASEST). No localiza bien la arteria responsable.',
    'Si es TRANSMURAL (oclusión completa), la lesión llega al epicardio y el vector apunta hacia los electrodos que la miran: el ST se ELEVA (SCACEST) y sí localiza el territorio.',
    'Usa el deslizador para comparar las dos situaciones en la misma pared anterolateral y fíjate en cómo cambia la flecha del ST en el 3D.',
  ],
  derivacionesAfectadas: ['V4', 'V5', 'V6', 'I', 'II'],
  reciprocas: ['aVR'],
  modificaciones: { isquemia: { territorio: [0.75, 0.25, 0.6], fase: 'lesion' } },
  territorio3D: {
    arterias: ['da', 'diagonal', 'cx'],
    segmentos: [6, 7, 12, 13, 16, 17],
  },
  control: {
    tipo: 'gravedad',
    etiqueta: 'Tipo de lesión',
    inicial: 1,
    niveles: [
      {
        id: 'sub-leve',
        etiqueta: 'Subendocárdica leve',
        detalle: 'ST ↓ ~1 mm',
        modificaciones: { isquemia: { tipo: 'subendocardica', intensidad: 0.6 } },
      },
      {
        id: 'sub-grave',
        etiqueta: 'Subendocárdica grave',
        detalle: 'ST ↓ 2–3 mm',
        modificaciones: { isquemia: { tipo: 'subendocardica', intensidad: 1.3 } },
      },
      {
        id: 'transmural',
        etiqueta: 'Transmural',
        detalle: 'ST ↑ (comparación)',
        derivacionesAfectadas: ['V3', 'V4', 'V5', 'V6', 'I', 'aVL'],
        reciprocas: ['III', 'aVR'],
        modificaciones: { isquemia: { tipo: 'transmural', intensidad: 1 } },
      },
    ],
  },
});
