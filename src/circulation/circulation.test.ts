import { describe, expect, it } from 'vitest';
import { CASOS_GUYTON, equilibrio, gastoCardiaco, getCasoGuyton, GUYTON_NORMAL, pasoPvc, pmll, retornoVenoso } from './guyton';
import { hemodinamica, MMHG_POR_CM, presiones, riesgoSincope } from './gravity';
import { balance, CASOS_STARLING, getCasoStarling, presionNeta, puntoDeCambio, STARLING_NORMAL } from './starling';

const etapa = (id: string, i = 0) => equilibrio(getCasoGuyton(id).etapas[i].params);

describe('Guyton: curvas y equilibrio', () => {
  it('normal: GC = RV = 5 L/min con PVC 0 y Pmll 7 mmHg', () => {
    const e = etapa('normal');
    expect(e.gc).toBeCloseTo(5, 1);
    expect(e.pvc).toBeCloseTo(0, 1);
    expect(e.pmll).toBeCloseTo(7, 1);
    expect(e.pam).toBeGreaterThan(85);
    expect(e.pam).toBeLessThan(100);
  });
  it('el retorno venoso es 0 cuando la PVC iguala la Pmll y tiene meseta por debajo de −4', () => {
    expect(retornoVenoso(GUYTON_NORMAL, pmll(GUYTON_NORMAL))).toBeCloseTo(0, 5);
    expect(retornoVenoso(GUYTON_NORMAL, -6)).toBeCloseTo(retornoVenoso(GUYTON_NORMAL, -4), 5);
  });
  it('Frank-Starling: el gasto sube con la PVC hasta una meseta', () => {
    expect(gastoCardiaco(GUYTON_NORMAL, 2)).toBeGreaterThan(gastoCardiaco(GUYTON_NORMAL, 0));
    expect(gastoCardiaco(GUYTON_NORMAL, 10)).toBeGreaterThan(12.5);
    expect(gastoCardiaco(GUYTON_NORMAL, 10)).toBeLessThan(13.1);
  });
  it('transfusión de 1 L: ≈ 13 L/min con PVC ≈ 8 mmHg', () => {
    const e = etapa('transfusion');
    expect(e.gc).toBeCloseTo(13, 0);
    expect(e.pvc).toBeCloseTo(8, 0);
  });
  it('ejercicio intenso: ≈ 21 L/min, PVC ≈ 2 y Pmll ≈ 20 mmHg', () => {
    const e = etapa('ejercicio');
    expect(e.gc).toBeCloseTo(21, 0);
    expect(e.pvc).toBeCloseTo(2, 0);
    expect(e.pmll).toBeCloseTo(20, 0);
  });
  it('insuficiencia cardíaca: A → B → C → D como en Guyton', () => {
    const [a, b, c, d] = [0, 1, 2, 3].map((i) => etapa('ic', i));
    expect(a.gc).toBeCloseTo(5, 1);
    expect(b.gc).toBeCloseTo(2, 0);
    expect(b.pvc).toBeCloseTo(4, 0);
    expect(c.gc).toBeCloseTo(4, 0);
    expect(c.pvc).toBeCloseTo(5, 0);
    expect(d.gc).toBeCloseTo(5, 0);
    expect(d.pvc).toBeCloseTo(6, 0);
    expect(d.pmll).toBeCloseTo(12, 0);
  });
  it('hemorragia: bajan PVC y gasto; los reflejos lo recuperan en parte', () => {
    const [sin, con] = [0, 1].map((i) => etapa('hemorragia', i));
    expect(sin.pvc).toBeLessThan(0);
    expect(sin.gc).toBeLessThan(4);
    expect(con.gc).toBeGreaterThan(sin.gc);
  });
  it('la PVC vuelve sola al equilibrio si se aparta (autorregulación)', () => {
    let pvc = 3;
    for (let i = 0; i < 600; i++) pvc = pasoPvc(GUYTON_NORMAL, pvc, 0.05);
    expect(pvc).toBeCloseTo(0, 1);
    pvc = -3;
    for (let i = 0; i < 600; i++) pvc = pasoPvc(GUYTON_NORMAL, pvc, 0.05);
    expect(pvc).toBeCloseTo(0, 1);
  });
  it('todos los casos tienen un equilibrio sin NaN', () => {
    for (const c of CASOS_GUYTON) for (const e of c.etapas) expect(Number.isFinite(equilibrio(e.params).gc), c.id).toBe(true);
  });
});

