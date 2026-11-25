import { useEffect, useState } from 'react';
import { EcgPanel } from './ecg/EcgPanel';
import { HeartScene } from './heart3d/HeartScene';
import { startClockLoop } from './store/clock';
import { useSim, type MobileTab, type Seccion } from './store/useSimStore';
import { Controls } from './ui/Controls';
import { EcgHeader } from './ui/EcgHeader';
import { LayersButton, ViewButtons } from './ui/LayerToggles';
import { HeartRateBadge, LeadInfoPanel, PhaseStepper } from './ui/LiveInfo';
import { PathologyPanel } from './ui/PathologyPanel';
import { VectorPlanes } from './ui/VectorPlanes';
import { WiggersPanel } from './ui/WiggersPanel';
import { PvLoopPanel } from './ui/PvLoopPanel';
import { HeartSoundsPanel } from './ui/HeartSoundsPanel';
import { CongenitalPanel } from './congenital/CongenitalPanel';
import { VesselPanel } from './vessels/VesselPanel';
import { QuizPanel } from './quiz/QuizPanel';
import { RespiratoryPanel } from './respiratory/RespiratoryPanel';
import { CirculationPanel } from './circulation/CirculationPanel';
import { audioPositionMs, playLoop, stopAudio } from './sounds/player';
import { getCycleData } from './sounds/cycleData';
import { clock } from './store/clock';

function useIsMobile(bp = 900) {
  const q = `(max-width: ${bp}px)`;
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [q]);
  return m;
}

const NUEVA_WEB = 'https://simulador-ecg.pages.dev';

/**
 * Aviso de la mudanza a Cloudflare Pages. En la web antigua invita a guardar
 * la dirección nueva; en la nueva, a guardarla en favoritos. Se puede cerrar.
 */
function MigrationNotice() {
  const key = 'aviso-cloudflare-cerrado';
  const [closed, setClosed] = useState(() => {
    try {
      return localStorage.getItem(key) === '1';
    } catch {
      return false;
    }
  });
  if (closed) return null;
  const enNueva = typeof location !== 'undefined' && location.hostname.endsWith('pages.dev');
  const cerrar = () => {
    setClosed(true);
    try {
      localStorage.setItem(key, '1');
    } catch {
      /* sin almacenamiento: solo se cierra en esta visita */
    }
  };
  return (
    <div className="migration-notice" role="status">
      <span aria-hidden>📢</span>
      {enNueva ? (
        <span>
          Dentro de unos días esta será la <b>dirección definitiva</b> de la web: <b>simulador-ecg.pages.dev</b>. Guárdala en favoritos.
        </span>
      ) : (
        <span>
          Dentro de unos días la web se trasladará definitivamente a{' '}
          <a href={NUEVA_WEB} target="_blank" rel="noopener noreferrer">
            simulador-ecg.pages.dev
          </a>
          . Guarda la nueva dirección (ya funciona).
        </span>
      )}
      <button className="migration-close" onClick={cerrar} aria-label="Cerrar aviso">
        ✕
      </button>
    </div>
  );
}

/** Aviso permanente: la versión publicada está en revisión (no se puede cerrar). */
function ReviewNotice() {
  return (
    <div className="review-notice" role="note">
      <span aria-hidden>🚧</span>
      <span>
        <b>Versión en revisión.</b> Esta versión publicada todavía se está revisando y <b>no es la definitiva</b>: puede contener errores o cambiar.
      </span>
    </div>
  );
}

function Footer() {
  return (
    <footer className="app-footer">
      <div>Creado por Antonio Requena Quesada con ayuda de Claude Code</div>
      <div className="copyright">
        © {new Date().getFullYear() > 2026 ? `2026–${new Date().getFullYear()}` : 2026} Antonio Requena Quesada. Todos los derechos reservados.
        Grabaciones de ruidos cardíacos: Univ. de Michigan (CC BY‑SA 4.0).{' '}
        <a href="./LICENCIAS-TERCEROS.txt" target="_blank" rel="noopener noreferrer">
          Licencias de terceros
        </a>
      </div>
    </footer>
  );
}

/** `fc`: mostrar la FC del simulador (fuera de él confundiría, p. ej. en «Adivina el ECG»). */
function Header({ fc = true }: { fc?: boolean }) {
  const theme = useSim((s) => s.theme);
  const toggleTheme = useSim((s) => s.toggleTheme);
  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-logo" aria-hidden>
          <svg viewBox="0 0 32 32" width="22" height="22">
            <path d="M2 17h7l2-6 4 14 4-20 3 12h8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </span>
        <div>
          <h1>FisioVisual</h1>
          <p className="brand-sub">Fisiología interactiva · Medicina</p>
        </div>
      </div>
      <p className="disclaimer" role="note">
        ⚠️ Herramienta <b>educativa y simplificada</b>. No apta para uso clínico ni para diagnóstico.
      </p>
      <div className="header-right">
        {fc && <HeartRateBadge />}
        <button className="icon-btn" onClick={toggleTheme} aria-label="Cambiar tema" title="Cambiar tema">
          {theme === 'claro' ? '☾' : '☀'}
        </button>
      </div>
    </header>
  );
}

