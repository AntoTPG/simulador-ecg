/**
 * ACINO EN 3D: un bronquiolo terminal que se divide en bronquiolos
 * respiratorios y conductos alveolares, terminados en sacos alveolares.
 * Respira sincronizado con las gráficas (el movimiento está EXAGERADO para que
 * se vea; en la realidad un alvéolo apenas cambia un 5–10 % de diámetro).
 *
 * Cada patología cambia lo que de verdad cambia en ella:
 *  - asma: el bronquiolo (músculo liso, pared inflamada, moco); alvéolos normales;
 *  - enfisema: alvéolos destruidos y fusionados; el bronquiolo se colapsa al espirar;
 *  - fibrosis: tabiques alveolares engrosados y rígidos;
 *  - obesidad y neuromusculares: el acino es normal (el problema está fuera).
 * Esquema simplificado, no a escala.
 */
import { Html, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { AcinoVisual } from './catalog';
import { sampleResp, type RespCycle } from './mechanics';
import { respClock } from './respClock';

const BRANCH = new THREE.Vector3(0, -1.1, 0);
const SACS = [
  new THREE.Vector3(-1.75, 0.55, 0.35),
  new THREE.Vector3(1.7, 0.45, -0.25),
  new THREE.Vector3(0.15, 1.5, -0.9),
  new THREE.Vector3(0.3, 0.9, 1.45),
];

/** Puntos repartidos sobre una esfera (espiral de Fibonacci). */
function fibonacci(n: number) {
  const out: THREE.Vector3[] = [];
  const g = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    out.push(new THREE.Vector3(Math.cos(g * i) * r, y, Math.sin(g * i) * r));
  }
  return out;
}

/** Tubo suave entre dos puntos (con una ligera curva). */
function tubePath(a: THREE.Vector3, b: THREE.Vector3) {
  const mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, 0.25, 0));
  return new THREE.QuadraticBezierCurve3(a, mid, b);
}

interface Props {
  visual: AcinoVisual;
  cycle: RespCycle;
  rotulos: boolean;
}

