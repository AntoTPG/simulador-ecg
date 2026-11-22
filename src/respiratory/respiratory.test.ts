import { describe, expect, it } from 'vitest';
import { getPatologiaResp, PATOLOGIAS_RESP } from './catalog';
import { lungCompliance, RESP_NORMAL, simulateBreathing } from './mechanics';

const run = (id: string) => {
  const p = getPatologiaResp(id).params;
  return { p, c: simulateBreathing(p) };
};
const min = (a: Float32Array) => a.reduce((m, x) => Math.min(m, x), Infinity);
const max = (a: Float32Array) => a.reduce((m, x) => Math.max(m, x), -Infinity);

describe('Mecánica respiratoria: adulto sano (valores de West)', () => {
  const c = simulateBreathing(RESP_NORMAL);
  it('CRF ≈ 2,4 L y volumen corriente ≈ 0,5 L', () => {
    expect(c.frcRelaxed).toBeCloseTo(2.4, 1);
    expect(c.vt).toBeGreaterThan(0.45);
    expect(c.vt).toBeLessThan(0.6);
  });
  it('presión pleural de −5 (CRF) a −8 cmH₂O (final de la inspiración)', () => {
    expect(c.ppl[0]).toBeCloseTo(-5, 0);
    expect(min(c.ppl)).toBeGreaterThan(-9);
    expect(min(c.ppl)).toBeLessThan(-7);
  });
  it('presión alveolar ≈ −1 al inspirar y ≈ +1 al espirar', () => {
    expect(min(c.palv)).toBeGreaterThan(-1.5);
    expect(min(c.palv)).toBeLessThan(-0.5);
    expect(max(c.palv)).toBeGreaterThan(0.5);
    expect(max(c.palv)).toBeLessThan(1.6);
  });
  it('distensibilidad pulmonar ≈ 0,2 L/cmH₂O y sin atrapamiento', () => {
    expect(lungCompliance(RESP_NORMAL)).toBeCloseTo(0.2, 1);
    expect(c.peepi).toBeLessThan(0.5);
  });
});

describe('Mecánica respiratoria: patologías', () => {
  const n = run('normal');
  it('asma: atrapamiento aéreo y PEEP intrínseca con distensibilidad normal', () => {
    const { p, c } = run('asma');
    expect(c.eelv).toBeGreaterThan(c.frcRelaxed + 0.2);
    expect(c.peepi).toBeGreaterThan(1.5);
    expect(lungCompliance(p)).toBeCloseTo(lungCompliance(n.p), 2);
    expect(min(c.ppl)).toBeLessThan(min(n.c.ppl) - 4); // más esfuerzo
  });
  it('enfisema: pulmón más distensible, CRF alta y flujo espiratorio limitado', () => {
    const { p, c } = run('enfisema');
    expect(lungCompliance(p)).toBeGreaterThan(lungCompliance(n.p) * 1.5);
    expect(c.frcRelaxed).toBeGreaterThan(n.c.frcRelaxed + 0.5);
    expect(c.limited.some((x) => x === 1)).toBe(true);
    expect(c.peepi).toBeGreaterThan(0.5);
  });
  it('fibrosis: pulmón rígido, CRF baja y respiración rápida y superficial', () => {
    const { p, c } = run('fibrosis');
    expect(lungCompliance(p)).toBeLessThan(lungCompliance(n.p) * 0.5);
    expect(c.frcRelaxed).toBeLessThan(n.c.frcRelaxed - 0.5);
    expect(c.vt).toBeLessThan(n.c.vt);
    expect(p.fr).toBeGreaterThan(n.p.fr);
  });
  it('obesidad: pulmón normal y CRF baja', () => {
    const { p, c } = run('obesidad');
    expect(p.kLung).toBe(n.p.kLung);
    expect(c.frcRelaxed).toBeLessThan(n.c.frcRelaxed - 0.3);
  });
  it('neuromuscular: volumen corriente pequeño', () => {
    const { c } = run('neuromuscular');
    expect(c.vt).toBeLessThan(0.3);
  });
  it('ninguna patología produce NaN', () => {
    for (const x of PATOLOGIAS_RESP) {
      const c = simulateBreathing(x.params);
      for (const arr of [c.vol, c.flow, c.palv, c.ppl]) expect(arr.every(Number.isFinite), x.id).toBe(true);
    }
  });
  it('ids únicos', () => {
    expect(new Set(PATOLOGIAS_RESP.map((p) => p.id)).size).toBe(PATOLOGIAS_RESP.length);
  });
});
