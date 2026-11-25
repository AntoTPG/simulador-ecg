/**
 * Pestaña «Circulación»: retorno venoso y gasto cardíaco (Guyton), gravedad y
 * postura, e intercambio capilar (Starling), con un glosario de abreviaturas.
 */
import { GravityPanel } from './GravityPanel';
import { GuytonPanel } from './GuytonPanel';
import { StarlingPanel } from './StarlingPanel';

/** Abreviaturas que se usan en la sección (y su significado). */
const GLOSARIO: { grupo: string; items: [string, string][] }[] = [
  {
    grupo: 'Corazón y circulación',
    items: [
      ['AD', 'aurícula derecha. Junto con las venas cavas del tórax forma el compartimento venoso central (~100 mL).'],
      ['VD · VI', 'ventrículo derecho · ventrículo izquierdo (la «bomba»).'],
      ['GC', 'gasto cardíaco: sangre que bombea el corazón por minuto (L/min) = volumen sistólico × frecuencia cardíaca.'],
      ['RV', 'retorno venoso: sangre que vuelve a la aurícula derecha por minuto (L/min). En estado estable, RV = GC.'],
      ['PVC', 'presión venosa central = presión en la aurícula derecha = presión de llenado del corazón derecho (precarga). Normal: 0–2 mmHg.'],
      ['Pmll', 'presión media de llenado circulatorio: la presión que habría en todos los vasos con el corazón parado (≈ 7 mmHg). Depende de la volemia y del tono venoso.'],
      ['Pvp', 'presión venosa periférica: la de las venas fuera del tórax; muy parecida a la Pmll.'],
      ['PAM', 'presión arterial media (≈ 93 mmHg en reposo) = GC × RPT + PVC.'],
      ['RPT', 'resistencia periférica total (sobre todo, las arteriolas).'],
      ['R', 'resistencia al retorno venoso: RV = (Pvp − PVC) / R.'],
      ['Pit', 'presión intratorácica: baja en la inspiración y «succiona» sangre hacia el tórax.'],
    ],
  },
  {
    grupo: 'Gravedad',
    items: [['ρ·g·h', 'presión de una columna de sangre: densidad (ρ) × gravedad (g) × altura (h) ≈ 0,77 mmHg por cada cm.']],
  },
  {
    grupo: 'Intercambio capilar (fuerzas de Starling)',
    items: [
      ['Pc', 'presión hidrostática capilar: empuja el líquido hacia fuera (≈ 32 mmHg al inicio y ≈ 15 al final del capilar).'],
      ['Pi', 'presión hidrostática del intersticio (cerca de 0, algo negativa).'],
      ['πc', 'presión oncótica (coloidosmótica) del plasma, por las proteínas (≈ 25 mmHg): retiene el agua dentro.'],
      ['πi', 'presión oncótica del intersticio (baja: hay pocas proteínas fuera).'],
      ['Kf', 'coeficiente de filtración: permeabilidad al agua × superficie de intercambio.'],
      ['σ', 'coeficiente de reflexión: cuánto «rebotan» las proteínas en la pared (1 = no pasan).'],
      ['PNF', 'presión neta de filtración = (Pc − Pi) − σ·(πc − πi). Positiva: sale líquido; negativa: entra.'],
    ],
  },
];

export function CirculationPanel() {
  return (
    <>
      <div className="resp-warning" role="note">
        <span aria-hidden>⚠️</span>
        <span>
          <b>Sección nueva, en revisión.</b> Modelos simplificados y valores orientativos, pensados para entender las relaciones entre presión, volumen y flujo. Contrástalo con tus apuntes y
          libros.
        </span>
      </div>
      <details className="card circ-glosario">
        <summary>📖 Abreviaturas de esta sección</summary>
        <div className="circ-glosario-grid">
          {GLOSARIO.map((g) => (
            <div key={g.grupo}>
              <h3 className="resp-h3">{g.grupo}</h3>
              <dl>
                {g.items.map(([abr, def]) => (
                  <div key={abr} className="circ-glosario-item">
                    <dt>{abr}</dt>
                    <dd>{def}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </details>
      <GuytonPanel />
      <GravityPanel />
      <StarlingPanel />
      <p className="sources small muted circ-fuentes">
        Fuentes: Hall JE, Hall ME. <i>Guyton y Hall. Tratado de fisiología médica</i> (gasto cardíaco, retorno venoso y su regulación; la microcirculación y el sistema linfático); Herring N,
        Paterson DJ. <i>Levick&apos;s Introduction to Cardiovascular Physiology</i>. Modelos y textos de elaboración propia, simplificados.
      </p>
    </>
  );
}
