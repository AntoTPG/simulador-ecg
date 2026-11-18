/**
 * EJES DE LAS DERIVACIONES alrededor del corazón.
 *  - Miembros (I, II, III, aVR, aVL, aVF): sistema hexaxial en el plano FRONTAL.
 *  - Precordiales (V1–V6): en el plano HORIZONTAL, de derecha‑delante a izquierda.
 * Mitad positiva continua (hacia el electrodo explorador) y mitad negativa
 * discontinua. Pulsa una etiqueta para seleccionar la derivación.
 */
import { Html, Line } from '@react-three/drei';
import { LEAD_NAMES, LEAD_INFO, type LeadName } from '../config/leads';
import { LEAD_UNIT } from '../engine/leads';
import { useSim } from '../store/useSimStore';
import { CHEST_AXIS_R, LIMB_AXIS_R, toThree } from './frames';

const LIMB_COLOR = '#4f8fd6';
const CHEST_COLOR = '#3aa66b';
const ACCENT = '#ff7a1a';

function Axis({ lead, r, color }: { lead: LeadName; r: number; color: string }) {
  const selected = useSim((s) => s.selectedLead === lead);
  const select = useSim((s) => s.selectLead);
  const u = toThree(LEAD_UNIT[lead]);
  const pos = u.clone().multiplyScalar(r);
  const neg = u.clone().multiplyScalar(-r);
  const label = u.clone().multiplyScalar(r + 0.38);
  const c = selected ? ACCENT : color;
  return (
    <group>
      <Line points={[[0, 0, 0], pos.toArray()]} color={c} lineWidth={selected ? 4 : 1.6} transparent opacity={selected ? 1 : 0.75} />
      <Line points={[[0, 0, 0], neg.toArray()]} color={c} lineWidth={selected ? 2 : 1} dashed dashSize={0.12} gapSize={0.1} transparent opacity={selected ? 0.8 : 0.35} />
      <Html position={label.toArray()} center zIndexRange={[20, 0]}>
        <button
          className={`axis-label${selected ? ' is-selected' : ''}`}
          style={{ borderColor: c }}
          onClick={() => select(lead)}
          title={`${lead}: mira la cara ${LEAD_INFO[lead].cara}`}
        >
          {lead}+
        </button>
      </Html>
    </group>
  );
}

export function LeadAxes() {
  const layers = useSim((s) => s.layers);
  return (
    <group>
      {layers.ejesMiembros &&
        LEAD_NAMES.filter((l) => LEAD_INFO[l].grupo === 'miembros').map((l) => (
          <Axis key={l} lead={l} r={LIMB_AXIS_R} color={LIMB_COLOR} />
        ))}
      {layers.ejesPrecordiales &&
        LEAD_NAMES.filter((l) => LEAD_INFO[l].grupo === 'precordial').map((l) => (
          <Axis key={l} lead={l} r={CHEST_AXIS_R} color={CHEST_COLOR} />
        ))}
    </group>
  );
}
