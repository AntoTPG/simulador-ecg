/**
 * MODELO AHA DE 17 SEGMENTOS del ventrículo izquierdo, sobre el VI procedural.
 *
 *  Basales (1–6) y medios (7–12), en sentido antihorario visto desde el ápex:
 *    anterior · anteroseptal · inferoseptal · inferior · inferolateral · anterolateral
 *  Apicales (13–16): anterior · septal · inferior · lateral.   17: ápex.
 *
 * Territorios coronarios típicos (dominancia derecha):
 *  DA → 1, 2, 7, 8, 13, 14, 17 (+ 6, 12, 16 por las diagonales)
 *  Cx → 5, 6, 11, 12, 16          CD → 3, 4, 9, 10, 15
 *
 * Ángulo θ alrededor del eje largo (ver lvSurface): 0° lateral, 90° anterior,
 * 180° septo, 270° inferior.
 */
export interface SegmentDef {
  id: number;
  nombre: string;
  /** Rango de altura en el marco local del corazón. */
  y: [number, number];
  /** Rango angular θ (grados). */
  theta: [number, number];
}

const BASAL: [number, number] = [0.3, 0.98];
const MID: [number, number] = [-0.45, 0.3];
const APICAL: [number, number] = [-1.3, -0.45];
const APEX: [number, number] = [-1.74, -1.3];

const WALLS6: [string, [number, number]][] = [
  ['anterior', [60, 120]],
  ['anteroseptal', [120, 180]],
  ['inferoseptal', [180, 240]],
  ['inferior', [240, 300]],
  ['inferolateral', [300, 360]],
  ['anterolateral', [0, 60]],
];
const WALLS4: [string, [number, number]][] = [
  ['anterior', [45, 135]],
  ['septal', [135, 225]],
  ['inferior', [225, 315]],
  ['lateral', [315, 405]],
];

export const AHA_SEGMENTS: SegmentDef[] = [
  ...WALLS6.map(([n, t], i) => ({ id: i + 1, nombre: `basal ${n}`, y: BASAL, theta: t })),
  ...WALLS6.map(([n, t], i) => ({ id: i + 7, nombre: `medio ${n}`, y: MID, theta: t })),
  ...WALLS4.map(([n, t], i) => ({ id: i + 13, nombre: `apical ${n}`, y: APICAL, theta: t })),
  { id: 17, nombre: 'ápex', y: APEX, theta: [0, 360] },
];
