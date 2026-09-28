/**
 * Lista los simbolos publicos que el barril de `qr` exporta y que ningun otro
 * archivo del repositorio menciona.
 *
 * No es lo mismo que "no se usa": un simbolo puede estar exportado para los
 * tests, y eso es legitimo porque son la parte que comprueba el contrato. Lo
 * que se busca es lo que no lo menciona NADA, ni la aplicacion ni los tests,
 * que es codigo que se mantiene sin que nada lo exercise.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const SKIP = new Set(['node_modules', 'dist', '.git', 'coverage', 'playwright-report', 'test-results', 'vendor']);

/** Todos los archivos de codigo del repositorio. */
function collect(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collect(full, out);
    else if (/\.(ts|mjs)$/.test(entry)) out.push(full);
  }
  return out;
}

const archivos = collect(ROOT);
const BARRIL = join(ROOT, 'src', 'qr', 'index.ts');

const nombres = new Set([...readFileSync(BARRIL, 'utf8').matchAll(/\b([A-Za-z_]\w*)\b/g)].map((m) => m[1]));

const otros = archivos
  .filter((f) => f !== BARRIL)
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n');

// Palabras que aparecen en el barril pero no son simbolos exportados.
const RUIDO = new Set([
  'export',
  'from',
  'import',
  'type',
  'as',
  'const',
  'function',
  'interface',
  'return',
  'readonly',
  'void',
  'string',
  'number',
  'boolean',
  'null',
  'undefined',
  'true',
  'false',
  'if',
  'for',
  'of',
  'in',
  'new',
  'public',
  'private',
  'module',
]);

const huerfanos = [];
for (const nombre of nombres) {
  if (RUIDO.has(nombre)) continue;
  if (!/^[A-Z]/.test(nombre)) continue;
  if (!new RegExp(`\\b${nombre}\\b`).test(otros)) huerfanos.push(nombre);
}

console.log(`Simbolos publicos del barril sin ninguna otra referencia (${huerfanos.length}):`);
for (const n of huerfanos) console.log(`  ${n}`);
