/**
 * Pestaña «Circulación»: retorno venoso y gasto cardíaco (Guyton), gravedad y
 * postura, e intercambio capilar (Starling).
 */
import { GravityPanel } from './GravityPanel';
import { GuytonPanel } from './GuytonPanel';
import { StarlingPanel } from './StarlingPanel';

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
