import { describe, expect, it } from 'vitest';
import { NORMAL_RANGES, PHYSIOLOGY } from '../../config/physiology';
import { LEAD_NAMES } from '../../config/leads';
import { LEAD_UNIT, LEAD_VECTORS } from '../leads';
import { measureAxis, measureIntervals, qrsNetArea, qrsPeaks } from '../measure';
import { defaultParams } from '../params';
import { simulate } from '../simulate';

const inRange = (v: number, [a, b]: readonly [number, number]) => v >= a && v <= b;

describe('Leyes de Einthoven y Goldberger', () => {
  for (const heartRate of [45, 70, 120]) {
    for (const qrsAxis of [-40, 50, 110]) {
      it(`se cumplen en cada muestra (FC ${heartRate}, eje ${qrsAxis}°)`, () => {
        const sim = simulate(defaultParams({ heartRate, qrsAxis }));
        const { I, II, III, aVR, aVL, aVF } = sim.leads;
        let maxE = 0;
        let maxG = 0;
        for (let i = 0; i < sim.n; i++) {
          maxE = Math.max(maxE, Math.abs(II[i] - (I[i] + III[i])));
          maxG = Math.max(maxG, Math.abs(aVR[i] + aVL[i] + aVF[i]));
        }
        expect(maxE).toBeLessThan(1e-5); // II = I + III
        expect(maxG).toBeLessThan(1e-5); // aVR + aVL + aVF = 0
      });
    }
  }

  it('los vectores de derivación también las cumplen', () => {
    const v = LEAD_VECTORS;
    for (let k = 0; k < 3; k++) {
      expect(v.II[k]).toBeCloseTo(v.I[k] + v.III[k], 10);
      expect(v.aVR[k] + v.aVL[k] + v.aVF[k]).toBeCloseTo(0, 10);
    }
  });

  it('el sistema hexaxial tiene los ángulos clásicos', () => {
    const ang = (l: keyof typeof LEAD_UNIT) => (Math.atan2(LEAD_UNIT[l][1], LEAD_UNIT[l][0]) * 180) / Math.PI;
    expect(ang('I')).toBeCloseTo(0, 6);
    expect(ang('II')).toBeCloseTo(60, 6);
    expect(ang('III')).toBeCloseTo(120, 6);
    expect(ang('aVF')).toBeCloseTo(90, 6);
    expect(ang('aVL')).toBeCloseTo(-30, 6);
    expect(ang('aVR')).toBeCloseTo(-150, 6);
  });

  it('las precordiales están en el plano horizontal y van de derecha-anterior (V1) a izquierda (V6)', () => {
    for (const l of ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const) expect(LEAD_UNIT[l][1]).toBeCloseTo(0, 10);
    const azim = (l: 'V1' | 'V6') => Math.atan2(LEAD_UNIT[l][2], LEAD_UNIT[l][0]);
    expect(azim('V1')).toBeGreaterThan(Math.PI / 2); // V1 apunta a la derecha y delante
    expect(Math.abs(azim('V6'))).toBeLessThan(Math.PI / 6); // V6 apunta a la izquierda
  });
});

describe('Eje eléctrico', () => {
  it('el eje por defecto es normal (−30° a +90°)', () => {
    const axis = measureAxis(simulate(defaultParams()));
    expect(inRange(axis, NORMAL_RANGES.axis)).toBe(true);
  });

  for (const target of [-60, -30, 0, 50, 90, 120]) {
    it(`el eje medido con I y aVF coincide con el configurado (${target}°)`, () => {
      const axis = measureAxis(simulate(defaultParams({ qrsAxis: target })));
      expect(Math.abs(axis - target)).toBeLessThan(4);
    });
  }
});

describe('Intervalos', () => {
  for (const heartRate of [50, 70, 100]) {
    it(`PR, QRS y QTc dentro de la normalidad a ${heartRate} lpm`, () => {
      const m = measureIntervals(defaultParams({ heartRate }));
      expect(inRange(m.pr, NORMAL_RANGES.pr)).toBe(true);
      expect(inRange(m.qrs, NORMAL_RANGES.qrs)).toBe(true);
      expect(inRange(m.qtc, NORMAL_RANGES.qtc)).toBe(true);
      expect(m.pDuration).toBeLessThan(120);
    });
  }

  it('los intervalos medidos se parecen a los configurados', () => {
    const m = measureIntervals(defaultParams());
    expect(Math.abs(m.pr - PHYSIOLOGY.prInterval)).toBeLessThan(15);
    expect(Math.abs(m.qrs - PHYSIOLOGY.qrsDuration)).toBeLessThan(15);
    expect(Math.abs(m.qtc - PHYSIOLOGY.qtc)).toBeLessThan(30);
  });

  it('el QT se acorta al subir la frecuencia', () => {
    expect(measureIntervals(defaultParams({ heartRate: 120 })).qt).toBeLessThan(
      measureIntervals(defaultParams({ heartRate: 60 })).qt,
    );
  });

  it('el registro dura ~10 s y contiene un número entero de latidos', () => {
    const sim = simulate(defaultParams({ heartRate: 72 }));
    expect(sim.beats.length).toBe(12);
    expect(Math.abs(sim.duration - 10000)).toBeLessThan(10);
  });
});

describe('Morfología del ECG normal', () => {
  const sim = simulate(defaultParams());

  it('aVR es negativa (el vector se aleja del hombro derecho)', () => {
    expect(qrsNetArea(sim, 'aVR')).toBeLessThan(0);
  });

  it('II tiene una R dominante de 0,8–2 mV', () => {
    const { r } = qrsPeaks(sim, 'II');
    expect(r).toBeGreaterThan(0.8);
    expect(r).toBeLessThan(2);
  });

  it('V1 es rS (predominio negativo) y V6 es qR (predominio positivo)', () => {
    expect(qrsNetArea(sim, 'V1')).toBeLessThan(0);
    expect(qrsNetArea(sim, 'V6')).toBeGreaterThan(0);
    expect(qrsPeaks(sim, 'V1').r).toBeGreaterThan(0.05); // r septal
    expect(qrsPeaks(sim, 'V6').s).toBeLessThan(-0.03); // q septal
  });

  it('la R progresa de V1 a V4', () => {
    const r = (['V1', 'V2', 'V3', 'V4'] as const).map((l) => qrsPeaks(sim, l).r);
    for (let i = 1; i < r.length; i++) expect(r[i]).toBeGreaterThan(r[i - 1]);
  });

  it('todas las derivaciones están en un rango de voltaje fisiológico (< 3 mV)', () => {
    for (const l of LEAD_NAMES) {
      const sig = sim.leads[l];
      let m = 0;
      for (let i = 0; i < sig.length; i++) m = Math.max(m, Math.abs(sig[i]));
      expect(m).toBeLessThan(3);
    }
  });

  it('el segmento ST es isoeléctrico en el corazón sano', () => {
    expect(sim.params.stVector).toEqual([0, 0, 0]);
  });
});
