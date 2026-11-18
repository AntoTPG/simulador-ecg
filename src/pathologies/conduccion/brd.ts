import { definePathology } from '../schema';

/**
 * BLOQUEO DE RAMA DERECHA. Los primeros lóbulos son los del QRS normal
 * (tabique y VI se activan a tiempo), reescalados a la nueva duración; se añade
 * un lóbulo TERMINAL lento hacia la derecha y adelante: el VD, activado tarde
 * y por vía muscular lenta.
 */
const qrsBRD = (ms: number, terminal: number) => {
  const f = (t: number) => t / ms; // ms → fracción de la nueva duración
  return [
    { at: f(13.5), wl: f(6.3), wr: f(6.3), v: [-0.12, 0.06, 0.22] as [number, number, number] },
    { at: f(32), wl: f(8.1), wr: f(8.1), v: [0.55, 0.55, 0.45] as [number, number, number] },
    { at: f(47), wl: f(9), wr: f(9), v: [1.05, 1.15, -0.55] as [number, number, number] },
    { at: f(67), wl: f(7.2), wr: f(7.2), v: [-0.15, -0.1, -0.35] as [number, number, number] },
    // Activación tardía del VD: hacia la derecha y adelante → R' en V1, S ancha en I y V6
    { at: 0.79, wl: 0.12, wr: 0.09, v: [-0.75 * terminal, -0.05 * terminal, 0.75 * terminal] as [number, number, number] },
  ];
};

export default definePathology({
  id: 'bloqueo-rama-derecha',
  nombre: 'Bloqueo de rama derecha (BRD)',
  categoria: 'Trastornos de la conducción',
  explicacion: [
    'La rama derecha no conduce: el tabique (que depende de la rama izquierda) y el VI se activan con normalidad, por eso el inicio del QRS es normal.',
    'El VD se activa TARDE y lentamente, de célula a célula desde el VI. Ese frente final va hacia la DERECHA y ADELANTE, sin oposición del VI (que ya terminó).',
    'Resultado: rSR\' ("orejas de conejo") en V1–V2, S ancha y empastada en I, aVL y V6, y R terminal en aVR. QRS ≥ 120 ms si es completo.',
    'La repolarización también es anómala (cambios secundarios): T negativa en V1–V3, opuesta a la deflexión terminal. Puede verse en sanos; si es nuevo, piensa en TEP, cardiopatía isquémica o del VD.',
  ],
  derivacionesAfectadas: ['V1', 'V2'],
  reciprocas: ['I', 'aVL', 'V5', 'V6'],
  modificaciones: {
    lobulosExtra: { T: [{ at: 0.55, wl: 0.2, wr: 0.15, v: [0.25, 0, -0.4] }] },
  },
  control: {
    tipo: 'gravedad',
    etiqueta: 'Grado',
    inicial: 1,
    niveles: [
      {
        id: 'incompleto',
        etiqueta: 'Incompleto',
        detalle: 'QRS 100–119 ms',
        modificaciones: { intervalos: { qrsDuration: 110 }, ondas: { QRS: qrsBRD(110, 0.5) } },
      },
      {
        id: 'completo',
        etiqueta: 'Completo',
        detalle: 'QRS ≥ 120 ms',
        modificaciones: { intervalos: { qrsDuration: 140 }, ondas: { QRS: qrsBRD(140, 0.8) } },
      },
    ],
  },
});
