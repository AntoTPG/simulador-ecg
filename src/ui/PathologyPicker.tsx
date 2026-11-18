/**
 * Selector de patologías: un desplegable con buscador y las patologías
 * agrupadas por categoría. Teclado: ↑/↓ para moverse, Enter para elegir, Esc para cerrar.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { getPathology, PATHOLOGIES } from '../pathologies/registry';
import { CATEGORIES } from '../pathologies/schema';
import { useSim } from '../store/useSimStore';

const CATEGORY_ICON: Record<string, string> = {
  Referencia: '✓',
  'Isquemia e infarto': '⚡',
  'Alteraciones electrolíticas': 'K⁺',
  'Trastornos de la conducción': '⇢',
  Hipertrofia: '▲',
  Arritmias: '∿',
  Otras: '•',
};

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function PathologyPicker() {
  const id = useSim((s) => s.pathologyId);
  const setPathology = useSim((s) => s.setPathology);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const current = getPathology(id);

  const filtered = useMemo(() => {
    const nq = norm(q.trim());
    return PATHOLOGIES.filter((p) => !nq || norm(`${p.nombre} ${p.categoria}`).includes(nq));
  }, [q]);
  const groups = CATEGORIES.map((c) => ({ c, items: filtered.filter((p) => p.categoria === c) })).filter((g) => g.items.length);

  useEffect(() => {
    if (!open) return;
    setActive(Math.max(0, filtered.findIndex((p) => p.id === id)));
    setTimeout(() => inputRef.current?.focus(), 0);
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const choose = (pid: string) => {
    setPathology(pid);
    setOpen(false);
    setQ('');
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false);
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(filtered.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter' && filtered[active]) choose(filtered[active].id);
  };

  return (
    <div className="picker" ref={rootRef} onKeyDown={onKey}>
      <button className="picker-btn" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}>
        <span className="picker-icon" aria-hidden>
          {CATEGORY_ICON[current.categoria]}
        </span>
        <span className="picker-text">
          <span className="picker-cat">{current.categoria}</span>
          <span className="picker-name">{current.nombre}</span>
        </span>
        <span className="picker-caret" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className="picker-pop" role="listbox" aria-label="Patologías">
          <input
            ref={inputRef}
            className="picker-search"
            placeholder="Buscar patología…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
          />
          <div className="picker-list">
            {groups.map((g) => (
              <div key={g.c} className="picker-group">
                <div className="picker-group-title">
                  <span aria-hidden>{CATEGORY_ICON[g.c]}</span> {g.c}
                </div>
                {g.items.map((p) => {
                  const idx = filtered.indexOf(p);
                  return (
                    <button
                      key={p.id}
                      role="option"
                      aria-selected={p.id === id}
                      className={`picker-opt${idx === active ? ' is-active' : ''}${p.id === id ? ' is-current' : ''}`}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => choose(p.id)}
                    >
                      {p.nombre}
                      {p.control && <span className="picker-badge">{p.control.niveles.length} {p.control.tipo === 'fase' ? 'fases' : 'niveles'}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
            {!filtered.length && <p className="muted picker-empty">Sin resultados.</p>}
            <div className="picker-group soon">
              <div className="picker-group-title">Próximamente (fase 3)</div>
              <p className="muted small">
                Pericarditis, miocarditis, calcio, bloqueos de rama y hemibloqueos, HVI, WPW, bloqueos AV, FA, flúter, TEP, Brugada, QT largo y
                efecto digitálico.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
