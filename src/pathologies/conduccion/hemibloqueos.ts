import { definePathology } from '../schema';

export default definePathology({
  id: 'hemibloqueos',
  nombre: 'Hemibloqueos (anterior y posterior izquierdos)',
  categoria: 'Trastornos de la conducción',
  explicacion: [
    'La rama izquierda se divide en dos fascículos: anterior (delgado, más vulnerable) y posterior (grueso, con doble riego). Si uno se bloquea, su territorio se activa tarde a partir del otro.',
    'El QRS apenas se ensancha (< 120 ms) porque la conducción sigue siendo por Purkinje; lo que cambia es el EJE: el vector final apunta hacia la zona activada tarde.',
    'Hemibloqueo ANTERIOR: el VI anterosuperior se activa al final → eje muy izquierdo (−45° a −90°), qR en I y aVL, rS en II, III y aVF. Es el más frecuente.',
    'Hemibloqueo POSTERIOR: la pared inferoposterior se activa al final → eje derecho (> +90°), rS en I y aVL, qR en III y aVF. Es raro y hay que descartar antes la sobrecarga del VD.',
  ],
  control: {
    tipo: 'fase',
    etiqueta: 'Fascículo bloqueado',
    inicial: 0,
    niveles: [
      {
        id: 'anterior',
        etiqueta: 'Anterior (HAI)',
        detalle: 'eje −60°',
        derivacionesAfectadas: ['I', 'aVL'],
        reciprocas: ['II', 'III', 'aVF'],
        modificaciones: {
          intervalos: { qrsDuration: 100 },
          ejeQRS: -60,
          // Fuerzas iniciales hacia abajo y a la derecha (fascículo posterior): q en I y aVL
          lobulosExtra: { QRS: [{ at: 0.12, wl: 0.07, wr: 0.07, v: [-0.15, 0.25, 0] }] },
        },
      },
      {
        id: 'posterior',
        etiqueta: 'Posterior (HPI)',
        detalle: 'eje +115°',
        derivacionesAfectadas: ['III', 'aVF'],
        reciprocas: ['I', 'aVL'],
        modificaciones: {
          intervalos: { qrsDuration: 100 },
          ejeQRS: 115,
          // Fuerzas iniciales hacia arriba y a la izquierda (fascículo anterior): q en III y aVF
          lobulosExtra: { QRS: [{ at: 0.12, wl: 0.07, wr: 0.07, v: [0.15, -0.25, 0] }] },
        },
      },
    ],
  },
});
