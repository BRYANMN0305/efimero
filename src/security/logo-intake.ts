/**
 * Validacion de la imagen de logo antes de decodificarla.
 *
 * La validacion se hace SIENDO OBLIGATORIA leer los bytes, y en este orden:
 * tamano del archivo, assinatura, y solo despues dimensiones. Ese orden importa
 * por una razon concreta: el consumo de memoria de una imagen viene de sus
 * dimensiones, no de los bytes del archivo, asi que leer las dimensiones del
 * header ANTES de decodificar es lo que evita que un PNG de 40000x40000 pixeles
 * (que pesa poco en disco y ocuparia 6 GB al descomprimirse) deje la pestana
 * colgada.
 *
 * @packageDocumentation
 */

import { LOGO_MAX_BYTES, LOGO_MAX_DIMENSION } from '../config';

/** Formatos de imagen aceptados. */
export const ACCEPTED_LOGO_FORMATS = ['image/png', 'image/jpeg', 'image/webp'] as const;

/** Tipo de archivo de logo. */
export type LogoFormat = (typeof ACCEPTED_LOGO_FORMATS)[number];

/** Por que se rechaza un archivo. */
export type LogoRejection =
  /** Supera el tamano maximo en bytes. */
  | 'tooLarge'
  /** La firma no corresponde a un formato aceptado. */
  | 'format'
  /** Las dimensiones declaradas superan el maximo. */
  | 'dimensions'
  /** Los bytes no son una imagen valida. */
  | 'corrupt';

/** Resultado de validar un archivo de logo. */
export type LogoIntake =
  | {
      readonly ok: true;
      readonly format: LogoFormat;
      /** Ancho en pixeles, leido del header. */
      readonly width: number;
      /** Alto en pixeles, leido del header. */
      readonly height: number;
    }
  | { readonly ok: false; readonly reason: LogoRejection; readonly evidence: string };

/**
 * Lee la firma de un archivo y devuelve su formato, sin mirar nada mas.
 *
 * Se comparan bytes magic y no el `type` que declara el navegador. El `type` lo
 * pone quien creo el archivo y no significa nada; los bytes magicos son los
 * que el decodificador va a mirar despues. Un `.exe` renombrado a `.png`
 * sigue teniendo firma de ejecutable, y un SVG (que es texto) no tiene
 * ninguna de las tres que se aceptan.
 */
export function sniffFormat(bytes: Uint8Array): LogoFormat | null {
  // Firma PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }

  // Firma JPEG: FF D8 FF. Los dos ultimos bytes de la firma (C0 a C3, C5 a C7,
  // C9 a CB, CD a CF) distinguen JPEG de JFIF; se aceptan los marcadores de
  // inicio mas comunes y el resto se trata como JPEG igual, porque el
  // decodificador hara la comprobacion fina.
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }

  // Firma WebP: "RIFF" .... "WEBP". El tamano real esta en los bytes 4 a 7.
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}

/** Dimensiones declaradas en un header. */
export interface Dimensions {
  readonly width: number;
  readonly height: number;
}

/**
 * Lee el ancho y el alto de un PNG, JPEG o WebP sin decodificar la imagen.
 *
 * Los tres formatos colocan la dimension en sitios distintos, asi que cada uno
 * tiene su parser. En los tres casos solo se leen bytes concretos del principio
 * del archivo; nunca se recorre entero ni se toca el canvas.
 */
export function readDimensions(bytes: Uint8Array, format: LogoFormat): Dimensions | null {
  switch (format) {
    case 'image/png':
      return readPngDimensions(bytes);
    case 'image/jpeg':
      return readJpegDimensions(bytes);
    case 'image/webp':
      return readWebpDimensions(bytes);
  }
}

/**
 * Dimensiones de un PNG.
 *
 * El alto y el ancho estan en los bytes 20 a 27 del chunk IHDR, en big-endian
 * de 32 bits, y es el primer chunk obligatorio del formato. El ancho y el alto
 * validos van de 1 a 2^31-1.
 */
function readPngDimensions(bytes: Uint8Array): Dimensions | null {
  // 8 de firma + 8 de longitud y tipo de chunk + 8 de datos = 24.
  if (bytes.length < 24) return null;
  if (bytes[12] !== 0x49 || bytes[13] !== 0x48 || bytes[14] !== 0x44 || bytes[15] !== 0x52) {
    return null;
  }
  const width = readUint32(bytes, 16);
  const height = readUint32(bytes, 20);
  return valid(width) && valid(height) ? { width, height } : null;
}

/** Un PNG valido no puede tener lados de 0, y 2^32 excede el maximo de la spec. */
function valid(value: number): boolean {
  return Number.isInteger(value) && value > 0 && value <= 0x7fff_ffff;
}

/** Lee un entero de 32 bits big-endian. */
function readUint32(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset]! << 24) | (bytes[offset + 1]! << 16) | (bytes[offset + 2]! << 8) | bytes[offset + 3]!) >>> 0;
}

/**
 * Dimensiones de un JPEG.
 *
 * No hay un sitio fijo: vienen del marcador SOFn, que puede estar al principio
 * o al final del archivo segun cuanto metadata lleva delante. Hay que recorrer
 * los segmentos, y cada uno se salta por su longitud declarada. Se ignora el
 * contenido de los segmentos porque solo interesa donde acaba el siguiente.
 */