function ScenePanel() {
  return (
    <section className="card scene-card" aria-label="Corazón 3D y vector cardíaco">
      <HeartScene />
      <div className="scene-top">
        <ViewButtons />
        <LayersButton />
      </div>
      <div className="scene-legend" aria-hidden>
        <span>
          <i className="dot rest" /> Reposo
        </span>
        <span>
          <i className="dot dep" /> Despolarizado
        </span>
        <span>
          <i className="dot front" /> Frente de onda
        </span>
      </div>
      <div className="scene-bottom">
        <PhaseStepper />
      </div>
    </section>
  );
}

function EcgSection() {
  return (
    <section className="card ecg-panel" aria-label="ECG de 12 derivaciones">
      <EcgHeader />
      <EcgPanel />
    </section>
  );
}

function VectorSection() {
  return (
    <section className="vector-section" aria-label="Proyección del vector en los planos">
      <VectorPlanes />
      <LeadInfoPanel />
    </section>
  );
}

/** Pestañas del móvil que no usan la animación (sin sonido ni barra de reproducción). */
const FUERA_DEL_SIMULADOR: MobileTab[] = ['quiz', 'respiratorio', 'circulacion', 'congenitas', 'histologia'];

/** Arranca, para o resincroniza el sonido según el estado (no dibuja nada). */
function AudioSync() {
  const audioOn = useSim((s) => s.audioOn);
  const playing = useSim((s) => s.playing);
  const speed = useSim((s) => s.speed);
  const sim = useSim((s) => s.sim);
  const soundId = useSim((s) => s.soundId);
  // Fuera del simulador (congénitas, histología) el sonido se calla
  const enSimulador = useSim((s) => !FUERA_DEL_SIMULADOR.includes(s.mobileTab));
  const seccion = useSim((s) => s.seccion);
  const mobile = useIsMobile();
  const activo = mobile ? enSimulador : seccion === 'simulador';
  useEffect(() => {
    if (activo && audioOn && playing && speed === 1) playLoop(getCycleData(sim, soundId).audio, sim.duration, clock.t);
    else stopAudio();
    return () => stopAudio();
  }, [activo, audioOn, playing, speed, sim, soundId]);
  return null;
}

const SECCIONES: { k: Seccion; label: string; icon: string }[] = [
  { k: 'simulador', label: 'Simulador ECG 3D', icon: '∿' },
  { k: 'quiz', label: 'Adivina el ECG', icon: '?' },
  { k: 'respiratorio', label: 'Respiratorio', icon: '🫁' },
  { k: 'circulacion', label: 'Circulación', icon: '⟳' },
  { k: 'congenitas', label: 'Cardiopatías congénitas', icon: '⧉' },
  { k: 'histologia', label: 'Histología y patología', icon: '◎' },
];

/** Pestañas principales del escritorio, para que la página no sea interminable. */
function SectionNav() {
  const seccion = useSim((s) => s.seccion);
  const setSeccion = useSim((s) => s.setSeccion);
  return (
    <nav className="section-nav" role="tablist" aria-label="Secciones">
      {SECCIONES.map((x) => (
        <button
          key={x.k}
          role="tab"
          aria-selected={seccion === x.k}
          className={`section-tab${seccion === x.k ? ' is-on' : ''}`}
          onClick={() => setSeccion(x.k)}
        >
          <span aria-hidden>{x.icon}</span>
          {x.label}
        </button>
      ))}
    </nav>
  );
}

/** Móvil: pestañas fijas en la barra inferior (las del simulador del corazón)… */
const TABS: { k: MobileTab; label: string; icon: string }[] = [
  { k: '3d', label: 'Corazón', icon: '♥' },
  { k: 'ecg', label: 'ECG', icon: '∿' },
  { k: 'ciclo', label: 'Ciclo', icon: '🩺' },
  { k: 'patologia', label: 'Patología', icon: '☰' },
];
/** …y el resto de secciones, en el menú desplegable «Más». */
const TABS_MAS: { k: MobileTab; label: string; icon: string }[] = [
  { k: 'quiz', label: 'Adivina el ECG', icon: '?' },
  { k: 'respiratorio', label: 'Respiratorio', icon: '🫁' },
  { k: 'circulacion', label: 'Circulación', icon: '⟳' },
  { k: 'congenitas', label: 'Cardiopatías congénitas', icon: '⧉' },
  { k: 'histologia', label: 'Histología y patología', icon: '◎' },
];

