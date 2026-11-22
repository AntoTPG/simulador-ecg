/**
 * CORTE TRANSVERSAL DE UNA ARTERIA (esquema estilizado tipo hematoxilina‑eosina).
 *
 * Geometría en coordenadas polares alrededor del centro: cada capa es un anillo
 * entre dos «radios» que pueden variar con el ángulo θ. Así se dibujan placas
 * excéntricas, la falsa luz de una disección o un microaneurisma segmentario.
 *
 * De dentro afuera: luz → íntima (endotelio + capa subendotelial) → lámina
 * elástica interna → media → lámina elástica externa → adventicia.
 */
import type { ReactNode } from 'react';
import type { Rasgos, TipoVaso } from './catalog';

const CX = 190;
const CY = 200;
const TAU = Math.PI * 2;
const N = 220; // puntos por contorno

/** Medidas base (en unidades del dibujo; no a escala real). */
const GEO: Record<TipoVaso, { lumen: number; intima: number; media: number; adv: number; laminas: number }> = {
  muscular: { lumen: 62, intima: 7, media: 46, adv: 40, laminas: 0 },
  elastica: { lumen: 70, intima: 8, media: 42, adv: 20, laminas: 8 },
  arteriola: { lumen: 54, intima: 6, media: 26, adv: 34, laminas: 0 },
};

const C = {
  lumen: '#fbecec',
  rbc: '#d9485a',
  intima: '#f4c4d0',
  endo: '#5d3a8f',
  elastic: '#7a2a69',
  media: '#e892ab',
  nucleo: '#5b3a8c',
  adv: '#f4dccd',
  fibra: '#d6a49c',
  foam: '#fff4da',
  lipid: '#f1cf63',
  cap: '#eaa9bb',
  calcio: '#8f86c6',
  trombo: '#8c1b2c',
  fibrina: '#f0a9b3',
  hialina: '#f6b9d0',
  fibrinoide: '#d43c90',
  linfo: '#3f2a7a',
  mucoide: '#cde2f3',
  cicatriz: '#f7e8ec',
  sangre: '#b8243c',
};

/** Generador pseudoaleatorio con semilla: el dibujo es siempre igual. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Diferencia angular en (−π, π]. */
const dAng = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
/** Campana suave centrada en c con anchura total w (radianes). */
const bump = (t: number, c: number, w: number) => {
  const d = dAng(t, c);
  return Math.abs(d) >= w / 2 ? 0 : Math.cos((Math.PI * d) / w) ** 2;
};
const P = (r: number, t: number): [number, number] => [CX + r * Math.cos(t), CY + r * Math.sin(t)];

type RF = (t: number) => number;

function contour(r: RF, t0 = 0, t1 = TAU, n = N) {
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) {
    const t = t0 + ((t1 - t0) * i) / n;
    const [x, y] = P(r(t), t);
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts;
}
/** Anillo (o sector de anillo) entre dos radios variables. */
function ring(rIn: RF, rOut: RF, t0 = 0, t1 = TAU) {
  const full = t1 - t0 >= TAU - 1e-6;
  const outer = contour(rOut, t0, t1);
  const inner = contour(rIn, t0, t1).reverse();
  if (full) return `M${outer.join('L')}Z M${inner.join('L')}Z`;
  return `M${outer.join('L')}L${inner.join('L')}Z`;
}
const closed = (r: RF) => `M${contour(r).join('L')}Z`;

export interface Etiqueta {
  texto: string;
  /** Punto del dibujo al que apunta. */
  x: number;
  y: number;
}

export interface VesselProps {
  vaso: TipoVaso;
  rasgos: Rasgos;
  seed?: number;
  rotulos?: boolean;
  titulo?: string;
}

