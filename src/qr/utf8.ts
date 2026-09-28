/**
 * Codificacion de texto a bytes para el codificador QR.
 *
 * Un codigo QR transporta BYTES, no caracteres. Confundir las dos cosas es el
 * error mas comun al mostrar el tamano de un codigo: un texto de 100 caracteres
 * con acentos puede pesar 130 bytes, o 190 con emoji. Todo lo que este modulo
 * mide y lo que se envia al codificador son bytes, siempre.
 *
 * @packageDocumentation
 */

/**
 * Codifica una cadena a bytes UTF-8.
 *
 * Se devuelve un `number[]` y no el `Uint8Array` que produce `TextEncoder`
 * porque la libreria de Nayuki declara `makeBytes(data: readonly number[])` y
 * el ejemplo oficial la invoca asi. Convertir aqui, una sola vez y en un solo
 * sitio, es preferible a repartir `Array.from(...)` por los llamadores.
 */
export function utf8Bytes(text: string): number[] {
  return Array.from(new TextEncoder().encode(text));
}

/**
 * Indica si una cadena tiene caracteres fuera de ASCII, es decir, si necesita
 * un segmento ECI.
 *
 * Se decide sobre el texto, no sobre los bytes, porque la pregunta que importa
 * es "el lector sabra que es UTF-8": ASCII es su unico supuesto, y UTF-8 sin
 * declararlo solo se acierta cuando todos los bytes estan por debajo de 0x80.
 *
 * El bug que corrige esto: declarar ECI 26 siempre. En un codigo ASCII puro eso
 * anade un segmento de 2 bytes que consume capacidad sin aportar nada, y en
 * niveles de correccion altos es la diferencia entre encajar y no encajar.
 *
 * @see {@link https://www.thonky.com/qr-code-tutorial/data-masking} para el
 *   fundamento del enmascaramiento de modo byte.
 */
export function needsEci(bytes: readonly number[]): boolean {
  return bytes.some((byte) => byte >= 0x80);
}

/**
 * Cuenta los bytes que ocupara un texto codificado en UTF-8, sin asignar el
 * arreglo de bytes.
 *
 * Se recorre por puntos de codigo, no por unidades de codigo, para que un emoji
 * (dos unidades de surrogado) cuente 4 bytes y no 2.
 */
export function countUtf8Bytes(text: string): number {
  let total = 0;
  for (const char of text) {
    const code = char.codePointAt(0);
    if (code === undefined) continue;
    if (code < 0x80) total += 1;
    else if (code < 0x800) total += 2;
    else if (code < 0x10000) total += 3;
    else total += 4;
  }
  return total;
}