function Acinus({ visual, cycle, rotulos }: Props) {
  const v = visual;
  const enf = v.alveolos === 'enfisema';
  const fib = v.alveolos === 'fibrosis';

  // Geometría de los alvéolos de cada saco según la patología
  const alv = useMemo(() => {
    const n = enf ? 7 : fib ? 20 : 15;
    const shell = enf ? 0.62 : fib ? 0.5 : 0.58;
    const r = enf ? 0.55 : fib ? 0.24 : 0.31;
    return { pts: fibonacci(n).map((p) => p.multiplyScalar(shell)), r };
  }, [enf, fib]);

  const ductCurves = useMemo(() => SACS.map((s) => tubePath(BRANCH, s)), []);
  const trunkCurve = useMemo(() => new THREE.LineCurve3(new THREE.Vector3(0, -3.6, 0), BRANCH), []);

  // Radios del bronquiolo terminal: luz (aire) y pared
  const lumen0 = 0.3 * v.luz;
  const wallR = 0.3 + 0.1 * v.pared;

  const sacRefs = useRef<(THREE.Group | null)[]>([]);
  const lumenRef = useRef<THREE.Mesh>(null);
  const collapse = useRef(1);

  useFrame(() => {
    const t = respClock.t;
    const V = sampleResp(cycle, cycle.vol, t);
    // Escala de los alvéolos ∝ raíz cúbica del volumen, exagerada ×3 para que se vea
    const s = 1 + 3 * (Math.cbrt(V / cycle.eelv) - 1);
    for (const g of sacRefs.current) g?.scale.setScalar(s);
    // El bronquiolo se ensancha algo al inspirar (tracción radial) y, en el enfisema,
    // se colapsa en la espiración cuando el flujo está limitado
    const lim = sampleResp(cycle, cycle.limited, t) > 0.5;
    const target = v.colapsoEspiratorio && lim ? 0.35 : 1;
    collapse.current += (target - collapse.current) * 0.15;
    const k = (1 + 0.6 * (s - 1)) * collapse.current;
    lumenRef.current?.scale.set(k, 1, k);
  });

  const alvColor = fib ? '#e7c3c9' : enf ? '#f7bcc8' : '#f4a6b8';
  const alvOpacity = fib ? 0.88 : enf ? 0.34 : 0.55;

  return (
    <group position={[0, 0.5, 0]}>
      {/* Bronquiolo terminal: pared (rosa, translúcida) y luz con aire (azul) */}
      <mesh>
        <tubeGeometry args={[trunkCurve, 8, wallR, 24, false]} />
        <meshStandardMaterial color={v.inflamacion ? '#e58aa0' : '#eba3b3'} transparent opacity={0.45} roughness={0.6} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <group position={[0, (-3.6 + BRANCH.y) / 2, 0]}>
        <mesh ref={lumenRef}>
          <cylinderGeometry args={[lumen0, lumen0, 3.6 + BRANCH.y, 24, 1, true]} />
          <meshStandardMaterial color="#bfe3ff" roughness={0.3} side={THREE.DoubleSide} />
        </mesh>
      </group>
      {/* Músculo liso: anillos alrededor del bronquiolo */}
      {[-3.2, -2.7, -2.2, -1.7, -1.3].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[wallR, 0.035 * v.musculo, 10, 32]} />
          <meshStandardMaterial color="#b4533e" roughness={0.5} />
        </mesh>
      ))}
      {/* Células inflamatorias (eosinófilos) en la pared */}
      {v.inflamacion &&
        Array.from({ length: 26 }, (_, i) => {
          const a = i * 2.39;
          const y = -3.4 + (i / 26) * 2.2;
          return (
            <mesh key={i} position={[Math.cos(a) * (wallR * 0.85), y, Math.sin(a) * (wallR * 0.85)]}>
              <sphereGeometry args={[0.045, 8, 8]} />
              <meshStandardMaterial color="#f97316" />
            </mesh>
          );
        })}
      {/* Tapones de moco en la luz */}
      {v.moco &&
        [-2.9, -2.1, -1.4].map((y, i) => (
          <mesh key={y} position={[0.05 * (i - 1), y, 0]} scale={[1, 1.7, 1]}>
            <sphereGeometry args={[lumen0 * 0.75, 16, 16]} />
            <meshStandardMaterial color="#d9e36b" roughness={0.9} transparent opacity={0.9} />
          </mesh>
        ))}

      {/* Bronquiolos respiratorios y conductos alveolares */}
      {ductCurves.map((c, i) => (
        <group key={i}>
          <mesh>
            <tubeGeometry args={[c, 20, 0.2, 16, false]} />
            <meshStandardMaterial color="#eba3b3" transparent opacity={0.45} roughness={0.6} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
          <mesh>
            <tubeGeometry args={[c, 20, 0.13, 12, false]} />
            <meshStandardMaterial color="#bfe3ff" roughness={0.3} />
          </mesh>
          {/* Algunos alvéolos ya brotan de la pared del bronquiolo respiratorio */}
          {[0.45, 0.7].map((u) => {
            const p = c.getPoint(u);
            const n = c.getTangent(u).cross(new THREE.Vector3(0, 0, 1)).normalize().multiplyScalar(0.22);
            return (
              <mesh key={u} position={p.clone().add(n)}>
                <sphereGeometry args={[alv.r * 0.7, 16, 16]} />
                <meshStandardMaterial color={alvColor} transparent opacity={alvOpacity} roughness={0.6} depthWrite={false} side={THREE.DoubleSide} />
              </mesh>
            );
          })}
        </group>
      ))}

      {/* Sacos alveolares: racimos de alvéolos que respiran */}
      {SACS.map((s, i) => (
        <group key={i} position={s} ref={(g) => (sacRefs.current[i] = g)}>
          {alv.pts.map((p, j) => (
            <group key={j} position={p}>
              <mesh>
                <sphereGeometry args={[alv.r, 20, 20]} />
                <meshStandardMaterial color={alvColor} transparent opacity={alvOpacity} roughness={0.55} depthWrite={false} side={THREE.DoubleSide} />
              </mesh>
              {/* Capilar que rodea el alvéolo (en el enfisema se pierde lecho capilar) */}
              {(!enf || j % 2 === 0) && (
                <mesh rotation={[p.y * 2, p.x * 2, 0]}>
                  <torusGeometry args={[alv.r * 1.02, fib ? 0.035 : 0.022, 8, 28]} />
                  <meshStandardMaterial color={j % 3 === 0 ? '#2563eb' : '#dc2626'} roughness={0.5} />
                </mesh>
              )}
              {/* Fibrosis: colágeno engrosando el tabique */}
              {fib && (
                <mesh rotation={[0, p.x * 3, p.y * 3]}>
                  <torusGeometry args={[alv.r * 1.06, 0.05, 6, 22]} />
                  <meshStandardMaterial color="#f5f0e6" roughness={0.9} />
                </mesh>
              )}
            </group>
          ))}
        </group>
      ))}

      {rotulos && (
        <>
          <Label pos={[wallR + 0.25, -3.0, 0]}>Bronquiolo terminal</Label>
          <Label pos={[-wallR - 0.25, -2.2, 0]} left>
            Músculo liso{v.musculo > 1.5 ? ' contraído' : ''}
          </Label>
          {v.moco && (
            <Label pos={[wallR + 0.25, -1.9, 0]} tone="warn">
              Moco
            </Label>
          )}
          {v.inflamacion && (
            <Label pos={[wallR + 0.25, -2.45, 0]} tone="warn">
              Pared inflamada (eosinófilos)
            </Label>
          )}
          <Label pos={[1.25, -0.55, 0]}>Bronquiolo respiratorio</Label>
          <Label pos={[SACS[1].x + 0.7, SACS[1].y + 0.4, SACS[1].z]}>{enf ? 'Espacios fusionados (destrucción)' : 'Saco alveolar'}</Label>
          {fib && (
            <Label pos={[SACS[0].x - 0.6, SACS[0].y + 0.8, SACS[0].z]} left tone="warn">
              Tabiques engrosados (colágeno)
            </Label>
          )}
          {!fib && (
            <Label pos={[SACS[0].x - 0.6, SACS[0].y + 0.75, SACS[0].z]} left>
              Capilares
            </Label>
          )}
          {v.colapsoEspiratorio && (
            <Label pos={[-wallR - 0.25, -1.4, 0]} left tone="warn">
              Se colapsa al espirar
            </Label>
          )}
        </>
      )}
    </group>
  );
}

function Label({ pos, children, left, tone }: { pos: [number, number, number]; children: React.ReactNode; left?: boolean; tone?: 'warn' }) {
  return (
    <Html position={pos} center={false} style={{ transform: left ? 'translate(-100%, -50%)' : 'translate(0, -50%)', pointerEvents: 'none' }}>
      <span className={`acino-label${tone ? ' warn' : ''}`}>{children}</span>
    </Html>
  );
}

/** En paneles estrechos (móvil) aleja la cámara para que quepa el acino con sus rótulos. */
function FitCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const k = Math.max(1, 1.25 / (size.width / Math.max(1, size.height)));
    camera.position.setLength(9.5 * k);
  }, [camera, size.width, size.height]);
  return null;
}

export function AcinusScene(props: Props) {
  return (
    <Canvas camera={{ position: [0, 0.2, 9.5], fov: 42 }} dpr={[1, 2]}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 6, 8]} intensity={1.2} />
      <directionalLight position={[-5, -3, -6]} intensity={0.4} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.12} minDistance={4} maxDistance={18} autoRotate autoRotateSpeed={0.5} />
      <FitCamera />
      <Acinus {...props} />
    </Canvas>
  );
}
