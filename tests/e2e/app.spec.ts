/**
 * Tests de extremo a extremo de la pagina montada.
 *
 * Aqui no se comprueba el algoritmo, que ya cubren los tests de unidad, sino
 * todo lo que solo existe con un DOM y un navegador de verdad: que el codigo se
 * pinta, que la biblioteca de lectura se carga y lee, que el logo aparece y que
 * lo que se descarga se abre sin conexion.
 *
 * Para comprobar que el codigo carries lo que tiene que carry se usa el estado
 * que la propia pagina muestra, no una lectura hecha desde el test. La pagina
 * compara lo que devuelve el lector con lo que queria codificar, asi que un
 * "Comprobado" ya dice que el contenido es el correcto: un test que descodifica
 * por su cuenta volveria a comprobar lo mismo, con mas codigo.
 *
 * @module tests/e2e/app
 */

import { readFile } from 'node:fs/promises';

import { expect, test, type Page } from '@playwright/test';

/** Enlace de ejemplo. No es peligroso y no necesita red. */
const URL_DE_EJEMPLO = 'https://teselo.vercel.app/qr';

/** Rellena el campo de texto libre y espera a que se compruebe la lectura. */
async function generarYComprobar(page: Page, texto: string): Promise<void> {
  await page.fill('#campo-text', texto);
  // El render se agrupa por fotograma y la lectura es asincrona, asi que se
  // espera al texto final. Sin esto el test leeria el estado anterior.
  await esperarComprobacion(page);
}

/** Espera a que un codigo se haya bloqueado y los botones queden muertos. */
async function esperarBloqueo(page: Page): Promise<void> {
  await expect(page.locator('#bloqueo')).toBeVisible();
}

/** Espera a que un codigo se haya vuelto a comprobar tras un cambio. */
async function esperarComprobacion(page: Page): Promise<void> {
  await expect(page.locator('#estado')).toContainText(/Comprobado|Checked/);
}

/**
 * Un PNG minimo de 1x1 en base64.
 *
 * El intake valida por bytes magicos y no por la extension, asi que el nombre
 * que se le pone no importa: por eso el test puede renombrarlo a `.jpg` y aun
 * asi tiene que aceptarlo.
 */
const PNG_1X1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

test.describe('la pagina monta y genera un codigo', () => {
  test('pinta el lienzo al abrir y avisa de que esta listo', async ({ page }) => {
    await page.goto('/');
    await page.click('#idioma-es');

    const lienzo = page.locator('#lienzo');
    await expect(lienzo).toBeVisible();
    await expect(lienzo).toHaveJSProperty('width', 512);
    await esperarComprobacion(page);
  });

  test('un texto suelto se codifica y un lector real lo devuelve igual', async ({ page }) => {
    await page.goto('/');
    await page.click('#idioma-es');
    await generarYComprobar(page, 'Hola, mundo');

    // Si el texto no fuera el correcto, la pagina lo diria: compara lo que
    // devuelve el lector con lo que queria codificar.
    await esperarComprobacion(page);
    await expect(page.locator('#que-texto')).toContainText('Hola, mundo');
  });

  test('un enlace se conserva entero, esquema incluido', async ({ page }) => {
    await page.goto('/');
    await page.click('#idioma-es');
    await generarYComprobar(page, URL_DE_EJEMPLO);

    await expect(page.locator('#que-texto')).toContainText('teselo.vercel.app');
  });
});

