import { definePathology } from '../schema';

/** Tracto de salida del VD: a la derecha y delante (lo que miran V1–V2). */
const TSVD: [number, number, number] = [-0.7, 0, 0.7];

export default definePathology({
  id: 'brugada',
  nombre: 'Síndrome de Brugada',
  categoria: 'Otras',
  explicacion: [
    'Canalopatía hereditaria (sobre todo del canal de sodio, SCN5A) que afecta al EPICARDIO del tracto de salida del VD: allí el potencial de acción pierde su meseta antes que en el endocardio.',
    'Esa diferencia de voltaje entre capas crea un vector de lesión hacia la derecha y adelante: ST elevado SOLO en V1–V2 (pueden registrarse más arriba, en 2.º–3.er EIC).',
    'Tipo 1 (diagnóstico): ST ↑ ≥ 2 mm "en aleta de tiburón" (coved), descendente, que termina en T negativa. Tipo 2: ST en "silla de montar" (saddleback) con T positiva; no es diagnóstico por sí solo.',
    'Riesgo de fibrilación ventricular y muerte súbita, a menudo en reposo o con fiebre. La fiebre y algunos fármacos (antiarrítmicos IC) pueden desenmascarar el tipo 1. Tratamiento: DAI en pacientes de alto riesgo.',
  ],
  derivacionesAfectadas: ['V1', 'V2'],
  territorio3D: { estructuras: ['vd'] },
  control: {
    tipo: 'fase',
    etiqueta: 'Patrón',
    inicial: 0,
    niveles: [
      {
        id: 'tipo-1',
        etiqueta: 'Tipo 1 (coved)',
        detalle: 'diagnóstico',
        modificaciones: {
          st: { direccion: TSVD, mv: 0.26 },
          lobulosExtra: {
            QRS: [{ at: 0.92, wl: 0.05, wr: 0.14, v: [-0.4, -0.05, 0.55] }], // onda J / r' en V1
            T: [{ at: 0.5, wl: 0.22, wr: 0.2, v: [0.35, 0.05, -0.55] }], // T negativa en V1–V2
          },
        },
      },
      {
        id: 'tipo-2',
        etiqueta: 'Tipo 2 (silla de montar)',
        detalle: 'sugestivo',
        modificaciones: {
          st: { direccion: TSVD, mv: 0.12 },
          lobulosExtra: { QRS: [{ at: 0.92, wl: 0.05, wr: 0.1, v: [-0.35, -0.05, 0.5] }] },
        },
      },
    ],
  },
});