function readJpegDimensions(bytes: Uint8Array): Dimensions | null {
  let offset = 2; // Se salta la firma de dos bytes.

  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return null;

    const marker = bytes[offset + 1]!;

    // Marcadores que no tienen carga util y no llevan longitud.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }

    // Marcadores que marcan el final de la imagen.
    if (marker === 0xd9 || marker === 0xda) return null;

    const length = (bytes[offset + 2]! << 8) | bytes[offset + 3]!;
    if (length < 2) return null;

    // Estructura del marcador: FF C0, longitud (2), precision (1), alto (2),
    // ancho (2). El offset apunta al primer FF, asi que cada campo va desplazado
    // desde ahi y no desde el principio del archivo.
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      if (offset + 9 > bytes.length) return null;
      const height = (bytes[offset + 5]! << 8) | bytes[offset + 6]!;
      const width = (bytes[offset + 7]! << 8) | bytes[offset + 8]!;
      return valid(width) && valid(height) ? { width, height } : null;
    }

    offset += 2 + length;
  }

  return null;
}

/** Dimensiones de un WebP. */
function readWebpDimensions(bytes: Uint8Array): Dimensions | null {
  // El nombre del "chunk" empieza en el byte 12.
  const chunk = String.fromCharCode(...bytes.subarray(12, 16));

  if (chunk === 'VP8X') {
    // Formato extendido, con 1 byte de flags, 3 de reservado, y ancho y alto de
    // 24 bits en little-endian (16 bits mas 7 bits, con la parte alta en el
    // ultimo bit de cada trio).
    if (bytes.length < 30) return null;
    const width = 1 + readUint24LE(bytes, 24);
    const height = 1 + readUint24LE(bytes, 27);
    return valid(width) && valid(height) ? { width, height } : null;
  }

  if (chunk === 'VP8 ') {
    // WebP con perdida simple: la firma de frameeoSync, y las dimensiones.
    if (bytes.length < 30) return null;
    const width = (bytes[26]! | (bytes[27]! << 8)) & 0x3fff;
    const height = (bytes[28]! | (bytes[29]! << 8)) & 0x3fff;
    return valid(width) && valid(height) ? { width, height } : null;
  }

  if (chunk === 'VP8L') {
    // WebP sin perdida: los 14 bits de cada dimension vienen en dos bytes.
    if (bytes.length < 25) return null;
    const bits = bytes[21]! | (bytes[22]! << 8) | (bytes[23]! << 16);
    const width = (bits & 0x3fff) + 1;
    const height = ((bits >> 14) & 0x3fff) + 1;
    return valid(width) && valid(height) ? { width, height } : null;
  }

  return null;
}

/** Lee un entero de 24 bits little-endian. */
function readUint24LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset]! | (bytes[offset + 1]! << 8) | (bytes[offset + 2]! << 16);
}

/**
 * Valida un archivo de logo sin decodificarlo.
 *
 * @param file - El archivo tal y como lo entrega el navegador o el portapapeles.
 * @returns Los datos de la imagen si es aceptable, o el motivo del rechazo.
 */
export function inspectLogo(file: File | Blob): Promise<LogoIntake> {
  return file.arrayBuffer().then((buffer) => intakeBytes(new Uint8Array(buffer)));
}

/**
 * Valida un conjunto de bytes ya leidos.
 *
 * Se separa de {@link inspectLogo} para que los tests puedan ejercitarlo sin
 * construir objetos `File`, que en Node no existen.
 */
export function intakeBytes(bytes: Uint8Array): LogoIntake {
  // 1. Tamano. Es lo mas barato y descarta de entrada cualquier cosa enorme.
  if (bytes.byteLength > LOGO_MAX_BYTES) {
    return { ok: false, reason: 'tooLarge', evidence: `${bytes.byteLength} B` };
  }
  if (bytes.byteLength === 0) {
    return { ok: false, reason: 'corrupt', evidence: 'archivo vacio' };
  }

  // 2. Firma. Descarta SVG, PDF, ejecutables y cualquier otra cosa, por muy
  //    nueva que sea su extension.
  const format = sniffFormat(bytes);
  if (format === null) {
    return { ok: false, reason: 'format', evidence: describeSignature(bytes) };
  }

  // 3. Dimensiones, todavia sin decodificar un solo pixel.
  const dimensions = readDimensions(bytes, format);
  if (dimensions === null) {
    return { ok: false, reason: 'corrupt', evidence: 'cabecera ilegible' };
  }
  if (dimensions.width > LOGO_MAX_DIMENSION || dimensions.height > LOGO_MAX_DIMENSION) {
    return {
      ok: false,
      reason: 'dimensions',
      evidence: `${dimensions.width}x${dimensions.height}`,
    };
  }

  return { ok: true, format, width: dimensions.width, height: dimensions.height };
}

/**
 * Describe los primeros bytes de un archivo rechazado, para poder explicar el
 * error sin exponer el contenido.
 */
function describeSignature(bytes: Uint8Array): string {
  const head = Array.from(bytes.subarray(0, 4))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join(' ');
  // Si parece texto, se muestra el principio, porque casi siempre significa que
  // el usuario subio un SVG o un archivo de texto creyendo que valia.
  const asText = new TextDecoder('utf-8', { fatal: false }).decode(bytes.subarray(0, 16));
  return /^[\s<]/.test(asText) ? `texto (${asText.trim().slice(0, 12)})` : head;
}