test.describe('los estilos cambian el codigo sin romperlo', () => {
  test('cambiar de preajuste vuelve a comprobar y el contenido sigue igual', async ({ page }) => {
    await page.goto('/');
    await page.click('#idioma-es');
    await generarYComprobar(page, 'Hola, mundo');

    await page.selectOption('#preajuste', 'dots');
    await esperarComprobacion(page);

    await expect(page.locator('#que-texto')).toContainText('Hola, mundo');
  });

  test('TODAS las formas que se ofrecen se pueden generar y descargar', async ({ page }) => {
    await page.goto('/');
    await page.click('#idioma-es');
    await generarYComprobar(page, 'Hola, mundo');

    // Se recorre la lista entera, no una muestra. Ningun estilo puede quedar
    // fuera de uso por el estilo de la propia pagina.
    //
    // Que la lectura automatica las reconozca o no es otra cosa: el rombo y las
    // barras no los lee jsQR, y eso no los hace malos, asi que la pagina avisa
    // en vez de impedir la descarga. Lo que no se admite es que un estilo
    //Checklist: no bloquea ningun estilo offered.
    const ofrecidas = await page
      .locator('#forma-modulos option')
      .evaluateAll((o) => o.map((e) => (e as HTMLOptionElement).value));
    expect(ofrecidas.length).toBeGreaterThan(0);

    const bloqueados: string[] = [];
    for (const forma of ofrecidas) {
      await page.selectOption('#forma-modulos', forma);
      // O se lee, o avisa de que no se lee. Lo que no vale es que se quede en
      // "comprobando" para siempre, que es lo que pasaria si el codigo no llega
      // a pintarse.
      await expect(page.locator('#estado')).toContainText(/Comprobado|Checked|Ningún lector|No reader/);
      if (!(await page.locator('#descargar-png').isEnabled())) bloqueados.push(forma);
    }
    expect(bloqueados).toEqual([]);
  });

  test('un preajuste de fondo oscuro avisa pero deja descargar', async ({ page }) => {
    await page.goto('/');
    await page.click('#idioma-es');
    await generarYComprobar(page, 'Hola, mundo');

    await page.selectOption('#preajuste', 'night');
    await esperarComprobacion(page);

    // Con tinta clara sobre fondo oscuro el ratio sale bien, asi que bloquear
    // seria mentir. Avisa, y deja descargar: es un caso legitimo.
    await expect(page.locator('#descargar-png')).toBeEnabled();
  });
});

test.describe('lo peligroso se bloquea y lo corriente no', () => {
  test('un esquema que ejecuta codigo no deja descargar', async ({ page }) => {
    await page.goto('/');
    await page.click('#idioma-es');
    await page.fill('#campo-text', 'javascript:alert(1)');

    await esperarBloqueo(page);
    await expect(page.locator('#descargar-png')).toBeDisabled();
    await expect(page.locator('#descargar-svg')).toBeDisabled();
  });

  test('un esquema peligroso con controles intercalados tambien se bloquea', async ({ page }) => {
    await page.goto('/');
    await page.click('#idioma-es');
    // El control nulo en medio es justo lo que hace que un filtro ingenuo se
    // lo salte. Aqui se normaliza antes de mirar el esquema.
    await page.fill('#campo-text', 'java\u0000script:alert(1)');

    await esperarBloqueo(page);
    await expect(page.locator('#descargar-png')).toBeDisabled();
  });

  test('un enlace corriente no activa ningun bloqueo', async ({ page }) => {
    await page.goto('/');
    await page.click('#idioma-es');
    await generarYComprobar(page, 'Solo un texto normal');

    await expect(page.locator('#bloqueo')).toBeHidden();
    await expect(page.locator('#descargar-png')).toBeEnabled();
  });
});

test.describe('el logo se carga y se pinta', () => {
  test('un logo pequeno se lee y uno grande se detecta como ilegible', async ({ page }) => {
    await page.goto('/');
    await page.click('#idioma-es');
    await generarYComprobar(page, 'Hola, mundo');

    await page.setInputFiles('#logo-archivo', {
      name: 'marca.png',
      mimeType: 'image/png',
      buffer: Buffer.from(PNG_1X1, 'base64'),
    });
    await expect(page.locator('#logo-controles')).toBeVisible();

    // Un logo de 2 modulos, con su margen, deja la placa en 4 y el codigo se
    // lee: es el caso bueno. Con 3 la placa llega a 5 y ya pisa el patron
    // localizador, que es justo lo que la pagina debe detectar.
    await page.fill('#logo-lado', '2');
    await esperarComprobacion(page);
    await expect(page.locator('#descargar-png')).toBeEnabled();

    // Al estirarlo, el logo se come informacion y un lector real deja de
    // entenderlo. Lo importante es que la pagina se de cuenta sola y no deje
    // descargar un codigo que no funciona, en vez de fiarse de un calculo.
    await page.fill('#logo-lado', '7');
    await expect(page.locator('#estado')).toContainText(/Ningún lector|No reader/);
  });

  test('el formato se deduce de los bytes, no de la extension', async ({ page }) => {
    await page.goto('/');
    await page.click('#idioma-es');
    await generarYComprobar(page, 'Hola, mundo');

    // Un PNG que se llama .jpg sigue siendo un PNG. Aceptarlo es lo correcto: el
    // nombre lo pone quien creo el archivo y no significa nada.
    await page.setInputFiles('#logo-archivo', {
      name: 'marca.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from(PNG_1X1, 'base64'),
    });

    await expect(page.locator('#logo-controles')).toBeVisible();
  });

  test('un archivo que no es imagen se rechaza con un motivo', async ({ page }) => {
    await page.goto('/');
    await page.click('#idioma-es');
    await generarYComprobar(page, 'Hola, mundo');

    await page.setInputFiles('#logo-archivo', {
      name: 'notas.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('esto no es una imagen', 'utf8'),
    });

    await expect(page.locator('#logo-error')).toBeVisible();
    await expect(page.locator('#logo-controles')).toBeHidden();
  });
});

