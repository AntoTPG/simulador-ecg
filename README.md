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

### Ciclo cardíaco y ruidos cardíacos

- **Diagrama de Wiggers**:
  - presión del VI, de la aorta y de la aurícula izquierda, volumen del VI, ECG (II) y fonocardiograma de un latido;
  - fases del ciclo y cierres y aperturas valvulares;
  - VTD, VTS y FE, con el cursor sincronizado con el ECG y el 3D.
- **Modelo hemodinámico** (`src/engine/hemodynamics.ts`), calculado latido a latido a partir del ECG. Incluye el acoplamiento electromecánico, Frank‑Starling, el modelo Windkessel y la patada auricular. Por eso las arritmias se reflejan solas: en la FA cada latido es distinto y no hay onda *a* ni R4, y en el BAV completo aparecen ondas *a* en cañón.
- **22 ruidos** fisiológicos y patológicos (`src/sounds/catalog.ts`): R1/R2, desdoblamientos, R3, R4, galopes, clics, chasquido de apertura, soplos sistólicos, diastólicos y continuos, roce y knock pericárdicos.
  - Cada uno trae una explicación breve, su foco de auscultación y si se oye mejor con la campana o con la membrana.
  - «Escuchar» reproduce un sonido **sintetizado** y sincronizado con la animación.
  - Además, la mayoría incluye **grabaciones reales** de pacientes con su esquema fonocardiográfico, de la Heart Sound and Murmur Library de la Universidad de Michigan (CC BY‑SA 4.0; ver `public/audio/michigan/LICENCIA.txt`). No van incluidas en la versión de un solo archivo.
  - Fuente de las explicaciones: Manual MSD («Auscultación cardíaca»).

### Cardiopatías congénitas

- Esquema anatómico interactivo de las cuatro cavidades y los grandes vasos (`src/congenital/`):
  - corazón normal, CIA, CIV, síndrome de Eisenmenger y ductus arterioso persistente;
  - Tetralogía de Fallot, coartación de aorta y transposición de grandes arterias.
- El color indica la saturación de O₂ (venosa, mezcla, arterial), el flujo está animado y los cortocircuitos llevan flechas con su dirección. Se marcan los defectos, las dilataciones y las hipertrofias, con la saturación y la presión de cada cavidad (valores orientativos).
- Cada malformación incluye su fisiopatología, el Qp/Qs, la auscultación, el ECG, la radiografía y el tratamiento, con enlaces al ruido y al ECG relacionados. Fuente: Manual MSD, «Anomalías cardiovasculares congénitas».

### Pared arterial (corte transversal)

- Corte transversal estilizado (tipo hematoxilina‑eosina) de una arteria muscular, de la aorta y de una arteriola (`src/vessels/`), normal y patológico lado a lado, con rótulos y el efecto en cada capa (íntima, media, adventicia).
- Patologías:
  - aterosclerosis por fases (estría grasa → fibroateroma → calcificada → complicada con trombo);
  - arteriolosclerosis hialina e hiperplásica, esclerosis de Mönckeberg, hipertrofia de la media por HTA;
  - aneurisma y disección aórtica;
  - arteritis de células gigantes, poliarteritis nudosa y aortitis sifilítica.

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

## Licencia

© 2026 Antonio Requena Quesada. **Todos los derechos reservados.** Ver [`LICENSE`](LICENSE).
Que el código sea visible no permite copiarlo, modificarlo ni redistribuirlo sin autorización por escrito.
Excepciones: las grabaciones de `public/audio/michigan/` (CC BY‑SA 4.0) y las dependencias de software, con sus propias licencias.
