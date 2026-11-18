// Genera los iconos PNG de la PWA (sin dependencias: solo zlib de Node).
// Uso: node scripts/make-icons.mjs
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
function png(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const A = [0xf9, 0x73, 0x16]; // #f97316
const B = [0xe1, 0x1d, 0x48]; // #e11d48
const PTS = [[2, 17], [9, 17], [11, 11], [15, 25], [19, 5], [22, 17], [30, 17]];

function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

function icon(size, maskable) {
  const buf = Buffer.alloc(size * size * 4);
  const r = maskable ? 0 : size * 0.22;
  const s = maskable ? size * 0.6 : size * 0.78;
  const o = (size - s) / 2;
  const k = s / 32;
  const pts = PTS.map(([a, b]) => [o + a * k, o + b * k]);
  const half = 1.6 * k;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // Cuadrado redondeado (cobertura con suavizado)
      const cx = Math.min(Math.max(x + 0.5, r), size - r);
      const cy = Math.min(Math.max(y + 0.5, r), size - r);
      const d = r ? Math.hypot(x + 0.5 - cx, y + 0.5 - cy) - r : -1;
      const cov = Math.max(0, Math.min(1, 0.5 - d));
      if (cov <= 0) continue;
      const t = (x + y) / (2 * size);
      let col = A.map((a, j) => a + (B[j] - a) * t);
      // Trazo blanco del ECG
      let dmin = Infinity;
      for (let j = 1; j < pts.length; j++) dmin = Math.min(dmin, distSeg(x + 0.5, y + 0.5, ...pts[j - 1], ...pts[j]));
      const w = Math.max(0, Math.min(1, half + 0.5 - dmin));
      col = col.map((c) => c + (255 - c) * w);
      buf[i] = col[0];
      buf[i + 1] = col[1];
      buf[i + 2] = col[2];
      buf[i + 3] = Math.round(255 * cov);
    }
  return png(size, buf);
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', icon(192, false));
writeFileSync('public/icons/icon-512.png', icon(512, false));
writeFileSync('public/icons/maskable-512.png', icon(512, true));
writeFileSync('public/icons/apple-touch-icon.png', icon(180, true));
console.log('Iconos generados en public/icons');
