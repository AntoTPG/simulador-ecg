import { describe, expect, it } from 'vitest';
import { getPathology } from '../pathologies/registry';
import { BANCO, entradasDe, nuevaPregunta, PATOLOGIAS_IDS, TEMAS, temaDe } from './bank';

/** Generador pseudoaleatorio con semilla, para tests reproducibles. */
function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

describe('Adivina el ECG: banco', () => {
  it('ids y respuestas únicos', () => {
    expect(new Set(BANCO.map((e) => e.id)).size).toBe(BANCO.length);
    expect(new Set(BANCO.map((e) => e.respuesta)).size).toBe(BANCO.length);
  });

  it('cada entrada apunta a una patología y a niveles que existen', () => {
    for (const e of BANCO) {
      expect(PATOLOGIAS_IDS.has(e.patologia), e.id).toBe(true);
      const n = getPathology(e.patologia).control?.niveles.length ?? 1;
      expect(e.niveles.length, e.id).toBeGreaterThan(0);
      for (const l of e.niveles) expect(l, e.id).toBeLessThan(n);
    }
  });

  it('dos respuestas de la misma patología no comparten nivel', () => {
    const vistos = new Map<string, string>();
    for (const e of BANCO)
      for (const l of e.niveles) {
        const k = `${e.patologia}#${l}`;
        expect(vistos.get(k), k).toBeUndefined();
        vistos.set(k, e.id);
      }
  });

  it('cada tema tiene al menos 2 preguntas', () => {
    for (const t of TEMAS) expect(entradasDe(t.k).length, t.k).toBeGreaterThanOrEqual(2);
  });
});

describe('Adivina el ECG: preguntas', () => {
  it('4 opciones distintas, una correcta, del tema elegido y sin repetir la anterior', () => {
    const r = rng(7);
    for (const t of TEMAS)
      for (let i = 0; i < 40; i++) {
        const q = nuevaPregunta(t.k, 'hiperk', r);
        expect(q.opciones).toHaveLength(4);
        expect(new Set(q.opciones).size).toBe(4);
        expect(q.opciones).toContain(q.entrada.id);
        expect(q.entrada.niveles).toContain(q.nivel);
        expect(q.fc).toBeGreaterThanOrEqual(60);
        expect(q.fc).toBeLessThanOrEqual(90);
        if (t.k !== 'todos') expect(temaDe(q.entrada)).toBe(t.k);
        if (entradasDe(t.k).length > 1) expect(q.entrada.id).not.toBe('hiperk');
      }
  });

  it('con un tema elegido, las opciones falsas son del mismo tema si hay bastantes', () => {
    const r = rng(3);
    const q = nuevaPregunta('Trastornos de la conducción', null, r);
    for (const id of q.opciones) expect(temaDe(BANCO.find((e) => e.id === id)!)).toBe('Trastornos de la conducción');
  });
});
