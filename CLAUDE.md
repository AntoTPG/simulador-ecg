# CLAUDE.md — FisioVisual (antes «Simulador ECG 3D»)

Instrucciones para Claude (y para cualquier persona) que trabaje en este proyecto.

## El proyecto

- **FisioVisual**: aplicación web **educativa** de fisiología interactiva para estudiantes de Medicina (el nombre «Simulador ECG 3D» se mantiene para el módulo del corazón). Incluye:
  - vector cardíaco en 3D y ECG de 12 derivaciones sincronizado;
  - patologías, diagrama de Wiggers, bucle presión‑volumen y ruidos cardíacos;
  - «Adivina el ECG» (autoevaluación);
  - respiratorio (marcado «en revisión»): mecánica pulmonar, ciclo respiratorio, acino 3D, espirometría y gasometría;
  - cardiopatías congénitas y pared arterial en corte transversal.
- Autor y responsable: **Antonio Requena Quesada**, estudiante de Medicina. Lo usan sus compañeros de facultad.
- Web publicada: https://antotpg.github.io/simulador-ecg/ y https://simulador-ecg.pages.dev (Cloudflare Pages, futura dirección definitiva). Repositorio público `AntoTPG/simulador-ecg`.

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
- Mantén el pie: «Creado por Antonio Requena Quesada con ayuda de Claude Code» y el aviso «© Antonio Requena Quesada. Todos los derechos reservados».
- El proyecto NO es de código abierto (ver `LICENSE`): no añadas licencias libres (MIT, GPL…) ni cambies `LICENSE` sin que Antonio lo pida.
- Grabaciones de `public/audio/michigan/`: **CC BY‑SA 4.0** (Universidad de Michigan). Hay que citarlas siempre, mantener `LICENCIA.txt` y anotar ahí cualquier cambio que se les haga.
- Las fuentes y créditos van en `CREDITS.md`.

## Seguridad y licencias (auditoría de noviembre de 2026)

- La web es estática y no carga NADA de otros dominios. La política de seguridad (CSP) está en `public/_headers` (cabeceras de Cloudflare Pages) y en `vite.config.ts` (etiqueta `<meta>` para GitHub Pages). Si algún día hace falta un recurso externo (fuente, CDN, analítica), hay que añadirlo en los dos sitios y volver a probar.
- No usar `innerHTML` con datos que no sean nuestros, ni `eval`/`new Function`. Zod va en modo `jitless` por la CSP.
- Antes de publicar: `npm audit` sin vulnerabilidades (el workflow corta si hay alguna alta en producción).
- `public/LICENCIAS-TERCEROS.txt` recoge los avisos de copyright de las bibliotecas; se regenera solo antes de cada build (`npm run licencias`).
- Toda fuente usada se cita en la interfaz y en `CREDITS.md`. Textos con palabras propias: se comprobó con un cotejo automático contra el Manual MSD (0 frases idénticas de 8 o más palabras).
- Nunca subir secretos: `.env` y claves están en `.gitignore`.

## Comandos

```powershell
npm install          # dependencias (Node 20.19+ o 22)
npm run dev          # servidor local en http://localhost:5173
npm test             # tests (Vitest): deben pasar SIEMPRE antes de publicar
npx tsc --noEmit     # comprobación de tipos
npm run build        # build de producción (dist/)
npm run build:single # un único HTML en dist-single/ (sin grabaciones reales)
```

Git no está en el PATH de las terminales antiguas. Ruta: `%LOCALAPPDATA%\Programs\Git\cmd\git.exe`.
Para que `git push` pueda abrir la ventana de inicio de sesión de GitHub: `$env:GCM_INTERACTIVE='always'`.

## Publicación

- Cada push a `main` ejecuta `.github/workflows/deploy.yml`: auditoría de dependencias → tests → build → GitHub Pages. Cloudflare Pages se despliega a la vez por su cuenta. Tarda alrededor de 1 minuto.
- Si un test falla, no se publica.
- Tras publicar, comprueba en https://github.com/AntoTPG/simulador-ecg/actions que el despliegue terminó bien.
- Mensajes de commit en español.

## Arquitectura (resumen)

- `src/config/`: parámetros fisiológicos (`physiology.ts`), electrodos (`leads.ts`) y papel del ECG.
- `src/engine/`: motor puro y testeado.
  - Dipolo cardíaco: bucles P/QRS/T con gaussianas.
  - Derivaciones a partir de potenciales de electrodo, de modo que Einthoven y Goldberger se cumplen exactos.
  - Ritmos: BAV, FA, flúter.
  - Patologías (`applyPathology.ts`), modelo hemodinámico (`hemodynamics.ts`) y bucle presión‑volumen (`pvLoop.ts`).
- `src/pathologies/`: **una patología = un archivo de datos** validado con Zod (`schema.ts`). Se registra solo y aparece en el desplegable. Los archivos que empiezan por `_` son datos compartidos.
- `src/sounds/`: catálogo de ruidos cardíacos (`catalog.ts`), síntesis de audio (`acoustics.ts`) y reproducción sincronizada (`player.ts`).
- `src/quiz/`: pestaña «Adivina el ECG» (banco de preguntas en `bank.ts` + ECG estático).
- `src/respiratory/`: modelo de mecánica pulmonar (`mechanics.ts`), patologías (`catalog.ts`), gráficas, acino 3D, reloj propio (`respClock.ts`) espirometría (`spirometry.ts` + `spiroCatalog.ts`) y gasometría (`gas.ts` + `gasCases.ts`).
- `src/congenital/`: cardiopatías congénitas (catálogo de datos + esquema SVG).
- `src/vessels/`: pared arterial en corte transversal (catálogo de datos + dibujo SVG por capas).
- `src/heart3d/`: escena 3D (react-three-fiber). Corazón procedural con mapa de activación; el contrato para cambiarlo por un glTF está en `models/HeartModel.ts`.
- `src/ecg/`: ECG en Canvas 2D (formatos 3×4 clásico y simultáneo).
- `src/ui/`: paneles e interfaz. Estado global con Zustand (`src/store/`). El reloj de la animación vive fuera de React (`clock.ts`).

## Al añadir contenido nuevo

1. Datos en su catálogo o archivo (patología, ruido, cardiopatía), con explicación y fuente.
2. Tests que comprueben los signos típicos.
3. `npm test` y `npx tsc --noEmit` en verde.
4. Previsualizar en local y enseñárselo a Antonio.
5. Publicar solo cuando lo apruebe y actualizar `README.md`/`CREDITS.md` si procede.
