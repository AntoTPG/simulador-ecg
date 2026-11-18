/**
 * ESQUEMA ANATÓMICO de las cuatro cavidades y los grandes vasos (vista frontal:
 * la derecha del paciente a la izquierda del dibujo, como en los libros).
 *
 * Todo se dibuja a partir de los datos de la malformación:
 *  - el color de cavidades y vasos indica la SATURACIÓN de O₂ (azul → rojo);
 *  - el flujo de sangre está animado en el sentido de la circulación;
 *  - los defectos (CIA, CIV, ductus, estenosis, coartación…) se marcan y se
 *    rotulan, con flechas para la dirección de los cortocircuitos.
 */
import type { ReactNode } from 'react';
import type { Congenita, Flujo } from './catalog';

/**
 * Color según la saturación: venosa (≤ 72 %) azul → mezcla (~85 %) morado →
 * arterial (98 %) rojo.
 */
export function satColor(sat: number) {
  const t = Math.max(0, Math.min(1, (sat - 72) / 22));
  const hue = 222 + t * 133; // 222 (azul) → 355 (rojo), pasando por el morado
  return `hsl(${hue % 360} 70% ${50 + 6 * (1 - Math.abs(t - 0.5) * 2)}%)`;
}

// Cavidades (rectángulos) y tabiques
const BOX = {
  AD: { x: 140, y: 175, w: 155, h: 125 },
  AI: { x: 345, y: 175, w: 155, h: 125 },
  VD: { x: 140, y: 310, w: 155, h: 145 },
  VI: { x: 345, y: 310, w: 155, h: 145 },
};
const NAME = { AD: 'Aurícula derecha', AI: 'Aurícula izquierda', VD: 'Ventrículo derecho', VI: 'Ventrículo izquierdo' } as const;

type Key = keyof typeof BOX;

function Vessel({
  d,
  sat,
  w = 20,
  label,
  flow = true,
}: {
  d: string;
  sat: number;
  w?: number;
  label?: string;
  flow?: boolean;
}) {
  const c = satColor(sat);
  return (
    <g>
      {label && <title>{label}</title>}
      <path d={d} className="cg-vessel-edge" strokeWidth={w + 4} />
      <path d={d} stroke={c} strokeWidth={w} className="cg-vessel" />
      {flow && <path d={d} className="cg-flow" strokeWidth={Math.max(2, w * 0.18)} />}
    </g>
  );
}

/** Flecha animada de un cortocircuito. */
function Shunt({ from, to, sat, flujo }: { from: [number, number]; to: [number, number]; sat: number; flujo: Flujo }) {
  const mid = (a: number, b: number) => (a + b) / 2;
  const arrow = (a: [number, number], b: [number, number], key: string, s: number, dy = 0) => (
    <g key={key}>
      <line x1={a[0]} y1={a[1] + dy} x2={b[0]} y2={b[1] + dy} stroke={satColor(s)} className="cg-shunt" markerEnd="url(#cg-arrow)" />
      <line x1={a[0]} y1={a[1] + dy} x2={b[0]} y2={b[1] + dy} className="cg-shunt-flow" />
    </g>
  );
  if (flujo === 'izq-dcha') return arrow(to, from, 'a', sat);
  if (flujo === 'dcha-izq') return arrow(from, to, 'a', sat);
  return (
    <g>
      {arrow(to, from, 'a', 92, -9)}
      {arrow(from, to, 'b', 62, 9)}
      <circle cx={mid(from[0], to[0])} cy={from[1]} r={0} />
    </g>
  );
}

function Tag({ x, y, children, anchor = 'middle' }: { x: number; y: number; children: ReactNode; anchor?: 'start' | 'middle' | 'end' }) {
  return (
    <text x={x} y={y} textAnchor={anchor} className="cg-tag">
      {children}
    </text>
  );
}