/** Barra inferior del móvil con menú desplegable «Más» para no amontonar pestañas. */
function MobileNav({ tab, setTab }: { tab: MobileTab; setTab: (t: MobileTab) => void }) {
  const [abierto, setAbierto] = useState(false);
  const enMas = TABS_MAS.find((t) => t.k === tab);
  const elegir = (t: MobileTab) => {
    setTab(t);
    setAbierto(false);
  };
  return (
    <>
      {abierto && <div className="mas-fondo" onClick={() => setAbierto(false)} aria-hidden />}
      {abierto && (
        <div className="mas-menu" role="menu" aria-label="Más secciones">
          {TABS_MAS.map((t) => (
            <button key={t.k} role="menuitem" className={`mas-item${tab === t.k ? ' is-on' : ''}`} onClick={() => elegir(t.k)}>
              <span aria-hidden>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      )}
      <nav className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.k} role="tab" aria-selected={tab === t.k} className={`tab${tab === t.k ? ' is-on' : ''}`} onClick={() => elegir(t.k)}>
            <span aria-hidden>{t.icon}</span>
            {t.label}
          </button>
        ))}
        <button
          role="tab"
          aria-selected={!!enMas}
          aria-haspopup="menu"
          aria-expanded={abierto}
          className={`tab${enMas ? ' is-on' : ''}`}
          onClick={() => setAbierto((v) => !v)}
        >
          <span aria-hidden>{enMas ? enMas.icon : '⋯'}</span>
          {enMas ? enMas.label.split(' ')[0] : 'Más'} {abierto ? '▾' : '▴'}
        </button>
      </nav>
    </>
  );
}

export default function App() {
  const mobile = useIsMobile();
  const tab = useSim((s) => s.mobileTab);
  const setTab = useSim((s) => s.setMobileTab);
  // Los hooks van antes del `return` del móvil: si no, al cruzar los 900 px React fallaría
  const seccion = useSim((s) => s.seccion);

  useEffect(
    () =>
      startClockLoop(() => {
        const s = useSim.getState();
        // Con el sonido activado, el reloj sigue al audio (sincronía perfecta)
        return { playing: s.playing, speed: s.speed, duration: s.sim.duration, external: s.audioOn ? audioPositionMs() : null };
      }),
    [],
  );

  if (mobile) {
    return (
      <div className="app mobile">
        <AudioSync />
        <Header fc={!FUERA_DEL_SIMULADOR.includes(tab)} />
        <ReviewNotice />
        <MigrationNotice />
        <main className="mobile-main">
          {tab === '3d' && (
            <div className="stack">
              <ScenePanel />
              <VectorSection />
            </div>
          )}
          {tab === 'ecg' && (
            <div className="stack">
              <EcgSection />
              <LeadInfoPanel />
            </div>
          )}
          {tab === 'ciclo' && (
            <div className="stack">
              <WiggersPanel />
              <PvLoopPanel />
              <HeartSoundsPanel />
            </div>
          )}
          {tab === 'congenitas' && (
            <div className="stack">
              <CongenitalPanel />
            </div>
          )}
          {tab === 'quiz' && (
            <div className="stack">
              <QuizPanel />
            </div>
          )}
          {tab === 'respiratorio' && (
            <div className="stack">
              <RespiratoryPanel />
            </div>
          )}
          {tab === 'circulacion' && (
            <div className="stack">
              <CirculationPanel />
            </div>
          )}
          {tab === 'histologia' && (
            <div className="stack">
              <VesselPanel />
            </div>
          )}
          {tab === 'patologia' && (
            <div className="stack">
              <PathologyPanel />
              <Footer />
            </div>
          )}
        </main>
        {!FUERA_DEL_SIMULADOR.includes(tab) && <Controls />}
        <MobileNav tab={tab} setTab={setTab} />
      </div>
    );
  }

  return (
    <div className="app desktop">
      <AudioSync />
      <Header fc={seccion === 'simulador'} />
      <ReviewNotice />
      <MigrationNotice />
      <SectionNav />
      {/* El contenido tiene su propio scroll; la barra de controles queda fija debajo y no tapa nada.
          La key hace que al cambiar de pestaña se vuelva arriba del todo. */}
      <div className="scroll-area" key={seccion}>
        {seccion === 'simulador' && (
          <>
            <main className="desktop-main">
              <div className="left-col">
                <ScenePanel />
                <VectorSection />
              </div>
              <div className="right-col">
                <EcgSection />
                <PathologyPanel />
              </div>
            </main>
            {/* Ciclo cardíaco y ruidos, sincronizados con todo lo anterior */}
            <section className="cycle-row" aria-label="Ciclo cardíaco y ruidos cardíacos">
              <WiggersPanel />
              <HeartSoundsPanel />
            </section>
            {/* Bucle presión-volumen, con el mismo reloj que el Wiggers */}
            <PvLoopPanel />
          </>
        )}
        {seccion === 'quiz' && <QuizPanel />}
        {seccion === 'respiratorio' && <RespiratoryPanel />}
        {seccion === 'circulacion' && <CirculationPanel />}
        {seccion === 'congenitas' && <CongenitalPanel />}
        {seccion === 'histologia' && <VesselPanel />}
        <Footer />
      </div>
      {seccion === 'simulador' && <Controls />}
    </div>
  );
}
