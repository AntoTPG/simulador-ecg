/**
 * Registro de patologías. En la fase 2 se cargarán automáticamente todos los
 * archivos de esta carpeta (import.meta.glob) y se validarán con Zod.
 */
import { normal } from './normal';

export interface PathologyEntry {
  id: string;
  nombre: string;
  categoria: string;
  explicacion: readonly string[];
}

export const PATHOLOGIES: PathologyEntry[] = [normal];

/** Categorías en el orden en que aparecen en el desplegable. */
export const CATEGORY_ORDER = [
  'Referencia',
  'Isquemia e infarto',
  'Alteraciones electrolíticas',
  'Trastornos de la conducción',
  'Hipertrofia',
  'Arritmias',
  'Otras',
];

export const getPathology = (id: string) => PATHOLOGIES.find((p) => p.id === id) ?? normal;
