/**
 * Bloqueo de esquemas de URL peligrosos.
 *
 * La razon de que este modulo exista: un codigo QR que apunta a `javascript:`
 * se ve exactamente igual que uno que apunta a tu sitio, y en cuanto la victima
 * lo abre, el codigo se ejecuta con los permisos de la pagina que lo abrio. Es
 * la via mas directa para distribuir phishing y malware con una imagen
 * inocente, y por eso aqui no hay forma de saltarse el bloqueo: no es un aviso,
 * es un `return` temprano.
 *
 * @packageDocumentation
 */

/** Esquemas que nunca se pueden codificar. */
export const BLOCKED_SCHEMES = [
  'javascript',
  'data',
  'vbscript',
  'livescript',
  'mocha',
  'file',
  'blob',
  'about',
  'view-source',
] as const;

/** Esquemas bloqueados, como tipo. */
export type BlockedScheme = (typeof BLOCKED_SCHEMES)[number];

/**
 * Normaliza un texto para poder comparar el esquema.
 *
 * El navegador, antes de analizar una URL, quita los controles ASCII de los
 * extremos y elimina el caracter de tabulacion, salto de linea y retorno de
 * carro de *todo* el interior. Eso significa que un "javascript:" partido con
 * un salto de linea en medio lo trata igual que si fuera entero. Si aqui se
 * comparara la cadena cruda, el bloqueo se esquivaria con un solo "\n".
 *
 * @see {@link https://url.spec.whatwg.org/} seccion "basic URL parser".
 */
export function normalizeForSchemeCheck(value: string): string {
  return (
    value
      // Se quitan primero los extremos: el navegador tambien los descarta.
      .replace(/^[\u0000-\u0020]+/, '')
      .replace(/[\u0000-\u0020]+$/, '')
      // Y luego los controles del interior, que algunos lectores de QR y algunos
      // navegadores eliminan en cualquier punto. La especificacion solo obliga a
      // quitar tabulador, salto y retorno, pero ampliaremos el margen a todo el
      // rango C0 mas el DEL: un esquema no puede contenerlos de todas formas, asi
      // que quitarlos no puede hacer pasar por legitimo nada que no lo sea, y si
      // cierra el hueco de "java\0script:".
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .toLowerCase()
  );
}

/**
 * Devuelve el esquema bloqueado que empieza el texto, o `null`.
 *
 * Solo se comprueba el principio de la cadena. Un `javascript:` que aparezca a
 * mitad de un texto no es un esquema, es texto, y bloquearlo seria incorrecto:
 * "usa javascript:void(0) para recargar" es una instruccion legitima.
 */
export function findBlockedScheme(value: string): BlockedScheme | null {
  const normalized = normalizeForSchemeCheck(value);
  const colon = normalized.indexOf(':');

  // Sin dos puntos no hay esquema. Antes de los dos puntos no puede haber
  // ninguna barra, porque entonces lo que precede es una ruta, no un esquema.
  if (colon <= 0) return null;
  if (normalized.slice(0, colon).includes('/')) return null;

  const scheme = normalized.slice(0, colon);
  const found = (BLOCKED_SCHEMES as readonly string[]).find((candidate) => candidate === scheme);
  return found === undefined ? null : (found as BlockedScheme);
}

/** Indica si el texto debe bloquearse por su esquema. */
export function isBlockedScheme(value: string): boolean {
  return findBlockedScheme(value) !== null;
}
