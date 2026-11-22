/**
 * Pestaña «Adivina el ECG»: sale un ECG de 12 derivaciones de una patología al
 * azar y hay que elegir el diagnóstico entre cuatro opciones. Al responder se
 * marcan las derivaciones clave y se explica la fisiopatología.
 *
 * El estado (pregunta, marcador, tema) vive en un pequeño almacén propio para
 * no perderse al cambiar de pestaña.
 */
import { useEffect, useMemo } from 'react';
import { create } from 'zustand';
import { defaultParams } from '../engine/params';
import { simulate } from '../engine/simulate';
import { paramsForPathology, resolvePathology } from '../engine/applyPathology';
import { getPathology } from '../pathologies/registry';
import { useSim } from '../store/useSimStore';
import { getEntrada, nuevaPregunta, TEMAS, type Pregunta, type Tema } from './bank';
import { StaticEcg } from './StaticEcg';

interface QuizState {
  tema: Tema;
  pregunta: Pregunta;
  /** Opción elegida (id) o null si aún no se ha respondido. */
  elegida: string | null;
  pista: boolean;
  superponer: boolean;
  aciertos: number;
  total: number;
  racha: number;
  mejorRacha: number;
  responder: (id: string) => void;
  siguiente: () => void;
  setTema: (t: Tema) => void;
  reiniciar: () => void;
  verPista: () => void;
  toggleSuperponer: () => void;
}

export const useQuiz = create<QuizState>()((set, get) => ({
  tema: 'todos',
  pregunta: nuevaPregunta('todos'),
  elegida: null,
  pista: false,
  superponer: false,
  aciertos: 0,
  total: 0,
  racha: 0,
  mejorRacha: 0,
  responder: (id) => {
    const s = get();
    if (s.elegida) return;
    const ok = id === s.pregunta.entrada.id;
    const racha = ok ? s.racha + 1 : 0;
    set({
      elegida: id,
      total: s.total + 1,
      aciertos: s.aciertos + (ok ? 1 : 0),
      racha,
      mejorRacha: Math.max(s.mejorRacha, racha),
    });
  },
  siguiente: () => {
    const s = get();
    set({ pregunta: nuevaPregunta(s.tema, s.pregunta.entrada.id), elegida: null, pista: false, superponer: false });
  },
  setTema: (tema) => set({ tema, pregunta: nuevaPregunta(tema), elegida: null, pista: false, superponer: false }),
  reiniciar: () => set({ aciertos: 0, total: 0, racha: 0, mejorRacha: 0 }),
  verPista: () => set({ pista: true }),
  toggleSuperponer: () => set({ superponer: !get().superponer }),
}));

