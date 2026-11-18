import { definePathology } from '../schema';

/** Dirección del vector de lesión difuso: hacia el ápex (abajo, izquierda y delante). */
const APEX: [number, number, number] = [0.55, 0.71, 0.44];

export default definePathology({
  id: 'pericarditis',
  nombre: 'Pericarditis aguda',
  categoria: 'Otras',
  explicacion: [
    'La inflamación del pericardio lesiona el EPICARDIO subyacente de forma difusa, no limitada a un territorio coronario.',
    'Sumando todas las paredes, el vector de lesión apunta hacia el ápex: ST ↑ CÓNCAVO ("en sonrisa") en casi todas las derivaciones (I, II, aVF, V2–V6) y descenso del ST solo en aVR (y a veces V1). No hay imagen en espejo de territorio, no aparecen ondas Q y la T no se invierte mientras el ST está elevado (a diferencia del IAM).',
    'La lesión auricular desplaza el segmento PR: DESCENSO del PR en II y en las precordiales, con PR elevado en aVR. Es muy específico.',
    'Evoluciona en estadios (Spodick). Si se acumula líquido (derrame), el voltaje del QRS cae y aparece taquicardia; si hay taponamiento, alternancia eléctrica.',
  ],
  derivacionesAfectadas: ['I', 'II', 'aVF', 'V2', 'V3', 'V4', 'V5', 'V6'],
  reciprocas: ['aVR', 'V1'],
  territorio3D: { estructuras: ['difuso'] },
  control: {
    tipo: 'fase',
    etiqueta: 'Estadio',
    inicial: 0,
    niveles: [
      {
        id: 'estadio-1',
        etiqueta: 'I · ST ↑ y PR ↓',
        detalle: 'horas–días',
        modificaciones: {
          st: { direccion: APEX, mv: 0.17 },
          pr: { direccion: [-0.4, -0.9, -0.1], mv: 0.08 },
        },
      },
      {
        id: 'estadio-2',
        etiqueta: 'II · ST normal, T plana',
        detalle: '~1 semana',
        modificaciones: { amplitud: { T: 0.35 }, pr: { direccion: [-0.4, -0.9, -0.1], mv: 0.03 } },
      },
      {
        id: 'estadio-3',
        etiqueta: 'III · T invertida',
        detalle: 'semanas',
        modificaciones: {
          amplitud: { T: 0.2 },
          lobulosExtra: { T: [{ at: 0.62, wl: 0.18, wr: 0.15, v: [-0.25, -0.25, -0.15] }] },
        },
      },
      {
        id: 'derrame',
        etiqueta: 'Con derrame',
        detalle: 'bajo voltaje',
        explicacion: ['El líquido pericárdico aleja el corazón de los electrodos y "cortocircuita" sus corrientes: QRS de bajo voltaje (< 5 mm en miembros) y taquicardia sinusal compensadora.'],
        modificaciones: {
          frecuencia: 110,
          amplitud: { QRS: 0.42, T: 0.5, P: 0.7 },
          st: { direccion: APEX, mv: 0.06 },
        },
      },
    ],
  },
});
