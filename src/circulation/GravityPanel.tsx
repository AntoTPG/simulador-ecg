/**
 * Panel «Gravedad y postura»: presiones arteriales y venosas en distintas
 * alturas del cuerpo, tumbado o de pie; acumulación de sangre en las piernas al
 * levantarse, hipotensión ortostática, barorreflejo y bomba muscular; y la
 * explicación con el principio de Bernoulli.
 */
import { useEffect, useRef, useState } from 'react';
import { hemodinamica, MMHG_POR_CM, presiones, riesgoSincope, type Postura } from './gravity';

const T_MAX = 40;
const Y_CORAZON = 146; // y del corazón en el dibujo (de pie)
/** Altura de cada punto EN EL DIBUJO (de pie); los cálculos usan la altura real en cm. */
const Y_DIBUJO: Record<string, number> = { seno: 44, cerebro: 64, cuello: 86, corazon: Y_CORAZON, mano: 172, pie: 284 };
/** Tumbado: la silueta se gira 90° y queda horizontal, con la cabeza a la izquierda. */
const TUMBADO = 'translate(220 160) rotate(-90) translate(-120 -164)';
const xTumbado = (y: number) => 220 + (y - 164);

export function GravityPanel() {
  const [postura, setPostura] = useState<Postura>('decubito');
  const [caminando, setCaminando] = useState(false);
  const [barorreflejo, setBarorreflejo] = useState(true);
  const [t, setT] = useState(0);
  const tRef = useRef(0);

  // Al ponerse de pie, el tiempo avanza (×4) hasta T_MAX segundos
  useEffect(() => {
    if (postura !== 'pie') {
      tRef.current = 0;
      setT(0);
      return;
    }
    tRef.current = 0;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      tRef.current = Math.min(T_MAX, tRef.current + ((now - last) / 1000) * 4);
      last = now;
      setT(tRef.current);
      if (tRef.current < T_MAX) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [postura, barorreflejo, caminando]);

  const e = { postura, caminando, barorreflejo, t };
  const hd = hemodinamica(e);
  const pts = presiones(e);
  const sincope = riesgoSincope(e);
  const de_pie = postura === 'pie';

  // Serie temporal para la mini‑gráfica (GC y PAM desde que se levanta)
  const serie = Array.from({ length: 81 }, (_, i) => {
    const ti = (i / 80) * T_MAX;
    const h = hemodinamica({ postura: 'pie', caminando, barorreflejo, t: ti });
    return { ti, gc: h.gc, pam: h.pam };
  });
  const gx = (ti: number) => 36 + (ti / T_MAX) * 250;
  const gyPam = (v: number) => 110 - (v / 120) * 95;
  const gyGc = (v: number) => 110 - (v / 6) * 95;

  // Coordenadas del dibujo: de pie (vertical) o tumbado (horizontal)
  const pos = (id: string) => (de_pie ? { x: 120, y: Y_DIBUJO[id] } : { x: xTumbado(Y_DIBUJO[id]), y: 160 });
  const pierna = Math.min(1, hd.acumulado / 0.5);
  const f0 = (x: number | null) => (x === null ? '—' : Math.round(x).toString());

  return (
    <section className="card circ-card" aria-labelledby="grav-title">
      <div className="cg-head">
        <h2 id="grav-title">Gravedad y postura · presiones a lo largo del cuerpo</h2>
        <div className="vs-toggles">
          <div className="seg" role="group" aria-label="Postura">
            <button className={`btn-seg${!de_pie ? ' is-on' : ''}`} onClick={() => setPostura('decubito')}>
              Tumbado
            </button>
            <button className={`btn-seg${de_pie ? ' is-on' : ''}`} onClick={() => setPostura('pie')}>
              De pie
            </button>
          </div>
          <label className="switch">
            <input type="checkbox" checked={caminando} onChange={(ev) => setCaminando(ev.target.checked)} />
            <span className="switch-track" aria-hidden />
            Caminando (bomba muscular)
          </label>
          <label className="switch">
            <input type="checkbox" checked={barorreflejo} onChange={(ev) => setBarorreflejo(ev.target.checked)} />
            <span className="switch-track" aria-hidden />
            Barorreflejo
          </label>
        </div>
      </div>

      <div className="circ-grid">
        <div>
          <svg viewBox="0 0 440 300" className="circ-svg circ-cuerpo" role="img" aria-label="Persona tumbada o de pie con las presiones arteriales y venosas en cada altura">
            {/* Silueta */}
            <g className="circ-body" transform={de_pie ? '' : TUMBADO}>
              <circle cx="120" cy="58" r="20" />
              <rect x="104" y="80" width="32" height="10" rx="4" />
              <rect x="94" y="88" width="52" height="92" rx="16" />
              <rect x="82" y="92" width="12" height="78" rx="6" />
              <rect x="146" y="92" width="12" height="78" rx="6" />
              <rect x="99" y="176" width="18" height="114" rx="8" />
              <rect x="123" y="176" width="18" height="114" rx="8" />
              {/* Venas de las piernas: más azules cuanto más sangre acumulan */}
              <rect x="104" y="186" width="7" height="98" rx="3" fill="#2563eb" opacity={0.25 + 0.6 * pierna} />
              <rect x="129" y="186" width="7" height="98" rx="3" fill="#2563eb" opacity={0.25 + 0.6 * pierna} />
              <circle cx="120" cy={Y_CORAZON - 2} r="7" fill="#e11d48" />
            </g>
            {/* Línea del corazón */}
            {de_pie && <line x1="20" x2="180" y1={Y_CORAZON} y2={Y_CORAZON} className="circ-axis0" strokeDasharray="4 4" />}
            {/* Etiquetas de presión */}
            {pts.map((p) => {
              const c = pos(p.id);
              const lx = 190;
              const ly = c.y;
              return (
                <g key={p.id}>
                  <circle cx={c.x} cy={c.y} r={3.5} fill="#0f172a" />
                  {de_pie && <line x1={c.x + 4} x2={lx - 4} y1={c.y} y2={ly} className="circ-leader" />}
                  {de_pie && (
                    <text x={lx} y={ly + 4} className="circ-ptxt">
                      <tspan fontWeight={700}>{p.nombre}</tspan>
                      {p.arteria && <tspan fill="#e11d48"> · art {f0(p.arterial)}</tspan>}
                      {p.vena && <tspan fill="#2563eb"> · ven {f0(p.venosa)}</tspan>}
                    </text>
                  )}
                </g>
              );
            })}
            {!de_pie && (
              <>
                <text x="220" y="60" textAnchor="middle" className="circ-ptxt">
                  Tumbado, la gravedad apenas influye:
                </text>
                <text x="220" y="78" textAnchor="middle" className="circ-ptxt">
                  PAM ≈ {Math.round(hd.pam)} mmHg en todo el cuerpo · venas periféricas ≈ 7 mmHg
                </text>
              </>
            )}
            {sincope && (
              <text x="220" y="20" textAnchor="middle" className="circ-alerta">
                ⚠ Poco riego cerebral: mareo o síncope
              </text>
            )}
          </svg>
          <p className="small muted resp-foot">Presiones en mmHg (arterial media y venosa). Por cada cm de altura, ±0,77 mmHg ({MMHG_POR_CM.toFixed(2).replace('.', ',')} mmHg/cm).</p>
        </div>

        <div className="circ-side">
          <svg viewBox="0 0 300 130" className="circ-svg circ-mini" role="img" aria-label="Evolución del gasto cardíaco y la presión arterial tras ponerse de pie">
            <line x1="36" x2="286" y1="110" y2="110" className="circ-axis0" />
            {[0, 10, 20, 30, 40].map((s) => (
              <text key={s} x={gx(s)} y="124" textAnchor="middle" className="circ-tick">
                {s}
              </text>
            ))}
            <text x="290" y="124" textAnchor="end" className="circ-tick">
              s
            </text>
            <path d={'M' + serie.map((s) => `${gx(s.ti)},${gyPam(s.pam)}`).join(' L')} stroke="#e11d48" className="circ-curve thin" />
            <path d={'M' + serie.map((s) => `${gx(s.ti)},${gyGc(s.gc)}`).join(' L')} stroke="#059669" className="circ-curve thin" />
            {de_pie && <line x1={gx(t)} x2={gx(t)} y1="12" y2="110" stroke="#f97316" strokeWidth="1.5" />}
            <text x="40" y="14" className="circ-note" fill="#e11d48">
              PAM (mmHg)
            </text>
            <text x="140" y="14" className="circ-note" fill="#059669">
              Gasto cardíaco (L/min)
            </text>
          </svg>
          <div className="pv-metrics">
            <div>
              <span>En las piernas</span>
              <b>{Math.round(hd.acumulado * 1000)}</b> mL
            </div>
            <div>
              <span>PVC</span>
              <b>{hd.pvc.toFixed(1).replace('.', ',')}</b> mmHg
            </div>
            <div>
              <span>Gasto</span>
              <b>{hd.gc.toFixed(1).replace('.', ',')}</b> L/min
            </div>
            <div>
              <span>PAM corazón</span>
              <b>{Math.round(hd.pam)}</b> mmHg
            </div>
            <div>
              <span>Simpático</span>
              <b>{Math.round(hd.simpatico * 100)}</b> %
            </div>
          </div>
          <ul className="quiz-explain">
            <li>
              <b>Al ponerse de pie</b>, la presión de la columna de sangre distiende las venas de las piernas, que acumulan ≈ 500 mL. Baja la PVC, el corazón se llena menos (Starling) y el gasto
              cae de 5 a ≈ 3 L/min: <b>hipotensión ortostática</b>.
            </li>
            <li>
              <b>El barorreflejo</b> lo corrige en segundos: más simpático → venoconstricción, más contractilidad y frecuencia, y vasoconstricción arteriolar. Sin él, el riego cerebral cae y
              aparece el mareo o el síncope.
            </li>
            <li>
              <b>Caminando</b>, la bomba muscular comprime las venas y las válvulas impiden el reflujo: baja la presión venosa del pie (de ≈ 90 a ≈ 25 mmHg) y se acumula menos sangre. Quieto de
              pie, la presión capilar del pie sube y tiende a formarse edema.
            </li>
          </ul>
        </div>
      </div>

      <details className="circ-details">
        <summary>¿Cómo llega la sangre al pie si allí hay más presión? (Bernoulli)</summary>
        <p className="pv-text">
          Lo que mueve la sangre no es solo la presión, sino la <b>energía total</b>: presión + energía potencial (ρ·g·h) + energía cinética (½·ρ·v²). De pie, al bajar hacia el pie la sangre
          pierde altura y esa energía potencial se convierte en presión; la energía total apenas cambia (salvo la que se pierde por rozamiento), así que no hay que «empujar» contra la gravedad: es
          como un sifón. En la tabla, presión arterial + altura (en mmHg) da casi lo mismo en todos los puntos.
        </p>
        <table className="spiro-table circ-tabla">
          <thead>
            <tr>
              <th>Punto (de pie)</th>
              <th>Presión arterial</th>
              <th>+ energía potencial (ρgh)</th>
              <th>= energía total</th>
            </tr>
          </thead>
          <tbody>
            {presiones({ postura: 'pie', caminando: false, barorreflejo: true, t: T_MAX })
              .filter((p) => p.arterial !== null)
              .map((p) => (
                <tr key={p.id}>
                  <td>{p.nombre}</td>
                  <td className="mono">{Math.round(p.arterial!)}</td>
                  <td className="mono">{Math.round(p.h * MMHG_POR_CM)}</td>
                  <td className="mono">{Math.round(p.arterial! + p.h * MMHG_POR_CM)}</td>
                </tr>
              ))}
          </tbody>
        </table>
        <p className="small muted">
          Con un estrechamiento la sangre se acelera y su presión baja (la energía pasa a cinética). Bernoulli no tiene en cuenta la viscosidad: en la microcirculación la presión cae por el
          rozamiento (Poiseuille), no por la velocidad.
        </p>
      </details>
    </section>
  );
}
