import { describe, expect, it } from 'vitest';
import { CASOS_ESPIRO, getCasoEspiro } from './spiroCatalog';
import { interpretar, simulateSpirometry, SPIRO_NORMAL } from './spirometry';

const ref = simulateSpirometry(SPIRO_NORMAL).m;
const caso = (id: string) => {
  const c = getCasoEspiro(id);
  const m = simulateSpirometry(c.params).m;
  const post = c.postBd ? simulateSpirometry(c.postBd).m : undefined;
  return { m, post, i: interpretar(m, ref, post, c.escala) };
};

describe('Espirometría: sujeto sano', () => {
  it('valores de un adulto sano', () => {
    expect(ref.fvc).toBeCloseTo(4.8, 1);
    expect(ref.ratio).toBeGreaterThan(0.75);
    expect(ref.ratio).toBeLessThan(0.9);
    expect(ref.pef).toBeGreaterThan(7);
  });
  it('se interpreta como normal y sin respuesta al broncodilatador', () => {
    const { i } = caso('normal');
    expect(i.patron).toBe('normal');
    expect(i.pruebaBd?.positiva).toBe(false);
  });
});

describe('Espirometría: patrones', () => {
  it('asma: obstrucción con prueba broncodilatadora positiva', () => {
    const { i, m } = caso('asma');
    expect(m.ratio).toBeLessThan(0.7);
    expect(i.patron).toBe('obstructivo');
    expect(i.pruebaBd?.positiva).toBe(true);
    expect(i.gravedad).toMatch(/ATS/); // GOLD es solo para la EPOC
  });
  it('EPOC: obstrucción GOLD 2 sin reversibilidad significativa', () => {
    const { i } = caso('epoc');
    expect(i.patron).toBe('obstructivo');
    expect(i.gravedad).toMatch(/GOLD 2/);
    expect(i.pruebaBd?.positiva).toBe(false);
  });
  it('fibrosis: restrictivo con cociente alto', () => {
    const { i, m } = caso('fibrosis');
    expect(i.patron).toBe('restrictivo');
    expect(m.ratio).toBeGreaterThan(0.85);
  });
  it('neuromuscular: restrictivo con PEF bajo', () => {
    const { i, m } = caso('neuromuscular');
    expect(i.patron).toBe('restrictivo');
    expect(m.pef).toBeLessThan(ref.pef * 0.6);
  });
  it('mixto', () => {
    expect(caso('mixto').i.patron).toBe('mixto');
  });
  it('vía aérea central: mesetas en la rama que toca', () => {
    const f = caso('fija');
    expect(f.i.patron).toBe('central');
    expect(f.m.mesetaEsp).toBeGreaterThan(0.3);
    expect(f.m.mesetaIns).toBeGreaterThan(0.5);
    expect((f.m.fev1 * 1000) / (f.m.pef * 60)).toBeGreaterThan(10); // índice de Empey
    const e = caso('extratoracica');
    expect(e.i.patron).toBe('central');
    expect(e.m.mesetaEsp).toBeLessThan(0.3);
    expect(e.m.fef50 / e.m.fif50).toBeGreaterThan(1.5);
    const t = caso('intratoracica');
    expect(t.i.patron).toBe('central');
    expect(t.m.mesetaIns).toBeLessThan(0.5);
    expect(t.m.fef50 / t.m.fif50).toBeLessThan(0.5);
  });
  it('ningún caso produce valores imposibles', () => {
    for (const c of CASOS_ESPIRO) {
      const { m } = simulateSpirometry(c.params);
      expect(m.fev1, c.id).toBeLessThanOrEqual(m.fvc + 1e-6);
      expect(m.fvc, c.id).toBeLessThanOrEqual(c.params.tlc - c.params.rv + 1e-6);
      expect(Number.isFinite(m.fef2575), c.id).toBe(true);
    }
  });
});
