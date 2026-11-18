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
  sim: SimResult;

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

function buildSim(heartRate: number, qrsAxis: number): SimResult {
  return simulate(defaultParams({ heartRate, qrsAxis }));
}

/** Recalcula la simulación conservando la fase relativa del reloj. */
function rebuild(get: () => SimState, heartRate: number, qrsAxis: number) {
  const old = get().sim;
  const sim = buildSim(heartRate, qrsAxis);
  clock.seek((clock.t / old.duration) * sim.duration);
  return sim;
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
  sim: buildSim(PHYSIOLOGY.heartRate, PHYSIOLOGY.qrsAxis),

  playing: true,
  speed: 0.25,

  selectedLead: 'II',
  layers: {
    electrodos: true,
    ejesMiembros: true,
    ejesPrecordiales: true,
    planoFrontal: true,
    planoHorizontal: false,
    bucle: true,
    coronarias: true,
    conduccion: true,
  },
  heartOpacity: 0.4,
  cut: null,
  cameraView: 'oblicua',
  cameraNonce: 0,

  theme: initialTheme,
  ecgLayout: 'clasico',
  mobileTab: '3d',

  setHeartRate: (heartRate) => set({ heartRate, sim: rebuild(get, heartRate, get().qrsAxis) }),
  setQrsAxis: (qrsAxis) => set({ qrsAxis, sim: rebuild(get, get().heartRate, qrsAxis) }),
  setPathology: (pathologyId) => set({ pathologyId }),
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
