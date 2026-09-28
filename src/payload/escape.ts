/**
 * Escapado de valores para los distintos formatos de payload.
 *
 * Cada formato escapa de una manera distinta y, en los tres casos, equivocarse
 * produce un codigo que se ve bien pero que el telefono no puede leer. Por eso
 * cada funcion cita la especificacion que sigue.
 *
 * @packageDocumentation
 */

/**
 * Percent-codifica un valor destined a una query string.
 *
 * `encodeURIComponent` ya escapa `+` como `%2B`, cosa que `encodeURI` no hace y
 * que en una query string es un bug silencioso: un `+` literal se decodifica
 * como espacio y el texto llega al destinatario con los espacios cambiados de
 * sitio.
 */
export function percentEncode(value: string): string {
  return encodeURIComponent(value);
}

/**
 * Escapa un valor del formato `WIFI:`.
 *
 * El formato no tiene especificacion oficial; es un convenio de facto que
 * implementan los lectores de ZXing y las apps de generadores. El separador de
 * campos es `;` y dentro de cada campo el separador de sub-claves es `:`; ademas
 * `,` y `"` reservan significado. Un SSID puede contener cualquiera de ellos:
 * " cafeteria, la de abajo " es un nombre de red perfectamente legitimo.
 *
 * La barra invertida es ademas el propio caracter de escape, asi que se escapa
 * primero; si se hiciera en otro orden, un valor con `\;` se convertiria en
 * `\\;` y al leerlo se obtendria una barra y un punto y coma, no un punto y
 * coma.
 */
export function escapeWifiValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/([;,:"])/g, '\\$1')
    .replace(/[\r\n\t]/g, ' ');
}

/**
 * Escapa un valor segun RFC 6350 seccion 3.4 (vCard).
 *
 * La RFC define tres escapes: barra invertida, punto y coma y coma. Los saltos
 * de linea se convierten en `\n` en lugar de eliminarse, porque un nombre con
 * salto de linea es raro pero una empresa con salto de linea en el nombre
 * comercial no es imposible, y perder informacion es peor que moverla.
 */
export function escapeVCardValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/**
 * Numero telefonico separado en su parte principal y su extension.
 */
export interface PhoneParts {
  /** Numero principal, ya normalizado a digitos con `+` opcional. */
  number: string;
  /** Extension, sin el signo de admiracion, o `null` si no hay. */
  extension: string | null;
}

/**
 * Separador de extension al final de un numero.
 *
 * Se acepta "x" ademas de "ext" porque es como se escribe en medio mundo, y
 * "anexo" porque es la palabra habitual en Mexico. La extension se limita a 6
 * digitos, que es lo que acepta la RFC 3966.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc3966} seccion 3.4
 */
const EXTENSION_PATTERN = /\s*(?:ext\.?|extensión|anexo|x)\s*[:.]?\s*(\d{1,6})\s*$/i;

/**
 * Separa la extension del numero principal.
 *
 * Esto no es cosmetico. Sin este paso, "5551234 ext. 99" se reduce a los solos
 * digitos "555123499", que es un numero distinto: se marca a la extension como
 * si fuera parte del numero principal.
 */
export function splitPhone(raw: string): PhoneParts {
  const trimmed = raw.trim();
  const match = EXTENSION_PATTERN.exec(trimmed);
  if (match?.[1] === undefined) {
    return { number: normalizePhone(trimmed), extension: null };
  }
  return {
    number: normalizePhone(trimmed.slice(0, match.index)),
    extension: match[1],
  };
}

/**
 * Compone un URI `tel:` segun la RFC 3966, incluyendo la extension si la hay.
 *
 * La extension va como parametro `;ext=`, no concatenada. Un telefono que
 * reconoce el esquema la usa; uno que no la ignora, y en los dos casos marca el
 * numero principal, que es lo importante.
 */
export function buildTelUri(parts: PhoneParts): string {
  const base = `tel:${parts.number}`;
  return parts.extension === null ? base : `${base};ext=${parts.extension}`;
}

/**
 * Normaliza un numero telefonico a la forma que entienden los lectores.
 *
 * Se conservan solo el `+` inicial y los digitos, en ese orden. El `+` solo
 * significa "prefijo internacional" si va el primero, asi que se elimina
 * cualquier otro.
 */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  return hasPlus ? `+${digits}` : digits;
}

/**
 * Un numero tiene forma de telefono si le quedan al menos 3 digitos.
 *
 * El umbral es deliberadamente bajo. Marcar como invalido un numero de
 * Extensions cortas o un prefijo de empresa seria mas molesto que dejar que el
 * telefono decida; el proposito de este filtro es atrapar un campo vacio o con
 * letras, no servir de validador de numeracion internacional.
 */
export function isPlausiblePhone(normalized: string): boolean {
  const digits = normalized.replace(/\D/g, '');
  return digits.length >= 3 && digits.length <= 15;
}

/**
 * Anade esquema a una URL que no lo trae.
 *
 * "empresa.com" no es una URL valida y el telefono no sabria que hacer con ella.
 * Anadir `https://` es lo que espera quien escribe el campo. Solo se reconocen
 * `http` y `https` como esquema ya presente: un `ftp://` de 1990 no se va a
 * reescribir a https, se va a dejar como estaba y que el usuario lo vea.
 */
export function normalizeUrl(raw: string): string {
  return /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
}

/** Un campo de texto no vacio, ya recortado. */
export function requireText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}
