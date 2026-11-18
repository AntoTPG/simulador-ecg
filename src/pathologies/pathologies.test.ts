import { describe, expect, it } from 'vitest';
import { paramsForPathology, resolvePathology } from '../engine/applyPathology';
import { mod } from '../engine/math';
import { measureAxis, measureIntervals, ventricularRate } from '../engine/measure';
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

/** Pico máximo y mínimo de una derivación durante el QRS del latido `i`. */
const qrsRS = (sim: SimResult, lead: LeadName, i = 1) => {
  const b = sim.beats[i];
  let r = 0;
  let s = 0;
  for (let t = -40; t <= sim.params.qrsDuration + 10; t += 2) {
    const dt = 1000 / sim.sampleRate;
    const v = sim.leads[lead][mod(Math.round((b.qrsOnset! + t) / dt), sim.n)];
    r = Math.max(r, v);
    s = Math.min(s, v);
  }
  return { r, s };
};
const axisOf = (sim: SimResult) => measureAxis(sim, sim.beats.find((b) => b.qrsOnset !== null)!.index);

describe('Trastornos de la conducción', () => {
  it('BRD completo: QRS ≥ 120 ms, R\' terminal en V1 y S ancha en I', () => {
    const s = simFor('bloqueo-rama-derecha', 'completo');
    expect(s.params.qrsDuration).toBeGreaterThanOrEqual(120);
    expect(at(s, 'V1', s.params.qrsDuration * 0.79)).toBeGreaterThan(0.3); // R'
    expect(at(s, 'I', s.params.qrsDuration * 0.79)).toBeLessThan(-0.2); // S terminal
  });

  it('BRI: QS en V1, R ancha en V6 sin q septal y T discordante', () => {
    const s = simFor('bloqueo-rama-izquierda');
    expect(s.params.qrsDuration).toBeGreaterThanOrEqual(120);
    // Sin r inicial en V1 (el tabique se activa de derecha a izquierda)
    expect(Math.max(...Array.from({ length: 16 }, (_, i) => at(s, 'V1', i * 2)))).toBeLessThan(0.05);
    expect(qrsRS(s, 'V6').r).toBeGreaterThan(0.8);
    // Sin q septal en V6
    expect(Math.min(...Array.from({ length: 16 }, (_, i) => at(s, 'V6', i * 2)))).toBeGreaterThan(-0.05);
    expect(extreme(s, 'V6', s.params.qrsDuration + 60, 450)).toBeLessThan(0);
  });

  it('Hemibloqueo anterior: eje < −30°; posterior: eje > +90°', () => {
    expect(axisOf(simFor('hemibloqueos', 'anterior'))).toBeLessThan(-30);
    expect(axisOf(simFor('hemibloqueos', 'posterior'))).toBeGreaterThan(90);
  });

  it('WPW: PR corto (< 120 ms) y QRS ensanchado', () => {
    const m = measureIntervals(paramsForPathology(defaultParams(), getPathology('wpw'), 0));
    expect(m.pr).toBeLessThan(120);
    expect(m.qrs).toBeGreaterThan(110);
  });

  it('BAV 1.er grado: PR > 200 ms', () => {
    expect(simFor('bloqueos-av', 'primer-grado').params.prInterval).toBeGreaterThan(200);
  });

  it('Wenckebach: el PR se alarga dentro del grupo y una P no se conduce', () => {
    const s = simFor('bloqueos-av', 'mobitz-1');
    const prs = s.beats.slice(0, 4).map((b) => (b.qrsOnset === null ? null : b.qrsOnset - b.pOnset!));
    expect(prs[3]).toBeNull();
    expect(prs[1]!).toBeGreaterThan(prs[0]!);
    expect(prs[2]!).toBeGreaterThan(prs[1]!);
    // Los incrementos decrecen → los RR se acortan
    expect(prs[2]! - prs[1]!).toBeLessThan(prs[1]! - prs[0]!);
  });

  it('Mobitz II: PR constante y P bloqueadas', () => {
    const s = simFor('bloqueos-av', 'mobitz-2');
    const conducted = s.beats.filter((b) => b.qrsOnset !== null);
    expect(conducted.length).toBeLessThan(s.beats.length);
    const prs = new Set(conducted.map((b) => Math.round(b.qrsOnset! - b.pOnset!)));
    expect(prs.size).toBe(1);
  });

  it('BAV completo: más P que QRS y frecuencia ventricular de escape', () => {
    const s = simFor('bloqueos-av', 'completo-nodal');
    const nP = s.segments.filter((x) => x.kind === 'P').length;
    const nQRS = s.beats.filter((b) => b.qrsOnset !== null).length;
    expect(nP).toBeGreaterThan(nQRS);
    expect(ventricularRate(s)).toBeLessThan(50);
  });
});

