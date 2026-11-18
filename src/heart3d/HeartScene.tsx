import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { useSim } from '../store/useSimStore';
import { setCut } from './clipping';
import { Electrodes } from './Electrodes';
import { LeadAxes } from './LeadAxes';
import { LoopTrail } from './LoopTrail';
import { HEART_QUATERNION } from './models/anatomy';
import { ProceduralHeart } from './models/ProceduralHeart';
import { Planes } from './Planes';
import { ProjectionHelper } from './ProjectionHelper';
import { VectorArrow } from './VectorArrow';

/** Coloca la cámara en las vistas predefinidas (frontal, horizontal, lateral). */
function CameraRig() {
  const view = useSim((s) => s.cameraView);
  const nonce = useSim((s) => s.cameraNonce);
  const { camera, controls, size } = useThree();
  useEffect(() => {
    // En paneles estrechos (móvil vertical) alejamos la cámara para que quepa todo
    const k = Math.max(1, 1.15 / (size.width / Math.max(1, size.height)));
    const d = 15 * k;
    if (view === 'oblicua') camera.position.set(6.2 * k, 5 * k, 12.8 * k); // 3/4: se ven ambos planos
    else if (view === 'frontal') camera.position.set(0, 0, d);
    else if (view === 'horizontal') camera.position.set(0, d, 0.001); // desde arriba (cabeza del paciente)
    else if (view === 'lateral') camera.position.set(d, 0, 0); // desde el lado izquierdo
    else return;
    camera.lookAt(0, 0, 0);
    const c = controls as unknown as { target: { set: (x: number, y: number, z: number) => void }; update: () => void } | null;
    c?.target.set(0, 0, 0);
    c?.update();
    // Solo al cambiar de vista (no al redimensionar, para no deshacer el zoom del usuario)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, nonce, camera, controls]);
  return null;
}

/** Aplica la profundidad de corte al plano compartido. */
function CutSync() {
  useFrame(() => setCut(useSim.getState().cut));
  return null;
}

export function HeartScene() {
  const layers = useSim((s) => s.layers);
  return (
    <Canvas
      camera={{ position: [6.2, 5, 12.8], fov: 42, near: 0.1, far: 200 }}
      gl={{ antialias: true, localClippingEnabled: true } as never}
      onCreated={({ gl }) => {
        gl.localClippingEnabled = true;
      }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 8, 10]} intensity={1.3} />
      <directionalLight position={[-6, -4, -8]} intensity={0.4} />
      <CameraRig />
      <CutSync />
      <OrbitControls makeDefault enableDamping dampingFactor={0.12} minDistance={4} maxDistance={30} />

      <group quaternion={HEART_QUATERNION}>
        <ProceduralHeart />
      </group>

      <Planes />
      <LeadAxes />
      {layers.electrodos && <Electrodes />}
      {layers.bucle && <LoopTrail />}
      <ProjectionHelper />
      <VectorArrow />
    </Canvas>
  );
}
