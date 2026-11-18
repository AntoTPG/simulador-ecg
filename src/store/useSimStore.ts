/**
 * Estado global (Zustand).
 *
 * Importante para el rendimiento: el TIEMPO de la animación NO vive aquí, sino
 * en `clock.ts`. Si el tiempo estuviera en el estado de React, toda la interfaz
 * se volvería a renderizar 60 veces por segundo.
 */
import { create } from 'zustand';
import type { LeadName } from '../config/leads';
import { PHYSIOLOGY } from '../config/physiology';
import { defaultParams } from '../engine/params';
import { simulate, type SimResult } from '../engine/simulate';
import { paramsForPathology } from '../engine/applyPathology';
import { getPathology } from '../pathologies/registry';
import { clock } from './clock';

export type Layer =
  | 'electrodos'
  | 'ejesMiembros'
  | 'ejesPrecordiales'
  | 'planoFrontal'
  | 'planoHorizontal'
  | 'bucle'
  | 'coronarias'
  | 'conduccion';

export type Theme = 'claro' | 'oscuro';
export type EcgLayout = 'clasico' | 'simultaneo';
export type CameraView = 'libre' | 'oblicua' | 'frontal' | 'horizontal' | 'lateral';
export type MobileTab = '3d' | 'ecg' | 'patologia';

interface SimState {
  heartRate: number;
  qrsAxis: number;
  pathologyId: string;
  /** Nivel del deslizador de gravedad/fase de la patología. */
  levelIndex: number;
  sim: SimResult;
  /** Corazón sano con la misma FC y eje (para superponerlo). */
  normalSim: SimResult;
  compare: boolean;

  playing: boolean;
  speed: number;

  selectedLead: LeadName | null;
  layers: Record<Layer, boolean>;
  heartOpacity: number;
  /** Profundidad del corte frontal (null = sin corte). */
  cut: number | null;
  cameraView: CameraView;
  cameraNonce: number;

  theme: Theme;
  ecgLayout: EcgLayout;
  mobileTab: MobileTab;

  setHeartRate: (hr: number) => void;
  setQrsAxis: (deg: number) => void;
  setPathology: (id: string) => void;
  setLevel: (i: number) => void;
  toggleCompare: () => void;
  togglePlay: () => void;
  setPlaying: (p: boolean) => void;
  setSpeed: (s: number) => void;
  selectLead: (l: LeadName | null) => void;
  toggleLayer: (l: Layer) => void;
  setHeartOpacity: (o: number) => void;
  setCut: (c: number | null) => void;
  setCameraView: (v: CameraView) => void;
  toggleTheme: () => void;
  setEcgLayout: (l: EcgLayout) => void;
  setMobileTab: (t: MobileTab) => void;
}

interface SimInputs {
  heartRate: number;
  qrsAxis: number;
  pathologyId: string;
  levelIndex: number;
}

/** Simulación con la patología aplicada + la del corazón sano (para «comparar con normal»). */
function buildSims({ heartRate, qrsAxis, pathologyId, levelIndex }: SimInputs) {
  const base = defaultParams({ heartRate, qrsAxis });
  const normalSim = simulate(base);
  const p = getPathology(pathologyId);
  const sim = p.id === 'normal' ? normalSim : simulate(paramsForPathology(base, p, levelIndex));
  return { sim, normalSim };
}

/** Recalcula la simulación conservando la fase relativa del reloj. */
function rebuild(get: () => SimState, changes: Partial<SimInputs>) {
  const s = get();
  const inputs: SimInputs = {
    heartRate: s.heartRate,
    qrsAxis: s.qrsAxis,
    pathologyId: s.pathologyId,
    levelIndex: s.levelIndex,
    ...changes,
  };
  const old = s.sim;
  const sims = buildSims(inputs);
  clock.seek((clock.t / old.duration) * sims.sim.duration);
  return { ...changes, ...sims };
}

const initialTheme: Theme =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';

/** El tema se aplica en el <html> de forma síncrona para que los lienzos lean ya las variables nuevas. */
export function applyTheme(t: Theme) {
  if (typeof document !== 'undefined') document.documentElement.dataset.theme = t === 'oscuro' ? 'dark' : 'light';
}
applyTheme(initialTheme);

export const useSim = create<SimState>()((set, get) => ({
  heartRate: PHYSIOLOGY.heartRate,
  qrsAxis: PHYSIOLOGY.qrsAxis,
  pathologyId: 'normal',
  levelIndex: 0,
  ...buildSims({ heartRate: PHYSIOLOGY.heartRate, qrsAxis: PHYSIOLOGY.qrsAxis, pathologyId: 'normal', levelIndex: 0 }),
  compare: false,

  playing: true,
  speed: 0.25,

  selectedLead: 'II',
  layers: {
    electrodos: true,
    ejesMiembros: true,
    ejesPrecordiales: false,
    planoFrontal: true,
    planoHorizontal: false,
    bucle: true,
    coronarias: true,
    conduccion: false,
  },
  heartOpacity: 0.8,
  cut: null,
  cameraView: 'oblicua',
  cameraNonce: 0,

  theme: initialTheme,
  ecgLayout: 'clasico',
  mobileTab: '3d',

  setHeartRate: (heartRate) => set(rebuild(get, { heartRate })),
  setQrsAxis: (qrsAxis) => set(rebuild(get, { qrsAxis })),
  setPathology: (pathologyId) => {
    const p = getPathology(pathologyId);
    set(rebuild(get, { pathologyId: p.id, levelIndex: p.control?.inicial ?? 0 }));
    // Selecciona automáticamente la derivación más representativa
    const first = p.derivacionesAfectadas[0];
    if (first) set({ selectedLead: first });
  },
  setLevel: (levelIndex) => set(rebuild(get, { levelIndex })),
  toggleCompare: () => set({ compare: !get().compare }),
  togglePlay: () => set({ playing: !get().playing }),
  setPlaying: (playing) => set({ playing }),
  setSpeed: (speed) => set({ speed }),
  selectLead: (selectedLead) => set({ selectedLead }),
  toggleLayer: (l) => set({ layers: { ...get().layers, [l]: !get().layers[l] } }),
  setHeartOpacity: (heartOpacity) => set({ heartOpacity }),
  setCut: (cut) => set({ cut }),
  setCameraView: (cameraView) => set({ cameraView, cameraNonce: get().cameraNonce + 1 }),
  toggleTheme: () => {
    const theme: Theme = get().theme === 'claro' ? 'oscuro' : 'claro';
    applyTheme(theme);
    set({ theme });
  },
  setEcgLayout: (ecgLayout) => set({ ecgLayout }),
  setMobileTab: (mobileTab) => set({ mobileTab }),
}));
