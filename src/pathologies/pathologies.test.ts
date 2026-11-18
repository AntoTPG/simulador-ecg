import { describe, expect, it } from 'vitest';
import { paramsForPathology, resolvePathology } from '../engine/applyPathology';
import { mod } from '../engine/math';
import { defaultParams } from '../engine/params';
import { simulate, type SimResult } from '../engine/simulate';
import type { LeadName } from '../config/leads';
import { getPathology, PATHOLOGIES, REGISTRY_ERRORS } from './registry';

const simFor = (id: string, level?: number | string) => {
  const p = getPathology(id);
  expect(p.id).toBe(id);
  const idx = typeof level === 'string' ? p.control!.niveles.findIndex((n) => n.id === level) : level ?? 0;
  expect(idx).toBeGreaterThanOrEqual(0);
  return simulate(paramsForPathology(defaultParams(), p, idx));
};

/** Valor de una derivación en un instante relativo al inicio del QRS del 2.º latido. */
const at = (sim: SimResult, lead: LeadName, msAfterQrsOnset: number) => {
  const b = sim.beats[1];
  const dt = 1000 / sim.sampleRate;
  return sim.leads[lead][mod(Math.round((b.qrsOnset! + msAfterQrsOnset) / dt), sim.n)];
};
/** Desnivel del ST: 60 ms después del punto J. */
const st = (sim: SimResult, lead: LeadName) => at(sim, lead, sim.params.qrsDuration + 60);

/** Extremo (máx. |valor|) de una derivación entre dos instantes relativos al QRS. */
const extreme = (sim: SimResult, lead: LeadName, from: number, to: number) => {
  let best = 0;
  for (let t = from; t <= to; t += 2) {
    const v = at(sim, lead, t);
    if (Math.abs(v) > Math.abs(best)) best = v;
  }
  return best;
};

describe('Registro de patologías', () => {
  it('todos los archivos son válidos según el esquema Zod', () => {
    expect(REGISTRY_ERRORS).toEqual([]);
  });

  it('incluye la referencia normal, las isquemias y el potasio', () => {
    const ids = PATHOLOGIES.map((p) => p.id);
    for (const id of [
      'normal',
      'iam-da-proximal',
      'iam-da-distal',
      'iam-cx-lateral',
      'iam-cx-posterior',
      'iam-cd-inferior',
      'iam-cd-vd',
      'isquemia-tronco-comun',
      'isquemia-subendocardica',
      'hiperpotasemia',
      'hipopotasemia',
    ])
      expect(ids).toContain(id);
  });

  it('cada isquemia combinada con su nivel tiene territorio y fase', () => {
    for (const p of PATHOLOGIES) {
      const niveles = p.control?.niveles.length ?? 1;
      for (let i = 0; i < niveles; i++) {
        const { mods } = resolvePathology(p, i);
        if (mods.isquemia) {
          expect(mods.isquemia.territorio, `${p.id} nivel ${i}`).toBeDefined();
          expect(mods.isquemia.fase, `${p.id} nivel ${i}`).toBeDefined();
        }
      }
    }
  });

  it('Einthoven y Goldberger se siguen cumpliendo en todas las patologías y niveles', () => {
    for (const p of PATHOLOGIES) {
      for (let i = 0; i < (p.control?.niveles.length ?? 1); i++) {
        const sim = simulate(paramsForPathology(defaultParams(), p, i));
        const { I, II, III, aVR, aVL, aVF } = sim.leads;
        for (let k = 0; k < sim.n; k += 7) {
          expect(Math.abs(II[k] - I[k] - III[k])).toBeLessThan(1e-5);
          expect(Math.abs(aVR[k] + aVL[k] + aVF[k])).toBeLessThan(1e-5);
        }
      }
    }
  });
});

