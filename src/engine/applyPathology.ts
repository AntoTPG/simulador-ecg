/**
 * APLICAR UNA PATOLOGÍA
 * =====================
 * Convierte las modificaciones declarativas de una patología (datos) en
 * cambios sobre los parámetros del corazón sano.
 */
import type { Modifications, Pathology } from '../pathologies/schema';
import { add, normalize, scale, type Vec3 } from './math';
import type { SimParams } from './params';
import { rotateLobes, type Lobe } from './waves';

/** Combina las modificaciones de la patología con las del nivel elegido (el nivel manda). */
export function mergeModifications(base: Modifications = {}, level: Modifications = {}): Modifications {
  const out: Modifications = { ...base, ...level };
  if (base.intervalos || level.intervalos) out.intervalos = { ...base.intervalos, ...level.intervalos };
  if (base.amplitud || level.amplitud) out.amplitud = { ...base.amplitud, ...level.amplitud };
  if (base.isquemia || level.isquemia) out.isquemia = { ...base.isquemia, ...level.isquemia };
  if (base.ondas || level.ondas) out.ondas = { ...base.ondas, ...level.ondas };
  if (base.lobulosExtra || level.lobulosExtra) {
    const keys = ['P', 'QRS', 'T', 'U'] as const;
    out.lobulosExtra = Object.fromEntries(
      keys.map((k) => [k, [...(base.lobulosExtra?.[k] ?? []), ...(level.lobulosExtra?.[k] ?? [])]]),
    );
  }
  return out;
}

const scaleAmp = (lobes: Lobe[], k: number | undefined) =>
  k === undefined ? lobes : lobes.map((l) => ({ ...l, v: scale(l.v, k) as Vec3 }));

/**
 * ISQUEMIA E INFARTO — traducción de cada fase a cambios del vector.
 * `n` = dirección del territorio (del centro del corazón a su epicardio).
 *
 *  · HIPERAGUDA (minutos): la isquemia acorta el potencial de acción de la zona
 *    → se repolariza antes y la T se hace alta y ancha en las derivaciones que
 *    miran al territorio (vector T extra hacia n).
 *  · LESIÓN: las células lesionadas tienen un potencial de reposo menos negativo
 *    y una meseta más baja → corriente de lesión. Si es TRANSMURAL, el vector de
 *    lesión (ST) apunta HACIA el epicardio lesionado → ST ↑ en las derivaciones
 *    que lo miran y ST ↓ "en espejo" (recíproco) en las opuestas. Si es
 *    SUBENDOCÁRDICA, apunta hacia la CAVIDAD → ST ↓ en las derivaciones que miran
 *    la zona.
 *  · NECROSIS: el tejido muerto no genera fuerzas eléctricas; el vector resultante
 *    se ALEJA del infarto → ondas Q patológicas y pérdida de R. El electrodo "ve a
 *    través de la ventana eléctrica" la pared opuesta, que se aleja de él.
 *  · CRÓNICA: queda la Q; el ST vuelve a la línea de base y la T se invierte
 *    (simétrica): la repolarización de la zona isquémica se retrasa y el vector T
 *    se aleja del territorio.
 */
function applyIschemia(p: SimParams, isq: NonNullable<Modifications['isquemia']>) {
  if (!isq.territorio || !isq.fase) return;
  const n = normalize(isq.territorio as Vec3);
  const k = isq.intensidad ?? 1;
  const sub = isq.tipo === 'subendocardica';
  const v = (s: number): Vec3 => scale(n, s * k);
  const addT = (s: number, w = 1) => p.waves.T.push({ at: 0.6, wl: 0.2 * w, wr: 0.16 * w, v: v(s) });
  const addQ = () =>
    p.waves.QRS.push(
      { at: 0.2, wl: 0.08, wr: 0.1, v: v(-0.75) }, // onda Q: las fuerzas iniciales se alejan
      { at: 0.48, wl: 0.1, wr: 0.1, v: v(-0.4) }, // pérdida de R en el territorio
    );

  if (sub) {
    // Subendocárdica: el vector de lesión apunta a la cavidad (−n) → descenso del ST.
    if (isq.fase !== 'necrosis' && isq.fase !== 'cronica') p.stVector = add(p.stVector, v(-0.17));
    if (isq.fase === 'cronica' || isq.fase === 'necrosis') addT(-0.25);
    return;
  }
  switch (isq.fase) {
    case 'hiperaguda':
      addT(0.55, 1.15);
      p.stVector = add(p.stVector, v(0.06));
      break;
    case 'lesion':
      p.stVector = add(p.stVector, v(0.28));
      addT(0.22);
      break;
    case 'necrosis':
      addQ();
      p.stVector = add(p.stVector, v(0.13));
      addT(-0.22);
      break;
    case 'cronica':
      addQ();
      // Debe superar a la T normal (concordante) para invertirla de verdad
      addT(-0.8, 0.85);
      break;
  }
}

