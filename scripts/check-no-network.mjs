/**
 * Guard de red: la aplicacion no debe poder hacer peticiones salientes.
 *
 * La promesa de Efímero es que todo se procesa en el equipo de quien lo usa. Eso
 * solo es creible si esta prohibido, no si se promete. Este script lee el
 * bundle ya compilado y falla si encuentra una API de red.
 *
 * Se comprueba el bundle y no el codigo fuente a proposito: asi se pillan tanto
 * las llamadas escritas a mano como las que introduce alguna dependencia sin
 * que nadie lo note al leer el repositorio.
 *
 * @module scripts/check-no-network
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const SRC = join(ROOT, 'src');

/**
 * APIs que pueden sacar datos del equipo.
 *
 * Se lista tambien `WebSocket` y `EventSource` porque son las que se olvida
 * alguien cuando hace una lista, y las dos hacen exactamente lo mismo.
 */
const NETWORK_APIS = [
  { pattern: /\bfetch\s*\(/, name: 'fetch()' },
  { pattern: /\bXMLHttpRequest\b/, name: 'XMLHttpRequest' },
  { pattern: /\bWebSocket\b/, name: 'WebSocket' },
  { pattern: /\bEventSource\b/, name: 'EventSource' },
  { pattern: /\bsendBeacon\b/, name: 'navigator.sendBeacon()' },
  { pattern: /\bimportScripts\s*\(/, name: 'importScripts()' },
];

/**
 * Claves de almacenamiento que si se permiten, con el motivo.
 *
 * La promesa de Efímero es que el contenido del codigo no se guarda ni sale del
 * equipo. No es "no se toca nada el disco": la preferencia de idioma tiene que
 * sobrevivir a una recarga, y no por descuido sino porque una persona que la
 * cambia espera que se mantenga.
 */
const ALLOWED_STORAGE_KEYS = new Set(['efimero.locale']);

/**
 * Cuantas veces puede aparecer `localStorage` en el bundle.
 *
 * Aqui hay una limitacion que conviene dejar escrita: la clave NO se puede
 * comprobar en el bundle. El minificador la sube a una constante del modulo, y
 * la llamada queda como `localStorage.getItem(Tt)`, con la clave real en otro
 * sitio. Anyadir el flag `g` a un patron mas laxo daria "0 llamadas" y el
 * guard pasaria sin haber mirado nada.
 *
 * Asi que se cuentan las apariciones del identificador, que la minificacion no
 * puede disimular, y se exige que sean exactamente las que permite la lista de
 * claves. Si alguien anade otra llamada, el numero sube y el guard falla
 * diciendo que la anada a la lista con su justificacion. La clave de cada
 * llamada si se comprueba, pero en el codigo fuente, que es donde se lee.
 */
const ALLOWED_STORAGE_MENTIONS = 2;

/**
 * Almacenamiento que no se admite en ninguna circunstancia.
 *
 * `sessionStorage` muere con la pestana, asi que no aporta nada y solo hace
 * ruido. `indexedDB` y las cookies son persistentes y globales para todo el
 * origen: un generador de QR no tiene ninguna razon para escribir ahi.
 */
const FORBIDDEN_STORAGE_APIS = [
  { pattern: /\bsessionStorage\b/, name: 'sessionStorage' },
  { pattern: /\bindexedDB\b/, name: 'indexedDB' },
  { pattern: /\bdocument\.cookie\b/, name: 'document.cookie' },
];

/**
 * Claves de almacenamiento declaradas en el codigo fuente.
 *
 * Recorre `src/` buscando las llamadas de almacenamiento y comprueba la clave
 * que reciben. Aqui si se puede leer la clave, porque en el fuente cada llamada
 * usa una constante con nombre o un literal, y ninguno de los dos se disimula al
 * compilar.
 *
 * Se cubren las dos formas por separado porque un literal suelto es
 * precisamente el caso peligroso: `setItem('qr', texto)` se escribe sin
 * pensar, mientras que `setItem(STORAGE_KEY, ...)` obliga a declarar el nombre
 * de la clave en algun sitio visible.
 *
 * @returns Lista de problemas, vacia si todo cuadra.
 */
function findForeignSourceKeys() {
  const problems = [];
  const calls = /(?:localStorage|sessionStorage|indexedDB)\s*\??\.\s*\w+\s*\(\s*("[^"]*"|'[^']*'|`[^`]*`|[A-Za-z_$][\w$]*)/g;

  for (const path of collect(SRC, (file) => file.endsWith('.ts'))) {
    const text = readFileSync(path, 'utf8');
    const name = relative(ROOT, path);

    for (const match of text.matchAll(calls)) {
      const argument = match[1];

      // Un literal se comprueba tal cual.
      if (argument.startsWith('"') || argument.startsWith("'") || argument.startsWith('`')) {
        const key = argument.slice(1, -1);
        if (!ALLOWED_STORAGE_KEYS.has(key)) {
          problems.push(`${name}  guarda en la clave literal "${key}", que no esta permitida`);
        }
        continue;
      }

      // Una constante se resuelve a su valor antes de juzgarla.
      const value = new RegExp(`\\b${argument}\\s*[:=]\\s*['"\`]([^'"\`]*)['"\`]`).exec(text);
      if (value === null) {
        problems.push(`${name}  escribe en la clave "${argument}", que no es un literal ni una constante con valor`);
      } else if (!ALLOWED_STORAGE_KEYS.has(value[1])) {
        problems.push(`${name}  declara la clave "${value[1]}", que no esta permitida`);
      }
    }
  }
  return problems;
}

/** Recorre un directorio y devuelve los archivos que cumplen un filtro. */
function collect(directory, accept) {
  if (!statSync(directory, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error(`No existe ${directory}. El build tiene que ejecutarse antes de este guard.`);
  }
  const found = [];
  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      found.push(...collect(full, accept));
    } else if (accept(full)) {
      found.push(full);
    }
  }
  return found;
}

/**
 * Cuenta las apariciones de un patron, para el mensaje de error.
 *
 * `matchAll` exige el flag `g` y lanza si falta, asi que se anade aqui. Los
 * patrones se declaran sin el porque son mas faciles de leer asi, y porque
 * anadirlo en la definicion haria que un `test` con ellos se comportase de
 * otra manera.
 */
function countMatches(text, pattern) {
  return [...text.matchAll(new RegExp(pattern.source, `${pattern.flags}g`))].length;
}

const files = collect(DIST, (path) => path.endsWith('.js'));
const problems = [];
let storageMentions = 0;

for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const name = relative(ROOT, file);

  for (const api of NETWORK_APIS) {
    const hits = countMatches(text, api.pattern);
    if (hits > 0) {
      problems.push(`${name}  usa ${api.name} (${hits} vez/veces)`);
    }
  }
  for (const api of FORBIDDEN_STORAGE_APIS) {
    const hits = countMatches(text, api.pattern);
    if (hits > 0) {
      problems.push(`${name}  usa ${api.name} (${hits} vez/veces)`);
    }
  }

  storageMentions += countMatches(text, /\blocalStorage\b/);
}

if (storageMentions > ALLOWED_STORAGE_MENTIONS) {
  problems.push(
    `el bundle menciona localStorage ${storageMentions} veces y solo se permiten ` +
      `${ALLOWED_STORAGE_MENTIONS}. Cada llamada nueva tiene que justifiable aqui: ` +
      `la preferencia de idioma es lo unico que Efímero guarda.`,
  );
}

problems.push(...findForeignSourceKeys());

if (problems.length > 0) {
  console.error('\nLa aplicacion no cumple su promesa de funcionar sin red:\n');
  for (const problem of problems) console.error(`  ${problem}`);
  console.error('\nUn generador de QR que se lleva el contenido del usuario a un servidor no es un generador de QR.');
  console.error('Si la API detectada es inevitable, marcala con una excepcion explicita en este script.\n');
  process.exit(1);
}

console.log(
  `Sin APIs de red en el codigo de la aplicacion (${files.length} archivo(s) de dist/). ` +
    `Almacenamiento: ${storageMentions} mencion(es) a localStorage, ` +
    `claves de fuente: ${[...ALLOWED_STORAGE_KEYS].join(', ')}.`,
);
