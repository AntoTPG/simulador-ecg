/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { VitePWA } from 'vite-plugin-pwa';
import type { Plugin } from 'vite';

/**
 * Política de seguridad de contenido (CSP) como etiqueta <meta>, solo en la build normal.
 * Cloudflare Pages ya la envía como cabecera (public/_headers), pero GitHub Pages no
 * permite cabeceras propias: con la etiqueta, la protección también llega allí.
 * (En una <meta> no valen frame-ancestors ni upgrade-insecure-requests en todos los
 * navegadores; eso queda a cargo de las cabeceras de Cloudflare.)
 */
const CSP_META =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none';"; // el «;» final evita que un añadido externo (p. ej., un antivirus) se pegue a la última regla
const cspMeta = (): Plugin => ({
  name: 'csp-meta',
  apply: 'build',
  transformIndexHtml: (html) =>
    html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${CSP_META}" />
    <meta name="referrer" content="strict-origin-when-cross-origin" />`),
});

// `base: './'` → rutas relativas: la misma build sirve para cualquier hosting
// estático (GitHub Pages en una subcarpeta), para Tauri y para Capacitor.
//
// `npm run build:single` (modo "single") genera UN ÚNICO archivo HTML con todo
// incrustado, que se puede mandar por correo y abrir con doble clic sin servidor
// (esa versión no se instala como PWA).
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [
    react(),
    ...(mode === 'single'
      ? [viteSingleFile()]
      : [
          cspMeta(),
          // PWA: instalable en el móvil/escritorio y funciona sin conexión
          VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['icons/apple-touch-icon.png'],
            manifest: {
              name: 'FisioVisual · Fisiología interactiva',
              short_name: 'FisioVisual',
              description: 'Fisiología interactiva para estudiantes de Medicina: vector cardíaco y ECG de 12 derivaciones en 3D, ciclo cardíaco, respiratorio, anatomía y autoevaluación',
              lang: 'es-ES',
              start_url: './',
              scope: './',
              display: 'standalone',
              orientation: 'any',
              background_color: '#0b0e14',
              theme_color: '#e11d48',
              categories: ['education', 'medical'],
              icons: [
                { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
                { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
                { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
              ],
            },
            workbox: {
              globPatterns: ['**/*.{js,css,html,png,svg,glb,woff2}'],
              // Las grabaciones reales (~6 MB) no se descargan al instalar la app:
              // se guardan en caché la primera vez que se escuchan
              globIgnores: ['**/audio/**'],
              // Al abrir un archivo (LICENCIAS-TERCEROS.txt, LICENCIA.txt de las grabaciones…)
              // el service worker NO debe responder con la app: solo las rutas sin extensión son la app
              navigateFallbackDenylist: [/\/[^/?]+\.[a-z0-9]+$/i],
              maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
              runtimeCaching: [
                {
                  urlPattern: ({ url }) => url.pathname.includes('/audio/'),
                  handler: 'CacheFirst',
                  options: {
                    cacheName: 'grabaciones-michigan',
                    expiration: { maxEntries: 60 },
                    rangeRequests: true,
                    cacheableResponse: { statuses: [0, 200] },
                  },
                },
              ],
            },
          }),
        ]),
  ],
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    chunkSizeWarningLimit: 1500,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}));
