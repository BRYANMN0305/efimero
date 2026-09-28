/**
 * Resolucion de los metadatos de compilacion.
 *
 * Lo usan tanto `vite.config.ts` como `vitest.config.ts`, para que la version
 * que se muestra en la pagina y la que ven los tests venga del mismo sitio. Si
 * cada config lo calculara por su cuenta, acabarian discrepando.
 *
 * Se ejecuta en Node, no en el navegador: es codigo de configuracion.
 *
 * @module scripts/build-info
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Determina el commit de git actual.
 *
 * @param root - Raiz del repositorio.
 * @returns El hash corto del commit, o `null` si git no esta disponible o el
 *   proyecto no esta en un repositorio. No es un error: el proyecto se puede
 *   el proyecto se puede distribuir sin git, y la compilacion debe funcionar.
 */
export function resolveCommit(root = ROOT) {
  try {
    const output = execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const commit = output.trim();
    return commit === '' ? null : commit;
  } catch {
    return null;
  }
}

/**
 * Lee la version del `package.json`.
 *
 * @param root - Raiz del repositorio.
 * @returns El campo `version`, o `null` si el archivo no se puede leer.
 */
export function resolveVersion(root = ROOT) {
  try {
    const raw = readFileSync(join(root, 'package.json'), 'utf8');
    const parsed = JSON.parse(raw);
    return typeof parsed.version === 'string' ? parsed.version : null;
  } catch {
    return null;
  }
}

/**
 * Valores que se inyectan como `__APP_VERSION__` y `__APP_COMMIT__`.
 *
 * @returns Objeto listo para pasar a `define` de Vite.
 */
export function buildDefines(root = ROOT) {
  return {
    __APP_VERSION__: JSON.stringify(resolveVersion(root) ?? '0.0.0-dev'),
    // Un JSON.stringify de null produce el literal "null", que es justo lo que
    // el modulo de build-info espera para distinguir "sin commit" de "commit
    // con la cadena vacia".
    __APP_COMMIT__: JSON.stringify(resolveCommit(root)),
  };
}
