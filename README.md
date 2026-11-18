# Simulador ECG 3D

**🌐 Úsala online:** https://antotpg.github.io/simulador-ecg/

Aplicación educativa para estudiantes de Medicina: muestra el **vector cardíaco en 3D** dentro de un corazón, los **ejes de las 12 derivaciones** a su alrededor y el **ECG de 12 derivaciones** sincronizado en papel milimetrado (25 mm/s, 10 mm/mV).

> ⚠️ **Herramienta educativa y simplificada. No apta para uso clínico ni para diagnóstico.**

## Estado

| Fase | Contenido | Estado |
|---|---|---|
| 1 · MVP | Motor del dipolo, ECG normal de 12 derivaciones, corazón 3D con vector, bucles y ejes | ✅ |
| 2 | Sistema de patologías (Zod), isquemias por arteria/fase, potasio, «comparar con normal» | ✅ |
| 3 | Resto de patologías (conducción, arritmias, calcio, pericarditis, miocarditis, HVI, TEP, Brugada, QT largo, digital), PWA instalable, pulido móvil | ✅ |

### Patologías incluidas

- **Isquemia e infarto**: DA proximal y distal, Cx lateral y posterior, CD inferior, CD con VD (V3R/V4R), tronco común, subendocárdica frente a transmural. Fases: T hiperaguda → ST ↑ → Q → T invertida.
- **Electrolitos**: hiperpotasemia (4 niveles), hipopotasemia (3), hiper e hipocalcemia.
- **Conducción**:
  - BRD (incompleto/completo), BRI, hemibloqueos anterior y posterior;
  - WPW;
  - bloqueos AV de 1.º, 2.º (Mobitz I, Mobitz II, 2:1) y 3.er grado (escape nodal o ventricular).
- **Arritmias**: fibrilación auricular (respuesta lenta, controlada o rápida) y flúter típico (2:1, 4:1 o variable).
- **Hipertrofia**: HVI (voltaje, sobrecarga).
- **Otras**: pericarditis (estadios y derrame), miocarditis, TEP (S1Q3T3), Brugada (tipos 1 y 2), QT largo, efecto e intoxicación digitálica.

## Instalarla como app (PWA)

Abre https://antotpg.github.io/simulador-ecg/ y:
- **Android (Chrome)**: menú ⋮ → «Instalar aplicación».
- **iPhone/iPad (Safari)**: botón Compartir → «Añadir a pantalla de inicio».
- **Ordenador (Chrome/Edge)**: icono de instalar en la barra de direcciones.

Una vez instalada funciona **sin conexión** y se actualiza sola cuando se publica una versión nueva.

## Ejecutarla en tu ordenador

