/**
 * Tests de la capa de seguridad.
 *
 * Quedan dos familias, con criterios distintos:
 *
 *  - Los esquemas se prueban con casos de evasion reales, porque de lo que se
 *    trata es de que nadie los esquive. Cada prueba de evasion incluye el
 *    motivo por el que el navegador lo interpretaria igual.
 *  - La ingesta de logos se prueba con imagenes falsas de tamano minimo. No
 *    hacen falta imagenes de verdad: ladecision se toma sobre los bytes, antes
 *    de decodificar, y esa es justamente la propiedad que se quiere comprobar.
 *
 * Lo que se elimino aqui y en el codigo es el detector de enlaces de phishing.
 * Se determino que sus avisos no eran fiables: un detector que marca medio
 * internet hace que la gente deje de leer los avisos, y el sitio real de una
 * marca salia marcado tanto como su imitacion. La proteccion que queda no es
 * heuristica: es un bloqueo de esquemas que ejecutan codigo, y una vista previa
 * del contenido exacto que se va a codificar.
 *
 * @packageDocumentation
 */

import { describe, expect, it } from 'vitest';

import { findBlockedScheme, intakeBytes, isBlockedScheme, readDimensions, sniffFormat } from '../src/security/index';

/* -------------------------------------------------------------------------- */
/* Utilidades para construir cabeceras de imagen                                */
/* -------------------------------------------------------------------------- */