describe('Gravedad y postura', () => {
  it('0,77 mmHg por cm de columna de sangre', () => {
    expect(MMHG_POR_CM).toBeCloseTo(0.77, 2);
  });
  it('de pie: ≈ 180–190 mmHg en las arterias del pie y ≈ 60 en el cerebro', () => {
    const p = presiones({ postura: 'pie', caminando: false, barorreflejo: true, t: 60 });
    const pie = p.find((x) => x.id === 'pie')!;
    const cerebro = p.find((x) => x.id === 'cerebro')!;
    expect(pie.arterial!).toBeGreaterThan(175);
    expect(pie.arterial!).toBeLessThan(200);
    expect(cerebro.arterial!).toBeGreaterThan(55);
    expect(cerebro.arterial!).toBeLessThan(75);
  });
  it('tumbado, la presión arterial apenas cambia con la altura', () => {
    const p = presiones({ postura: 'decubito', caminando: false, barorreflejo: true, t: 0 });
    const pie = p.find((x) => x.id === 'pie')!;
    expect(Math.abs(pie.arterial! - 93)).toBeLessThan(10);
  });
  it('al levantarse: ~500 mL en las piernas, el gasto cae a ≈ 3 L/min y el barorreflejo lo corrige', () => {
    const pronto = hemodinamica({ postura: 'pie', caminando: false, barorreflejo: false, t: 30 });
    expect(pronto.acumulado).toBeCloseTo(0.5, 1);
    expect(pronto.gc).toBeCloseTo(3, 0);
    const compensado = hemodinamica({ postura: 'pie', caminando: false, barorreflejo: true, t: 30 });
    expect(compensado.gc).toBeGreaterThan(pronto.gc + 1);
    expect(compensado.pam).toBeGreaterThan(pronto.pam + 20);
  });
  it('sin barorreflejo hay riesgo de síncope; con él, no', () => {
    expect(riesgoSincope({ postura: 'pie', caminando: false, barorreflejo: false, t: 30 })).toBe(true);
    expect(riesgoSincope({ postura: 'pie', caminando: false, barorreflejo: true, t: 30 })).toBe(false);
  });
  it('caminando, la bomba muscular baja mucho la presión venosa del pie', () => {
    const quieto = presiones({ postura: 'pie', caminando: false, barorreflejo: true, t: 60 }).find((x) => x.id === 'pie')!;
    const andando = presiones({ postura: 'pie', caminando: true, barorreflejo: true, t: 60 }).find((x) => x.id === 'pie')!;
    expect(quieto.venosa!).toBeGreaterThan(85);
    expect(andando.venosa!).toBeLessThan(40);
  });
});

describe('Intercambio capilar (Starling)', () => {
  it('normal: filtra en el extremo arterial, absorbe en el venoso y la linfa recoge ≈ 3 L/día', () => {
    expect(presionNeta(STARLING_NORMAL, 0)).toBeGreaterThan(0);
    expect(presionNeta(STARLING_NORMAL, 1)).toBeLessThan(0);
    expect(puntoDeCambio(STARLING_NORMAL)).not.toBeNull();
    const b = balance(STARLING_NORMAL);
    expect(b.filtracionNeta).toBeGreaterThan(2);
    expect(b.filtracionNeta).toBeLessThan(4);
    expect(b.edema).toBe(false);
  });
  it('insuficiencia cardíaca, hipoproteinemia, histamina y linfedema producen edema', () => {
    for (const id of ['ic', 'proteinas', 'histamina', 'linfedema']) expect(balance(getCasoStarling(id).params).edema, id).toBe(true);
  });
  it('hemorragia: absorción neta (autotransfusión)', () => {
    expect(balance(getCasoStarling('hemorragia').params).filtracionNeta).toBeLessThan(0);
  });
  it('vasoconstricción arteriolar: menos filtración que lo normal', () => {
    expect(balance(getCasoStarling('vasoconstriccion').params).filtracionNeta).toBeLessThan(balance(STARLING_NORMAL).filtracionNeta);
  });
  it('ids únicos', () => {
    expect(new Set(CASOS_STARLING.map((c) => c.id)).size).toBe(CASOS_STARLING.length);
  });
});
