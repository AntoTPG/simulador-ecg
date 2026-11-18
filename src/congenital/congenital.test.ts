import { describe, expect, it } from 'vitest';
import { getPathology } from '../pathologies/registry';
import { getSound } from '../sounds/catalog';
import { CONGENITAS } from './catalog';

describe('Cardiopatías congénitas', () => {
  it('ids únicos y enlaces a ruidos y ECG existentes', () => {
    const ids = new Set<string>();
    for (const c of CONGENITAS) {
      expect(ids.has(c.id)).toBe(false);
      ids.add(c.id);
      if (c.sonido) expect(getSound(c.sonido).id).toBe(c.sonido);
      if (c.ecg) expect(getPathology(c.ecg).id).toBe(c.ecg);
    }
  });

  it('saturaciones coherentes con el tipo de cardiopatía', () => {
    for (const c of CONGENITAS) {
      const ao = c.valores.Ao.sat;
      if (c.tipo === 'cianogena') expect(ao, c.id).toBeLessThan(90);
      else expect(ao, c.id).toBeGreaterThanOrEqual(95);
    }
  });

  it('los cortocircuitos I→D producen un "salto" de saturación en el lado derecho', () => {
    const cia = CONGENITAS.find((c) => c.id === 'cia')!;
    const civ = CONGENITAS.find((c) => c.id === 'civ')!;
    const dap = CONGENITAS.find((c) => c.id === 'ductus')!;
    expect(cia.valores.AD.sat).toBeGreaterThan(75); // salto auricular
    expect(civ.valores.AD.sat).toBeLessThan(75);
    expect(civ.valores.VD.sat).toBeGreaterThan(75); // salto ventricular
    expect(dap.valores.VD.sat).toBeLessThan(75);
    expect(dap.valores.AP.sat).toBeGreaterThan(75); // salto en la pulmonar
  });
});
