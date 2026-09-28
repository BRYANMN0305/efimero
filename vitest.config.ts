/**
 * Configuracion de Vitest.
 *
 * Va en su propio archivo, y no como campo `test` dentro de `vite.config.ts`,
 * para que las opciones de test no contaminen la configuracion de build ni
 * mezclen los tipos de Vite con los de Vitest.
 */

import { defineConfig } from 'vitest/config';

import { buildDefines } from './scripts/build-info.mjs';

export default defineConfig({
  /**
   * Los mismos identificadores que inyecta `vite.config.ts`. Sin esto, importar
   * `src/build-info.ts` en un test lanzaria un ReferenceError, porque el tipo de
   * los valores lo declara TypeScript pero el valor solo existe al compilar.
   */
  define: buildDefines(),

  test: {
    /**
     * `jsdom` no es una dependencia. Todo el codigo de este proyecto que se
     * puede testear de forma util (codificacion, payloads, seguridad,
     * diagnostico de escaneabilidad) es logica pura y funciona en Node. El DOM
     * se ejercita en los tests end-to-end de Playwright, con un navegador de
     * verdad, que es donde un DOM falso seria menos fiable que uno real.
     */
    environment: 'node',

    include: ['tests/**/*.test.ts'],

    /**
     * El codigo de terceros se carga en el global antes de cada archivo de test.
     * `tests/setup-vendor.ts` explica por que hace falta y por que no se
     * modifica el archivo original.
     */
    setupFiles: ['tests/setup-vendor.ts'],

    /** Se ejecutan en paralelo por archivo. Cada test es independiente. */
    isolate: true,
    pool: 'threads',

    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/vendor/**', 'src/globals.d.ts', 'src/main.ts'],
      reporter: ['text', 'html', 'lcov'],
      /**
       * Umbrales deliberados no-altos. La app tiene mucha presentacion y
       * bindings de DOM, que un umbral alto de ramas marcaria como no cubierto
       * sin ganar nada. Lo que si se exige es 100% de lineas en el nucleo
       * critico, y eso se comprueba con `coverage.include` en el job de CI.
       */
      thresholds: {
        lines: 80,
        functions: 75,
        branches: 70,
        statements: 80,
      },
    },
  },
});
