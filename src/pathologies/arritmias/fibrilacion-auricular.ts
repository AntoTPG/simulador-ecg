import { definePathology } from '../schema';

export default definePathology({
  id: 'fibrilacion-auricular',
  nombre: 'Fibrilación auricular',
  categoria: 'Arritmias',
  explicacion: [
    'Múltiples frentes de reentrada caóticos (a menudo iniciados en las venas pulmonares) activan las aurículas a 350–600/min de forma desorganizada: no hay contracción auricular eficaz.',
    'En el ECG desaparecen las P y la línea de base muestra ondas f pequeñas e irregulares, que se ven mejor en V1 (y a veces casi no se ven: FA "fina").',
    'El nodo AV recibe impulsos al azar y deja pasar solo algunos: QRS normalmente estrechos con intervalos RR IRREGULARMENTE IRREGULARES. Es la clave diagnóstica.',
    'Es la arritmia sostenida más frecuente. Riesgo principal: trombos en la orejuela izquierda y embolia (ictus) → valorar anticoagulación (CHA₂DS₂‑VA) y controlar la frecuencia o el ritmo.',
  ],
  derivacionesAfectadas: ['V1', 'II'],
  territorio3D: { estructuras: ['auriculas'] },
  control: {
    tipo: 'gravedad',
    etiqueta: 'Respuesta ventricular',
    inicial: 1,
    niveles: [
      { id: 'lenta', etiqueta: 'Lenta', detalle: '~50 lpm', modificaciones: { ritmo: { tipo: 'fa', fcVentricular: 50 } } },
      { id: 'controlada', etiqueta: 'Controlada', detalle: '~80 lpm', modificaciones: { ritmo: { tipo: 'fa', fcVentricular: 80 } } },
      { id: 'rapida', etiqueta: 'Rápida', detalle: '~130 lpm', modificaciones: { ritmo: { tipo: 'fa', fcVentricular: 130 } } },
    ],
  },
});