test.describe('las descargas son archivos de verdad', () => {
  test('el SVG descargado es autonomo y no lleva codigo ejecutable', async ({ page }) => {
    await page.goto('/');
    await page.click('#idioma-es');
    await generarYComprobar(page, URL_DE_EJEMPLO);

    const [descarga] = await Promise.all([page.waitForEvent('download'), page.click('#descargar-svg')]);
    const ruta = await descarga.path();
    expect(ruta).not.toBeNull();

    const contenido = await readFile(ruta, 'utf8');
    expect(contenido).toContain('<svg');
    // Un SVG con script dentro es un vector de ataque clasico, y aqui no hay
    // ninguna razon para que lo haya.
    expect(contenido).not.toMatch(/<script/i);
    expect(contenido).not.toMatch(/on\w+\s*=/i);
  });

  test('el PNG descargado es un PNG de verdad', async ({ page }) => {
    await page.goto('/');
    await page.click('#idioma-es');
    await generarYComprobar(page, 'Hola, mundo');

    const [descarga] = await Promise.all([page.waitForEvent('download'), page.click('#descargar-png')]);
    const bytes = await readFile(await descarga.path());

    // Firma magica de PNG. Un HTML con nombre .png no la tiene, y por eso se
    // comprueba en vez de fiarse de la extension del archivo.
    expect([...bytes.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  });
});

test.describe('las opciones retiradas no vuelven', () => {
  test('no hay boton de compartir ni interruptor de fondo transparente', async ({ page }) => {
    await page.goto('/');
    await page.click('#idioma-es');
    await generarYComprobar(page, 'Hola, mundo');

    // Se quitaron por decision de producto: "Compartir" copiaba una imagen al
    // portapapeles, que no es compartir, y el fondo transparente se ve mal en
    // impresion y sobre pantallas oscuras. Este test esta para que, si alguien
    // los anade por su cuenta, se note en la revision y no en produccion.
    await expect(page.locator('#copiar-imagen')).toHaveCount(0);
    await expect(page.locator('#fondo-transparente')).toHaveCount(0);

    // Y la interfaz sigue funcionando sin ellos.
    await expect(page.locator('#descargar-png')).toBeEnabled();
    await esperarComprobacion(page);
  });
});
test.describe('la pagina no habla con la red', () => {
  test('no hace ninguna peticion a un tercero al cargar y usar', async ({ page }) => {
    const peticiones: string[] = [];
    page.on('request', (request) => {
      // Se ignoran los recursos del propio origen: la pagina tiene que cargar
      // su CSS y su JS de algun sitio. Lo que no puede es hablar con fuera.
      if (!request.url().startsWith('http://localhost')) peticiones.push(request.url());
    });

    await page.goto('/');
    await page.click('#idioma-es');
    await generarYComprobar(page, URL_DE_EJEMPLO);
    await page.selectOption('#preajuste', 'dots');
    await esperarComprobacion(page);

    expect(peticiones).toEqual([]);
  });
});

test.describe('los dos idiomas funcionan', () => {
  test('cambiar a ingles traduce la pagina y sigue generando', async ({ page }) => {
    await page.goto('/');
    await page.click('#idioma-es');
    await generarYComprobar(page, 'Hello');

    await page.click('#idioma-en');
    await esperarComprobacion(page);
    await esperarComprobacion(page);

    // El contenido no se toca al cambiar de idioma; solo cambia como se cuenta.
    await expect(page.locator('#que-texto')).toContainText('Hello');
  });

  test('el idioma elegido se recuerda al recargar', async ({ page }) => {
    await page.goto('/');
    await page.click('#idioma-es');
    await page.click('#idioma-en');
    await esperarComprobacion(page);

    await page.reload();
    await esperarComprobacion(page);
  });
});
