/**
 * Paridad de traducciones en tiempo de ejecucion.
 *
 * El tipo `Record<MessageKey, string>` ya obliga a que `en.ts` tenga todas las
 * claves de `es.ts` en tiempo de compilacion. Eso no es suficiente por dos
 * motivos:
 *
 *  1. Solo mira las claves que existen en TypeScript. Una clave anadida a mano
 *     en `es.ts` y olvidada en `en.ts` la detecta el compilador; una clave
 *     anadida con un comentario que la oculta, no.
 *  2. No mira los marcadores de interpolacion. Una traduccion puede tener
 *     `{url}` y la otra `{link}`: los tipos los dan por buenos y el error solo
 *     aparece en pantalla, con un `{link}` literal donde deberia ir un enlace.
 *
 * @module scripts/check-i18n
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const ESPANOL = join(ROOT, 'src/i18n/es.ts');
const INGLES = join(ROOT, 'src/i18n/en.ts');

/**
 * Extrae las claves de un archivo de traduccion.
 *
 * Se leen los literales de las claves con una expresion regular en vez de
 * importar el modulo. Es menos preciso que importarlo, pero evita arrancar
 * TypeScript y tener que compilarlo, y para la forma que tienen estos archivos,
 * una linea por clave, no hay ambiguedad.
 *
 * @param {string} text - Contenido del archivo.
 * @returns Mapa de clave a valor de la traduccion.
 */
function parseCatalog(text) {
  const catalog = new Map();
  const line = /^\s*'([a-zA-Z0-9.]+)':\s*(?:'((?:[^'\\]|\\.)*)'|\n?\s*'((?:[^'\\]|\\.)*)')/gm;
  let match;
  while ((match = line.exec(text)) !== null) {
    const key = match[1];
    // Una clave puede partir su valor en varias cadenas seguidas para que el
    // texto quepa en el ancho del editor. Se concatenan todas.
    const pieces = [match[2], match[3]].filter((piece) => piece !== undefined);
    catalog.set(key, pieces.join(''));
  }
  return catalog;
}

/** Devuelve los marcadores de interpolacion de un texto, ordenados. */
function placeholders(value) {
  return [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

const es = parseCatalog(readFileSync(ESPANOL, 'utf8'));
const en = parseCatalog(readFileSync(INGLES, 'utf8'));

if (es.size === 0) {
  console.error(
    `No se encontro ninguna clave en ${ESPANOL}. El formato del archivo ha cambiado y el guard hay que actualizarlo.`,
  );
  process.exit(1);
}

const problems = [];

for (const key of es.keys()) {
  if (!en.has(key)) {
    problems.push(`falta en en.ts  ${key}`);
    continue;
  }
  const expected = placeholders(es.get(key));
  const actual = placeholders(en.get(key));
  if (expected.join(',') !== actual.join(',')) {
    problems.push(
      `marcadores distintos  ${key}\n` + `      es.ts  {${expected.join('} {')}}\n` + `      en.ts  {${actual.join('} {')}}`,
    );
  }
}

for (const key of en.keys()) {
  if (!es.has(key)) {
    problems.push(`sobra en en.ts  ${key}`);
  }
}

if (problems.length > 0) {
  console.error(`\nLas traducciones no cuadran (${problems.length} problema/s):\n`);
  for (const problem of problems) console.error(`  ${problem}`);
  console.error('\nes.ts es la fuente de verdad. Toda clave debe existir en ambos idiomas con los mismos marcadores.\n');
  process.exit(1);
}

console.log(`Traducciones coherentes: ${es.size} clave(s) en espanol e ingles, con los mismos marcadores.`);
