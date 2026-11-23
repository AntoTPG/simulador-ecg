/**
 * Pestaña «Respiratorio» — fase 1: mecánica y ciclo respiratorio.
 * Selector de patología, acino 3D, ciclo (volumen, flujo, presiones), curvas
 * presión‑volumen estáticas, medidas y explicación. Todo sale del mismo
 * modelo (`mechanics.ts`) y va con el mismo reloj.
 */
import { useEffect, useMemo, useState } from 'react';
import { AcinusScene } from './AcinusScene';
import { GRUPOS_RESP, getPatologiaResp, PATOLOGIAS_RESP } from './catalog';
import { lungCompliance, RESP_NORMAL, simulateBreathing } from './mechanics';
import { respClock, startRespLoop, useRespPlay } from './respClock';
import { RespCycleChart } from './RespCycleChart';
import { RespPvChart } from './RespPvChart';
import { SpirometryPanel } from './SpirometryPanel';
import { GasPanel } from './GasPanel';

export function RespiratoryPanel() {
  const [id, setId] = useState('normal');
  const [comparar, setComparar] = useState(true);
  const [rotulos, setRotulos] = useState(true);
  const play = useRespPlay();
  const pat = getPatologiaResp(id);
  const esNormal = pat.id === 'normal';

  const cycle = useMemo(() => simulateBreathing(pat.params), [pat]);
  const normalCycle = useMemo(() => simulateBreathing(RESP_NORMAL), []);

  // El reloj respiratorio solo corre mientras la pestaña está abierta
  useEffect(() => startRespLoop(), []);
  // Al cambiar de patología se empieza por el principio de una inspiración
  useEffect(() => {
    respClock.t = 0;
    respClock.emit();
  }, [pat]);

  const p = pat.params;
  const ve = cycle.vt * p.fr;
  const dato = (label: string, val: string, unit: string, title?: string) => (
    <div title={title}>
      <span>{label}</span>
      <b>{val}</b> {unit}
    </div>
  );
  let pplMin = 0;
  for (let i = 0; i < cycle.n; i++) pplMin = Math.min(pplMin, cycle.ppl[i]);

  return (
    <>
    <div className="resp-warning" role="note">
      <span aria-hidden>⚠️</span>
      <span>
        <b>Sección en revisión.</b> La parte de respiratorio es nueva y el autor todavía no la ha revisado a fondo: puede contener imprecisiones. Contrástala con tus
        apuntes y libros.
      </span>
    </div>
    <section className="card resp-card" aria-labelledby="resp-title">
      <div className="cg-head">
        <h2 id="resp-title">Respiratorio · mecánica y ciclo respiratorio</h2>
        <div className="vs-toggles">
          <div className="seg" role="group" aria-label="Velocidad">
            <button className="btn-seg" onClick={play.toggle} aria-label={play.playing ? 'Pausa' : 'Reproducir'}>
              {play.playing ? '❚❚' : '▶'}
            </button>
            {[0.5, 1].map((s) => (
              <button key={s} className={`btn-seg${play.speed === s ? ' is-on' : ''}`} onClick={() => play.setSpeed(s)}>
                {s === 0.5 ? '0,5×' : '1×'}
              </button>
            ))}
          </div>
          {!esNormal && (
            <label className="switch">
              <input type="checkbox" checked={comparar} onChange={(e) => setComparar(e.target.checked)} />
              <span className="switch-track" aria-hidden />
              Comparar con normal
            </label>
          )}
          <label className="switch">
            <input type="checkbox" checked={rotulos} onChange={(e) => setRotulos(e.target.checked)} />
            <span className="switch-track" aria-hidden />
            Rótulos
          </label>
        </div>
      </div>

      <div className="vs-groups">
        {GRUPOS_RESP.map((g) => (
          <div key={g} className="sound-group">
            <div className="sound-group-title">{g}</div>
            <div className="sound-chips">
              {PATOLOGIAS_RESP.filter((x) => x.grupo === g).map((x) => (
                <button
                  key={x.id}
                  className={`sound-chip ${x.grupo === 'Referencia' ? 'fisiologico' : 'patologico'}${x.id === id ? ' is-on' : ''}`}
                  onClick={() => setId(x.id)}
                >
                  {x.nombre}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="resp-grid">
        <div className="resp-3d-col">
          <div className="resp-3d">
            <AcinusScene visual={pat.acino} cycle={cycle} rotulos={rotulos} />
            <div className="resp-where">
              <b>¿Dónde está el problema?</b> {pat.donde}
            </div>
          </div>
          <p className="small muted resp-foot">
            Acino: bronquiolo terminal → bronquiolos respiratorios → sacos alveolares. Esquema no a escala; el movimiento está exagerado para que se vea. Arrastra para girar.
          </p>
        </div>
        <div>
          <RespCycleChart cycle={cycle} normal={!esNormal && comparar ? normalCycle : null} />
        </div>
      </div>

      <div className="resp-grid resp-grid-2">
        <div>
          <h3 className="resp-h3">Curvas presión‑volumen (pulmón y pared torácica)</h3>
          <RespPvChart p={p} cycle={cycle} normal={!esNormal && comparar ? RESP_NORMAL : null} />
          <p className="small muted resp-foot">
            La CRF es el volumen en el que la curva del sistema (verde) cruza el 0: el pulmón tira hacia dentro tanto como la pared hacia fuera.
          </p>
        </div>
        <div className="resp-side">
          <div className="pv-metrics">
            {dato('FR', String(p.fr), 'rpm')}
            {dato('V. corriente', (cycle.vt * 1000).toFixed(0), 'mL')}
            {dato('V. minuto', ve.toFixed(1), 'L/min')}
            {dato('CRF', cycle.frcRelaxed.toFixed(2), 'L', 'Capacidad residual funcional: equilibrio pulmón–pared')}
            {dato('Fin espiración', cycle.eelv.toFixed(2), 'L', 'Volumen real al final de la espiración. Si es mayor que la CRF, hay atrapamiento aéreo')}
            {dato('PEEP intr.', cycle.peepi >= 1 ? cycle.peepi.toFixed(1) : '0', 'cmH₂O', 'Presión que queda en el alvéolo al final de la espiración por atrapamiento aéreo')}
            {dato('C pulmonar', (lungCompliance(p) * 1000).toFixed(0), 'mL/cmH₂O', 'Distensibilidad estática del pulmón a la CRF')}
            {dato('Resistencia', p.rExp.toFixed(0), 'cmH₂O·s/L', 'Resistencia espiratoria de la vía aérea')}
            {dato('Ppl mín.', pplMin.toFixed(1), 'cmH₂O', 'Presión pleural más negativa: refleja el esfuerzo inspiratorio')}
          </div>
          <ul className="quiz-explain">
            {pat.explicacion.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
          <div className="resp-claves">
            {pat.claves.map((c) => (
              <span key={c} className="quiz-pill small">
                {c}
              </span>
            ))}
          </div>
          <p className="sources small muted">
            Fuentes: West JB, Luks AM. <i>Fisiología respiratoria. Fundamentos</i>; West JB. <i>Fisiopatología pulmonar</i>; Manual MSD (versión para profesionales). Modelo simplificado;
            valores orientativos.
          </p>
        </div>
      </div>
    </section>
    <SpirometryPanel />
    <GasPanel />
    </>
  );
}
