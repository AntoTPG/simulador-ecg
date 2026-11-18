/**
 * REGISTRO DE PATOLOGÍAS
 * Carga automáticamente todos los archivos .ts de esta carpeta (y subcarpetas),
 * los valida con Zod y los ordena por categoría. Para añadir una patología basta
 * con crear su archivo: no hay que tocar nada más.
 */
import { CATEGORIES, pathologySchema, type Pathology } from './schema';

const modules = import.meta.glob<{ default: unknown }>(['./**/*.ts', '!./registry.ts', '!./schema.ts', '!./**/_*.ts', '!./**/*.test.ts'], {
  eager: true,
});

export interface RegistryError {
  archivo: string;
  mensaje: string;
}

const pathologies: Pathology[] = [];
const errors: RegistryError[] = [];

for (const [path, mod] of Object.entries(modules)) {
  const archivo = path.replace('./', 'src/pathologies/');
  if (!mod.default) {
    errors.push({ archivo, mensaje: 'el archivo no tiene "export default".' });
    continue;
  }
  const r = pathologySchema.safeParse(mod.default);
  if (!r.success) {
    const mensaje = r.error.issues.map((i) => `${i.path.join('.') || '(raíz)'}: ${i.message}`).join(' · ');
    errors.push({ archivo, mensaje });
    console.error(`[patologías] ${archivo} no es válido → ${mensaje}`);
    continue;
  }
  if (pathologies.some((p) => p.id === r.data.id)) {
    errors.push({ archivo, mensaje: `id repetido: "${r.data.id}"` });
    continue;
  }
  pathologies.push(r.data);
}

pathologies.sort(
  (a, b) =>
    CATEGORIES.indexOf(a.categoria) - CATEGORIES.indexOf(b.categoria) ||
    (a.id === 'normal' ? -1 : b.id === 'normal' ? 1 : 0) ||
    a.nombre.localeCompare(b.nombre, 'es'),
);

export const PATHOLOGIES: readonly Pathology[] = pathologies;
export const REGISTRY_ERRORS: readonly RegistryError[] = errors;

export const getPathology = (id: string): Pathology =>
  pathologies.find((p) => p.id === id) ?? pathologies.find((p) => p.id === 'normal')!;
