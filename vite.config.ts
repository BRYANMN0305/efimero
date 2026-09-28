/**
 * Configuracion de Vite para el sitio y para la biblioteca de codificacion.
 *
 * Las decisiones de aqui estan justificadas en `docs/architecture.md`; los
 * comentarios explican solo por que se ha hecho algo distinto de la
 * configuracion por defecto de Vite.
 */

import { defineConfig } from 'vite';

import { buildDefines } from './scripts/build-info.mjs';

export default defineConfig({
  /**
   * Rutas relativas, no con barra inicial.
   *
   * Sirve para dos cosas a la vez: permite abrir la carpeta `dist` con doble
   * clic desde el disco (modo `file://`) y hace que el build offline de un
   * solo archivo funcione sin tener que reescribir las referencias.
   */
  base: './',

  define: buildDefines(),

  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,

    /**
     * Sin inlining. Un recurso de menos de 4 KB se metería dentro del archivo
     * JavaScript como un `data:` URI, y eso estorba: los mapas de fuentes
     * dejan de poder resolverse y el HTML generado deja de ser legible. El
     * bundle es pequeno de todos modos.
     */
    assetsInlineLimit: 0,

    /**
     * Un unico archivo de JavaScript y uno de CSS. No se usa
     * `vite-plugin-singlefile` porque obliga a incrustar los scripts en linea,
     * y eso es incompatible con `script-src 'self'` sin `unsafe-inline`.
     */
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },

    /** Reporta el tamano de cada asset al final de la compilacion. */
    reportCompressedSize: true,

    /**
     * Sin polyfill de `modulepreload`.
     *
     * Vite lo anade por defecto y usa `fetch()` para ir adelantando los modulos
     * del grafo. Aqui sobra por dos razones: son unos 400 bytes de polyfill que
     * solo se ejecutan en navegadores sin soporte, y el guard de red ve un
     * `fetch` en el bundle que no es codigo nuestro. Perder el precargado en un
     * navegador antiguo no rompe nada: los enlaces se ignoran y los modulos se
     * cargan en orden, que es mas lento y nada mas.
     */
    modulePreload: { polyfill: false },
  },

  server: {
    port: 5173,
    strictPort: false,
    open: false,
  },

  preview: {
    port: 4173,
    strictPort: false,
  },
});
