import { definePathology } from '../schema';

/**
 * HIPERPOTASEMIA. Cada nivel describe el ECG completo de esa gravedad
 * (los cambios se van acumulando a medida que sube el K⁺).
 */
export default definePathology({
  id: 'hiperpotasemia',
  nombre: 'Hiperpotasemia',
  categoria: 'Alteraciones electrolíticas',
  explicacion: [
    'El K⁺ extracelular alto hace MENOS negativo el potencial de reposo (ecuación de Nernst). Al principio, la mayor conductancia al K⁺ acelera la repolarización: la fase 3 del potencial de acción es más rápida y la onda T se vuelve alta, estrecha, simétrica y "picuda".',
    'Con más K⁺, la despolarización parcial inactiva canales de Na⁺: la fase 0 es más lenta y la conducción se enlentece. Primero se afecta el miocardio auricular (P aplanada y ancha, PR largo) y después el ventricular (QRS ancho).',
    'En los niveles extremos el QRS ancho se fusiona con la T y aparece el patrón SINUSOIDAL, preludio de la fibrilación ventricular o la asistolia.',
    'La correlación entre el K⁺ y el ECG es pobre: un ECG alterado es una urgencia (gluconato cálcico para estabilizar la membrana, insulina con glucosa, salbutamol…).',
  ],
  derivacionesAfectadas: ['V2', 'V3', 'V4', 'II'],
  territorio3D: { estructuras: ['difuso'] },
  control: {
    tipo: 'gravedad',
    etiqueta: 'Nivel de K⁺',
    inicial: 0,
    niveles: [
      {
        id: 't-picudas',
        etiqueta: 'T picudas',
        detalle: 'K⁺ 5,5–6,5 mEq/L',
        explicacion: ['Repolarización acelerada: T alta, estrecha y de base corta, simétrica ("en tienda de campaña"). El QT puede acortarse ligeramente.'],
        modificaciones: { amplitud: { T: 2.1 }, anchuraT: 0.6, intervalos: { qtc: 385 } },
      },
      {
        id: 'p-aplanada',
        etiqueta: 'PR largo, P aplanada',
        detalle: 'K⁺ 6,5–7,5 mEq/L',
        explicacion: ['Conducción auricular lenta: la P se aplana y se ensancha y el PR se alarga. Las T siguen picudas.'],
        modificaciones: {
          amplitud: { T: 2.2, P: 0.4 },
          anchuraT: 0.6,
          intervalos: { qtc: 385, prInterval: 230, pDuration: 135 },
        },
      },
      {
        id: 'qrs-ancho',
        etiqueta: 'QRS ancho',
        detalle: 'K⁺ 7,5–8,5 mEq/L',
        explicacion: ['La P casi desaparece (las aurículas son más sensibles al K⁺) y el QRS se ensancha porque la fase 0 es lenta en todo el ventrículo. Riesgo alto de bradiarritmias y bloqueos.'],
        modificaciones: {
          amplitud: { T: 2.0, P: 0.1, QRS: 0.85 },
          anchuraT: 0.7,
          intervalos: { qtc: 410, prInterval: 260, pDuration: 150, qrsDuration: 170 },
        },
      },
      {
        id: 'sinusoidal',
        etiqueta: 'Patrón sinusoidal',
        detalle: 'K⁺ > 8,5–9 mEq/L',
        explicacion: ['El QRS, muy ancho, se funde con la T en una onda lenta y ondulante (patrón sinusoidal). Es una situación periparada: FV o asistolia inminentes.'],
        modificaciones: {
          amplitud: { T: 1.5, P: 0, QRS: 0.8 },
          anchuraT: 1.1,
          intervalos: { qtc: 470, qrsDuration: 260 },
        },
      },
    ],
  },
});
