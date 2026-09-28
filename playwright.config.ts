/**
 * Configuracion de los tests end-to-end.
 *
 * Estos tests son los unicos que usan un DOM de verdad y un navegador de verdad.
 * Para el resto, `vitest.config.ts` usa Node a proposito: un DOM simulado da
 * una falsa seguridad en justo lo que mas lo necesita, que es medir tamanos y
 * leer pixeles de un lienzo.
 */

import { defineConfig, devices } from '@playwright/test';

/** Puerto del servidor de pruebas. Fijado para que no dependa de lo que haya libre. */
const PORT = 4173;

/**
 * Navegadores contra los que se prueba.
 *
 * Se prueban los navegadores ya instalados en el sistema en vez del Chromium
 * que baja Playwright, por dos razones. La practica es que `npx playwright
 * install` descarga unos 150 MB desde la red, y esta pagina no puede depender
 * de red ni para probarse. Y la segunda es mas interesante: lo que importa es
 * que el codigo funcione en los navegadores que la gente tiene, no en una
 * version concreta empaquetada. Edge y Chrome comparten motor, asi que entre los
 * dos se cubren Blink, y el CSS y el lienzo se portan bien.
 *
 * Si algun dia se anade un motor mas, como WebKit o Gecko, se anade aqui una
 * entrada mas con su `channel` y ya esta.
 */
const BROWSERS = [{ channel: 'chrome' }, { channel: 'msedge' }] as const;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,

  /**
   * En local se deja que Playwright decida cuantos workers abrir. En CI se
   * limita a uno, porque los runners vienen con dos nucleos y abrir mas solo
   * produce pruebas mas lentas y errores de tiempo.
   *
   * La propiedad se anade solo cuando tiene valor: el proyecto usa
   * `exactOptionalPropertyTypes`, que distingue "no esta" de "esta a
   * undefined", y asignarle `undefined` a proposito es un error de tipos.
   */
  ...(process.env.CI ? { workers: 1 } : {}),

  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: BROWSERS.map((browser) => ({
    name: browser.channel,
    use: { ...devices['Desktop Chrome'], channel: browser.channel },
  })),

  /**
   * Levanta el build real, no el servidor de desarrollo. La diferencia importa
   * para lo que se comprueba aqui: la CSP solo existe en el build, y un test
   * end-to-end que pasara contra el dev server no probaria nada de la
   * configuracion de seguridad que importa.
   */
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
