/**
 * Globales que Vite inyecta en tiempo de compilacion.
 *
 * Se declaran aqui para que el typecheck conozca sus tipos. Los valores reales
 * los define `vite.config.ts` leidos de `package.json` y del estado de git, asi
 * que no existen dos fuentes de verdad que puedan desincronizarse.
 */

declare const __APP_VERSION__: string;
declare const __APP_COMMIT__: string;

/**
 * Direccion publica del sitio, resuelta al compilar.
 *
 * La inyecta `vite.config.ts` desde `VERCEL_PROJECT_PRODUCTION_URL` cuando se
 * compila en Vercel, y desde la direccion del repositorio cuando no. Vai por
 * esta via y no con un literal porque el dominio de Vercel no se elige: lo
 * asigna la plataforma y cambia si el nombre esta ocupado.
 */
declare const __APP_SITE_URL__: string;
