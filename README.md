# Simulador ECG 3D

Aplicación educativa para estudiantes de Medicina: muestra el **vector cardíaco en 3D** dentro de un corazón, los **ejes de las 12 derivaciones** a su alrededor y el **ECG de 12 derivaciones** sincronizado en papel milimetrado (25 mm/s, 10 mm/mV).

> ⚠️ **Herramienta educativa y simplificada. No apta para uso clínico ni para diagnóstico.**

## Estado

| Fase | Contenido | Estado |
|---|---|---|
| 1 · MVP | Motor del dipolo, ECG normal de 12 derivaciones, corazón 3D con vector, bucles y ejes | ✅ |
| 2 | Sistema de patologías (Zod), isquemias por arteria/fase, potasio, «comparar con normal» | ⏳ |
| 3 | Resto de patologías, PWA instalable, pulido móvil, modelo glTF libre | ⏳ |

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
   - **GitHub Pages**: sube el repositorio y publica `dist/` (por ejemplo, con la acción `actions/deploy-pages`).
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

*(El sistema completo llega en la fase 2; este es el formato previsto.)*

1. Crea un archivo en `src/pathologies/<categoría>/<nombre>.ts` que exporte un objeto de **datos puros**: nombre, categoría, modificaciones del vector y de los intervalos, derivaciones afectadas, cambios recíprocos, explicación, territorio 3D y deslizador de gravedad o fase.
2. Al arrancar, el esquema Zod lo valida. Si falta un campo o un valor no tiene sentido, verás un error claro que dice qué archivo falla.
3. Aparece solo en el desplegable, dentro de su categoría.

## Créditos

Creado por **Antonio Requena Quesada** con ayuda de Claude Code.

Corazón 3D procedural, creado para este proyecto. Ver `CREDITS.md`.
