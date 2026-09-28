/**
 * Codificacion del contenido a un simbolo QR.
 *
 * Es la unica pieza que habla con la libreria de terceros. A partir de aqui, el
 * resto del proyecto solo ve la interfaz `EncodedQr` que declara en
 * `qr/types.ts`, y no la forma concreta de la matriz. Asi, cambiar de
 * implementacion de codificacion no obliga a tocar ni el dibujo ni la
 * seguridad ni la interfaz.
 *
 * @module
 */

import type { Ecc, EncodedQr } from './types';
import { needsEci, utf8Bytes } from './utf8';

/**
 * Designador ECI de UTF-8 segun el registro de la norma ISO/IEC 18004.
 *
 * Cuando el texto lleva acentos, emojis o cualquier cosa fuera de ASCII, los
 * lectores necesitan saber que los bytes son UTF-8 y no, por ejemplo, Shift-JIS.
 * Sin este designador, un telefono puede leer un codigo con una tilde de forma
 * distinta en cada marca. Se antepone como segmento propio, que es como lo
 * define la norma, en lugar de confiar en que el lector lo adivine.
 */
const ECI_UTF8 = 26;

/** Traduce el nombre del nivel de correccion al objeto que usa la libreria. */
function toVendorEcc(ecc: Ecc): qrcodegen.QrCode.Ecc {
  switch (ecc) {
    case 'low':
      return qrcodegen.QrCode.Ecc.LOW;
    case 'medium':
      return qrcodegen.QrCode.Ecc.MEDIUM;
    case 'quartile':
      return qrcodegen.QrCode.Ecc.QUARTILE;
    case 'high':
      return qrcodegen.QrCode.Ecc.HIGH;
  }
}

/** Traduce de vuelta el nivel efectivo que eligio la libreria. */
function fromVendorEcc(ecc: qrcodegen.QrCode.Ecc): Ecc {
  if (ecc === qrcodegen.QrCode.Ecc.LOW) return 'low';
  if (ecc === qrcodegen.QrCode.Ecc.MEDIUM) return 'medium';
  if (ecc === qrcodegen.QrCode.Ecc.QUARTILE) return 'quartile';
  return 'high';
}

/** Error de codificacion con un mensaje apto para mostrar a la persona. */
export class QrEncodeError extends Error {
  /** Razon concreta, para poder elegir el mensaje exacto en la interfaz. */
  readonly reason: 'tooLong';

  constructor(reason: 'tooLong') {
    super(reason);
    this.name = 'QrEncodeError';
    this.reason = reason;
  }
}

/**
 * Codifica un texto en un simbolo QR.
 *
 * @param text - Contenido a codificar.
 * @param ecc - Nivel de correccion de errores pedido. La libreria puede
 *   devolver uno mejor si el contenido cabe en el mismo tamaño, y el valor
 *   efectivo se devuelve en el resultado.
 * @returns El simbolo codificado, envuelto en la interfaz propia del proyecto.
 * @throws {QrEncodeError} Si el texto no cabe en la version maxima, o si se
 *   pide UTF-8 con un designador ECI que el estandar no admite.
 */
export function encodeText(text: string, ecc: Ecc): EncodedQr {
  const bytes = utf8Bytes(text);
  const useEci = needsEci(bytes);
  const segments: qrcodegen.QrSegment[] = [];

  if (useEci) {
    // `makeEci` se encarga de elegir la forma del designador segun el rango
    // del valor, como manda la norma. No hace falta construirlo a mano, y
    // hacerlo a mano seria duplicar una tabla de la especificacion.
    segments.push(qrcodegen.QrSegment.makeEci(ECI_UTF8));
  }

  segments.push(...qrcodegen.QrSegment.makeSegments(text));

  let code: qrcodegen.QrCode;
  try {
    code = qrcodegen.QrCode.encodeSegments(segments, toVendorEcc(ecc));
  } catch (cause) {
    if (cause instanceof RangeError) throw new QrEncodeError('tooLong');
    throw cause;
  }

  return wrap(code, useEci, false);
}

/**
 * Codifica bytes arbitrarios, para el modo binario.
 *
 * Se usa para payloads que no son texto legible, como el contenido de una vCard
 * con fotografias incrustadas. En la practica casi nunca hace falta, porque
 * codificar como UTF-8 da un resultado mas compacto y mas portable, pero
 * mantenerlo abierto evita tener un callejon sin salida si alguna vez hace
 * falta.
 *
 * @param bytes - Contenido binario.
 * @param ecc - Nivel de correccion de errores pedido.
 * @returns El simbolo codificado.
 * @throws {QrEncodeError} Si el contenido no cabe.
 */
export function encodeBytes(bytes: readonly number[], ecc: Ecc): EncodedQr {
  const segment = qrcodegen.QrSegment.makeBytes(bytes);
  let code: qrcodegen.QrCode;
  try {
    code = qrcodegen.QrCode.encodeSegments([segment], toVendorEcc(ecc));
  } catch (cause) {
    if (cause instanceof RangeError) throw new QrEncodeError('tooLong');
    throw cause;
  }
  return wrap(code, false, true);
}

/**
 * Adapta el simbolo de la libreria a la interfaz del proyecto.
 *
 * Se copia el cierre sobre `getModule` para que la matriz no quede viva por
 * referencia. Si la libreria reutilizara su memoria interna, un cambio
 * posterior afectaria a un codigo ya dibujado.
 */
function wrap(code: qrcodegen.QrCode, hasEci: boolean, isBinary: boolean): EncodedQr {
  const { size } = code;
  return {
    size,
    version: code.version,
    ecc: fromVendorEcc(code.errorCorrectionLevel),
    mask: code.mask,
    hasEci,
    isBinary,
    getModule: (x: number, y: number): boolean => {
      if (x < 0 || y < 0 || x >= size || y >= size) return false;
      return code.getModule(x, y);
    },
  };
}
