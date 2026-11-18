import { definePathology } from '../schema';

const T: [number, number, number] = [0.38, 0.33, 0.22];

export default definePathology({
  id: 'qt-largo',
  nombre: 'QT largo',
  categoria: 'Otras',
  explicacion: [
    'El intervalo QT mide la duración de la despolarización + repolarización ventricular. Se corrige por la frecuencia (QTc, Bazett): largo si > 450 ms (♂) o > 460 ms (♀), y de alto riesgo si > 500 ms.',
    'Se alarga cuando la repolarización es más lenta: menos corriente de K⁺ de salida (IKr, IKs) o más Na⁺/Ca²⁺ de entrada tardía. Causas: congénitas (LQT1–3) o adquiridas (fármacos: antiarrítmicos, macrólidos, antipsicóticos…; hipopotasemia, hipomagnesemia, hipocalcemia; bradicardia).',
    'La repolarización prolongada y heterogénea favorece las posdespolarizaciones precoces y una taquicardia ventricular polimorfa típica: las TORSADES DE POINTES, que pueden degenerar en FV.',
    'La forma de la T orienta al tipo congénito: base ancha (LQT1), T bífida y de bajo voltaje (LQT2), ST largo con T tardía (LQT3).',
  ],
  derivacionesAfectadas: ['II', 'V2', 'V3', 'V5'],
  territorio3D: { estructuras: ['difuso'] },
  control: {
    tipo: 'gravedad',
    etiqueta: 'QTc',
    inicial: 1,
    niveles: [
      { id: 'limite', etiqueta: 'Límite', detalle: 'QTc ~470 ms', modificaciones: { intervalos: { qtc: 475 } } },
      {
        id: 'largo',
        etiqueta: 'Largo',
        detalle: 'QTc ~520 ms',
        modificaciones: { intervalos: { qtc: 525 }, anchuraT: 1.15 },
      },
      {
        id: 'muy-largo',
        etiqueta: 'Muy largo, T bífida',
        detalle: 'QTc > 580 ms',
        explicacion: ['QTc muy prolongado con T bífida (patrón tipo LQT2): riesgo alto de torsades de pointes. Corregir K⁺ y Mg²⁺ y retirar fármacos.'],
        modificaciones: {
          intervalos: { qtc: 590 },
          ondas: {
            T: [
              { at: 0.52, wl: 0.18, wr: 0.1, v: [T[0] * 0.65, T[1] * 0.65, T[2] * 0.65] },
              { at: 0.78, wl: 0.09, wr: 0.08, v: [T[0] * 0.6, T[1] * 0.6, T[2] * 0.6] },
            ],
          },
        },
      },
    ],
  },
});
