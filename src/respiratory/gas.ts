/**
 * ============================================================================
 *  GASOMETRÍA ARTERIAL: interpretación paso a paso
 * ============================================================================
 * Reglas tomadas del Manual MSD (versión para profesionales): «Regulación del
 * equilibrio ácido‑base», «Acidosis metabólica», «Alcalosis metabólica»,
 * «Acidosis respiratoria», «Alcalosis respiratoria» y «Gasometría arterial»;
 * y de West (Fisiología y Fisiopatología respiratoria) para la oxigenación.
 *
 *  1. Coherencia: Henderson‑Hasselbalch, pH = 6,1 + log(HCO₃⁻ / (0,03 · PaCO₂)).
 *  2. ¿Acidemia o alcalemia? (pH 7,35–7,45).
 *  3. Trastorno primario: ¿lo explica el PaCO₂ (respiratorio) o el HCO₃⁻ (metabólico)?
 *  4. Compensación esperada (si no se cumple, hay un trastorno MIXTO):
 *     - acidosis metabólica: PaCO₂ = 1,5 · HCO₃⁻ + 8 ± 2 (Winter);
 *     - alcalosis metabólica: PaCO₂ = 0,7 · HCO₃⁻ + 21 ± 2;
 *     - acidosis respiratoria: HCO₃⁻ ↑ 1 (aguda) o ≈ 3,5 (crónica) por cada 10 mmHg de PaCO₂;
 *     - alcalosis respiratoria: HCO₃⁻ ↓ 2 (aguda) o ≈ 4–5 (crónica) por cada 10 mmHg.
 *  5. Anión gap = Na⁺ − (Cl⁻ + HCO₃⁻), corregido por la albúmina (+2,5 por cada
 *     g/dL por debajo de 4). Si está alto, cociente delta (ΔAG/ΔHCO₃⁻).
 *  6. Oxigenación: PAO₂ = FiO₂ · (Patm − 47) − PaCO₂ / 0,8; gradiente A‑a
 *     (normal ≈ edad/4 + 4); PaO₂/FiO₂.
 * Los cortes son los habituales de los libros; la clínica manda.
 */

export interface GasInput {
  ph: number;
  paco2: number; // mmHg
  hco3: number; // mEq/L
  pao2: number; // mmHg
  fio2: number; // fracción (0,21 = aire ambiente)
  na: number;
  cl: number;
  albumina: number; // g/dL
  edad: number;
  /** Para los trastornos respiratorios: si es agudo, crónico o no se sabe. */
  evolucion: 'aguda' | 'cronica' | 'desconocida';
  /** Presión atmosférica (mmHg): 760 a nivel del mar. */
  patm: number;
}

export const GAS_NORMAL: GasInput = {
  ph: 7.4,
  paco2: 40,
  hco3: 24,
  pao2: 95,
  fio2: 0.21,
  na: 140,
  cl: 104,
  albumina: 4,
  edad: 30,
  evolucion: 'desconocida',
  patm: 760,
};

export type Primario = 'acidosis-metabolica' | 'alcalosis-metabolica' | 'acidosis-respiratoria' | 'alcalosis-respiratoria';

export const NOMBRE_PRIMARIO: Record<Primario, string> = {
  'acidosis-metabolica': 'Acidosis metabólica',
  'alcalosis-metabolica': 'Alcalosis metabólica',
  'acidosis-respiratoria': 'Acidosis respiratoria',
  'alcalosis-respiratoria': 'Alcalosis respiratoria',
};

export interface Paso {
  titulo: string;
  texto: string;
  estado: 'ok' | 'alerta' | 'info';
}

export interface GasResult {
  pasos: Paso[];
  /** Diagnóstico ácido‑base resumido (p. ej., «Acidosis metabólica con anión gap elevado…»). */
  diagnostico: string[];
  primario: Primario | null;
  phCalc: number;
  ag: number;
  agCorr: number;
  pAO2: number;
  gradAa: number;
  gradAaNormal: number;
  pafi: number;
}

/** pH que corresponde a un HCO₃⁻ y un PaCO₂ (Henderson‑Hasselbalch). */
export const phHH = (hco3: number, paco2: number) => 6.1 + Math.log10(hco3 / (0.03 * paco2));
/** HCO₃⁻ que corresponde a un pH y un PaCO₂. */
export const hco3HH = (ph: number, paco2: number) => 0.03 * paco2 * Math.pow(10, ph - 6.1);

