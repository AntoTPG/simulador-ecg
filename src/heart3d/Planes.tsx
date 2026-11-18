/** Planos de referencia: frontal (derivaciones de miembros) y horizontal (precordiales). */
import { Html } from '@react-three/drei';
import { DoubleSide } from 'three';
import { useSim } from '../store/useSimStore';

const R = 5.6;

function Disc({ color, rotation }: { color: string; rotation: [number, number, number] }) {
  return (
    <group rotation={rotation}>
      <mesh renderOrder={0}>
        <circleGeometry args={[R, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.07} side={DoubleSide} depthWrite={false} />
      </mesh>
      <mesh renderOrder={0}>
        <ringGeometry args={[R - 0.03, R, 96]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} side={DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

const Tag = ({ p, children }: { p: [number, number, number]; children: string }) => (
  <Html position={p} center zIndexRange={[5, 0]}>
    <span className="orient-label">{children}</span>
  </Html>
);

export function Planes() {
  const layers = useSim((s) => s.layers);
  return (
    <group>
      {layers.planoFrontal && (
        <group>
          <Disc color="#4f8fd6" rotation={[0, 0, 0]} />
          <Tag p={[-R - 0.2, 0, 0]}>Derecha del paciente</Tag>
          <Tag p={[R + 0.2, 0, 0]}>Izquierda</Tag>
          <Tag p={[0, R + 0.25, 0]}>Superior</Tag>
          <Tag p={[0, -R - 0.25, 0]}>Inferior</Tag>
        </group>
      )}
      {layers.planoHorizontal && (
        <group>
          <Disc color="#3aa66b" rotation={[-Math.PI / 2, 0, 0]} />
          <Tag p={[0, 0, R + 0.25]}>Anterior</Tag>
          <Tag p={[0, 0, -R - 0.25]}>Posterior</Tag>
        </group>
      )}
    </group>
  );
}
