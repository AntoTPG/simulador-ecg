import { definePathology } from '../schema';

export default definePathology({
  id: 'bloqueo-rama-izquierda',
  nombre: 'Bloqueo de rama izquierda (BRI)',
  categoria: 'Trastornos de la conducción',
  explicacion: [
    'La rama izquierda no conduce: el impulso baja por la rama derecha y el tabique se activa al revés, de DERECHA a IZQUIERDA. Desaparecen la q septal de I, aVL y V6 y la r inicial de V1.',
    'Después el VI se activa lentamente, de célula a célula, a través del tabique: todo el QRS apunta a la izquierda y atrás durante ≥ 120 ms.',
    'Resultado: QS o rS profundo en V1–V3 y R ancha, mellada ("en meseta" o en M) en I, aVL, V5 y V6.',
    'El ST y la T son DISCORDANTES (opuestos al QRS): ST ↑ en V1–V3 y T negativa en V5–V6. Por eso el BRI enmascara el diagnóstico de infarto (criterios de Sgarbossa). Un BRI nuevo suele indicar cardiopatía estructural.',
  ],
  derivacionesAfectadas: ['V1', 'V2', 'V3', 'I', 'aVL', 'V5', 'V6'],
  modificaciones: {
    intervalos: { qrsDuration: 150 },
    ondas: {
      QRS: [
        { at: 0.12, wl: 0.08, wr: 0.08, v: [0.35, 0.1, -0.25] }, // tabique de derecha a izquierda
        { at: 0.4, wl: 0.14, wr: 0.14, v: [0.9, 0.35, -0.7] }, // VI, lento
        { at: 0.68, wl: 0.13, wr: 0.11, v: [0.85, 0.25, -0.6] }, // segunda muesca de la R
      ],
      // T discordante: opuesta al QRS
      T: [{ at: 0.62, wl: 0.18, wr: 0.12, v: [-0.45, -0.15, 0.35] }],
    },
    st: { direccion: [-0.6, -0.2, 0.6], mv: 0.12 },
  },
});
