import { describe, expect, it } from 'vitest';
import { computeCycle, NORMAL_HEMO, sampleCycle, type Cycle } from '../hemodynamics';
import { defaultParams } from '../params';
import { simulate } from '../simulate';

const sim = simulate(defaultParams());
const c = computeCycle(sim);
const b = c.beats[2];

const range = (arr: Float32Array, from: number, to: number) => {
  let mn = Infinity;
  let mx = -Infinity;
  for (let t = from; t < to; t += c.dt) {
    const v = sampleCycle(c, arr, t);
    mn = Math.min(mn, v);
    mx = Math.max(mx, v);
  }
  return { mn, mx };
};

describe('Ciclo cardíaco normal', () => {
  it('presión aórtica ~120/80 mmHg', () => {
    const { mn, mx } = range(c.pao, b.mc, b.end);
    expect(mx).toBeGreaterThan(110);
    expect(mx).toBeLessThan(135);
    expect(mn).toBeGreaterThan(65);
    expect(mn).toBeLessThan(90);
  });

  it('VTD ~120 mL, VTS ~50 mL y fracción de eyección 55–70 %', () => {
    expect(b.edv).toBeGreaterThan(105);
    expect(b.edv).toBeLessThan(140);
    const fe = (b.edv - b.esv) / b.edv;
    expect(fe).toBeGreaterThan(0.55);
    expect(fe).toBeLessThan(0.7);
  });

  it('orden de los eventos valvulares y duraciones razonables', () => {
    expect(b.mc).toBeLessThan(b.ao);
    expect(b.ao).toBeLessThan(b.ac);
    expect(b.ac).toBeLessThan(b.mo);
    expect(b.ac - b.ao).toBeGreaterThan(220); // eyección ~ 250–320 ms
    expect(b.ac - b.ao).toBeLessThan(340);
  });

  it('el R2 (cierre aórtico) coincide aproximadamente con el final de la onda T', () => {
    const tSeg = sim.segments.find((s) => s.kind === 'T' && s.beat === b.beat)!;
    expect(Math.abs(b.ac - tSeg.end)).toBeLessThan(60);
  });

  it('en eyección la presión del VI supera a la aórtica y en diástole la AI supera al VI', () => {
    const mid = (b.ao + b.ac) / 2;
    expect(sampleCycle(c, c.plv, mid)).toBeGreaterThanOrEqual(sampleCycle(c, c.pao, mid));
    const dia = b.mo + 150;
    expect(sampleCycle(c, c.pla, dia)).toBeGreaterThan(sampleCycle(c, c.plv, dia));
  });

  it('el volumen no cambia en la contracción isovolumétrica', () => {
    const v0 = sampleCycle(c, c.vlv, b.mc + 2);
    const v1 = sampleCycle(c, c.vlv, b.ao - 2);
    expect(Math.abs(v1 - v0)).toBeLessThan(1);
  });
});

describe('Ciclo cardíaco patológico', () => {
  const cyc = (p: Partial<typeof NORMAL_HEMO>, s = sim): Cycle => computeCycle(s, { ...NORMAL_HEMO, ...p });

  it('estenosis aórtica: gradiente VI–aorta > 40 mmHg', () => {
    const k = cyc({ aoGrad: 60, psys: 110 });
    const bb = k.beats[2];
    let g = 0;
    for (let t = bb.ao; t < bb.ac; t += 2) g = Math.max(g, sampleCycle(k, k.plv, t) - sampleCycle(k, k.pao, t));
    expect(g).toBeGreaterThan(40);
  });

  it('insuficiencia aórtica: presión diferencial amplia (> 80 mmHg)', () => {
    const k = cyc({ tau: 600, pInf: 0, arLeak: 60, psys: 160 });
    const bb = k.beats[2];
    expect(bb.pSys - bb.pDia).toBeGreaterThan(80);
  });

  it('la taquicardia acorta el llenado y reduce el VTD', () => {
    const fast = computeCycle(simulate(defaultParams({ heartRate: 150 })));
    expect(fast.beats[2].edv).toBeLessThan(b.edv - 10);
  });
});
