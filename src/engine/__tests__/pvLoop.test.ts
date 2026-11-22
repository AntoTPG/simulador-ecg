import { describe, expect, it } from 'vitest';
import { defaultParams } from '../params';
import { simulate } from '../simulate';
import { computePvLoop, edpvr, PV_NORMAL, pvMetrics, type PvInputs } from '../pvLoop';

const sim = simulate(defaultParams());
const run = (c: Partial<PvInputs>) => {
  const r = computePvLoop(sim, { ...PV_NORMAL, ...c });
  return { r, m: pvMetrics(r) };
};

describe('Bucle presión-volumen', () => {
  const n = run({});

  it('el corazón sano tiene valores de libro', () => {
    console.log('normal', n.m, 'pes', n.r.pes);
    expect(n.m.vtd).toBeGreaterThan(110);
    expect(n.m.vtd).toBeLessThan(135);
    expect(n.m.vts).toBeGreaterThan(42);
    expect(n.m.vts).toBeLessThan(58);
    expect(n.m.fe).toBeGreaterThan(0.52);
    expect(n.m.fe).toBeLessThan(0.68);
    expect(n.m.pMax).toBeGreaterThan(105);
    expect(n.m.pMax).toBeLessThan(140);
  });

  it('el punto de fin de sístole cae sobre la RPVTS', () => {
    const { cycle } = n.r;
    const b = cycle.beats[1];
    const p = cycle.plv[Math.round(b.ac / cycle.dt - 1)];
    expect(Math.abs(p - n.r.pes)).toBeLessThan(12);
  });

  it('↑ contractilidad: se vacía más (↓ VTS, ↑ FE)', () => {
    const c = run({ ees: 4 });
    expect(c.m.vts).toBeLessThan(n.m.vts - 5);
    expect(c.m.fe).toBeGreaterThan(n.m.fe);
  });

  it('↑ poscarga: más presión y menos volumen de eyección', () => {
    const c = run({ ea: 2.6 });
    console.log('poscarga', c.m);
    expect(c.m.pMax).toBeGreaterThan(n.m.pMax + 20);
    expect(c.m.vs).toBeLessThan(n.m.vs - 5);
  });

  it('↑ precarga: más volumen de eyección (Frank-Starling)', () => {
    const c = run({ edv: 160 });
    expect(c.m.vs).toBeGreaterThan(n.m.vs + 10);
  });

  it('ventrículo rígido: más presión telediastólica con el mismo volumen', () => {
    expect(edpvr(122, 1.6)).toBeGreaterThan(edpvr(122) * 2);
  });

  it('estenosis aórtica: presión del VI muy alta', () => {
    const c = run({ valvula: 'ea' });
    console.log('EA', c.m);
    expect(c.m.pMax).toBeGreaterThan(160);
  });

  it('insuficiencia mitral: parte del VS no sale por la aorta', () => {
    const c = run({ valvula: 'im', edv: 160 });
    expect(c.m.vsAnterogrado).toBeLessThan(c.m.vs * 0.7);
  });

  it('sin NaN en ningún caso extremo', () => {
    for (const valvula of ['ninguna', 'ea', 'ia', 'im', 'em'] as const)
      for (const c of [{ edv: 80, ees: 0.8, ea: 3.5 }, { edv: 220, ees: 5, ea: 0.6 }]) {
        const { r, m } = run({ ...c, valvula, rigidez: 2 });
        expect(Number.isFinite(m.trabajo)).toBe(true);
        expect(r.cycle.plv.every((x) => Number.isFinite(x))).toBe(true);
      }
  });
});

describe('Casos del panel: valores plausibles', () => {
  const casos: [string, Partial<PvInputs>][] = [
    ['IC FE reducida', { ees: 1.0, edv: 195, rigidez: 0.85 }],
    ['IC FE conservada', { rigidez: 1.6, edv: 112, ea: 1.8 }],
    ['IA', { valvula: 'ia', edv: 215, ea: 1.1, rigidez: 0.7 }],
    ['IM', { valvula: 'im', edv: 170, rigidez: 0.8 }],
    ['EM', { valvula: 'em', edv: 95 }],
  ];
  for (const [nombre, c] of casos)
    it(nombre, () => {
      const { r, m } = run(c);
      expect(r.edp, nombre).toBeLessThan(32);
      expect(m.pMax, nombre).toBeLessThan(200);
      expect(m.pMax, nombre).toBeGreaterThan(85);
    });
  it('IC con FE reducida tiene FE < 40 % y la conservada > 50 %', () => {
    expect(run(casos[0][1]).m.fe).toBeLessThan(0.4);
    expect(run(casos[1][1]).m.fe).toBeGreaterThan(0.5);
  });
});
