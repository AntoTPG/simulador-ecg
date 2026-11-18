import { definePathology } from '../schema';

export default definePathology({
  id: 'tep',
  nombre: 'Tromboembolismo pulmonar (TEP)',
  categoria: 'Otras',
  explicacion: [
    'Un trombo en las arterias pulmonares aumenta bruscamente la poscarga del VENTRÍCULO DERECHO, que se dilata y sufre isquemia.',
    'El hallazgo más frecuente es simplemente TAQUICARDIA SINUSAL. El ECG sirve más para descartar otras causas y valorar la sobrecarga del VD que para diagnosticar el TEP.',
    'El patrón S1Q3T3 (S en I, Q y T negativa en III) refleja el desplazamiento del vector hacia la derecha por el VD dilatado; es clásico pero poco sensible.',
    'Otros signos de sobrecarga del VD: T negativas en V1–V4, bloqueo de rama derecha (completo o incompleto) nuevo, eje derecho y P pulmonar. Su presencia indica peor pronóstico.',
  ],
  derivacionesAfectadas: ['I', 'III', 'V1', 'V2', 'V3'],
  territorio3D: { estructuras: ['vd'] },
  control: {
    tipo: 'gravedad',
    etiqueta: 'Hallazgos',
    inicial: 1,
    niveles: [
      {
        id: 'taquicardia',
        etiqueta: 'Taquicardia sinusal',
        detalle: 'lo más frecuente',
        modificaciones: { frecuencia: 112 },
      },
      {
        id: 's1q3t3',
        etiqueta: 'S1Q3T3 + sobrecarga VD',
        detalle: 'TEP con repercusión',
        modificaciones: {
          frecuencia: 115,
          ejeQRS: 95,
          lobulosExtra: {
            QRS: [
              { at: 0.14, wl: 0.07, wr: 0.07, v: [0.25, -0.4, 0] }, // fuerzas iniciales hacia arriba → Q en III
              { at: 0.8, wl: 0.09, wr: 0.1, v: [-0.7, -0.1, 0.35] }, // fuerzas terminales a la derecha → S en I, r' en V1
            ],
            T: [{ at: 0.6, wl: 0.2, wr: 0.15, v: [0.2, -0.45, -0.4] }], // T negativa en III y V1–V3
          },
        },
      },
    ],
  },
});
