/**
 * Ritmo sinusal normal. Sirve de referencia y de plantilla: en la fase 2 cada
 * patología será un archivo como este (datos puros validados con Zod) con las
 * modificaciones del vector y de los intervalos.
 */
export const normal = {
  id: 'normal',
  nombre: 'Normal — ritmo sinusal',
  categoria: 'Referencia',
  explicacion: [
    'El impulso nace en el nodo sinusal (aurícula derecha alta) y despolariza las aurículas hacia abajo y a la izquierda: onda P positiva en II y negativa en aVR.',
    'El nodo AV lo retrasa ~0,1 s (segmento PR) para que la contracción auricular complete el llenado ventricular.',
    'El haz de His y las ramas activan primero el tabique (de izquierda a derecha: q septal en V6, r en V1) y luego las paredes libres; como el VI tiene mucha más masa, el vector medio del QRS apunta abajo y a la izquierda (eje entre −30° y +90°).',
    'Durante el ST todas las células están en la meseta del potencial de acción, no hay diferencias de voltaje y el segmento es isoeléctrico. La repolarización (onda T) va del epicardio al endocardio, por eso la T es concordante con el QRS.',
  ],
} as const;
