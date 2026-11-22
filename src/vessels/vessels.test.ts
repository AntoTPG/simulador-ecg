import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { PATOLOGIAS_VASO, GRUPOS_VASO, normalDe } from './catalog';
import { VesselSvg } from './VesselSvg';

describe('Pared arterial', () => {
  it('ids únicos, grupos válidos y una referencia normal para cada tipo de vaso', () => {
    const ids = new Set<string>();
    for (const p of PATOLOGIAS_VASO) {
      expect(ids.has(p.id)).toBe(false);
      ids.add(p.id);
      expect(GRUPOS_VASO).toContain(p.grupo);
      expect(normalDe(p.vaso)).toBeDefined();
      const descritas = { ...p.capas, ...Object.assign({}, ...(p.niveles ?? []).map((n) => n.capas ?? {})) };
      if (p.grupo !== 'Referencia') expect(Object.keys(descritas).length, p.id).toBeGreaterThan(0);
    }
  });

  it('la aterosclerosis afecta sobre todo a la íntima y Mönckeberg a la media', () => {
    const ate = PATOLOGIAS_VASO.find((p) => p.id === 'aterosclerosis')!;
    const mon = PATOLOGIAS_VASO.find((p) => p.id === 'monckeberg')!;
    const sif = PATOLOGIAS_VASO.find((p) => p.id === 'sifilis')!;
    expect(ate.capas.intima).toBeTruthy();
    expect(mon.capas.media).toBeTruthy();
    expect(mon.capas.intima).toBeUndefined();
    expect(sif.capas.adventicia).toBeTruthy();
  });

  it('todos los cortes (y cada fase) se dibujan sin errores ni valores no numéricos', () => {
    for (const p of PATOLOGIAS_VASO) {
      const variantes = p.niveles?.map((n) => n.rasgos) ?? [p.rasgos];
      for (const r of variantes) {
        const svg = renderToStaticMarkup(createElement(VesselSvg, { vaso: p.vaso, rasgos: r }));
        expect(svg, p.id).toContain('<svg');
        expect(svg, p.id).not.toContain('NaN');
      }
    }
  });
});
