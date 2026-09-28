/**
 * Globales que Vite inyecta en tiempo de compilacion.
 *
 * Se declaran aqui para que el typecheck conozca sus tipos. Los valores reales
 * los define `vite.config.ts` leidos de `package.json` y del estado de git, asi
 * que no existen dos fuentes de verdad que puedan desincronizarse.
 */

declare const __APP_VERSION__: string;
declare const __APP_COMMIT__: string;
