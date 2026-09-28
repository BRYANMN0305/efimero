/**
 * Metadatos de compilacion, inyectados por Vite.
 *
 * Viven en su propio modulo, y no en `config.ts`, por una razon concreta:
 * `config.ts` lo importa medio proyecto, incluidos modulos de logica pura que
 * se ejecutan en los tests. Si la informacion de build estuviera ahi, cargar
 * `config.ts` en Node (donde Vite no ha inyectado nada) lanzaria un
 * `ReferenceError` solo por leer una constante que no tiene nada que ver con
 * ella.
 *
 * @packageDocumentation
 */

/**
 * Version publicada.
 *
 * El acceso con `typeof` es deliberado: si el identificador no llegara a
 * definirse, se recurre a un marcador en vez de romper la pagina entera por un
 * dato cosmetico. La version real se ve igualmente en el pie de la pagina,
 * que es donde de verdad importa.
 */
export const VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'desconocida';

/** Commit de git desde el que se compilo, o `null` si no se pudo determinar. */
export const COMMIT: string | null = typeof __APP_COMMIT__ === 'string' && __APP_COMMIT__ !== '' ? __APP_COMMIT__ : null;

/** Datos de compilacion, agrupados. */
export const BUILD_INFO: { readonly version: string; readonly commit: string | null } = {
  version: VERSION,
  commit: COMMIT,
};

/** Cadena corta para mostrar en el pie: "0.1.0" o "0.1.0 (a1b2c3d)". */
export function buildLabel(): string {
  return COMMIT === null ? VERSION : `${VERSION} (${COMMIT.slice(0, 7)})`;
}
