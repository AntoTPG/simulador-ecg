import { describe, expect, it } from 'vitest';
import { paramsForPathology } from '../engine/applyPathology';
import { defaultParams } from '../engine/params';
import { simulate } from '../engine/simulate';
import { getPathology } from '../pathologies/registry';
import { inspiration } from './acoustics';
import { FOCO_INFO, HEART_SOUNDS, SOUND_GROUPS } from './catalog';
import { getCycleData } from './cycleData';

const normalSim = simulate(defaultParams());
const faSim = simulate(paramsForPathology(defaultParams(), getPathology('fibrilacion-auricular'), 1));
const labels = (sim = normalSim, id = 'normal') => getCycleData(sim, id).events.map((e) => e.label);

describe('Catálogo de ruidos cardíacos', () => {
  it('ids únicos, grupo y foco válidos, explicación de 2–4 frases', () => {
    const ids = new Set<string>();
    for (const s of HEART_SOUNDS) {
      expect(ids.has(s.id)).toBe(false);
      ids.add(s.id);
      expect(SOUND_GROUPS).toContain(s.grupo);
      expect(FOCO_INFO[s.foco]).toBeDefined();
      expect(s.explicacion.length).toBeGreaterThanOrEqual(2);
      expect(s.explicacion.length).toBeLessThanOrEqual(4);
      if (s.ecgAsociado) expect(getPathology(s.ecgAsociado).id).toBe(s.ecgAsociado);
    }
  });

  it('incluye ruidos fisiológicos y patológicos', () => {
    expect(HEART_SOUNDS.some((s) => s.tipo === 'fisiologico')).toBe(true);
    expect(HEART_SOUNDS.filter((s) => s.tipo === 'patologico').length).toBeGreaterThan(10);
  });

  it('todos los ruidos generan audio válido (sin NaN, normalizado)', () => {
    for (const s of HEART_SOUNDS) {
      const { audio } = getCycleData(normalSim, s.id);
      let peak = 0;
      for (let i = 0; i < audio.length; i += 7) {
        expect(Number.isFinite(audio[i])).toBe(true);
        peak = Math.max(peak, Math.abs(audio[i]));
      }
      expect(peak).toBeGreaterThan(0.3);
      expect(peak).toBeLessThanOrEqual(0.86);
    }
  });
});

describe('Relaciones fisiológicas de los ruidos', () => {
  it('un R1 y un R2 por latido', () => {
    const l = labels();
    expect(l.filter((x) => x === 'R1').length).toBe(normalSim.beats.length);
    expect(l.filter((x) => x === 'A2').length).toBe(normalSim.beats.length);
  });

  it('el R4 desaparece en la fibrilación auricular (no hay contracción auricular)', () => {
    expect(labels(normalSim, 'r4')).toContain('R4');
    expect(labels(faSim, 'r4')).not.toContain('R4');
  });

  it('el desdoblamiento fisiológico del R2 aumenta en la inspiración', () => {
    const ev = getCycleData(normalSim, 'desdoblamiento-fisiologico').events.filter((e) => e.kind === 'tono');
    const split = (a2: (typeof ev)[number]) => {
      const p2 = ev.find((e) => e.kind === 'tono' && e.label === 'P2' && e.t > a2.t - 80 && e.t < a2.t + 120)!;
      return { s: (p2 as { t: number }).t - (a2 as { t: number }).t, insp: inspiration((a2 as { t: number }).t) };
    };
    const splits = ev.filter((e) => e.label === 'A2').map(split);
    const inspS = splits.filter((x) => x.insp > 0.5).map((x) => x.s);
    const expS = splits.filter((x) => x.insp === 0).map((x) => x.s);
    expect(Math.min(...inspS)).toBeGreaterThan(Math.max(...expS));
  });

  it('desdoblamiento paradójico: P2 antes que A2 en la espiración', () => {
    const ev = getCycleData(normalSim, 'desdoblamiento-paradojico').events.filter((e) => e.kind === 'tono') as { label: string; t: number }[];
    const a2 = ev.filter((e) => e.label === 'A2').find((e) => inspiration(e.t) === 0)!;
    const p2 = ev.find((e) => e.label === 'P2' && Math.abs(e.t - a2.t) < 80)!;
    expect(p2.t).toBeLessThan(a2.t);
  });

  it('el R1 es más débil en el BAV de 1.er grado (PR largo)', () => {
    const bav1 = simulate(paramsForPathology(defaultParams(), getPathology('bloqueos-av'), 0));
    const amp = (sim: typeof normalSim) =>
      (getCycleData(sim, 'normal').events.find((e) => e.label === 'R1') as { amp: number }).amp;
    expect(amp(bav1)).toBeLessThan(amp(normalSim) * 0.8);
  });

  it('estenosis mitral: la aurícula izquierda supera al VI en diástole (gradiente)', () => {
    const { cycle } = getCycleData(normalSim, 'estenosis-mitral');
    const b = cycle.beats[2];
    const t = (b.mo + b.end) / 2;
    const i = Math.round(t / cycle.dt) % cycle.n;
    expect(cycle.pla[i] - cycle.plv[i]).toBeGreaterThan(5);
  });
});
