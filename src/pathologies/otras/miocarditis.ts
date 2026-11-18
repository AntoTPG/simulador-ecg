import { definePathology } from '../schema';

export default definePathology({
  id: 'miocarditis',
  nombre: 'Miocarditis',
  categoria: 'Otras',
  explicacion: [
    'La inflamación afecta al propio MIOCARDIO (a menudo tras una infección viral). El ECG casi nunca es normal, pero sus cambios son inespecíficos.',
    'Lo más típico: taquicardia sinusal desproporcionada a la fiebre, alteraciones difusas de la repolarización (ST ligeramente elevado o T negativas) y bajo voltaje por edema miocárdico.',
    'Si la inflamación alcanza el sistema de conducción aparecen bloqueos AV o de rama y el QRS se ensancha: es un signo de mal pronóstico.',
    'Son frecuentes las arritmias (extrasístoles, taquicardias ventriculares) y puede coexistir con pericarditis (miopericarditis). Se confirma con troponina y resonancia magnética.',
  ],
  derivacionesAfectadas: ['I', 'II', 'V3', 'V4', 'V5', 'V6'],
  territorio3D: { estructuras: ['difuso'] },
  control: {
    tipo: 'gravedad',
    etiqueta: 'Gravedad',
    inicial: 0,
    niveles: [
      {
        id: 'leve',
        etiqueta: 'Leve',
        detalle: 'taquicardia y T negativas',
        modificaciones: {
          frecuencia: 112,
          amplitud: { QRS: 0.75, T: 0.3 },
          st: { direccion: [0.55, 0.71, 0.44], mv: 0.05 },
          lobulosExtra: { T: [{ at: 0.6, wl: 0.18, wr: 0.15, v: [-0.15, -0.15, -0.12] }] },
          intervalos: { qtc: 460 },
        },
      },
      {
        id: 'grave',
        etiqueta: 'Grave',
        detalle: 'bajo voltaje, QRS ancho, BAV 1.º',
        explicacion: ['Afectación extensa: bajo voltaje, QRS ensanchado por trastorno de conducción intraventricular, PR largo y repolarización muy alterada. Riesgo de shock cardiogénico y arritmias malignas.'],
        modificaciones: {
          frecuencia: 125,
          amplitud: { QRS: 0.5, T: 0.2 },
          st: { direccion: [0.55, 0.71, 0.44], mv: 0.07 },
          lobulosExtra: { T: [{ at: 0.6, wl: 0.18, wr: 0.15, v: [-0.2, -0.2, -0.15] }] },
          intervalos: { qtc: 480, qrsDuration: 125, prInterval: 230 },
        },
      },
    ],
  },
});
