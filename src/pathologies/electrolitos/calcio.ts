import { definePathology } from '../schema';

/** Vector T normal (sin girar), para las T desplazadas en el tiempo. */
const T_NORMAL: [number, number, number] = [0.38, 0.33, 0.22];

export default definePathology({
  id: 'calcio',
  nombre: 'Hipercalcemia e hipocalcemia',
  categoria: 'Alteraciones electrolíticas',
  explicacion: [
    'El Ca²⁺ entra en la célula durante la MESETA del potencial de acción (fase 2, canales de calcio tipo L), que en el ECG corresponde al segmento ST.',
    'Con el Ca²⁺ ALTO la meseta se acorta: el ST se acorta o casi desaparece y la T sale justo después del QRS → QT CORTO. En casos graves pueden aparecer ondas J (Osborn) y bloqueos.',
    'Con el Ca²⁺ BAJO la meseta se alarga: el ST se alarga y la T, de forma casi normal, aparece tarde → QT LARGO a expensas del ST (a diferencia de la hipopotasemia, donde se aplana la T y crece la U).',
    'Regla mnemotécnica: el calcio "estira o encoge" el ST; el potasio cambia la forma de la T.',
  ],
  derivacionesAfectadas: ['II', 'V2', 'V3', 'V4'],
  territorio3D: { estructuras: ['difuso'] },
  control: {
    tipo: 'gravedad',
    etiqueta: 'Calcio',
    inicial: 1,
    niveles: [
      {
        id: 'hiper-grave',
        etiqueta: 'Hipercalcemia grave',
        detalle: 'Ca²⁺ > 14 mg/dL',
        explicacion: ['ST prácticamente ausente: la T arranca del final del QRS. QT muy corto. Pueden aparecer ondas J, PR largo y bradiarritmias.'],
        modificaciones: {
          intervalos: { qtc: 320, prInterval: 210 },
          ondas: { T: [{ at: 0.42, wl: 0.22, wr: 0.16, v: T_NORMAL }] },
          lobulosExtra: { QRS: [{ at: 0.95, wl: 0.05, wr: 0.08, v: [0.25, 0.2, 0.1] }] },
        },
      },
      {
        id: 'hiper',
        etiqueta: 'Hipercalcemia',
        detalle: 'Ca²⁺ 11–14 mg/dL',
        explicacion: ['El ST se acorta y la T sale antes: QT corto (QTc < 360 ms).'],
        modificaciones: { intervalos: { qtc: 345 }, ondas: { T: [{ at: 0.5, wl: 0.2, wr: 0.13, v: T_NORMAL }] } },
      },
      {
        id: 'hipo',
        etiqueta: 'Hipocalcemia',
        detalle: 'Ca²⁺ 7–8,5 mg/dL',
        explicacion: ['Segmento ST largo y rectilíneo, con T de forma normal pero tardía: QT largo (QTc ~480 ms).'],
        modificaciones: { intervalos: { qtc: 485 }, ondas: { T: [{ at: 0.78, wl: 0.13, wr: 0.09, v: T_NORMAL }] } },
      },
      {
        id: 'hipo-grave',
        etiqueta: 'Hipocalcemia grave',
        detalle: 'Ca²⁺ < 7 mg/dL',
        explicacion: ['ST muy largo, QTc > 520 ms: riesgo de torsades de pointes. Clínica: tetania, parestesias, signos de Chvostek y Trousseau.'],
        modificaciones: { intervalos: { qtc: 545 }, ondas: { T: [{ at: 0.82, wl: 0.11, wr: 0.08, v: T_NORMAL }] } },
      },
    ],
  },
});
