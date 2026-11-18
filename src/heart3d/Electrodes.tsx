/**
 * ELECTRODOS, con los colores de la norma IEC:
 *  - Miembros: R (rojo, brazo dcho.), L (amarillo, brazo izq.), F (verde, pierna
 *    izq.) en los vértices del triángulo de Einthoven. (El negro de la pierna
 *    derecha es solo tierra y no participa en ninguna derivación.)
 *  - Precordiales V1–V6 sobre el tórax, en el plano horizontal.
 */
import { Html, Line } from '@react-three/drei';
import { ELECTRODE_COLORS, ELECTRODE_VECTORS, type ElectrodeName } from '../config/leads';
import { normalize } from '../engine/math';
import { CHEST_AXIS_R, LIMB_ELECTRODE_R, toThree } from './frames';

const LIMB: { e: ElectrodeName; label: string }[] = [
  { e: 'R', label: 'R · brazo dcho.' },
  { e: 'L', label: 'L · brazo izq.' },
  { e: 'F', label: 'F · pierna izq.' },
];
const CHEST: ElectrodeName[] = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'];

function Electrode({ pos, color, label }: { pos: [number, number, number]; color: string; label: string }) {
  return (
    <group position={pos}>
      <mesh>
        <sphereGeometry args={[0.16, 20, 14]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.2} />
      </mesh>
      <Html center position={[0, -0.36, 0]} zIndexRange={[10, 0]}>
        <span className="electrode-label">{label}</span>
      </Html>
    </group>
  );
}

export function Electrodes() {
  const limbPos = LIMB.map(({ e }) => toThree(normalize(ELECTRODE_VECTORS[e]), LIMB_ELECTRODE_R));
  return (
    <group>
      {/* Triángulo de Einthoven */}
      <Line
        points={[...limbPos.map((p) => p.toArray()), limbPos[0].toArray()]}
        color="#9aa0a6"
        lineWidth={1}
        transparent
        opacity={0.45}
      />
      {LIMB.map(({ e, label }, i) => (
        <Electrode key={e} pos={limbPos[i].toArray() as [number, number, number]} color={ELECTRODE_COLORS[e]} label={label} />
      ))}
      {CHEST.map((e) => (
        <Electrode
          key={e}
          pos={toThree(normalize(ELECTRODE_VECTORS[e]), CHEST_AXIS_R).toArray() as [number, number, number]}
          color={ELECTRODE_COLORS[e]}
          label={e}
        />
      ))}
    </group>
  );
}
