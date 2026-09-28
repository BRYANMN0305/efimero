/**
 * Carga de la libreria de codificacion de terceros para los tests.
 *
 * El codigo de `public/vendor/qrcodegen.js` es un script clasico: compila el
 * espacio de nombres a `var qrcodegen` en el ambito global. En el navegador eso
 * funciona con una etiqueta `<script>`; en Node, donde los modulos tienen su
 * propio ambito, un `import` lo dejaria encerrado y el resto del proyecto no lo
 * veria.
 *
 * En vez de renombrar el archivo o duplicarlo con un envoltorio, lo que se hace
 * aqui es ejecutarlo tal cual, con su ambito propio, y colocar el resultado en
 * el global. Asi el archivo que se prueba es exactamente el mismo que se envia
 * al navegador, byte a byte, que es justo lo que se quiere comprobar.
 *
 * @module tests/setup-vendor
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const VENDOR_PATH = fileURLToPath(new URL('../public/vendor/qrcodegen.js', import.meta.url));

const source = readFileSync(VENDOR_PATH, 'utf8');

/**
 * Ejecuta el script y devuelve lo que deja en su ambito.
 *
 * Se usa `Function` y no `eval` para que el codigo corra con su propio ambito
 * en lugar de contaminar el del modulo. El archivo empieza con `"use strict"`,
 * asi que su `var qrcodegen` se queda dentro de la funcion.
 */
function runVendorScript(code: string): unknown {
  return new Function(`${code}\nreturn qrcodegen;`)();
}

const api = runVendorScript(source) as Record<string, unknown> | undefined;

const qrCode = api?.QrCode as { name?: unknown } | undefined;
const qrSegment = api?.QrSegment as { makeEci?: unknown } | undefined;

if (typeof qrCode?.name !== 'string' || typeof qrSegment?.makeEci !== 'function') {
  // Un fallo aqui significa que el archivo de `public/vendor` no es el que se
  // espera. Es preferible que todos los tests se caigan con un mensaje claro
  // que descubrirlo en el primer test que lo use.
  throw new Error(
    `No se pudo cargar ${VENDOR_PATH}: el archivo no expone la API esperada de qrcodegen. ` +
      'Comprueba que el codigo de terceros no se haya modificado a mano; su checksum lo verifica `npm run check:vendor`.',
  );
}

(globalThis as unknown as { qrcodegen: unknown }).qrcodegen = api;
