/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { VitePWA } from 'vite-plugin-pwa';

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
          // PWA: instalable en el móvil/escritorio y funciona sin conexión
          VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['icons/apple-touch-icon.png'],
            manifest: {
              name: 'Simulador ECG 3D',
              short_name: 'ECG 3D',
              description: 'Simulador educativo del vector cardíaco en 3D y del ECG de 12 derivaciones',
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
