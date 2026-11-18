import { definePathology } from '../schema';

export default definePathology({
  id: 'hvi',
  nombre: 'Hipertrofia ventricular izquierda (HVI)',
  categoria: 'Hipertrofia',
  explicacion: [
    'Más masa en el VI (hipertensión, estenosis aórtica, miocardiopatía hipertrófica) = más fuerzas eléctricas hacia la izquierda y atrás: el vector del QRS se hace más GRANDE.',
    'Por eso crecen las R en I, aVL, V5–V6 y las S en V1–V2. Criterio de Sokolow‑Lyon: S(V1) + R(V5 o V6) > 35 mm. Criterio de Cornell: R(aVL) + S(V3) > 28 mm (♂) / 20 mm (♀).',
    'La activación tarda algo más en atravesar una pared gruesa: el QRS se ensancha ligeramente y puede desviarse el eje a la izquierda.',
    'En fases avanzadas aparece el patrón de "SOBRECARGA" (strain): ST descendido y T asimétrica negativa en V5–V6, I y aVL, por isquemia subendocárdica relativa y repolarización alterada.',
  ],
  derivacionesAfectadas: ['V5', 'V6', 'I', 'aVL'],
  reciprocas: ['V1', 'V2'],
  territorio3D: { segmentos: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17] },
  control: {
    tipo: 'gravedad',
    etiqueta: 'Grado',
    inicial: 1,
    niveles: [
      {
        id: 'voltaje',
        etiqueta: 'Solo voltaje',
        detalle: 'Sokolow > 35 mm',
        modificaciones: { amplitud: { QRS: 1.8 }, intervalos: { qrsDuration: 100 } },
      },
      {
        id: 'sobrecarga',
        etiqueta: 'Con sobrecarga (strain)',
        detalle: 'ST ↓ y T − en V5–V6',
        modificaciones: {
          amplitud: { QRS: 1.9, T: 0.4 },
          intervalos: { qrsDuration: 108 },
          st: { direccion: [-0.7, -0.25, 0.45], mv: 0.1 },
          lobulosExtra: { T: [{ at: 0.6, wl: 0.2, wr: 0.14, v: [-0.5, -0.28, 0.28] }] },
        },
      },
    ],
  },
});
