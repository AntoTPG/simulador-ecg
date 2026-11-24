// Genera public/LICENCIAS-TERCEROS.txt con los avisos de copyright y licencias de
// todas las bibliotecas de código que se incluyen en la web (dependencias de producción).
// Las licencias MIT, ISC, BSD y Apache obligan a incluir estos avisos al distribuir el código.
// Uso: node scripts/licencias.mjs  (se ejecuta también antes de cada build)
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// `npm ls` puede salir con error por avisos sin importancia (p. ej., dependencias opcionales):
// se aprovecha su salida igualmente. Si no hay salida, se conserva el archivo ya generado y
// la build NO se detiene (el archivo está en el repositorio).
let salida = '';
try {
  salida = execSync('npm ls --omit=dev --all --parseable', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
} catch (e) {
  salida = e.stdout?.toString() ?? '';
}
if (!salida.trim()) {
  console.warn('licencias: no se pudo listar las dependencias; se mantiene public/LICENCIAS-TERCEROS.txt');
  process.exit(0);
}
const dirs = salida.trim().split(/\r?\n/).slice(1);
const vistos = new Map();
for (const d of dirs) {
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(path.join(d, 'package.json'), 'utf8'));
  } catch {
    continue;
  }
  const id = `${pkg.name}@${pkg.version}`;
  if (vistos.has(id)) continue;
  const lic = typeof pkg.license === 'string' ? pkg.license : pkg.license?.type ?? 'ver texto';
  const archivos = fs.readdirSync(d).filter((f) => /^(licen[cs]e|copying|notice)/i.test(f));
  const textos = archivos.map((f) => fs.readFileSync(path.join(d, f), 'utf8').trim());
  vistos.set(id, { lic, textos });
}
const orden = [...vistos.keys()].sort();
let out = `LICENCIAS DE TERCEROS · FisioVisual
==========================================
La web incluye las siguientes bibliotecas de código abierto. Cada una conserva su
licencia y su aviso de copyright, que se reproducen a continuación.
El código propio del simulador NO es de código abierto: ver el archivo LICENSE del proyecto.
Las grabaciones de public/audio/michigan/ tienen su propia licencia (CC BY-SA 4.0, ver LICENCIA.txt).

Generado automáticamente (${orden.length} paquetes).
`;
for (const id of orden) {
  const { lic, textos } = vistos.get(id);
  out += `\n\n------------------------------------------------------------\n${id} — ${lic}\n------------------------------------------------------------\n`;
  out += textos.length ? textos.join('\n\n') : `(El paquete no incluye archivo de licencia; licencia declarada: ${lic}.)`;
}
fs.writeFileSync('public/LICENCIAS-TERCEROS.txt', out + '\n');
console.log(`LICENCIAS-TERCEROS.txt: ${orden.length} paquetes`);
