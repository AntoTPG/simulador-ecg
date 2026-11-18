# CLAUDE.md — Simulador ECG 3D

Instrucciones para Claude (y para cualquier persona) que trabaje en este proyecto.

## El proyecto

- Aplicación web **educativa** para estudiantes de Medicina. Incluye:
  - vector cardíaco en 3D y ECG de 12 derivaciones sincronizado;
  - patologías, diagrama de Wiggers y ruidos cardíacos;
  - cardiopatías congénitas.
- Autor y responsable: **Antonio Requena Quesada**, estudiante de Medicina. Lo usan sus compañeros de facultad.
- Web publicada: https://antotpg.github.io/simulador-ecg/ (repositorio público `AntoTPG/simulador-ecg`).

## Cómo trabajar con Antonio

- **Idioma: español de España**, en la interfaz, en las explicaciones y en los comentarios del código.
- Antonio no programa habitualmente: explica las cosas en lenguaje llano, sin jerga innecesaria.
- **Nunca publicar sin permiso explícito.** Antes de subir un cambio (commit + push), muéstraselo funcionando en local (`npm run dev` → http://localhost:5173) y espera a que diga que se publique. Un «sí» a un cambio no vale para los siguientes.
- Él decide qué se añade y qué se publica. El contenido médico debe poder revisarse antes de llegar a sus compañeros.

## Normas de contenido (muy importantes)

- Rigor médico: usa fuentes fiables y cítalas: Manual MSD versión profesional, guías y libros de referencia.
- Redacta **con palabras propias**. Nunca copies párrafos literales de manuales ni imágenes de libros con copyright.
- Los valores numéricos (saturaciones, presiones, intervalos) son orientativos: indícalo cuando proceda.
- Mantén siempre visible el aviso: «Herramienta educativa y simplificada. No apta para uso clínico ni para diagnóstico». El enfoque debe seguir siendo educativo, nunca diagnóstico.
- Mantén el pie: «Creado por Antonio Requena Quesada con ayuda de Claude Code».
- Grabaciones de `public/audio/michigan/`: **CC BY‑SA 4.0** (Universidad de Michigan). Hay que citarlas siempre, mantener `LICENCIA.txt` y anotar ahí cualquier cambio que se les haga.
- Las fuentes y créditos van en `CREDITS.md`.

## Comandos

```powershell
npm install          # dependencias (Node 20+)
npm run dev          # servidor local en http://localhost:5173
npm test             # tests (Vitest): deben pasar SIEMPRE antes de publicar
npx tsc --noEmit     # comprobación de tipos
npm run build        # build de producción (dist/)
npm run build:single # un único HTML en dist-single/ (sin grabaciones reales)
```

Git no está en el PATH de las terminales antiguas. Ruta: `%LOCALAPPDATA%\Programs\Git\cmd\git.exe`.
Para que `git push` pueda abrir la ventana de inicio de sesión de GitHub: `$env:GCM_INTERACTIVE='always'`.

## Publicación

- Cada push a `main` ejecuta `.github/workflows/deploy.yml`: tests → build → GitHub Pages. Tarda alrededor de 1 minuto.
- Si un test falla, no se publica.
- Tras publicar, comprueba en https://github.com/AntoTPG/simulador-ecg/actions que el despliegue terminó bien.
- Mensajes de commit en español.

## Arquitectura (resumen)

- `src/config/`: parámetros fisiológicos (`physiology.ts`), electrodos (`leads.ts`) y papel del ECG.
- `src/engine/`: motor puro y testeado.
  - Dipolo cardíaco: bucles P/QRS/T con gaussianas.
  - Derivaciones a partir de potenciales de electrodo, de modo que Einthoven y Goldberger se cumplen exactos.
  - Ritmos: BAV, FA, flúter.
  - Patologías (`applyPathology.ts`) y modelo hemodinámico (`hemodynamics.ts`).
- `src/pathologies/`: **una patología = un archivo de datos** validado con Zod (`schema.ts`). Se registra solo y aparece en el desplegable. Los archivos que empiezan por `_` son datos compartidos.
- `src/sounds/`: catálogo de ruidos cardíacos (`catalog.ts`), síntesis de audio (`acoustics.ts`) y reproducción sincronizada (`player.ts`).
- `src/congenital/`: cardiopatías congénitas (catálogo de datos + esquema SVG).
- `src/heart3d/`: escena 3D (react-three-fiber). Corazón procedural con mapa de activación; el contrato para cambiarlo por un glTF está en `models/HeartModel.ts`.
- `src/ecg/`: ECG en Canvas 2D (formatos 3×4 clásico y simultáneo).
- `src/ui/`: paneles e interfaz. Estado global con Zustand (`src/store/`). El reloj de la animación vive fuera de React (`clock.ts`).

## Al añadir contenido nuevo

1. Datos en su catálogo o archivo (patología, ruido, cardiopatía), con explicación y fuente.
2. Tests que comprueben los signos típicos.
3. `npm test` y `npx tsc --noEmit` en verde.
4. Previsualizar en local y enseñárselo a Antonio.
5. Publicar solo cuando lo apruebe y actualizar `README.md`/`CREDITS.md` si procede.
