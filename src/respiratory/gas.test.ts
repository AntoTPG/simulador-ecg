import { describe, expect, it } from 'vitest';
import { GAS_NORMAL, interpretarGas, phHH } from './gas';
import { CASOS_GAS, getCasoGas } from './gasCases';

const dx = (id: string) => interpretarGas(getCasoGas(id).valores);
const txt = (id: string) => dx(id).diagnostico.join(' | ').toLowerCase();

describe('Gasometría: casos de libro', () => {
  it('todos los casos son coherentes con Henderson-Hasselbalch', () => {
    for (const c of CASOS_GAS) expect(Math.abs(phHH(c.valores.hco3, c.valores.paco2) - c.valores.ph), c.id).toBeLessThan(0.03);
  });
  it('normal', () => {
    const r = interpretarGas(GAS_NORMAL);
    expect(r.primario).toBeNull();
    expect(r.diagnostico[0]).toBe('Gasometría normal');
  });
  it('cetoacidosis: acidosis metabólica con AG alto bien compensada', () => {
    const r = dx('cad');
    expect(r.primario).toBe('acidosis-metabolica');
    expect(r.agCorr).toBeGreaterThan(20);
    expect(txt('cad')).toMatch(/anión gap elevado/);
    expect(txt('cad')).not.toMatch(/añadida/);
  });
  it('diarrea: acidosis metabólica con AG normal', () => {
    expect(dx('diarrea').agCorr).toBeLessThanOrEqual(14);
    expect(txt('diarrea')).toMatch(/hiperclorémica/);
  });
  it('vómitos: alcalosis metabólica compensada', () => {
    expect(dx('vomitos').primario).toBe('alcalosis-metabolica');
    expect(txt('vomitos')).not.toMatch(/añadida/);
  });
  it('opiáceos: acidosis respiratoria aguda con gradiente A-a normal', () => {
    const r = dx('opiaceos');
    expect(r.primario).toBe('acidosis-respiratoria');
    expect(txt('opiaceos')).toMatch(/aguda/);
    expect(r.gradAa).toBeLessThan(r.gradAaNormal + 2);
    expect(txt('opiaceos')).toMatch(/tipo 2/);
  });
  it('EPOC: acidosis respiratoria crónica con gradiente A-a alto', () => {
    const r = dx('epoc');
    expect(txt('epoc')).toMatch(/crónica/);
    expect(r.gradAa).toBeGreaterThan(r.gradAaNormal + 2);
  });
  it('ansiedad y TEP: alcalosis respiratoria; solo el TEP tiene gradiente A-a alto', () => {
    expect(dx('ansiedad').primario).toBe('alcalosis-respiratoria');
    expect(dx('tep').primario).toBe('alcalosis-respiratoria');
    expect(dx('ansiedad').gradAa).toBeLessThan(dx('ansiedad').gradAaNormal + 2);
    expect(dx('tep').gradAa).toBeGreaterThan(dx('tep').gradAaNormal + 20);
  });
  it('shock séptico: mixto (metabólica + respiratoria) y PaO2/FiO2 baja', () => {
    expect(txt('sepsis')).toMatch(/mixto/);
    expect(txt('sepsis')).not.toMatch(/oculta/);
    expect(dx('sepsis').diagnostico).toHaveLength(1);
    expect(dx('sepsis').pafi).toBeLessThan(200);
  });
  it('salicilatos: acidosis metabólica + alcalosis respiratoria añadida', () => {
    expect(dx('salicilatos').primario).toBe('alcalosis-respiratoria');
    expect(txt('salicilatos')).toMatch(/acidosis metabólica/);
    expect(txt('salicilatos')).not.toMatch(/crónica/);
    // también sin saber la evolución
    const r = interpretarGas({ ...getCasoGas('salicilatos').valores, evolucion: 'desconocida' });
    expect(r.diagnostico.join(' ').toLowerCase()).not.toMatch(/crónica/);
  });
  it('acidosis láctica + vómitos: AG alto y alcalosis metabólica concomitante', () => {
    expect(txt('oculta')).toMatch(/alcalosis metabólica concomitante/);
  });
  it('detecta una gasometría incoherente', () => {
    const r = interpretarGas({ ...GAS_NORMAL, ph: 7.2 });
    expect(r.pasos[0].estado).toBe('alerta');
  });
});