export function CongenitalDiagram({ c, showValues }: { c: Congenita; showValues: boolean }) {
  const d = c.defectos;
  const v = c.valores;
  const venous = c.tipo === 'cianogena' ? Math.max(40, v.Ao.sat - 25) : 70;
  const pulmVenous = Math.max(v.AI.sat, d.transposicion ? 92 : 98);
  const dil = new Set(d.dilatadas ?? []);

  // Cavidades (las dilatadas crecen hacia fuera)
  const box = (k: Key) => {
    const b = { ...BOX[k] };
    if (dil.has(k)) {
      const g = 10;
      if (k === 'AD' || k === 'VD') b.x -= g;
      b.w += g;
      if (k === 'AD' || k === 'AI') b.y -= g;
      b.h += g;
    }
    return b;
  };

  // Recorridos de los vasos
  const tga = !!d.transposicion;
  const cavas = 'M 220 530 L 60 530 L 60 238 L 140 238';
  const venasPulm = 'M 420 40 L 580 40 L 580 238 L 500 238';
  const pulmonar = tga ? 'M 500 400 L 545 400 L 545 64 L 420 64' : 'M 140 345 L 108 345 L 108 56 L 220 56';
  const aortaRoot = d.aortaCabalgante ? 'M 320 318 L 320 140 L 530 140 L 530 100' : 'M 500 345 L 530 345 L 530 100';
  const aortaArch = 'M 530 100 L 615 100 L 615 505 L 420 505';
  const aortaTga = 'M 140 400 L 98 400 L 98 505 L 220 505';
  const pw = d.estenosisPulmonar ? 20 * (1 - 0.6 * d.estenosisPulmonar) : 20;

  return (
    <svg viewBox="0 0 640 560" className="cg-svg" role="img" aria-label={`Esquema anatómico: ${c.nombre}`}>
      <defs>
        <marker id="cg-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" className="cg-arrowhead" />
        </marker>
      </defs>

      {/* Pulmones y cuerpo */}
      <rect x="220" y="18" width="200" height="62" rx="18" className="cg-organ lungs" />
      <text x="320" y="54" textAnchor="middle" className="cg-organ-label">
        Pulmones
      </text>
      {d.coartacion ? (
        <>
          <rect x="440" y="58" width="122" height="30" rx="10" className="cg-organ" />
          <text x="501" y="78" textAnchor="middle" className="cg-organ-label small">
            Cabeza y brazos
          </text>
          <rect x="220" y="488" width="200" height="56" rx="18" className="cg-organ" />
          <text x="320" y="521" textAnchor="middle" className="cg-organ-label">
            Abdomen y piernas
          </text>
        </>
      ) : (
        <>
          <rect x="220" y="488" width="200" height="56" rx="18" className="cg-organ" />
          <text x="320" y="521" textAnchor="middle" className="cg-organ-label">
            Cuerpo
          </text>
        </>
      )}

      {/* Vasos (se dibujan antes que el corazón, salvo la aorta cabalgante) */}
      <Vessel d={cavas} sat={venous} label={`Venas cavas · ${venous} %`} />
      <Vessel d={venasPulm} sat={pulmVenous} label={`Venas pulmonares · ${pulmVenous} %`} />
      <Vessel d={pulmonar} sat={v.AP.sat} w={pw} label={`Arteria pulmonar · ${v.AP.sat} % · ${v.AP.pres} mmHg`} />
      {tga ? (
        <Vessel d={aortaTga} sat={v.Ao.sat} w={22} label={`Aorta (sale del VD) · ${v.Ao.sat} %`} />
      ) : (
        <>
          {!d.aortaCabalgante && <Vessel d={aortaRoot} sat={v.Ao.sat} w={22} label={`Aorta · ${v.Ao.sat} %`} />}
          {d.coartacion ? (
            <>
              <Vessel d="M 530 100 L 615 100 L 615 190" sat={v.Ao.sat} w={22} label={`Aorta ascendente · ${v.Ao.pres} mmHg`} />
              <Vessel d="M 548 100 L 548 88" sat={v.Ao.sat} w={12} label="Troncos supraaórticos" />
              <Vessel d="M 615 214 L 615 505 L 420 505" sat={v.Ao.sat} w={22} label={`Aorta descendente · ${v.AoInf?.pres ?? ''} mmHg`} />
              <Vessel d="M 615 190 L 615 214" sat={v.Ao.sat} w={7} flow={false} label="Coartación" />
            </>
          ) : (
            <Vessel d={aortaArch} sat={v.Ao.sat} w={22} />
          )}
        </>
      )}
      {d.ductus && (
        <g>
          <Vessel
            d={d.ductus.flujo === 'dcha-izq' ? 'M 108 120 L 530 120' : 'M 530 120 L 108 120'}
            sat={d.ductus.flujo === 'dcha-izq' ? v.AP.sat : v.Ao.sat}
            w={10}
            label="Ductus arterioso"
          />
          <circle cx="320" cy="120" r="16" className="cg-defect-ring" />
          <Tag x={320} y={108}>
            Ductus arterioso
          </Tag>
        </g>
      )}

      {/* Corazón: contorno muscular y tabiques */}
      <rect x="122" y="160" width="396" height="310" rx="40" className="cg-heart" />
      {(Object.keys(BOX) as Key[]).map((k) => {
        const b = box(k);
        const hyper = (k === 'VD' && d.hvd) || (k === 'VI' && d.hvi);
        const cav = v[k];
        return (
          <g key={k}>
            <title>{`${NAME[k]} · SatO₂ ${cav.sat} % · ${cav.pres} mmHg`}</title>
            <rect
              x={b.x}
              y={b.y}
              width={b.w}
              height={b.h}
              rx="18"
              fill={satColor(cav.sat)}
              className={`cg-chamber${hyper ? ' hyper' : ''}${dil.has(k) ? ' dilated' : ''}`}
            />
            <text x={b.x + b.w / 2} y={b.y + 26} textAnchor="middle" className="cg-chamber-name">
              {k}
            </text>
            {showValues && (
              <>
                <text x={b.x + b.w / 2} y={b.y + 50} textAnchor="middle" className="cg-chamber-val">
                  {cav.sat} %
                </text>
                <text x={b.x + b.w / 2} y={b.y + 70} textAnchor="middle" className="cg-chamber-sub">
                  {cav.pres} mmHg
                </text>
              </>
            )}
            {dil.has(k) && (
              <text x={b.x + b.w / 2} y={b.y + b.h - 12} textAnchor="middle" className="cg-chamber-sub">
                dilatada
              </text>
            )}
            {hyper && (
              <text x={b.x + b.w / 2} y={b.y + b.h - 12} textAnchor="middle" className="cg-chamber-sub">
                hipertrofia
              </text>
            )}
          </g>
        );
      })}
      {/* Tabique interauricular (con o sin CIA) */}
      {d.cia ? (
        <>
          <rect x="296" y="175" width="48" height="45" className="cg-septum" />
          <rect x="296" y="268" width="48" height="32" className="cg-septum" />
          <circle cx="320" cy="244" r="26" className="cg-defect-ring" />
          <Shunt from={[290, 244]} to={[350, 244]} sat={d.cia.flujo === 'dcha-izq' ? v.AD.sat : 98} flujo={d.cia.flujo} />
          <Tag x={320} y={194}>
            CIA
          </Tag>
        </>
      ) : (
        <rect x="296" y="175" width="48" height="125" className="cg-septum" />
      )}
      {/* Tabique interventricular (con o sin CIV) */}
      {d.civ ? (
        <>
          <rect x="296" y="366" width="48" height="89" className="cg-septum" />
          <circle cx="320" cy="340" r="24" className="cg-defect-ring" />
          <Shunt from={[290, 340]} to={[350, 340]} sat={d.civ.flujo === 'dcha-izq' ? v.VD.sat : v.VI.sat} flujo={d.civ.flujo} />
          <Tag x={320} y={392}>
            CIV
          </Tag>
        </>
      ) : (
        <rect x="296" y="310" width="48" height="145" className="cg-septum" />
      )}
      {/* Plano valvular AV */}
      <line x1="150" y1="305" x2="290" y2="305" className="cg-valve" />
      <line x1="350" y1="305" x2="490" y2="305" className="cg-valve" />

      {/* Aorta cabalgante: nace sobre la CIV, por delante de las aurículas */}
      {d.aortaCabalgante && (
        <g>
          <Vessel d={aortaRoot} sat={v.Ao.sat} w={30} label={`Aorta cabalgante · ${v.Ao.sat} %`} />
          <Tag x={360} y={156} anchor="start">
            Aorta cabalgante
          </Tag>
        </g>
      )}
      {/* Estenosis pulmonar */}
      {d.estenosisPulmonar && (
        <g>
          <circle cx={tga ? 545 : 108} cy={tga ? 380 : 330} r="18" className="cg-defect-ring" />
          <Tag x={tga ? 545 : 104} y={tga ? 368 : 296} anchor={tga ? 'middle' : 'middle'}>
            Estenosis
          </Tag>
          <Tag x={104} y={310}>
            pulmonar
          </Tag>
        </g>
      )}
      {/* Coartación */}
      {d.coartacion && (
        <g>
          <circle cx="615" cy="202" r="20" className="cg-defect-ring" />
          <Tag x={600} y={240} anchor="end">
            Coartación
          </Tag>
        </g>
      )}

      {/* Rótulos de los vasos */}
      <Tag x={60} y={555 - 2} anchor="start">
        Cavas · {venous} %
      </Tag>
      <Tag x={580} y={30} anchor="middle">
        V. pulmonares
      </Tag>
      {tga ? (
        <>
          <Tag x={98} y={478} anchor="middle">
            Aorta
          </Tag>
          <Tag x={545} y={92} anchor="middle">
            A. pulmonar
          </Tag>
        </>
      ) : (
        <>
          <Tag x={108} y={160} anchor="middle">
            A. pulmonar
          </Tag>
          <Tag x={615} y={92} anchor="middle">
            Aorta
          </Tag>
        </>
      )}
      {showValues && (
        <>
          <Tag x={tga ? 560 : 92} y={tga ? 250 : 252} anchor={tga ? 'start' : 'end'}>
            {v.AP.sat} % · {v.AP.pres}
          </Tag>
          {tga ? (
            <Tag x={84} y={455} anchor="end">
              {v.Ao.sat} %
            </Tag>
          ) : (
            <Tag x={600} y={300} anchor="end">
              {v.Ao.sat} % · {v.Ao.pres}
            </Tag>
          )}
          {v.AoInf && (
            <Tag x={600} y={420} anchor="end">
              {v.AoInf.pres} mmHg
            </Tag>
          )}
        </>
      )}
    </svg>
  );
}
