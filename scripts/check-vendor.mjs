/**
 * Verificacion del codigo de terceros.
 *
 * `public/vendor/qrcodegen.js` es una copia sin modificar de la libreria de
 * Project Nayuki, bajo licencia MIT. Hay dos motivos por los que no puede
 * cambiar nunca:
 *
 *  1. **Licencia.** El aviso de copyright va dentro del archivo. Si se edita el
 *     codigo, ese aviso deja de describir el archivo, y distribuirlo sin su
 *     licencia seria un incumplimiento. La licencia MIT obliga a conservar el
 *     aviso intacto.
 *
 *  2. **Trazabilidad.** Es mas facil avisar de un problema upstream cuando se
 *     sabe que el archivo es el de la version publicada. Un checksum convierte
 *     "creo que no lo he tocado" en una comprobacion.
 *
 * @module scripts/check-vendor
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');

/**
 * Copias verificadas, con la version de la que proceden.
 *
 * Al actualizar la libreria hay que cambiar aqui el checksum, y el fallo
 * intentional del checksum obliga a que la actualizacion sea una decision
 * consciente y documentada, no un `curl` que alguien ejecuta un viernes.
 */
const VENDOR_FILES = [
  {
    path: 'public/vendor/qrcodegen.js',
    sha256: '79f419f267ce5a80d97f8099e0a789a4ecc4697b5348d86371a1f3b2a75d6e03',
    license: 'MIT',
    copyright: 'Project Nayuki',
    version: '1.8.0',
  },
];

/**
 * Fragmentos que tienen que seguir apareciendo en el archivo.
 *
 * Se comprueban ademas del checksum porque el checksum solo demuestra que el
 * archivo no cambio desde la ultima vez que se verifico. Si alguien actualiza
 * el checksum junto con el archivo, estos fragmentos son los que detectan que
 * se perdio el aviso de licencia por el camino.
 */
const REQUIRED_FRAGMENTS = [
  { needle: 'MIT License', why: 'declaracion de licencia' },
  { needle: 'Copyright', why: 'aviso de derechos de autor' },
  { needle: 'qrcodegen', why: 'espacio de nombres global' },
];

/** Devuelve el SHA-256 de un archivo, en minusculas. */
function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

const problems = [];

for (const file of VENDOR_FILES) {
  const full = join(ROOT, file.path);
  const actual = sha256(full);

  if (actual !== file.sha256) {
    problems.push(
      `${file.path}  checksum distinto\n` +
        `    esperado  ${file.sha256}\n` +
        `    obtenido  ${actual}\n` +
        '    Si es una actualizacion deliberada, cambia el valor en este script y anota la version nueva.',
    );
    continue;
  }

  const text = readFileSync(full, 'utf8');
  for (const fragment of REQUIRED_FRAGMENTS) {
    if (!text.includes(fragment.needle)) {
      problems.push(`${file.path}  no aparece el ${fragment.why} ("${fragment.needle}")`);
    }
  }
}

if (problems.length > 0) {
  console.error('\nEl codigo de terceros no supera la verificacion:\n');
  for (const problem of problems) console.error(`  ${problem}`);
  console.error(`\n${problems.length} problema(s) con el codigo de terceros.\n`);
  process.exit(1);
}

const licenses = [...new Set(VENDOR_FILES.map((file) => file.license))].join(', ');
console.log(`Codigo de terceros verificado: ${VENDOR_FILES.length} archivo(s), licencia ${licenses}.`);
for (const file of VENDOR_FILES) {
  console.log(`  ${file.path}  ${file.copyright} ${file.version}`);
}
