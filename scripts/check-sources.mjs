/**
 * Guard de integridad del codigo fuente.
 *
 * Comprueba dos cosas que no se ven al compilar ni al ejecutar los tests:
 *
 *  1. Que no se colen caracteres de alfabetos que no corresponden. Un texto
 *     corrupto en un mensaje de la interfaz o en un comentario no rompe nada
 *     de forma visible: compila, los tests pasan, y lo descubre el usuario en
 *     produccion. Este control existe porque ese fallo se dio mas de una vez
 *     durante el desarrollo de este proyecto.
 *
 *  2. Que el arbol de trabajo no traiga archivos que nunca deben versionarse.
 *
 * Se ejecuta en Node, antes de compilar, y falla el proceso si encuentra algo.
 *
 * @module scripts/check-sources
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');

/** Extensiones con texto legible donde tiene sentido esta comprobacion. */
const TEXT_EXTENSIONS = new Set(['.ts', '.js', '.mjs', '.cjs', '.json', '.html', '.css', '.md', '.yml', '.yaml', '.svg']);

/** Directorios que nunca se recorren. */
const SKIP_DIRECTORIES = new Set(['node_modules', 'dist', '.git', 'coverage', 'playwright-report', 'test-results', '.vite']);

/**
 * Rangos de caracteres admitidos.
 *
 * Es una lista blanca. Una lista negra de "scripts prohibidos" dejaria pasar
 * cirilico, arabe o tailandes, que en un proyecto en espanol tampoco son
 * correctos. Con lista blanca, cualquier cosa no contemplada salta a la vista.
 */
const ALLOWED_RANGES = [
  [0x0000, 0x007f], // ASCII
  [0x00a0, 0x00ff], // Latin-1 Supplement: acentos, enye, interrogaciones
  [0x0100, 0x017f], // Latin Extended-A
  [0x2010, 0x2027], // Guiones y comillas tipograficas
  [0x2030, 0x205e], // Puntuacion: puntos suspensivos y comillas angulares
  [0x20a0, 0x20bf], // Signos de moneda
  [0x2190, 0x21ff], // Flechas
  [0x2212, 0x2212], // Signo menos
];

/** Nombre legible de un caracter fuera de rango, para el mensaje de error. */
function describeChar(char) {
  return `U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')} (${JSON.stringify(char)})`;
}

/**
 * Caracteres de control que si se admiten.
 *
 * El rango ASCII de arriba entra entero, y con el entran tambien el BEL, el ESC
 * y el resto de controles invisibles. Esos no son "caracteres raros": se
 * cuelan al escribir el texto y se comen la primera letra de una palabra, asi
 * que el resultado es un identificador o un mensaje que parece correcto y no lo
 * es. Solo el salto de linea y el tabulador tienen una razon de existir aqui.
 */
const ALLOWED_CONTROL_CHARS = new Set(['\n', '\r', '\t']);

/** Caracteres de control que no estan en la lista de admitidos. */
function findControlChars(text, name) {
  const problems = [];
  for (const char of text) {
    const code = char.codePointAt(0);
    if (code >= 0x20 || code === 0x09 || ALLOWED_CONTROL_CHARS.has(char)) continue;
    problems.push(`${name}  tiene un caracter de control invisible  ${describeChar(char)}`);
  }
  return problems;
}

/** Archivos que no deben estar en el arbol de trabajo. */
const FORBIDDEN_PATHS = [
  { suffix: '.idea', reason: 'configuracion del IDE de JetBrains' },
  { suffix: '.vscode', reason: 'configuracion del IDE de VS Code' },
  { suffix: '.DS_Store', reason: 'archivo de Finder' },
  { suffix: 'Thumbs.db', reason: 'archivo de Windows' },
];

/**
 * Recorre el arbol de archivos con una funcion, saltando lo que no interesa.
 *
 * La funcion recibe cada ruta y un segundo argumento que dice si es un
 * directorio. Hace falta porque hay prohibidos que son directorios enteros,
 * como `.idea`, y comparar solo el nombre del archivo no los detectaria nunca.
 *
 * @param {string} directory - Directorio por el que empezar.
 * @param {(path: string, isDirectory: boolean) => void} visit - Que hacer con cada ruta.
 */
function walk(directory, visit) {
  for (const entry of readdirSync(directory)) {
    if (SKIP_DIRECTORIES.has(entry)) continue;
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      visit(full, true);
      walk(full, visit);
    } else {
      visit(full, false);
    }
  }
}

/**
 * Busca caracteres fuera de los rangos admitidos en un archivo de texto.
 *
 * @returns Lista de descripciones de los problemas encontrados.
 */
function findBadCharacters(path) {
  const text = readFileSync(path, 'utf8');
  const problems = [];
  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    for (const char of line) {
      const code = char.codePointAt(0);
      const allowed = ALLOWED_RANGES.some(([low, high]) => code >= low && code <= high);
      if (!allowed) {
        problems.push(`${relative(ROOT, path)}:${index + 1}  ${describeChar(char)}`);
      }
    }
  });

  return problems;
}