/** Bytes de una firma PNG. */
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Construye un PNG con las dimensiones pedidas, sin un solo pixel de verdad. */
function fakePng(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(24);
  bytes.set(PNG_SIGNATURE, 0);
  // Longitud del chunk IHDR, 4 bytes big-endian.
  bytes.set([0, 0, 0, 13], 8);
  // "IHDR".
  bytes.set([0x49, 0x48, 0x44, 0x52], 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

/** Construye un JPEG con un marcador SOF0 y las dimensiones pedidas. */
function fakeJpeg(width: number, height: number): Uint8Array {
  // FFD8, luego FFC0, longitud 0x0011, precision, alto, ancho, y relleno.
  return new Uint8Array([
    0xff,
    0xd8,
    0xff,
    0xc0,
    0x00,
    0x11,
    0x08,
    (height >> 8) & 0xff,
    height & 0xff,
    (width >> 8) & 0xff,
    width & 0xff,
    0x03,
    0x01,
    0x22,
    0x00,
    0x02,
    0x11,
    0x01,
    0x03,
    0x11,
    0x01,
  ]);
}

/** Construye un WebP extended (VP8X) con las dimensiones pedidas. */
function fakeWebp(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(30);
  // "RIFF" + tamano + "WEBP" + "VP8X" + tamano del chunk.
  bytes.set([0x52, 0x49, 0x46, 0x46], 0);
  bytes.set([0x1a, 0x00, 0x00, 0x00], 4);
  bytes.set([0x57, 0x45, 0x42, 0x50], 8);
  bytes.set([0x56, 0x50, 0x38, 0x58], 12);
  bytes.set([0x0a, 0x00, 0x00, 0x00], 16);
  // Bandera de flags, 3 bytes reservados, y ancho y alto de 24 bits.
  const w = width - 1;
  const h = height - 1;
  bytes.set([w & 0xff, (w >> 8) & 0xff, (w >> 16) & 0xff], 24);
  bytes.set([h & 0xff, (h >> 8) & 0xff, (h >> 16) & 0xff], 27);
  return bytes;
}

/* -------------------------------------------------------------------------- */
/* Esquemas peligrosos                                                         */
/* -------------------------------------------------------------------------- */

describe('findBlockedScheme', () => {
  it('bloquea los esquemas que ejecutan codigo', () => {
    expect(findBlockedScheme('javascript:alert(1)')).toBe('javascript');
    expect(findBlockedScheme('data:text/html;base64,PGgxPk90aW5kbz4=')).toBe('data');
    expect(findBlockedScheme('vbscript:msgbox(1)')).toBe('vbscript');
    expect(findBlockedScheme('file:///etc/passwd')).toBe('file');
  });

  it('ignora las mayusculas y minusculas', () => {
    // El esquema de una URL no distingue mayusculas: "JavaScript:" se ejecuta.
    expect(findBlockedScheme('JavaScript:alert(1)')).toBe('javascript');
    expect(findBlockedScheme('JAVASCRIPT:alert(1)')).toBe('javascript');
  });

  it('ignora los espacios que envuelven el esquema', () => {
    // El navegador descarta los espacios del principio y del final.
    expect(findBlockedScheme('   javascript:alert(1)')).toBe('javascript');
    expect(findBlockedScheme('javascript:alert(1)   ')).toBe('javascript');
  });

  it('esquiva el bloqueo partirlo con un salto de linea', () => {
    // El parser de URL de la especificacion elimina tabulador, salto de linea y
    // retorno de carro de todo el interior, asi que esto SI se ejecuta en un
    // navegador. Bloquear la cadena cruda seria un agujero de evasion.
    expect(findBlockedScheme('java\nscript:alert(1)')).toBe('javascript');
    expect(findBlockedScheme('java\tscript:alert(1)')).toBe('javascript');
    expect(findBlockedScheme('java\rscript:alert(1)')).toBe('javascript');
  });

  it('permite los esquemas que no son peligrosos', () => {
    expect(findBlockedScheme('https://ejemplo.com')).toBeNull();
    expect(findBlockedScheme('tel:+525512345678')).toBeNull();
    expect(findBlockedScheme('WIFI:T:WPA;S:Red;P:clave;H:false;;')).toBeNull();
    expect(findBlockedScheme('mailto:ana@ejemplo.com')).toBeNull();
  });

  it('no bloquea la palabra javascript: dentro de un texto', () => {
    // "javascript:" aqui es texto, no un esquema, porque lo precede una ruta o
    // un espacio. Bloquearlo seria un falso positivo molesto.
    expect(findBlockedScheme('usa javascript:void(0) para recargar')).toBeNull();
    expect(findBlockedScheme('ver https://ejemplo.com/javascript:guia')).toBeNull();
  });

  it('no confunde una ruta con un esquema', () => {
    // Sin barra antes del dos puntos no hay esquema, sino una ruta con dos
    // puntos en ella.
    expect(findBlockedScheme('data:text/plain')).toBe('data');
    expect(findBlockedScheme('carpeta/data:archivo')).toBeNull();
  });
});

describe('isBlockedScheme', () => {
  it('no deja pasar ninguna forma obfuscada', () => {
    // Este es el unico bloqueo de la herramienta, asi que es el unico que tiene
    // que ser a prueba de intentos. Cada vector se ha visto en campaigns
    // reales de phishing por QR.
    const vectores = [
      'javascript:alert(1)',
      'JaVaScRiPt:alert(1)',
      '  javascript:alert(1)',
      'java\tscript:alert(1)',
      'java\nscript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'blob:https://ejemplo.com/1234',
      'vbscript:msgbox(1)',
      '\u0000javascript:alert(1)',
      'java\u0000script:alert(1)',
    ];
    for (const vector of vectores) {
      expect(isBlockedScheme(vector), `debio bloquear: ${JSON.stringify(vector)}`).toBe(true);
    }
  });

  it('deja pasar lo que la gente comparte todos los dias', () => {
    for (const legitimo of [
      'https://ejemplo.com',
      'http://ejemplo.com/ruta?con=parametros',
      'mailto:ana@ejemplo.com?subject=Hola',
      'tel:+525512345678',
      'sms:+525512345678?body=Hola',
      'BEGIN:VCARD\nVERSION:3.0\nFN:Ana\nEND:VCARD',
      'WIFI:T:WPA;S:Mi red;P:clave;;',
      'un texto normal con dos puntos: aqui',
    ]) {
      expect(isBlockedScheme(legitimo), `no debia bloquear: ${JSON.stringify(legitimo)}`).toBe(false);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Ingesta de imagenes de logo                                                  */
/* -------------------------------------------------------------------------- */

describe('sniffFormat', () => {
  it('reconoce los tres formatos aceptados por sus bytes magicos', () => {
    expect(sniffFormat(fakePng(100, 100))).toBe('image/png');
    expect(sniffFormat(fakeJpeg(100, 100))).toBe('image/jpeg');
    expect(sniffFormat(fakeWebp(100, 100))).toBe('image/webp');
  });

  it('rechaza un SVG, que es texto', () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    expect(sniffFormat(svg)).toBeNull();
  });

  it('rechaza un PDF', () => {
    expect(sniffFormat(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]))).toBeNull();
  });

  it('rechaza un PNG con la firma mal formada', () => {
    const roto = fakePng(10, 10);
    roto[1] = 0x00;
    expect(sniffFormat(roto)).toBeNull();
  });
});

describe('intakeBytes', () => {
  it('acepta una imagen valida y devuelve sus dimensiones', () => {
    expect(intakeBytes(fakePng(512, 256))).toEqual({
      ok: true,
      format: 'image/png',
      width: 512,
      height: 256,
    });
  });

  it('lee las dimensiones de los tres formatos', () => {
    expect(readDimensions(fakePng(300, 120), 'image/png')).toEqual({ width: 300, height: 120 });
    expect(readDimensions(fakeJpeg(640, 480), 'image/jpeg')).toEqual({ width: 640, height: 480 });
    expect(readDimensions(fakeWebp(64, 32), 'image/webp')).toEqual({ width: 64, height: 32 });
  });

  it('rechaza un SVG aunque el navegador lo declare como PNG', () => {
    // El `type` de un File lo pone quien creo el archivo. Los bytes no mienten.
    const svg = new TextEncoder().encode('<svg onload="alert(1)"></svg>');
    expect(intakeBytes(svg)).toMatchObject({ ok: false, reason: 'format' });
  });

  it('rechaza una imagen truncada', () => {
    const truncada = fakePng(100, 100).subarray(0, 20);
    expect(intakeBytes(truncada)).toMatchObject({ ok: false, reason: 'corrupt' });
  });

  it('rechaza un archivo vacio', () => {
    expect(intakeBytes(new Uint8Array(0))).toMatchObject({ ok: false, reason: 'corrupt' });
  });

  it('rechaza por dimensiones antes de decodificar', () => {
    // El caso que motiva el orden de las comprobaciones: un PNG de 20000 px de
    // lado cabe en 30 KB en disco y al descomprimir ocuparia 1.6 GB.
    const bomba = fakePng(20000, 20000);
    expect(bomba.byteLength).toBeLessThan(1024);
    expect(intakeBytes(bomba)).toMatchObject({ ok: false, reason: 'dimensions' });
  });

  it('rechaza por tamano antes de mirar la firma', () => {
    const enorme = new Uint8Array(3 * 1024 * 1024);
    enorme.set(PNG_SIGNATURE, 0);
    expect(intakeBytes(enorme)).toMatchObject({ ok: false, reason: 'tooLarge' });
  });
});