const f1 = (x: number) => x.toFixed(1).replace('.', ',');
const f0 = (x: number) => x.toFixed(0);
const f2 = (x: number) => x.toFixed(2).replace('.', ',');

export function interpretarGas(g: GasInput): GasResult {
  const pasos: Paso[] = [];
  const dx: string[] = [];

  // 1. Coherencia interna
  const phCalc = phHH(g.hco3, g.paco2);
  const incoherente = Math.abs(phCalc - g.ph) > 0.05;
  pasos.push({
    titulo: '1 · ¿Es coherente?',
    texto: `Con ese HCO₃⁻ y ese PaCO₂, la ecuación de Henderson‑Hasselbalch da un pH de ${f2(phCalc)}. ${
      incoherente ? 'No cuadra con el pH medido: revisa los valores (error de transcripción o de muestra).' : 'Cuadra con el pH medido.'
    }`,
    estado: incoherente ? 'alerta' : 'ok',
  });

  // 2. pH
  const acidemia = g.ph < 7.35;
  const alcalemia = g.ph > 7.45;
  pasos.push({
    titulo: '2 · ¿Acidemia o alcalemia?',
    texto: `pH ${f2(g.ph)}: ${acidemia ? 'ACIDEMIA (< 7,35)' : alcalemia ? 'ALCALEMIA (> 7,45)' : 'dentro de lo normal (7,35–7,45)'}.`,
    estado: acidemia || alcalemia ? 'alerta' : 'ok',
  });

  // 3. Trastorno primario
  const co2Alto = g.paco2 > 45;
  const co2Bajo = g.paco2 < 35;
  const hco3Alto = g.hco3 > 26;
  const hco3Bajo = g.hco3 < 22;
  let primario: Primario | null = null;
  const mixtoPrimario: string[] = [];
  if (acidemia) {
    if (hco3Bajo && co2Alto) mixtoPrimario.push('acidosis metabólica', 'acidosis respiratoria');
    else if (co2Alto) primario = 'acidosis-respiratoria';
    else if (hco3Bajo) primario = 'acidosis-metabolica';
  } else if (alcalemia) {
    if (hco3Alto && co2Bajo) mixtoPrimario.push('alcalosis metabólica', 'alcalosis respiratoria');
    else if (co2Bajo) primario = 'alcalosis-respiratoria';
    else if (hco3Alto) primario = 'alcalosis-metabolica';
  } else {
    // pH normal: si el PaCO₂ y el HCO₃⁻ se mueven en sentidos «compensadores» y están alterados, hay dos trastornos
    if (co2Alto && hco3Alto) mixtoPrimario.push('acidosis respiratoria', 'alcalosis metabólica');
    else if (co2Bajo && hco3Bajo) mixtoPrimario.push('alcalosis respiratoria', 'acidosis metabólica');
  }

  if (mixtoPrimario.length) {
    pasos.push({
      titulo: '3 · Trastorno primario',
      texto: `El PaCO₂ (${f0(g.paco2)} mmHg) y el HCO₃⁻ (${f0(g.hco3)} mEq/L) están alterados ${
        acidemia || alcalemia ? 'y los dos empujan el pH en el mismo sentido' : 'con un pH normal'
      }: hay DOS trastornos primarios a la vez (${mixtoPrimario.join(' + ')}).`,
      estado: 'alerta',
    });
    dx.push(`Trastorno mixto: ${mixtoPrimario.join(' + ')}`);
  } else if (primario) {
    const porque = primario.includes('respiratoria')
      ? `el PaCO₂ (${f0(g.paco2)} mmHg) está ${co2Alto ? 'alto' : 'bajo'} y explica el pH`
      : `el HCO₃⁻ (${f0(g.hco3)} mEq/L) está ${hco3Alto ? 'alto' : 'bajo'} y explica el pH`;
    pasos.push({ titulo: '3 · Trastorno primario', texto: `${NOMBRE_PRIMARIO[primario]}: ${porque}.`, estado: 'alerta' });
    dx.push(NOMBRE_PRIMARIO[primario]);
  } else {
    const alterado = co2Alto || co2Bajo || hco3Alto || hco3Bajo;
    pasos.push({
      titulo: '3 · Trastorno primario',
      texto: alterado
        ? 'Hay valores alterados con un pH normal y en sentidos que no se compensan entre sí: revísalos.'
        : 'PaCO₂ (35–45 mmHg) y HCO₃⁻ (22–26 mEq/L) normales: sin trastorno ácido‑base (salvo que el anión gap diga otra cosa).',
      estado: alterado ? 'alerta' : 'ok',
    });
  }

  // 4. Compensación esperada
  if (primario) {
    let esperado = '';
    let fuera: string | null = null;
    if (primario === 'acidosis-metabolica') {
      const e = 1.5 * g.hco3 + 8;
      esperado = `PaCO₂ esperado (Winter) = 1,5 × ${f0(g.hco3)} + 8 = ${f0(e)} ± 2 mmHg`;
      if (g.paco2 > e + 2) fuera = 'el PaCO₂ es MÁS ALTO de lo esperado → acidosis respiratoria añadida';
      else if (g.paco2 < e - 2) fuera = 'el PaCO₂ es MÁS BAJO de lo esperado → alcalosis respiratoria añadida';
    } else if (primario === 'alcalosis-metabolica') {
      const e = 0.7 * g.hco3 + 21;
      esperado = `PaCO₂ esperado = 0,7 × ${f0(g.hco3)} + 21 = ${f0(e)} ± 2 mmHg`;
      if (g.paco2 > e + 2) fuera = 'el PaCO₂ es más alto de lo esperado → acidosis respiratoria añadida';
      else if (g.paco2 < e - 2) fuera = 'el PaCO₂ es más bajo de lo esperado → alcalosis respiratoria añadida';
    } else {
      const d = (g.paco2 - 40) / 10;
      const ag = 24 + d * (primario === 'acidosis-respiratoria' ? 1 : 2);
      const cr = 24 + d * (primario === 'acidosis-respiratoria' ? 3.5 : 4.5);
      const [lo, hi] = [Math.min(ag, cr) - 2, Math.max(ag, cr) + 2];
      esperado = `HCO₃⁻ esperado: ${f0(ag)} si es aguda, ≈ ${f0(cr)} si es crónica`;
      // Un HCO₃⁻ bajo con el anión gap elevado no es compensación renal crónica: hay ácidos añadidos
      const agTemprano = g.na - (g.cl + g.hco3) + 2.5 * (4 - g.albumina);
      if (g.hco3 < lo) fuera = 'el HCO₃⁻ es más bajo de lo esperado → acidosis metabólica añadida';
      else if (primario === 'alcalosis-respiratoria' && agTemprano > 14 && g.hco3 < ag - 2)
        fuera = 'el HCO₃⁻ ha bajado más de lo que explica una forma aguda y, con el anión gap alto, no se debe a la compensación renal → acidosis metabólica añadida';
      else if (g.hco3 > hi) fuera = 'el HCO₃⁻ es más alto de lo esperado → alcalosis metabólica añadida';
      else {
        const cerca = Math.abs(g.hco3 - ag) <= Math.abs(g.hco3 - cr) ? 'aguda' : 'crónica';
        esperado += `. El HCO₃⁻ medido encaja mejor con una forma ${cerca}`;
        if (g.evolucion !== 'desconocida' && (g.evolucion === 'aguda') !== (cerca === 'aguda'))
          fuera = `la clínica dice «${g.evolucion}», pero la compensación sugiere una forma ${cerca}: piensa en un trastorno metabólico añadido`;
        else dx[dx.length - 1] += ` ${cerca === 'aguda' ? 'aguda' : 'crónica'}`;
      }
    }
    pasos.push({
      titulo: '4 · ¿Está bien compensado?',
      texto: `${esperado}. ${fuera ? `No: ${fuera}.` : 'Sí: compensación adecuada (trastorno simple).'}`,
      estado: fuera ? 'alerta' : 'ok',
    });
    if (fuera) dx.push(fuera.split('→ ')[1] ?? fuera);
  }

  // 5. Anión gap
  const ag = g.na - (g.cl + g.hco3);
  const agCorr = ag + 2.5 * (4 - g.albumina);
  const agAlto = agCorr > 14;
  let textoAg = `AG = ${f0(g.na)} − (${f0(g.cl)} + ${f0(g.hco3)}) = ${f0(ag)} mEq/L`;
  if (Math.abs(g.albumina - 4) > 0.2) textoAg += `; corregido por la albúmina (${f1(g.albumina)} g/dL): ${f1(agCorr)}`;
  textoAg += agAlto ? '. ELEVADO (> 12 ± 2): hay ácidos no medidos (lactato, cetoácidos, tóxicos, uremia).' : '. Normal (≈ 12 ± 2).';
  if (agAlto) {
    const delta = (agCorr - 12) / Math.max(0.5, 24 - g.hco3);
    textoAg += ` Cociente delta (ΔAG/ΔHCO₃⁻) = ${f1(delta)}: `;
    if (g.hco3 >= 24 || delta > 2) {
      textoAg += 'el HCO₃⁻ ha bajado MENOS de lo que explica el anión gap → alcalosis metabólica concomitante.';
      dx.push('acidosis metabólica con anión gap elevado + alcalosis metabólica concomitante');
    } else if (delta < 1) {
      textoAg += 'el HCO₃⁻ ha bajado MÁS de lo que explica el anión gap → acidosis metabólica hiperclorémica (AG normal) añadida.';
      dx.push('acidosis metabólica hiperclorémica añadida');
    } else textoAg += 'entre 1 y 2: acidosis con anión gap elevado «pura».';
  } else if (primario === 'acidosis-metabolica') {
    textoAg += ' Acidosis metabólica con AG normal (hiperclorémica): pérdida de bicarbonato (diarrea, acidosis tubular renal) o aporte de cloro.';
  }
  pasos.push({ titulo: '5 · Anión gap', texto: textoAg, estado: agAlto ? 'alerta' : 'ok' });
  if (primario === 'acidosis-metabolica') dx[0] += agAlto ? ' con anión gap elevado' : ' con anión gap normal (hiperclorémica)';
  else if (agAlto && mixtoPrimario.includes('acidosis metabólica')) dx[0] += ' (la metabólica, con anión gap elevado)';
  else if (agAlto && !dx.some((d) => d.includes('anión gap') || d.includes('acidosis metabólica')))
    dx.push('acidosis metabólica con anión gap elevado (oculta)');

  // 6. Oxigenación
  const pAO2 = g.fio2 * (g.patm - 47) - g.paco2 / 0.8;
  const gradAa = pAO2 - g.pao2;
  const gradAaNormal = g.edad / 4 + 4;
  const pafi = g.pao2 / g.fio2;
  const hipox = g.pao2 < 80;
  const insuf = g.pao2 < 60;
  const aaAlto = gradAa > gradAaNormal + 2;
  let ox = `PAO₂ = ${f2(g.fio2)} × (${f0(g.patm)} − 47) − ${f0(g.paco2)}/0,8 = ${f0(pAO2)} mmHg; gradiente A‑a = ${f0(gradAa)} mmHg (normal para ${f0(g.edad)} años ≈ ${f0(
    gradAaNormal,
  )}). `;
  if (!hipox) ox += 'PaO₂ normal.';
  else if (aaAlto)
    ox += `${insuf ? 'Insuficiencia respiratoria' : 'Hipoxemia'} con gradiente A‑a AUMENTADO: el problema está en el pulmón (alteración V/Q, cortocircuito o difusión).`;
  else
    ox += `${insuf ? 'Insuficiencia respiratoria' : 'Hipoxemia'} con gradiente A‑a NORMAL: el pulmón intercambia bien; la causa es hipoventilación (o un aire pobre en O₂, como en la altitud).`;
  if (g.fio2 > 0.21) ox += ` PaO₂/FiO₂ = ${f0(pafi)}${pafi <= 300 ? ' (≤ 300: intercambio muy alterado; en el contexto adecuado, criterio de SDRA)' : ''}.`;
  pasos.push({ titulo: '6 · Oxigenación', texto: ox, estado: hipox ? 'alerta' : 'ok' });
  if (insuf) dx.push(g.paco2 > 45 ? 'insuficiencia respiratoria hipercápnica (tipo 2)' : 'insuficiencia respiratoria hipoxémica (tipo 1)');

  if (!dx.length) dx.push(hipox ? 'Sin trastorno ácido‑base' : 'Gasometría normal');
  return { pasos, diagnostico: dx, primario, phCalc, ag, agCorr, pAO2, gradAa, gradAaNormal, pafi };
}