export function QuizPanel() {
  const q = useQuiz();
  const setPathology = useSim((s) => s.setPathology);
  const setLevel = useSim((s) => s.setLevel);
  const setSeccion = useSim((s) => s.setSeccion);
  const setMobileTab = useSim((s) => s.setMobileTab);

  const { entrada, nivel, fc, opciones } = q.pregunta;
  const p = getPathology(entrada.patologia);
  const { level, afectadas, reciprocas } = resolvePathology(p, nivel);

  // ECG de la pregunta y el normal con la misma frecuencia (para superponerlo)
  const { sim, normal } = useMemo(() => {
    const base = defaultParams({ heartRate: fc });
    const normal = simulate(base);
    return { sim: p.id === 'normal' ? normal : simulate(paramsForPathology(base, p, nivel)), normal };
  }, [p, nivel, fc]);

  const respondida = q.elegida !== null;
  const acierto = q.elegida === entrada.id;
  const marcar = respondida || q.pista;

  // Teclado: 1–4 para responder; Intro o → para la siguiente
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const s = useQuiz.getState();
      const n = Number(e.key);
      if (!s.elegida && n >= 1 && n <= s.pregunta.opciones.length) s.responder(s.pregunta.opciones[n - 1]);
      else if (s.elegida && (e.key === 'Enter' || e.key === 'ArrowRight')) s.siguiente();
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, []);

  const abrirEnSimulador = () => {
    setPathology(p.id);
    setLevel(nivel);
    setSeccion('simulador');
    setMobileTab('ecg');
  };

  const pct = q.total ? Math.round((100 * q.aciertos) / q.total) : 0;

  return (
    <section className="card quiz-card" aria-labelledby="quiz-title">
      <div className="cg-head">
        <h2 id="quiz-title">Adivina el ECG</h2>
        <div className="quiz-score" aria-live="polite">
          <span className="quiz-pill">
            Aciertos <b>{q.aciertos}</b>/{q.total}
            {q.total > 0 && <span className="muted"> · {pct} %</span>}
          </span>
          <span className="quiz-pill">
            Racha <b>{q.racha}</b>
            <span className="muted"> · mejor {q.mejorRacha}</span>
          </span>
          {q.total > 0 && (
            <button className="btn btn-small" onClick={q.reiniciar}>
              Reiniciar
            </button>
          )}
        </div>
      </div>

      <div className="sound-chips quiz-temas" role="radiogroup" aria-label="Tema">
        {TEMAS.map((t) => (
          <button
            key={t.k}
            role="radio"
            aria-checked={q.tema === t.k}
            className={`sound-chip fisiologico${q.tema === t.k ? ' is-on' : ''}`}
            onClick={() => q.setTema(t.k)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="quiz-prompt">
        <b>¿Qué muestra este ECG?</b> <span className="muted small">25 mm/s · 10 mm/mV · la tira inferior es II</span>
      </p>

      <StaticEcg
        sim={sim}
        extra={p.derivacionesExtra}
        compareSim={respondida && q.superponer && p.id !== 'normal' ? normal : null}
        afectadas={marcar ? afectadas : []}
        reciprocas={respondida ? reciprocas : []}
      />

      {q.pista && !respondida && (
        <p className="quiz-hint small">
          💡{' '}
          {afectadas.length
            ? 'Fíjate en las derivaciones marcadas en rojo.'
            : 'Fíjate en el ritmo: en la tira larga de II mira las ondas P, el PR y si los RR son regulares.'}
        </p>
      )}

      <div className="quiz-options">
        {opciones.map((id, i) => {
          const e = getEntrada(id);
          const estado = !respondida ? '' : id === entrada.id ? ' is-ok' : id === q.elegida ? ' is-bad' : ' is-dim';
          return (
            <button key={id} className={`quiz-option${estado}`} disabled={respondida} onClick={() => q.responder(id)}>
              <span className="quiz-key" aria-hidden>
                {i + 1}
              </span>
              {e.respuesta}
            </button>
          );
        })}
      </div>

      <div className="quiz-actions">
        {!respondida && !q.pista && (
          <button className="btn btn-small" onClick={q.verPista}>
            💡 Pista
          </button>
        )}
        {respondida && (
          <button className="btn btn-primary" onClick={q.siguiente}>
            Siguiente ECG →
          </button>
        )}
      </div>

      {respondida && (
        <div className={`quiz-feedback ${acierto ? 'ok' : 'bad'}`}>
          <h3>
            {acierto ? '✔ ¡Correcto!' : '✘ No es eso.'} <span>{entrada.respuesta}</span>
          </h3>
          <p className="small muted">
            En el simulador: <b>{p.nombre}</b>
            {level && (
              <>
                {' '}
                · {level.etiqueta}
                {level.detalle && ` (${level.detalle})`}
              </>
            )}
          </p>
          {(afectadas.length > 0 || reciprocas.length > 0) && (
            <div className="quiz-leads small">
              {afectadas.length > 0 && (
                <span>
                  <i className="chip chip-afectada">rojo</i> derivaciones con el hallazgo: {afectadas.join(', ')}
                </span>
              )}
              {reciprocas.length > 0 && (
                <span>
                  <i className="chip chip-reciproca">azul</i> cambios recíprocos: {reciprocas.join(', ')}
                </span>
              )}
            </div>
          )}
          <ul className="quiz-explain">
            {[...p.explicacion, ...(level?.explicacion ?? [])].map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
          <div className="quiz-actions">
            {p.id !== 'normal' && (
              <label className="switch">
                <input type="checkbox" checked={q.superponer} onChange={q.toggleSuperponer} />
                <span className="switch-track" aria-hidden />
                Superponer el ECG normal
              </label>
            )}
            <button className="btn btn-small" onClick={abrirEnSimulador}>
              ∿ Abrir en el simulador (3D y vector)
            </button>
          </div>
        </div>
      )}
      <p className="small muted quiz-foot">Teclado: 1–4 para responder · Intro para el siguiente.</p>
    </section>
  );
}
