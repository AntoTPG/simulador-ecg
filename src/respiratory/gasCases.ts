/**
 * Casos clínicos de gasometría. Los valores son de elaboración propia, típicos
 * de libro y coherentes con Henderson‑Hasselbalch; no son pacientes reales.
 */
import { GAS_NORMAL, type GasInput } from './gas';

export interface CasoGas {
  id: string;
  nombre: string;
  historia: string;
  valores: GasInput;
  /** Lo que hay que aprender con este caso. */
  clave: string;
}

const g = (x: Partial<GasInput>): GasInput => ({ ...GAS_NORMAL, ...x });

export const CASOS_GAS: CasoGas[] = [
  {
    id: 'normal',
    nombre: 'Normal',
    historia: 'Adulto sano de 30 años, aire ambiente.',
    valores: GAS_NORMAL,
    clave: 'Referencia: pH 7,35–7,45; PaCO₂ 35–45 mmHg; HCO₃⁻ 22–26 mEq/L; PaO₂ 80–100 mmHg.',
  },
  {
    id: 'cad',
    nombre: 'Cetoacidosis diabética',
    historia: 'Mujer de 19 años con diabetes tipo 1, vómitos, dolor abdominal y respiración profunda (Kussmaul).',
    valores: g({ ph: 7.26, paco2: 23, hco3: 10, pao2: 102, na: 135, cl: 98, edad: 19 }),
    clave: 'Acidosis metabólica con anión gap elevado y compensación respiratoria adecuada (Winter).',
  },
  {
    id: 'diarrea',
    nombre: 'Diarrea grave',
    historia: 'Varón de 40 años con diarrea acuosa abundante desde hace 3 días.',
    valores: g({ ph: 7.32, paco2: 30, hco3: 15, pao2: 96, na: 138, cl: 113, edad: 40 }),
    clave: 'Acidosis metabólica con anión gap NORMAL (hiperclorémica): se pierde bicarbonato por las heces.',
  },
  {
    id: 'vomitos',
    nombre: 'Vómitos repetidos',
    historia: 'Mujer de 25 años con vómitos incoercibles desde hace 2 días.',
    valores: g({ ph: 7.5, paco2: 45, hco3: 34, pao2: 90, na: 138, cl: 90, edad: 25 }),
    clave: 'Alcalosis metabólica (pérdida de HCl gástrico) con hipoventilación compensadora.',
  },
  {
    id: 'opiaceos',
    nombre: 'Sobredosis de opiáceos',
    historia: 'Varón de 30 años encontrado somnoliento, con miosis y 6 respiraciones por minuto. Aire ambiente.',
    valores: g({ ph: 7.21, paco2: 70, hco3: 27, pao2: 52, na: 140, cl: 102, edad: 30, evolucion: 'aguda' }),
    clave: 'Acidosis respiratoria AGUDA (el riñón aún no ha compensado) con hipoxemia de gradiente A‑a normal: hipoventilación pura.',
  },
  {
    id: 'epoc',
    nombre: 'EPOC con hipercapnia crónica',
    historia: 'Varón de 68 años con EPOC grave, estable, en su revisión. Aire ambiente.',
    valores: g({ ph: 7.34, paco2: 60, hco3: 31, pao2: 48, na: 140, cl: 98, edad: 68, evolucion: 'cronica' }),
    clave: 'Acidosis respiratoria CRÓNICA compensada por el riñón (HCO₃⁻ alto) y gradiente A‑a aumentado (alteración V/Q).',
  },
  {
    id: 'ansiedad',
    nombre: 'Crisis de ansiedad',
    historia: 'Mujer de 22 años con hiperventilación, parestesias peribucales y en las manos. Aire ambiente.',
    valores: g({ ph: 7.52, paco2: 28, hco3: 22, pao2: 106, na: 140, cl: 106, edad: 22, evolucion: 'aguda' }),
    clave: 'Alcalosis respiratoria aguda con oxigenación normal.',
  },
  {
    id: 'tep',
    nombre: 'Tromboembolismo pulmonar',
    historia: 'Mujer de 45 años con disnea brusca y dolor torácico pleurítico tras un vuelo largo. Aire ambiente.',
    valores: g({ ph: 7.49, paco2: 30, hco3: 22, pao2: 62, na: 140, cl: 104, edad: 45, evolucion: 'aguda' }),
    clave: 'Alcalosis respiratoria aguda con hipoxemia y gradiente A‑a muy aumentado: el pulmón no intercambia bien (V/Q).',
  },
  {
    id: 'sepsis',
    nombre: 'Shock séptico con SDRA',
    historia: 'Varón de 60 años con neumonía, hipotensión y lactato alto, agotado. FiO₂ 50 %.',
    valores: g({ ph: 7.13, paco2: 50, hco3: 16, pao2: 60, fio2: 0.5, na: 140, cl: 100, albumina: 2.5, edad: 60 }),
    clave: 'Trastorno MIXTO: acidosis metabólica (láctica) + acidosis respiratoria (no puede compensar). Fíjate en la corrección del AG por la albúmina y en la PaO₂/FiO₂.',
  },
  {
    id: 'salicilatos',
    nombre: 'Intoxicación por salicilatos',
    historia: 'Mujer de 35 años que ha tomado muchos comprimidos de ácido acetilsalicílico; acúfenos y taquipnea.',
    valores: g({ ph: 7.47, paco2: 20, hco3: 14, pao2: 110, na: 140, cl: 104, edad: 35, evolucion: 'aguda' }),
    clave: 'MIXTO: acidosis metabólica con AG elevado + alcalosis respiratoria primaria (el salicilato estimula el centro respiratorio). El PaCO₂ está mucho más bajo de lo que predice Winter.',
  },
  {
    id: 'oculta',
    nombre: 'Acidosis láctica + vómitos',
    historia: 'Varón de 55 años con isquemia intestinal que lleva días vomitando.',
    valores: g({ ph: 7.36, paco2: 40, hco3: 22, pao2: 88, na: 140, cl: 92, edad: 55 }),
    clave: 'pH casi normal, pero el anión gap está muy alto y el cociente delta > 2: acidosis con AG elevado + alcalosis metabólica que se «tapan» entre sí.',
  },
];

export const getCasoGas = (id: string) => CASOS_GAS.find((c) => c.id === id) ?? CASOS_GAS[0];