/**
 * Comprueba que no haya archivos ni directorios prohibidos.
 *
 * Un directorio prohibido se reporta una sola vez, en el propio directorio, y
 * no en cada archivo que contiene. Si no, un `.idea` con veinte archivos
 * produciria veinte lineas diciendo exactamente lo mismo.
 *
 * Se preguntan por archivos, pero aqui importa mas que esten ignorados que que
 * no existan. Un `.idea` lo crea el editor de la persona que trabaja aqui cada
 * vez que abre el proyecto, asi que exigir que no exista solo haria que el build
 * fallara por tener el IDE abierto. Lo que no puede pasar es que acaben
 * versionados, y de eso ya se encarga `.gitignore`. El guard avisa de lo que no
 * esta ignorado, que es lo unico que de verdad se colaria.
 */
function findForbiddenPaths() {
  const problems = [];
  const ignored = readGitignore();
  walk(ROOT, (path, isDirectory) => {
    const name = path.split(sep).pop();
    for (const rule of FORBIDDEN_PATHS) {
      if (name !== rule.suffix && !name.endsWith(rule.suffix)) continue;
      // Un archivo prohibido que cuelga de un directorio ya prohibido no
      // aporta nada: el directorio ya se ha senalado.
      if (!isDirectory && name !== rule.suffix) continue;
      if (isIgnored(relative(ROOT, path), isDirectory, ignored)) continue;
      problems.push(`${relative(ROOT, path)}  ${rule.reason}`);
    }
  });
  return problems;
}

/** Patrones de `.gitignore` que empiezan por `!`, que es lo unico que se usa. */
const NEGATIONS = /^\s*!/;

/**
 * Lee los patrones de `.gitignore`.
 *
 * Se queda con los comentarios fuera y con las excepciones: un `.gitignore` con
 * `!.vscode/settings.json` significa que ese archivo si se versiona, asi que no
 * puede tratarse como prohibido por estar dentro de `.vscode`.
 *
 * @returns {string[]} Patrones sin la marca de negacion.
 */
function readGitignore() {
  const file = join(ROOT, '.gitignore');
  if (statSync(file, { throwIfNoEntry: false }) === undefined) return [];
  return readFileSync(file, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#') && !NEGATIONS.test(line));
}

/**
 * Dice si una ruta esta cubierta por un patron de `.gitignore`.
 *
 * Solo implementa lo que este repositorio usa de verdad: un nombre suelto, que
 * vale en cualquier nivel, y una barra al final, que significa "todo lo que
 * cuelgue de aqui". No es un evaluador de `.gitignore` completo, y no pretende
 * serlo: si algun dia hace falta mas, este sitio es el que hay que ampliar.
 *
 * @param {string} path - Ruta relativa al repositorio, con `/` como separador.
 * @param {boolean} isDirectory - Si la ruta es un directorio.
 * @param {string[]} patterns - Patrones de `.gitignore`.
 * @returns {boolean} `true` si el patron cubre la ruta.
 */
function isIgnored(path, isDirectory, patterns) {
  const normalized = path.split(sep).join('/');
  const parts = normalized.split('/');
  return patterns.some((pattern) => {
    const clean = pattern.endsWith('/') ? pattern.slice(0, -1) : pattern;
    if (clean.startsWith('/')) return normalized === clean.slice(1);
    if (clean.includes('/')) return normalized === clean || normalized.startsWith(`${clean}/`);
    // Un patron sin barra vale en cualquier nivel, y si es directorio vale
    // tambien para todo lo que lleva dentro.
    return parts.includes(clean) || (isDirectory && parts[0] === clean);
  });
}

const badCharacters = [];
const invisibleCharacters = [];
const forbiddenPaths = findForbiddenPaths();

walk(ROOT, (path) => {
  if (extname(path) === '.mjs' || TEXT_EXTENSIONS.has(extname(path))) {
    badCharacters.push(...findBadCharacters(path));
    invisibleCharacters.push(...findControlChars(readFileSync(path, 'utf8'), relative(ROOT, path)));
  }
});

if (forbiddenPaths.length > 0) {
  console.error('\nArchivos que no deben estar en el repositorio:\n');
  for (const problem of forbiddenPaths) console.error(`  ${problem}`);
}

if (badCharacters.length > 0) {
  console.error('\nCaracteres de alfabetos no admitidos:\n');
  for (const problem of badCharacters) console.error(`  ${problem}`);
}

if (invisibleCharacters.length > 0) {
  console.error('\nCaracteres invisibles que se han colado en el texto:\n');
  for (const problem of invisibleCharacters) console.error(`  ${problem}`);
}

const total = badCharacters.length + invisibleCharacters.length + forbiddenPaths.length;
if (total > 0) {
  console.error(`\n${total} problema(s) de integridad. Revisa el archivo de docs/para-contribuir.md.\n`);
  process.exit(1);
}

console.log('Integridad del codigo fuente correcta.');
