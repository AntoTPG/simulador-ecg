import { useEffect, useState } from 'react';
import { EcgPanel } from './ecg/EcgPanel';
import { HeartScene } from './heart3d/HeartScene';
import { startClockLoop } from './store/clock';
import { useSim, type MobileTab } from './store/useSimStore';
import { Controls } from './ui/Controls';
import { EcgHeader } from './ui/EcgHeader';
import { LayersButton, ViewButtons } from './ui/LayerToggles';
import { HeartRateBadge, LeadInfoPanel, PhaseStepper } from './ui/LiveInfo';
import { PathologyPanel } from './ui/PathologyPanel';
import { VectorPlanes } from './ui/VectorPlanes';

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

function Footer() {
  return <footer className="app-footer">Creado por Antonio Requena Quesada con ayuda de Claude Code</footer>;
}

function Header() {
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
          <h1>Simulador ECG 3D</h1>
          <p className="brand-sub">Vector cardíaco · 12 derivaciones</p>
        </div>
      </div>
      <p className="disclaimer" role="note">
        ⚠️ Herramienta <b>educativa y simplificada</b>. No apta para uso clínico ni para diagnóstico.
      </p>
      <div className="header-right">
        <HeartRateBadge />
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

const TABS: { k: MobileTab; label: string; icon: string }[] = [
  { k: '3d', label: 'Corazón', icon: '♥' },
  { k: 'ecg', label: 'ECG', icon: '∿' },
  { k: 'patologia', label: 'Patología', icon: '☰' },
];

export default function App() {
  const mobile = useIsMobile();
  const tab = useSim((s) => s.mobileTab);
  const setTab = useSim((s) => s.setMobileTab);

  useEffect(
    () =>
      startClockLoop(() => {
        const s = useSim.getState();
        return { playing: s.playing, speed: s.speed, duration: s.sim.duration };
      }),
    [],
  );

  if (mobile) {
    return (
      <div className="app mobile">
        <Header />
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
          {tab === 'patologia' && (
            <div className="stack">
              <PathologyPanel />
              <Footer />
            </div>
          )}
        </main>
        <Controls />
        <nav className="tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.k} role="tab" aria-selected={tab === t.k} className={`tab${tab === t.k ? ' is-on' : ''}`} onClick={() => setTab(t.k)}>
              <span aria-hidden>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
      </div>
    );
  }

  return (
    <div className="app desktop">
      <Header />
      {/* El contenido tiene su propio scroll; la barra de controles queda fija debajo y no tapa nada */}
      <div className="scroll-area">
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
        <Footer />
      </div>
      <Controls />
    </div>
  );
}