describe('Isquemia e infarto', () => {
  it('DA proximal (lesión): ST ↑ en V2–V3 y aVL, ST ↓ recíproco en III', () => {
    const s = simFor('iam-da-proximal', 'lesion');
    expect(st(s, 'V2')).toBeGreaterThan(0.15);
    expect(st(s, 'V3')).toBeGreaterThan(0.15);
    expect(st(s, 'aVL')).toBeGreaterThan(0.03);
    expect(st(s, 'III')).toBeLessThan(-0.05);
  });

  it('DA proximal (necrosis): aparece una onda Q/QS en V2', () => {
    const normal = simFor('normal');
    const s = simFor('iam-da-proximal', 'necrosis');
    expect(extreme(s, 'V2', 0, 30)).toBeLessThan(-0.2);
    expect(extreme(normal, 'V2', 0, 30)).toBeGreaterThan(0);
  });

  it('DA proximal (crónica): ST normalizado y T invertida en V3', () => {
    const s = simFor('iam-da-proximal', 'cronica');
    expect(Math.abs(st(s, 'V3'))).toBeLessThan(0.08);
    expect(extreme(s, 'V3', 150, 400)).toBeLessThan(-0.15);
  });

  it('DA (hiperaguda): T mayor que en el corazón sano en V3', () => {
    const tPeak = (sim: SimResult) => extreme(sim, 'V3', 150, 400);
    expect(tPeak(simFor('iam-da-proximal', 'hiperaguda'))).toBeGreaterThan(tPeak(simFor('normal')) * 1.5);
  });

  it('CD inferior: ST ↑ en III > II y ST ↓ recíproco en aVL', () => {
    const s = simFor('iam-cd-inferior', 'lesion');
    expect(st(s, 'III')).toBeGreaterThan(0.1);
    expect(st(s, 'III')).toBeGreaterThan(st(s, 'II'));
    expect(st(s, 'aVL')).toBeLessThan(-0.05);
  });

  it('CD con VD: ST ↑ en V4R y en V1', () => {
    const s = simFor('iam-cd-vd', 'lesion');
    expect(st(s, 'V4R')).toBeGreaterThan(0.1);
    expect(st(s, 'V1')).toBeGreaterThan(0.05);
  });

  it('Cx lateral: ST ↑ en I, aVL y V6; ↓ en III', () => {
    const s = simFor('iam-cx-lateral', 'lesion');
    for (const l of ['I', 'aVL', 'V6'] as const) expect(st(s, l)).toBeGreaterThan(0.05);
    expect(st(s, 'III')).toBeLessThan(-0.05);
  });

  it('Cx posterior: ST ↓ en V1–V3 y, en la necrosis, R más alta en V1', () => {
    const s = simFor('iam-cx-posterior', 'lesion');
    for (const l of ['V1', 'V2', 'V3'] as const) expect(st(s, l)).toBeLessThan(-0.1);
    const rV1 = (sim: SimResult) => Math.max(...Array.from({ length: 40 }, (_, i) => at(sim, 'V1', i * 2)));
    expect(rV1(simFor('iam-cx-posterior', 'necrosis'))).toBeGreaterThan(rV1(simFor('normal')) + 0.2);
  });

  it('Tronco común: ST ↑ en aVR (> V1) y ↓ difuso en V5, II', () => {
    const s = simFor('isquemia-tronco-comun', 'grave');
    expect(st(s, 'aVR')).toBeGreaterThan(0.1);
    expect(st(s, 'aVR')).toBeGreaterThan(st(s, 'V1'));
    expect(st(s, 'V5')).toBeLessThan(-0.1);
    expect(st(s, 'II')).toBeLessThan(-0.1);
  });

  it('Subendocárdica desciende el ST y transmural lo eleva en la misma derivación', () => {
    expect(st(simFor('isquemia-subendocardica', 'sub-grave'), 'V5')).toBeLessThan(-0.1);
    expect(st(simFor('isquemia-subendocardica', 'transmural'), 'V5')).toBeGreaterThan(0.1);
  });
});

describe('Potasio', () => {
  const tPeak = (sim: SimResult) => extreme(sim, 'V3', sim.params.qrsDuration, 450);

  it('Hiperpotasemia: T picudas → P aplanada/PR largo → QRS ancho → sinusoidal', () => {
    const normal = simFor('normal');
    const l = [0, 1, 2, 3].map((i) => simFor('hiperpotasemia', i));
    expect(tPeak(l[0])).toBeGreaterThan(tPeak(normal) * 1.6);
    expect(l[1].params.prInterval).toBeGreaterThan(200);
    expect(l[2].params.qrsDuration).toBeGreaterThan(l[1].params.qrsDuration);
    expect(l[3].params.qrsDuration).toBeGreaterThan(l[2].params.qrsDuration);
    // La P se aplana progresivamente
    const pAmp = (sim: SimResult) => Math.max(...sim.params.waves.P.map((lb) => Math.hypot(...lb.v)));
    expect(pAmp(l[1])).toBeLessThan(pAmp(normal));
    expect(pAmp(l[3])).toBe(0);
  });

  it('Hipopotasemia grave: onda U mayor que la T en V2 y ST descendido', () => {
    const s = simFor('hipopotasemia', 'grave');
    const qt = s.beats[1].qt;
    const t = extreme(s, 'V2', s.params.qrsDuration + 40, qt - 20);
    const u = extreme(s, 'V2', qt + 60, qt + 160);
    expect(u).toBeGreaterThan(Math.abs(t));
    expect(st(s, 'V5')).toBeLessThan(-0.03);
  });
});
