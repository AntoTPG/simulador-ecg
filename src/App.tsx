import { useEffect, useState } from 'react';
import { EcgPanel } from './ecg/EcgPanel';
import { HeartScene } from './heart3d/HeartScene';
import { startClockLoop } from './store/clock';
import { useSim, type MobileTab } from './store/useSimStore';
import { Controls } from './ui/Controls';
import { EcgHeader } from './ui/EcgHeader';
import { LayerToggles, ViewButtons } from './ui/LayerToggles';
import { LeadInfoPanel, PhaseBadge } from './ui/LiveInfo';
import { PathologyPanel } from './ui/PathologyPanel';

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

function Disclaimer() {
  return (
    <p className="disclaimer" role="note">
      ⚠️ Herramienta <b>educativa y simplificada</b>. No apta para uso clínico ni para diagnóstico.
    </p>
  );
}

function Footer() {
  return <footer className="app-footer">Creado por Antonio Requena Quesada con ayuda de Claude Code</footer>;
}

function Header() {
  const theme = useSim((s) => s.theme);
  const toggleTheme = useSim((s) => s.toggleTheme);
  return (
    <header className="app-header">
      <h1>
        <span className="logo" aria-hidden>
          ♥
        </span>{' '}
        Simulador ECG 3D
      </h1>
      <Disclaimer />
      <button className="btn btn-small" onClick={toggleTheme} aria-label="Cambiar tema">
        {theme === 'claro' ? '☾ Oscuro' : '☀ Claro'}
      </button>
    </header>
  );
}

function ScenePanel() {
  return (
    <section className="panel scene-panel" aria-label="Corazón 3D y vector cardíaco">
      <HeartScene />
      <ViewButtons />
      <PhaseBadge />
      <LeadInfoPanel />
    </section>
  );
}

function EcgSection() {
  return (
    <section className="panel ecg-panel" aria-label="ECG de 12 derivaciones">
      <EcgHeader />
      <EcgPanel />
    </section>
  );
}

const TABS: { k: MobileTab; label: string }[] = [
  { k: '3d', label: 'Corazón 3D' },
  { k: 'ecg', label: 'ECG' },
  { k: 'patologia', label: 'Patología' },
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
        <nav className="tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.k} role="tab" aria-selected={tab === t.k} className={`tab${tab === t.k ? ' is-on' : ''}`} onClick={() => setTab(t.k)}>
              {t.label}
            </button>
          ))}
        </nav>
        <main className="mobile-main">
          {tab === '3d' && <ScenePanel />}
          {tab === 'ecg' && <EcgSection />}
          {tab === 'patologia' && (
            <div className="stack">
              <PathologyPanel />
              <LayerToggles />
              <Footer />
            </div>
          )}
        </main>
        <Controls />
      </div>
    );
  }

  return (
    <div className="app desktop">
      <Header />
      <main className="desktop-main">
        <ScenePanel />
        <div className="right-col">
          <EcgSection />
          <PathologyPanel />
        </div>
      </main>
      <Controls />
      <LayerToggles />
      <Footer />
    </div>
  );
}
