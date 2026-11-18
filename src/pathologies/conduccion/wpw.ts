import { definePathology } from '../schema';

export default definePathology({
  id: 'wpw',
  nombre: 'Preexcitación — Wolff-Parkinson-White',
  categoria: 'Trastornos de la conducción',
  explicacion: [
    'Existe una vía accesoria (haz de Kent) que une aurícula y ventrículo saltándose el nodo AV, que es el único "freno" fisiológico.',
    'El impulso llega antes por la vía accesoria y empieza a activar una zona del ventrículo de forma lenta, músculo a músculo: PR CORTO (< 120 ms) y ONDA DELTA (empastamiento inicial del QRS).',
    'Poco después llega el impulso normal por el His y el resto del QRS es normal: el QRS es una "fusión" algo ancho. Hay cambios secundarios del ST‑T, opuestos a la delta.',
    'La dirección de la delta localiza la vía (aquí, izquierda: delta positiva en V1). Riesgo: taquicardias por reentrada y, si aparece una FA, conducción muy rápida a los ventrículos (¡evitar fármacos que frenan el nodo AV!).',
  ],
  derivacionesAfectadas: ['V1', 'V2', 'II', 'aVF'],
  modificaciones: {
    intervalos: { prInterval: 150, qrsDuration: 115 },
    lobulosExtra: {
      // Onda delta: empieza ANTES del QRS normal y sube despacio
      QRS: [{ at: -0.08, wl: 0.16, wr: 0.12, v: [0.35, 0.35, 0.55] }],
      // Cambios secundarios de la repolarización
      T: [{ at: 0.55, wl: 0.2, wr: 0.15, v: [-0.15, -0.15, -0.25] }],
    },
  },
});
