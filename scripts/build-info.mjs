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
 * Resuelve la direccion publica del sitio.
 *
 * Se lee del entorno en vez de escribirla a mano porque el dominio de Vercel no
 * se elige: lo asigna la plataforma y cambia si el proyecto se renombra o si el
 * nombre esta ocupado por otro. Escribirlo en el codigo era una bomba de
 * relojería: el proyecto se llamo `efimero`, el dominio tambien, y al crear el
 * proyecto en Vercel resulto que `efimero.vercel.app` ya estaba asignado a
 * alguien. Con un literal, el ejemplo habria seguido apuntando al sitio de un
 * tercero sin que nada fallara.
 *
 * Vercel define `VERCEL_PROJECT_PRODUCTION_URL` con el dominio de produccion
 * del proyecto. Sin ella, que es el caso de una compilacion local, se usa la
 * direccion del repositorio, leida del `package.json`: siempre existe, nunca
 * caduca y no lleva a ninguna parte.
 *
 * @param env - Entorno de la compilacion. Se pasa por parametro para poder
 *   probarla sin tocar el proceso.
 * @param root - Raiz del repositorio, para el respaldo.
 * @returns {string} Direccion sin barra final.
 */
export function resolveSiteUrl(env = process.env, root = ROOT) {
  const production = env.VERCEL_PROJECT_PRODUCTION_URL;
  if (typeof production === 'string' && production.trim() !== '') {
    return `https://${production
      .trim()
      .replace(/^https?:\/\//, '')
      .replace(/\/+$/, '')}`;
  }
  return resolveRepository(root) ?? 'https://example.invalid';
}

/**
 * Lee la direccion del repositorio del `package.json` y la normaliza.
 *
 * @param root - Raiz del repositorio.
 * @returns {string|null} La direccion en https, o `null` si no se puede leer.
 */
export function resolveRepository(root = ROOT) {
  try {
    const raw = readFileSync(join(root, 'package.json'), 'utf8');
    const url = JSON.parse(raw)?.repository?.url;
    if (typeof url !== 'string') return null;
    return url
      .replace(/^git\+/, '')
      .replace(/\.git$/, '')
      .replace(/^git:\/\//, 'https://')
      .replace(/^git@github\.com:/, 'https://github.com/');
  } catch {
    return null;
  }
}

/**
 * Valores que se inyectan como `__APP_VERSION__`, `__APP_COMMIT__` y
 * `__APP_SITE_URL__`.
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
    __APP_SITE_URL__: JSON.stringify(resolveSiteUrl(process.env, root)),
  };
}
