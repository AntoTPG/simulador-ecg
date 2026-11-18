/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `base: './'` → rutas relativas: la misma build sirve para cualquier hosting
// estático, para Tauri (escritorio) y para Capacitor (Android/iOS).
//
// `npm run build:single` (modo "single") genera UN ÚNICO archivo HTML con todo
// incrustado, que se puede mandar por correo/WhatsApp y abrir con doble clic
// sin servidor (aunque así no se instala como PWA).
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), ...(mode === 'single' ? [viteSingleFile()] : [])],
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    chunkSizeWarningLimit: 1500,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}));
