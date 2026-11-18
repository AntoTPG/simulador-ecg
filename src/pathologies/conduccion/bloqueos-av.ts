import { definePathology } from '../schema';

export default definePathology({
  id: 'bloqueos-av',
  nombre: 'Bloqueos auriculoventriculares (1.º, 2.º y 3.er grado)',
  categoria: 'Trastornos de la conducción',
  explicacion: [
    'El nodo AV retrasa fisiológicamente el impulso. En los bloqueos AV ese retraso es excesivo (1.er grado), algunas P no pasan (2.º grado) o no pasa ninguna (3.er grado).',
    'Fíjate en la tira de ritmo (II): cuenta las P y los QRS y mira si cada QRS tiene "su" P a una distancia constante.',
    'Los bloqueos SUPRAHISIANOS (nodo AV: 1.º y Mobitz I) suelen ser benignos (vagotonía, fármacos, IAM inferior). Los INFRAHISIANOS (Mobitz II, muchos de 3.er grado) son peligrosos y suelen necesitar marcapasos.',
  ],
  derivacionesAfectadas: ['II'],
  control: {
    tipo: 'gravedad',
    etiqueta: 'Grado',
    inicial: 0,
    niveles: [
      {
        id: 'primer-grado',
        etiqueta: '1.er grado',
        detalle: 'PR > 200 ms',
        explicacion: ['Todas las P se conducen, pero con un PR largo y constante (> 200 ms). No da síntomas; vigila fármacos que frenan el nodo (betabloqueantes, verapamilo, digoxina).'],
        modificaciones: { intervalos: { prInterval: 290 } },
      },
      {
        id: 'mobitz-1',
        etiqueta: 'Mobitz I',
        detalle: 'Wenckebach 4:3',
        explicacion: ['El PR se alarga latido a latido hasta que una P no se conduce; tras la pausa vuelve a empezar. Los RR se acortan dentro del grupo y la pausa dura menos de dos RR. Bloqueo nodal, casi siempre benigno.'],
        modificaciones: { intervalos: { prInterval: 180 }, ritmo: { tipo: 'wenckebach', conducidos: 3, incremento: 90 } },
      },
      {
        id: 'mobitz-2',
        etiqueta: 'Mobitz II',
        detalle: '3:2, PR fijo',
        explicacion: ['El PR es CONSTANTE y de repente una P no se conduce. El bloqueo está en el His‑Purkinje (a menudo con QRS ancho). Puede progresar bruscamente a bloqueo completo: indicación de marcapasos.'],
        modificaciones: { intervalos: { prInterval: 170 }, ritmo: { tipo: 'mobitz2', relacion: 3 } },
      },
      {
        id: '2-1',
        etiqueta: '2:1',
        detalle: 'una sí, una no',
        explicacion: ['Una P sí y otra no. Con 2:1 no se puede saber si es Mobitz I o II (no hay dos PR seguidos que comparar): el QRS ancho sugiere bloqueo infrahisiano.'],
        modificaciones: { intervalos: { prInterval: 170 }, ritmo: { tipo: 'mobitz2', relacion: 2 } },
      },
      {
        id: 'completo-nodal',
        etiqueta: '3.er grado nodal',
        detalle: 'escape 45 lpm, QRS estrecho',
        explicacion: ['Disociación AV completa: las P van a su ritmo y los QRS al suyo. El escape nace en la unión AV (QRS estrecho, 40–60 lpm), relativamente estable.'],
        modificaciones: { ritmo: { tipo: 'bav3', fcVentricular: 45 } },
      },
      {
        id: 'completo-ventricular',
        etiqueta: '3.er grado ventricular',
        detalle: 'escape 32 lpm, QRS ancho',
        explicacion: ['El escape nace en el propio ventrículo: QRS ancho y muy lento (20–40 lpm), inestable. Síncope (Stokes‑Adams), riesgo de asistolia: marcapasos urgente.'],
        modificaciones: {
          ritmo: { tipo: 'bav3', fcVentricular: 32 },
          intervalos: { qrsDuration: 160 },
          ondas: {
            QRS: [
              { at: 0.2, wl: 0.12, wr: 0.12, v: [0.5, 0.2, -0.3] },
              { at: 0.5, wl: 0.16, wr: 0.16, v: [1.0, 0.4, -0.8] },
            ],
            T: [{ at: 0.6, wl: 0.2, wr: 0.14, v: [-0.45, -0.2, 0.35] }],
          },
        },
      },
    ],
  },
});