Necesitas [Node.js](https://nodejs.org) 20 o superior.

```powershell
npm install
npm run dev
```

Abre la dirección que aparece (normalmente http://localhost:5173).

```powershell
npm test
```

Ejecuta los tests del motor: leyes de Einthoven y Goldberger, eje normal, intervalos y morfología.

## Compartirla con los compañeros

Hay dos opciones:

1. **Un único archivo HTML** (lo más fácil de mandar):
   ```powershell
   npm run build:single
   ```
   Genera `dist-single/index.html` (~1 MB) con todo dentro. Se puede mandar por correo, Drive o WhatsApp y abrir con doble clic, sin instalar nada.
2. **Publicarla en una web** (enlace que funciona en el móvil y, desde la fase 3, se podrá instalar como app):
   ```powershell
   npm run build
   ```
   Sube la carpeta `dist/` a cualquier hosting estático:
   - **Netlify Drop**: arrastra `dist/` a https://app.netlify.com/drop.
   - **GitHub Pages** (lo que usa este repositorio): cada `git push` a `main` ejecuta `.github/workflows/deploy.yml`, que pasa los tests, construye y publica en https://antotpg.github.io/simulador-ecg/.
   - **Cloudflare Pages / Vercel**: comando de build `npm run build`, carpeta de salida `dist`.

   Las rutas son relativas (`base: './'`), así que funciona en cualquier subcarpeta.

### Más adelante: escritorio y móvil nativos
La build es web pura (sin APIs de Node ni recursos externos), así que se puede empaquetar sin cambiar el código:
- **Tauri** (Windows/macOS/Linux): `npm create tauri-app` o `npx tauri init`, con `frontendDist: "../dist"`.
- **Capacitor** (Android/iOS): `npm i @capacitor/core @capacitor/cli && npx cap init`, `webDir: "dist"`, y después `npx cap add android`.

## Cómo funciona (modelo fisiológico)

- **Hipótesis del dipolo**: en cada instante la actividad eléctrica del corazón se resume en un vector `H(t)`.
- **Bucles vectocardiográficos**: P, QRS, T y U son sumas de gaussianas asimétricas con dirección 3D (`src/engine/normalWaves.ts`). Por eso la punta del vector dibuja bucles.
- **Derivaciones**: cada electrodo tiene un vector de campo y su potencial es `φ = L·H`. Las derivaciones se calculan restando potenciales, como hace el electrocardiógrafo. Así **II = I + III** y **aVR + aVL + aVF = 0** se cumplen exactamente:
  - miembros: triángulo de Einthoven (sistema hexaxial);
  - precordiales: coeficientes de la matriz inversa de Dower, en el plano horizontal.
- **Ritmo**: un planificador decide cuándo ocurre cada P y cada QRS, lo que prepara bloqueos AV, FA y flúter para la fase 3.
- **Parámetros**: FC, PR, QRS, QTc y eje están en un único archivo, `src/config/physiology.ts`.

## Estructura

```
src/
  config/       physiology.ts (parámetros) · leads.ts (electrodos) · ecgPaper.ts
  engine/       motor puro y testeado: ondas, ritmo, simulación, derivaciones, mediciones
  pathologies/  una patología = un archivo de datos (fase 2)
  store/        estado global (Zustand) y reloj de la animación
  heart3d/      escena 3D (react-three-fiber): corazón, vector, bucles, ejes, electrodos
  ecg/          dibujo del ECG en Canvas 2D
  ui/           controles, línea de tiempo, paneles
```

## Añadir una patología nueva

1. Crea un archivo en `src/pathologies/<carpeta>/<nombre>.ts` que exporte por defecto un objeto de **datos puros**. Usa `definePathology` para tener autocompletado:

   ```ts
   import { definePathology } from '../schema';

   export default definePathology({
     id: 'mi-patologia',
     nombre: 'Mi patología',
     categoria: 'Otras',
     explicacion: ['Frase 1…', 'Frase 2…', 'Frase 3…'],
     derivacionesAfectadas: ['V1', 'V2'],
     reciprocas: ['II'],
     modificaciones: {
       intervalos: { prInterval: 220 },          // ms, valores absolutos
       amplitud: { T: 0.5, U: 3 },               // multiplicadores
       st: { direccion: [0, 0, 1], mv: 0.15 },   // vector de lesión
     },
     territorio3D: { segmentos: [1, 7, 13], arterias: ['da'] },
     control: {                                   // deslizador opcional
       tipo: 'gravedad', etiqueta: 'Gravedad',
       niveles: [
         { id: 'leve', etiqueta: 'Leve', modificaciones: { amplitud: { T: 0.8 } } },
         { id: 'grave', etiqueta: 'Grave', modificaciones: { amplitud: { T: 0.3 } } },
       ],
     },
   });
   ```

2. Todos los campos posibles, explicados, están en [`src/pathologies/schema.ts`](src/pathologies/schema.ts):
   - intervalos y amplitudes;
   - anchura de la T;
   - desplazamientos del ST y del PR;
   - lóbulos extra en los bucles;
   - isquemia por territorio y fase;
   - derivaciones extra (V3R, V4R);
   - segmentos AHA, arterias y punto de oclusión para el 3D.
3. Al arrancar, Zod valida el archivo. Si algo está mal, el panel de patología muestra en amarillo qué archivo y qué campo fallan. `npm test` también lo comprueba.
4. La patología aparece sola en el desplegable, dentro de su categoría. Los archivos que empiezan por `_` (por ejemplo, `isquemia/_fases.ts`) son datos compartidos y no se cargan como patologías.

## Créditos

Creado por **Antonio Requena Quesada** con ayuda de Claude Code.

Corazón 3D procedural, creado para este proyecto. Ver `CREDITS.md`.
