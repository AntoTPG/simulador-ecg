import { definePathology } from '../schema';

/**
 * HIPOPOTASEMIA. El descenso del ST se modela como un vector de lesión
 * OPUESTO al vector T normal: (−0,7; −0,6; −0,4).
 */
export default definePathology({
  id: 'hipopotasemia',
  nombre: 'Hipopotasemia',
  categoria: 'Alteraciones electrolíticas',
  explicacion: [
    'Con poco K⁺ extracelular disminuye la conductancia de los canales de K⁺ que repolarizan la célula: la fase 3 del potencial de acción se enlentece y se prolonga la repolarización.',
    'La onda T se aplana y, a la vez, crece la onda U (repolarización tardía de las fibras de Purkinje y de las células M). La U puede llegar a superar a la T y se ve mejor en V2–V3.',
    'Aparece un descenso del ST y la T y la U se funden: lo que parece un "QT largo" es en realidad un intervalo QU largo.',
    'La repolarización prolongada y heterogénea favorece las arritmias (extrasístoles, torsades de pointes), sobre todo si el paciente toma digoxina.',
  ],
  derivacionesAfectadas: ['V2', 'V3', 'II'],
  territorio3D: { estructuras: ['difuso'] },
  control: {
    tipo: 'gravedad',
    etiqueta: 'Nivel de K⁺',
    inicial: 1,
    niveles: [
      {
        id: 'leve',
        etiqueta: 'T aplanada',
        detalle: 'K⁺ 3,0–3,5 mEq/L',
        explicacion: ['La T pierde voltaje y empieza a verse la onda U.'],
        modificaciones: { amplitud: { T: 0.6, U: 4 } },
      },
      {
        id: 'moderada',
        etiqueta: 'Ondas U, ST ↓',
        detalle: 'K⁺ 2,5–3,0 mEq/L',
        explicacion: ['La U es prominente y el ST desciende. La T, aplanada, se funde con la U.'],
        modificaciones: {
          amplitud: { T: 0.4, U: 7 },
          st: { direccion: [-0.7, -0.6, -0.4], mv: 0.07 },
        },
      },
      {
        id: 'grave',
        etiqueta: 'U > T, QU largo',
        detalle: 'K⁺ < 2,5 mEq/L',
        explicacion: ['La U supera a la T, el ST desciende más y el intervalo QU se alarga mucho. La P puede crecer y el PR alargarse ligeramente. Riesgo de torsades de pointes.'],
        modificaciones: {
          amplitud: { T: 0.2, U: 10, P: 1.4 },
          st: { direccion: [-0.7, -0.6, -0.4], mv: 0.12 },
          intervalos: { prInterval: 200 },
        },
      },
    ],
  },
});
