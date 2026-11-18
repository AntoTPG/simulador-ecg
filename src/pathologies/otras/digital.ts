import { definePathology } from '../schema';

/** Opuesto al QRS dominante: el descenso del ST "en cubeta" se ve donde la R es alta. */
const CUBETA: [number, number, number] = [-0.6, -0.55, 0.25];

export default definePathology({
  id: 'digital',
  nombre: 'Efecto e intoxicación digitálica',
  categoria: 'Otras',
  explicacion: [
    'La digoxina inhibe la bomba Na⁺/K⁺‑ATPasa: aumenta el Ca²⁺ intracelular (efecto inotrópico) y acorta el potencial de acción ventricular. Además tiene un efecto vagal que frena el nodo AV.',
    'EFECTO digitálico (normal en quien la toma, no indica toxicidad): descenso del ST "en cubeta" o "cazoleta" (curvo, como la barba de Salvador Dalí) en las derivaciones con R alta, T aplanada, QT corto y PR algo alargado.',
    'INTOXICACIÓN: casi cualquier arritmia, típicamente con automatismo aumentado y conducción AV deprimida a la vez: extrasístoles ventriculares (bigeminismo), taquicardia auricular con bloqueo, BAV de 2.º grado, TV bidireccional.',
    'La favorecen la hipopotasemia, la insuficiencia renal y la edad avanzada. Antídoto: anticuerpos antidigoxina (Fab).',
  ],
  derivacionesAfectadas: ['V4', 'V5', 'V6', 'II', 'I'],
  control: {
    tipo: 'gravedad',
    etiqueta: 'Situación',
    inicial: 0,
    niveles: [
      {
        id: 'efecto',
        etiqueta: 'Efecto digitálico',
        detalle: 'dosis terapéutica',
        modificaciones: {
          st: { direccion: CUBETA, mv: 0.11 },
          amplitud: { T: 0.3 },
          intervalos: { qtc: 370, prInterval: 205 },
        },
      },
      {
        id: 'intoxicacion',
        etiqueta: 'Intoxicación (BAV Wenckebach)',
        detalle: 'niveles tóxicos',
        explicacion: ['Aquí se muestra el bloqueo AV de 2.º grado tipo Wenckebach por el efecto vagal y la depresión nodal, sumado a la cubeta digitálica.'],
        modificaciones: {
          st: { direccion: CUBETA, mv: 0.13 },
          amplitud: { T: 0.25 },
          intervalos: { qtc: 365, prInterval: 220 },
          ritmo: { tipo: 'wenckebach', conducidos: 3, incremento: 80 },
        },
      },
    ],
  },
});