describe('Arritmias', () => {
  it('FA: sin ondas P y RR irregulares', () => {
    const s = simFor('fibrilacion-auricular', 'controlada');
    expect(s.segments.some((x) => x.kind === 'P')).toBe(false);
    const rr = s.beats.map((b) => b.rr);
    const mean = rr.reduce((a, b) => a + b, 0) / rr.length;
    const sd = Math.sqrt(rr.reduce((a, b) => a + (b - mean) ** 2, 0) / rr.length);
    expect(sd / mean).toBeGreaterThan(0.1);
    expect(Math.abs(ventricularRate(s) - 80)).toBeLessThan(10);
  });

  it('Flúter 2:1: FC ventricular ~150 lpm y ondas F negativas en II', () => {
    const s = simFor('fluter-auricular', '2-1');
    expect(Math.abs(ventricularRate(s) - 150)).toBeLessThan(5);
    const s4 = simFor('fluter-auricular', '4-1');
    expect(Math.abs(ventricularRate(s4) - 75)).toBeLessThan(5);
    // Fuera del QRS‑T, II tiene deflexiones negativas (dientes de sierra)
    let min = 0;
    const b = s4.beats[1];
    for (let t = b.qrsOnset! + 450; t < b.qrsOnset! + 700; t += 2) min = Math.min(min, s4.leads.II[mod(Math.round(t / 2), s4.n)]);
    expect(min).toBeLessThan(-0.05);
  });
});

describe('Otras', () => {
  it('Pericarditis (estadio I): ST ↑ difuso, ST ↓ en aVR y PR descendido en II', () => {
    const s = simFor('pericarditis', 'estadio-1');
    for (const l of ['I', 'II', 'V5'] as const) expect(st(s, l)).toBeGreaterThan(0.05);
    expect(st(s, 'aVR')).toBeLessThan(-0.05);
    const b = s.beats[1];
    const prMid = s.leads.II[mod(Math.round((b.qrsOnset! - 25) / 2), s.n)];
    expect(prMid).toBeLessThan(-0.02);
  });

  it('Pericarditis con derrame y miocarditis grave: bajo voltaje', () => {
    const normalR = qrsRS(simFor('normal'), 'II').r;
    expect(qrsRS(simFor('pericarditis', 'derrame'), 'II').r).toBeLessThan(normalR * 0.6);
    expect(qrsRS(simFor('miocarditis', 'grave'), 'II').r).toBeLessThan(normalR * 0.7);
  });

  it('HVI: Sokolow S(V1) + R(V5) > 3,5 mV; strain con ST ↓ en V6', () => {
    const s = simFor('hvi', 'sobrecarga');
    expect(-qrsRS(s, 'V1').s + qrsRS(s, 'V5').r).toBeGreaterThan(3.5);
    expect(st(s, 'V6')).toBeLessThan(-0.03);
  });

  it('TEP: S en I, Q en III y T negativa en III', () => {
    const s = simFor('tep', 's1q3t3');
    expect(at(s, 'I', s.params.qrsDuration * 0.8)).toBeLessThan(-0.1);
    expect(extreme(s, 'III', 0, 20)).toBeLessThan(-0.05);
    expect(extreme(s, 'III', 150, 380)).toBeLessThan(0);
  });

  it('Brugada tipo 1: ST ↑ en V1–V2 mayor que en V4', () => {
    const s = simFor('brugada', 'tipo-1');
    const stJ = (l: LeadName) => at(s, l, s.params.qrsDuration + 20);
    expect(stJ('V1')).toBeGreaterThan(0.15);
    expect(stJ('V2')).toBeGreaterThan(0.15);
    expect(stJ('V1')).toBeGreaterThan(stJ('V4'));
  });

  it('Calcio: la hipercalcemia acorta el QT y la hipocalcemia lo alarga', () => {
    const qtc = (lvl: string) => {
      const p = getPathology('calcio');
      return measureIntervals(paramsForPathology(defaultParams(), p, p.control!.niveles.findIndex((n) => n.id === lvl))).qtc;
    };
    const normal = measureIntervals(defaultParams()).qtc;
    expect(qtc('hiper')).toBeLessThan(normal - 30);
    expect(qtc('hipo')).toBeGreaterThan(normal + 50);
  });

  it('QT largo: QTc > 500 ms en el nivel "largo"', () => {
    expect(simFor('qt-largo', 'largo').params.qtc).toBeGreaterThan(500);
  });

  it('Digital: descenso del ST en V5 y QT corto', () => {
    const s = simFor('digital', 'efecto');
    expect(st(s, 'V5')).toBeLessThan(-0.05);
    expect(s.params.qtc).toBeLessThan(400);
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
