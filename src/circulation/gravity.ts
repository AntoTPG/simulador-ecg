/**
 * ============================================================================
 *  GRAVEDAD, POSTURA Y PRESIONES VASCULARES
 * ============================================================================
 * Modelo SIMPLIFICADO y educativo (Guyton y Hall; Levick).
 *
 *  - Presión sanguínea medida = presión «hidrodinámica» (la que genera el
 *    corazón) + presión gravitatoria de la columna de sangre (ley de Pascal,
 *    P = ρ·g·h). Con la densidad de la sangre (1,05 g/mL) sale ≈ 0,77 mmHg por
 *    cada cm de altura.
 *  - De pie, por debajo del corazón se SUMA y por encima se RESTA.
 *  - La gravedad no impide el flujo (principio del sifón; Bernoulli): lo que
 *    mueve la sangre es la diferencia de ENERGÍA total, no solo de presión.
 *  - Venas: de pie se distienden las de las piernas y acumulan ≈ 500 mL; baja
 *    la PVC y el gasto cardíaco (hipotensión ortostática) hasta que el reflejo
 *    barorreceptor compensa. La bomba muscular y las válvulas bajan la presión
 *    venosa del pie al caminar.
 *  - Por encima del corazón las venas superficiales del cuello se colapsan
 *    (≈ 0 mmHg); los senos durales no, por la rigidez de la duramadre, y su
 *    presión puede ser negativa (riesgo de embolia gaseosa).
 */

/** mmHg por cada cm de columna de sangre: ρ·g·h = 1050 kg/m³ · 9,8 m/s² · 0,01 m / 133,3 Pa. */
export const MMHG_POR_CM = (1050 * 9.8 * 0.01) / 133.322;

export type Postura = 'decubito' | 'pie';

export interface EstadoPostural {
  postura: Postura;
  /** Bomba muscular activa (caminando) o de pie inmóvil. */
  caminando: boolean;
  /** Reflejo barorreceptor funcionando. */
  barorreflejo: boolean;
  /** Segundos desde el cambio de postura (para la evolución temporal). */
  t: number;
}

/** Puntos del cuerpo, con su altura respecto al corazón (cm) de pie. */
export const PUNTOS = [
  { id: 'seno', nombre: 'Seno sagital', h: 45, vena: true, arteria: false },
  { id: 'cerebro', nombre: 'Arterias cerebrales', h: 38, vena: false, arteria: true },
  { id: 'cuello', nombre: 'Venas del cuello', h: 22, vena: true, arteria: false },
  { id: 'corazon', nombre: 'Corazón (referencia)', h: 0, vena: true, arteria: true },
  { id: 'mano', nombre: 'Mano (brazo colgando)', h: -40, vena: true, arteria: true },
  { id: 'pie', nombre: 'Pie', h: -125, vena: true, arteria: true },
] as const;

const suave = (x: number) => 1 - Math.exp(-Math.max(0, x));

/**
 * Situación hemodinámica global en el instante t tras el cambio de postura.
 * De pie: la sangre se acumula en las piernas en unos 10 s; la PVC y el gasto
 * caen; si hay barorreflejo, en unos 15–20 s sube el simpático y se recuperan.
 */
export function hemodinamica(e: EstadoPostural) {
  if (e.postura === 'decubito') return { acumulado: 0, pvc: 0, gc: 5, pam: 93, simpatico: 0 };
  const llenado = suave(e.t / 4); // 0→1 en ~10 s
  const bomba = e.caminando ? 0.45 : 1; // la bomba muscular reduce la sangre acumulada
  const acumulado = 0.5 * llenado * bomba; // L en las venas de las piernas
  const simpatico = e.barorreflejo ? suave((e.t - 3) / 6) : 0;
  // Sin compensación: PVC y gasto caen con lo acumulado (≈ −2 mmHg y −2 L/min con 500 mL)
  const pvc = -4 * acumulado * (1 - 0.6 * simpatico);
  const gc = 5 - 4 * acumulado * (1 - 0.75 * simpatico);
  // La resistencia periférica sube con el simpático
  const rpt = 18.6 * (1 + 0.13 * simpatico);
  return { acumulado, pvc, gc, pam: gc * rpt + pvc, simpatico };
}

/** Presión arterial media y venosa en cada punto (mmHg). */
export function presiones(e: EstadoPostural) {
  const hd = hemodinamica(e);
  const factor = e.postura === 'pie' ? 1 : 0.06; // tumbado, solo el grosor del cuerpo
  return PUNTOS.map((p) => {
    const grav = -p.h * MMHG_POR_CM * factor; // + por debajo del corazón
    const arterial = p.arteria ? hd.pam + grav : null;
    let venosa: number | null = null;
    if (p.vena) {
      if (p.id === 'seno') venosa = Math.min(0, 2 + grav * 0.5) + (e.postura === 'pie' ? -8 : 6);
      else if (p.id === 'cuello') venosa = e.postura === 'pie' ? 0 : 5; // colapsadas de pie
      else if (p.id === 'corazon') venosa = hd.pvc;
      else {
        // Venas por debajo del corazón: la presión «dinámica» periférica + la columna.
        // Caminando, las válvulas fragmentan la columna y la bomba muscular la vacía.
        const columna = e.caminando && p.id === 'pie' ? grav * 0.25 : grav;
        venosa = 7 + columna;
      }
    }
    return { ...p, arterial, venosa };
  });
}

/** Riesgo de síncope: cuando la presión arterial cerebral cae por debajo de ~50 mmHg. */
export function riesgoSincope(e: EstadoPostural) {
  const cerebro = presiones(e).find((p) => p.id === 'cerebro')!;
  return (cerebro.arterial ?? 99) < 50;
}