export function VesselSvg({ vaso, rasgos: R, seed = 7, rotulos = true, titulo }: VesselProps) {
  const g = GEO[vaso];
  const rand = rng(seed);
  const els: ReactNode[] = [];
  const etiquetas: Etiqueta[] = [];
  const vasaBase: Etiqueta[] = []; // rótulo anatómico normal (no patológico)
  let k = 0;
  const key = () => `e${k++}`;

  // ---------- Radios base, modificados por la patología ----------
  let lumen0 = g.lumen;
  let mediaW = g.media;
  let intima0 = g.intima;
  let adv = g.adv;
  if (R.hipertrofiaMedia) {
    lumen0 *= 0.8;
    mediaW *= R.hipertrofiaMedia;
  }
  if (R.aneurisma) {
    lumen0 *= 1.6;
    mediaW *= 0.42;
  }
  const RIEL = lumen0 + intima0; // lámina elástica interna (radio de referencia)
  if (R.intimaEngrosada) intima0 += R.intimaEngrosada * lumen0 * 0.5;
  if (R.hialina) intima0 += R.hialina * lumen0 * 0.55;
  if (R.hiperplasica) intima0 += lumen0 * 0.72;

  // Placa de ateroma (excéntrica, arriba a la derecha)
  const placa = R.placa;
  const TH0 = -0.9;
  const arcoPlaca = placa ? (placa.fase === 'estria' ? 1.2 : 2.7) : 0;
  const Pmax = placa ? Math.max(4, placa.estenosis * lumen0 * 1.25) : 0;
  const avanzada = !!placa && placa.fase !== 'estria';
  const Pf: RF = (t) => (placa ? Pmax * bump(t, TH0, arcoPlaca) : 0);
  // La placa avanzada «come» parte de la media (se adelgaza bajo ella)
  const thin: RF = (t) => (avanzada ? mediaW * 0.38 * bump(t, TH0, arcoPlaca) : 0);

  // Disección: falsa luz en la media (arco de ~220°, a la izquierda)
  const THD = Math.PI * 0.95;
  const FL = R.diseccion ? 30 : 0;
  const push: RF = (t) => (R.diseccion ? FL * bump(t, THD, 3.8) : 0);

  // PAN: microaneurisma segmentario (abajo a la derecha)
  const THP = 0.75;
  const bulge: RF = (t) => (R.necrosisFibrinoide === 'segmentaria' ? 18 * bump(t, THP, 1.3) : 0);

  // Íntima en corteza de árbol (sífilis)
  const wrinkle: RF = (t) => (R.cortezaArbol ? 2.6 * Math.sin(23 * t) + 1.6 * Math.sin(41 * t + 1) : 0);

  const rIEL: RF = (t) => RIEL + thin(t) - 0.75 * push(t);
  const rLum: RF = (t) => Math.max(6, RIEL - intima0 - Pf(t) - 0.75 * push(t) + wrinkle(t));
  // Luz residual: el trombo de una placa complicada ocupa casi toda la luz
  const rRes: RF = (t) =>
    placa?.fase === 'complicada' ? Math.max(5, rLum(t) - (rLum(t) - 8) * 0.82 * bump(t, TH0 + 0.5, 4.6)) : rLum(t);
  const rEEL: RF = (t) => RIEL + mediaW + bulge(t);
  const rADV: RF = (t) => RIEL + mediaW + adv + bulge(t) * 1.2;

  // ---------- ADVENTICIA ----------
  els.push(<path key={key()} d={ring(rEEL, rADV)} fill={C.adv} fillRule="evenodd" />);
  // fibras de colágeno onduladas
  for (let i = 0; i < 34; i++) {
    const t = (i / 34) * TAU + rand() * 0.1;
    const r0 = rEEL(t) + 4 + rand() * (adv - 8);
    const len = 0.18 + rand() * 0.2;
    const pts = Array.from({ length: 7 }, (_, j) => {
      const tt = t + (len * j) / 6;
      const [x, y] = P(r0 + 2 * Math.sin(j * 1.7), tt);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    els.push(<polyline key={key()} points={pts.join(' ')} fill="none" stroke={C.fibra} strokeWidth={1.2} />);
  }
  // núcleos de fibroblastos
  for (let i = 0; i < 26; i++) {
    const t = rand() * TAU;
    const [x, y] = P(rEEL(t) + 3 + rand() * (adv - 6), t);
    els.push(
      <ellipse key={key()} cx={x} cy={y} rx={3.2} ry={1.2} fill={C.nucleo} opacity={0.75} transform={`rotate(${((t * 180) / Math.PI + 90).toFixed(0)} ${x} ${y})`} />,
    );
  }
  // vasa vasorum (en aorta y arterias musculares grandes)
  const vasaN = vaso === 'arteriola' ? 0 : vaso === 'elastica' ? 6 : 4;
  for (let i = 0; i < vasaN; i++) {
    const t = (i / vasaN) * TAU + 0.4;
    const [x, y] = P((rEEL(t) + rADV(t)) / 2, t);
    const pared = R.endarteritisVasa ? 4.2 : 1.4;
    const luz = R.endarteritisVasa ? 1.2 : 3.4;
    if (R.endarteritisVasa) {
      // manguito de células plasmáticas y linfocitos
      for (let j = 0; j < 14; j++) {
        const a = rand() * TAU;
        const rr = 7 + rand() * 5;
        els.push(<circle key={key()} cx={x + rr * Math.cos(a)} cy={y + rr * Math.sin(a)} r={1.3} fill={C.linfo} />);
      }
    }
    els.push(<circle key={key()} cx={x} cy={y} r={luz + pared} fill={C.media} stroke={C.elastic} strokeWidth={0.6} />);
    els.push(<circle key={key()} cx={x} cy={y} r={luz} fill={C.rbc} opacity={0.85} />);
    if (i === 0) (R.endarteritisVasa ? etiquetas : vasaBase).push({ texto: R.endarteritisVasa ? 'Vasa vasorum obliterados' : 'Vasa vasorum', x, y });
  }

  // ---------- MEDIA ----------
  els.push(<path key={key()} d={ring(rIEL, rEEL)} fill={R.hialina ? C.hialina : C.media} fillRule="evenodd" />);
  if (vaso === 'elastica') {
    // láminas elásticas concéntricas (fragmentadas en el aneurisma)
    for (let j = 1; j <= g.laminas; j++) {
      const f = j / (g.laminas + 1);
      const rl: RF = (t) => rIEL(t) + (rEEL(t) - rIEL(t)) * f + 1.1 * Math.sin(18 * t + j);
      els.push(
        <path
          key={key()}
          d={`M${contour(rl).join('L')}`}
          fill="none"
          stroke={C.elastic}
          strokeWidth={1.1}
          strokeDasharray={R.aneurisma ? '9 7' : R.endarteritisVasa ? '22 6' : undefined}
          opacity={0.75}
        />,
      );
    }
  }
  // núcleos de músculo liso, alargados y circunferenciales
  const nNuc = Math.round((R.hialina ? 0.25 : 1) * (vaso === 'arteriola' ? 60 : 130) * (R.hipertrofiaMedia ?? 1));
  for (let i = 0; i < nNuc; i++) {
    const t = rand() * TAU;
    const a = rIEL(t) + 3;
    const b = rEEL(t) - 3;
    if (b <= a) continue;
    const [x, y] = P(a + rand() * (b - a), t);
    els.push(
      <ellipse key={key()} cx={x} cy={y} rx={4} ry={1.1} fill={C.nucleo} opacity={0.8} transform={`rotate(${((t * 180) / Math.PI + 90).toFixed(0)} ${x} ${y})`} />,
    );
  }
  // Calcificación de la media (Mönckeberg)
  if (R.calcioMedia) {
    for (let ring2 = 0; ring2 < 2; ring2++) {
      const f = 0.35 + 0.3 * ring2;
      for (let i = 0; i < 70; i++) {
        const t = (i / 70) * TAU + rand() * 0.05;
        if (Math.sin(3 * t + ring2 * 2) < -0.6) continue; // anillos incompletos
        const [x, y] = P(rIEL(t) + (rEEL(t) - rIEL(t)) * f + (rand() - 0.5) * 6, t);
        els.push(<circle key={key()} cx={x} cy={y} r={1.8 + rand() * 2.4} fill={C.calcio} stroke="#4b3f86" strokeWidth={0.5} />);
      }
    }
    const [x, y] = P((rIEL(0.2) + rEEL(0.2)) / 2, 0.2);
    etiquetas.push({ texto: 'Calcio en la media', x, y });
  }
  // Degeneración mucoide (quística)
  if (R.degeneracionMucoide) {
    for (let i = 0; i < 9; i++) {
      const t = rand() * TAU;
      const [x, y] = P(rIEL(t) + (rEEL(t) - rIEL(t)) * (0.55 + rand() * 0.3), t);
      els.push(<ellipse key={key()} cx={x} cy={y} rx={6 + rand() * 4} ry={3 + rand() * 2} fill={C.mucoide} opacity={0.9} transform={`rotate(${((t * 180) / Math.PI + 90).toFixed(0)} ${x} ${y})`} />);
    }
  }
  // Cicatrices de la media (sífilis)
  if (R.endarteritisVasa) {
    for (let i = 0; i < 5; i++) {
      const t0 = rand() * TAU;
      els.push(
        <path key={key()} d={ring((t) => rIEL(t) + (rEEL(t) - rIEL(t)) * 0.45, (t) => rEEL(t) - 1, t0, t0 + 0.35)} fill={C.cicatriz} opacity={0.95} />,
      );
    }
    const [x, y] = P((rIEL(-0.3) + rEEL(-0.3)) / 2 + 8, -0.3);
    etiquetas.push({ texto: 'Cicatrices en la media', x, y });
  }

  // ---------- LÁMINAS ELÁSTICAS ----------
  els.push(
    <path key={key()} d={closed((t) => rEEL(t) + 0.8 * Math.sin(30 * t))} fill="none" stroke={C.elastic} strokeWidth={1.6} opacity={0.85} />,
  );
  els.push(
    <path
      key={key()}
      d={closed((t) => rIEL(t) + 1.8 * Math.sin(36 * t))}
      fill="none"
      stroke={C.elastic}
      strokeWidth={R.hialina ? 1.4 : 2.6}
      strokeDasharray={R.granulomas ? '16 9' : undefined}
    />,
  );

  // ---------- ÍNTIMA ----------
  const intimaFill = R.hialina ? C.hialina : C.intima;
  els.push(<path key={key()} d={ring(rLum, rIEL)} fill={intimaFill} fillRule="evenodd" />);
  // Hiperplásica: capas concéntricas «en bulbo de cebolla»
  if (R.hiperplasica) {
    for (let j = 1; j <= 6; j++) {
      const rl: RF = (t) => rLum(t) + (rIEL(t) - rLum(t)) * (j / 7);
      els.push(<path key={key()} d={closed(rl)} fill="none" stroke={C.nucleo} strokeWidth={0.9} opacity={0.55} />);
      for (let i = 0; i < 22; i++) {
        const t = (i / 22) * TAU + j * 0.3;
        const [x, y] = P(rl(t), t);
        els.push(<ellipse key={key()} cx={x} cy={y} rx={3} ry={1} fill={C.nucleo} transform={`rotate(${((t * 180) / Math.PI + 90).toFixed(0)} ${x} ${y})`} />);
      }
    }
    const [x, y] = P((rLum(-0.5) + rIEL(-0.5)) / 2, -0.5);
    etiquetas.push({ texto: '«Bulbo de cebolla»', x, y });
  }
  if (R.hialina) {
    const [x, y] = P((rLum(-0.4) + rEEL(-0.4)) / 2, -0.4);
    etiquetas.push({ texto: 'Pared hialina', x, y });
  }
  if (R.intimaEngrosada && R.intimaEngrosada > 0.3) {
    const [x, y] = P((rLum(-1.9) + rIEL(-1.9)) / 2, -1.9);
    etiquetas.push({ texto: 'Íntima engrosada', x, y });
  }

  // ---------- PLACA DE ATEROMA ----------
  if (placa) {
    const t0 = TH0 - arcoPlaca / 2;
    const t1 = TH0 + arcoPlaca / 2;
    if (placa.fase === 'estria') {
      for (let i = 0; i < 16; i++) {
        const t = t0 + 0.12 + ((t1 - t0 - 0.24) * i) / 15;
        const [x, y] = P(rLum(t) + (rIEL(t) - rLum(t)) * 0.5, t);
        els.push(<circle key={key()} cx={x} cy={y} r={2.6} fill={C.foam} stroke="#c9a86a" strokeWidth={0.5} />);
      }
      const [x, y] = P(rLum(TH0) + 3, TH0);
      etiquetas.push({ texto: 'Células espumosas', x, y });
    } else {
      const cap: RF = (t) => Math.max(3, 0.3 * (rIEL(t) - rLum(t)));
      const coreIn: RF = (t) => rLum(t) + cap(t);
      const coreOut: RF = (t) => rIEL(t) - 3;
      const ct0 = TH0 - arcoPlaca * 0.3;
      const ct1 = TH0 + arcoPlaca * 0.3;
      // núcleo lipídico necrótico
      els.push(<path key={key()} d={ring(coreIn, coreOut, ct0, ct1)} fill={C.lipid} />);
      // cristales de colesterol (hendiduras)
      for (let i = 0; i < 14; i++) {
        const t = ct0 + rand() * (ct1 - ct0);
        const r = coreIn(t) + rand() * (coreOut(t) - coreIn(t));
        const [x, y] = P(r, t);
        const ang = rand() * 180;
        els.push(<line key={key()} x1={x - 5} y1={y} x2={x + 5} y2={y} stroke="#fffbe8" strokeWidth={1.4} transform={`rotate(${ang.toFixed(0)} ${x} ${y})`} />);
      }
      // cápsula fibrosa
      els.push(<path key={key()} d={ring(rLum, coreIn, ct0 - 0.05, ct1 + 0.05)} fill={C.cap} />);
      // células espumosas en los «hombros» de la placa
      for (const sh of [ct0, ct1]) {
        for (let i = 0; i < 5; i++) {
          const t = sh + (rand() - 0.5) * 0.25;
          const [x, y] = P(rLum(t) + (rIEL(t) - rLum(t)) * (0.3 + rand() * 0.4), t);
          els.push(<circle key={key()} cx={x} cy={y} r={2.4} fill={C.foam} stroke="#c9a86a" strokeWidth={0.5} />);
        }
      }
      // calcio
      if (placa.fase === 'calcificada' || placa.fase === 'complicada') {
        for (let i = 0; i < 18; i++) {
          const t = ct0 + rand() * (ct1 - ct0);
          const [x, y] = P(coreIn(t) + (coreOut(t) - coreIn(t)) * (0.4 + rand() * 0.55), t);
          els.push(<circle key={key()} cx={x} cy={y} r={2 + rand() * 3.2} fill={C.calcio} stroke="#4b3f86" strokeWidth={0.5} />);
        }
      }
      const [lx, ly] = P((coreIn(TH0) + coreOut(TH0)) / 2, TH0);
      etiquetas.push({ texto: 'Núcleo lipídico necrótico', x: lx, y: ly });
      const [cx, cy] = P((rLum(TH0 - 0.5) + coreIn(TH0 - 0.5)) / 2, TH0 - 0.5);
      etiquetas.push({ texto: placa.fase === 'complicada' ? 'Cápsula fibrosa rota' : 'Cápsula fibrosa', x: cx, y: cy });
      if (placa.fase === 'calcificada') etiquetas.push({ texto: 'Calcio', x: lx + 6, y: ly + 8 });
    }
  }

  // ---------- NECROSIS FIBRINOIDE ----------
  if (R.necrosisFibrinoide === 'segmentaria') {
    els.push(<path key={key()} d={ring((t) => rLum(t) - 1, (t) => rEEL(t) + adv * 0.4, THP - 0.55, THP + 0.55)} fill={C.fibrinoide} opacity={0.78} />);
    for (let i = 0; i < 70; i++) {
      const t = THP + (rand() - 0.5) * 1.5;
      const [x, y] = P(rLum(t) + rand() * (rADV(t) - rLum(t)), t);
      els.push(<circle key={key()} cx={x} cy={y} r={1.2} fill={C.linfo} />);
    }
    const [x, y] = P((rIEL(THP) + rEEL(THP)) / 2, THP);
    etiquetas.push({ texto: 'Necrosis fibrinoide', x, y });
  }
  if (R.necrosisFibrinoide === 'circunferencial') {
    els.push(<path key={key()} d={ring((t) => rIEL(t) + 1, (t) => rIEL(t) + mediaW * 0.5)} fill={C.fibrinoide} opacity={0.55} fillRule="evenodd" />);
    const [x, y] = P(rIEL(0.6) + mediaW * 0.25, 0.6);
    etiquetas.push({ texto: 'Necrosis fibrinoide', x, y });
  }

  // ---------- GRANULOMAS (células gigantes) ----------
  if (R.granulomas) {
    for (let i = 0; i < 5; i++) {
      const t = (i / 5) * TAU + 0.5;
      const [x, y] = P(rIEL(t) + 9, t);
      for (let j = 0; j < 18; j++) {
        const a = rand() * TAU;
        const rr = 6 + rand() * 9;
        els.push(<circle key={key()} cx={x + rr * Math.cos(a)} cy={y + rr * Math.sin(a)} r={1.3} fill={C.linfo} />);
      }
      els.push(<ellipse key={key()} cx={x} cy={y} rx={8} ry={6} fill="#f3a9c4" stroke="#b85e8b" strokeWidth={0.6} />);
      for (let j = 0; j < 7; j++) {
        const a = (j / 7) * TAU;
        els.push(<circle key={key()} cx={x + 5.5 * Math.cos(a)} cy={y + 3.8 * Math.sin(a)} r={1.3} fill={C.nucleo} />);
      }
      if (i === 0) etiquetas.push({ texto: 'Granuloma (cél. gigante)', x, y });
    }
    const [x, y] = P(rIEL(2.3), 2.3);
    etiquetas.push({ texto: 'Lámina elástica rota', x, y });
  }

  // ---------- INFLAMACIÓN difusa ----------
  for (const capa of R.inflamacion ?? []) {
    if (capa === 'media' && R.granulomas) continue;
    const lim: [RF, RF] = capa === 'intima' ? [rLum, rIEL] : capa === 'media' ? [rIEL, rEEL] : [rEEL, rADV];
    for (let i = 0; i < 40; i++) {
      const t = rand() * TAU;
      const [x, y] = P(lim[0](t) + rand() * (lim[1](t) - lim[0](t)), t);
      els.push(<circle key={key()} cx={x} cy={y} r={1.2} fill={C.linfo} opacity={0.85} />);
    }
  }

  // ---------- DISECCIÓN: falsa luz ----------
  if (R.diseccion) {
    const fa: RF = (t) => RIEL + mediaW * 0.35 - 0.75 * push(t);
    const fb: RF = (t) => RIEL + mediaW * 0.35 + 0.25 * push(t);
    els.push(<path key={key()} d={ring(fa, fb, THD - 1.9, THD + 1.9)} fill={C.sangre} />);
    // puerta de entrada: desgarro de la íntima
    const tt = THD - 1.6;
    els.push(<path key={key()} d={ring((t) => rLum(t) - 1, (t) => fa(t) + 1, tt - 0.06, tt + 0.06)} fill={C.sangre} />);
    const [x, y] = P((fa(THD) + fb(THD)) / 2, THD);
    etiquetas.push({ texto: 'Falsa luz (en la media)', x, y });
    const [fx, fy] = P((rIEL(THD + 0.9) + fa(THD + 0.9)) / 2, THD + 0.9);
    etiquetas.push({ texto: 'Colgajo de íntima y media', x: fx, y: fy });
    const [ex, ey] = P(rLum(tt), tt);
    etiquetas.push({ texto: 'Desgarro de la íntima', x: ex, y: ey });
  }

  // ---------- LUZ ----------
  els.push(<path key={key()} d={closed(rLum)} fill={C.lumen} />);
  // Endotelio: núcleos planos sobre la superficie luminal
  const nEndo = Math.round(TAU * lumen0 / 9);
  for (let i = 0; i < nEndo; i++) {
    const t = (i / nEndo) * TAU;
    const [x, y] = P(rLum(t) + 1.4, t);
    els.push(<ellipse key={key()} cx={x} cy={y} rx={3} ry={0.9} fill={C.endo} transform={`rotate(${((t * 180) / Math.PI + 90).toFixed(0)} ${x} ${y})`} />);
  }
  // Trombo (placa complicada)
  if (placa?.fase === 'complicada') {
    els.push(<path key={key()} d={ring(rRes, (t) => rLum(t) + 0.5, TH0 + 0.5 - 2.3, TH0 + 0.5 + 2.3)} fill={C.trombo} />);
    for (let i = 0; i < 24; i++) {
      const t = TH0 + 0.5 + (rand() - 0.5) * 3.6;
      const r = rRes(t) + rand() * (rLum(t) - rRes(t));
      const [x, y] = P(r, t);
      els.push(<line key={key()} x1={x - 6} y1={y} x2={x + 6} y2={y + 2} stroke={C.fibrina} strokeWidth={0.9} transform={`rotate(${(rand() * 180).toFixed(0)} ${x} ${y})`} />);
    }
    const [x, y] = P((rRes(TH0 + 0.5) + rLum(TH0 + 0.5)) / 2, TH0 + 0.5);
    etiquetas.push({ texto: 'Trombo', x, y });
  }
  // Trombo mural laminado (aneurisma)
  if (R.aneurisma) {
    const tin: RF = (t) => rLum(t) - 26 * bump(t, 2.2, 3.4);
    els.push(<path key={key()} d={ring(tin, (t) => rLum(t) - 1, 2.2 - 1.7, 2.2 + 1.7)} fill={C.trombo} opacity={0.92} />);
    for (let j = 1; j <= 4; j++) {
      const rl: RF = (t) => rLum(t) - 26 * bump(t, 2.2, 3.4) * (j / 5);
      els.push(<path key={key()} d={`M${contour(rl, 2.2 - 1.5, 2.2 + 1.5).join('L')}`} fill="none" stroke={C.fibrina} strokeWidth={1.4} />);
    }
    const [x, y] = P(rLum(2.2) - 13, 2.2);
    etiquetas.push({ texto: 'Trombo mural laminado', x, y });
    const [mx, my] = P((rIEL(-0.2) + rEEL(-0.2)) / 2, -0.2);
    etiquetas.push({ texto: 'Media adelgazada', x: mx, y: my });
  }
  // Glóbulos rojos en la luz residual
  for (let i = 0; i < 14; i++) {
    const t = rand() * TAU;
    const r = rand() * rRes(t) * 0.75;
    const [x, y] = P(r, t);
    els.push(<ellipse key={key()} cx={x} cy={y} rx={3.4} ry={3} fill={C.rbc} opacity={0.75} />);
  }

  // ---------- Rótulos básicos ----------
  // Cada capa se rotula en un ángulo distinto (de dentro afuera, de arriba abajo en el lado
  // derecho) para que las líneas guía no se crucen.
  const base: Etiqueta[] = [];
  const capasBase: [string, (t: number) => number][] = [
    ['Luz', (t) => rRes(t) * 0.45],
    ['Íntima (endotelio)', (t) => (rLum(t) + rIEL(t)) / 2],
    ['Lámina elástica interna', rIEL],
    ['Media', (t) => (rIEL(t) + rEEL(t)) / 2],
    ...(vaso !== 'arteriola' ? ([['Lámina elástica externa', rEEL]] as [string, RF][]) : []),
    ['Adventicia', (t) => (rEEL(t) + rADV(t)) / 2],
  ];
  capasBase.forEach(([texto, rf], i) => {
    const t = 0.55 - (1.1 * i) / Math.max(1, capasBase.length - 1) + 0.05;
    const [x, y] = P(rf(t), t);
    base.push({ texto, x, y });
  });

  base.push(...vasaBase);
  const todas = [...base, ...etiquetas].slice(0, 11);
  // Columna de texto a la derecha, ordenada por altura y sin solaparse
  const orden = [...todas].sort((a, b) => a.y - b.y);
  const gap = 360 / Math.max(orden.length, 1);
  const filas = orden.map((e, i) => ({ ...e, ty: 22 + gap * (i + 0.5) }));

  return (
    <svg viewBox={rotulos ? '0 0 580 400' : '0 0 380 400'} className="vs-svg" role="img" aria-label={titulo ?? 'Corte transversal de una arteria'}>
      {titulo && (
        <text x={190} y={18} textAnchor="middle" className="vs-title">
          {titulo}
        </text>
      )}
      {els}
      {rotulos &&
        filas.map((e, i) => {
          const isBase = base.includes(todas.find((x) => x.texto === e.texto)!);
          return (
            <g key={`l${i}`}>
              <polyline points={`${e.x},${e.y} 392,${e.ty} 398,${e.ty}`} className={`vs-leader${isBase ? '' : ' path'}`} />
              <circle cx={e.x} cy={e.y} r={2} className={`vs-dot${isBase ? '' : ' path'}`} />
              <text x={402} y={e.ty + 4} className={`vs-label${isBase ? '' : ' path'}`}>
                {e.texto}
              </text>
            </g>
          );
        })}
    </svg>
  );
}