/** Nivel elegido de una patología y sus datos combinados. */
export function resolvePathology(p: Pathology, levelIndex: number) {
  const niveles = p.control?.niveles ?? [];
  const level = niveles.length ? niveles[Math.max(0, Math.min(levelIndex, niveles.length - 1))] : undefined;
  return {
    level,
    mods: mergeModifications(p.modificaciones, level?.modificaciones),
    afectadas: level?.derivacionesAfectadas ?? p.derivacionesAfectadas,
    reciprocas: level?.reciprocas ?? p.reciprocas,
  };
}

/** Parámetros de simulación para una patología, partiendo del corazón sano `base`. */
export const paramsForPathology = (base: SimParams, p: Pathology, levelIndex: number) =>
  applyModifications(base, resolvePathology(p, levelIndex).mods);

/** Devuelve unos parámetros nuevos con la patología aplicada (no modifica `base`). */
export function applyModifications(base: SimParams, m: Modifications): SimParams {
  const p: SimParams = {
    ...base,
    waves: {
      P: base.waves.P.map((l) => ({ ...l })),
      QRS: base.waves.QRS.map((l) => ({ ...l })),
      T: base.waves.T.map((l) => ({ ...l })),
      U: base.waves.U.map((l) => ({ ...l })),
    },
    stVector: [...base.stVector] as Vec3,
    prSegmentVector: [...base.prSegmentVector] as Vec3,
  };

  // 1. Intervalos (valores absolutos) y frecuencia sinusal propia de la patología
  Object.assign(p, m.intervalos ?? {});
  if (m.frecuencia) p.heartRate = m.frecuencia;

  // 2a. Ondas sustituidas por completo (p. ej. QRS de un bloqueo de rama izquierda)
  for (const k of ['P', 'QRS', 'T', 'U'] as const) {
    const w = m.ondas?.[k];
    if (w) p.waves[k] = w.map((l) => ({ ...l, v: [...l.v] as Vec3 }));
  }

  // 2b. Desviación del eje (hemibloqueos, sobrecarga del VD…): se giran QRS y T en el plano frontal
  if (m.ejeQRS !== undefined) {
    const rot = m.ejeQRS - p.qrsAxis;
    p.waves.QRS = rotateLobes(p.waves.QRS, rot);
    p.waves.T = rotateLobes(p.waves.T, rot);
    p.qrsAxis = m.ejeQRS;
  }

  // 2c. Amplitud y anchura de las ondas
  p.waves.P = scaleAmp(p.waves.P, m.amplitud?.P);
  p.waves.QRS = scaleAmp(p.waves.QRS, m.amplitud?.QRS);
  p.waves.T = scaleAmp(p.waves.T, m.amplitud?.T);
  p.waves.U = scaleAmp(p.waves.U, m.amplitud?.U);
  if (m.anchuraT) p.waves.T = p.waves.T.map((l) => ({ ...l, wl: l.wl * m.anchuraT!, wr: l.wr * m.anchuraT! }));

  // 3. Segmentos desplazados
  if (m.st) p.stVector = add(p.stVector, scale(normalize(m.st.direccion as Vec3), m.st.mv));
  if (m.pr) p.prSegmentVector = add(p.prSegmentVector, scale(normalize(m.pr.direccion as Vec3), m.pr.mv));

  // 4. Lóbulos añadidos
  for (const k of ['P', 'QRS', 'T', 'U'] as const) {
    const extra = m.lobulosExtra?.[k];
    if (extra) p.waves[k].push(...extra.map((l) => ({ ...l, v: [...l.v] as Vec3 })));
  }

  // 5. Isquemia
  if (m.isquemia) applyIschemia(p, m.isquemia);

  // 6. Ritmo (bloqueos AV, FA, flúter)
  if (m.ritmo) {
    const { tipo, ...rest } = m.ritmo;
    p.rhythm = { kind: tipo, ...rest } as SimParams['rhythm'];
  }

  return p;
}
