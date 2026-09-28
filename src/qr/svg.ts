/**
 * Salida a SVG.
 *
 * El SVG se genera desde la misma lista de dibujo que la pantalla, con la misma
 * funcion de trazado. La unica diferencia es que las coordenadas se multiplican
 * por la escala para que el archivo tenga medidas en pixeles y no en modulos.
 *
 * @module
 */

import type { DrawList, DrawOp } from './draw-list';
import { shapeToSvgPath } from './shapes';
import type { QrStyle } from './types';

/** Escapa un valor para atributo XML. */
function attribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Pinta una operacion de forma como elemento `<path>`. */
function shapeToElement(op: DrawOp & { kind: 'shape' }, scale: number, color: string): string {
  const d = shapeToSvgPath(op.shape, op.x * scale, op.y * scale, op.w * scale, op.h * scale);
  return `  <path d="${d}" fill="${attribute(color)}"/>`;
}

/** Pinta una operacion de imagen. */
function imageToElement(op: DrawOp & { kind: 'image' }, scale: number): string {
  // El recorte se expresa con un `clipPath`, que es la unica forma de recortar
  // en SVG que se comporta igual en todos los lectores.
  const id = `logo-${clipSequence}`;
  clipSequence++;
  const d = shapeToSvgPath(op.shape, op.x * scale, op.y * scale, op.w * scale, op.h * scale);
  const x = op.x * scale;
  const y = op.y * scale;
  const w = op.w * scale;
  const h = op.h * scale;
  const longer = Math.max(w, h);
  return (
    `  <defs><clipPath id="${id}"><path d="${d}"/></clipPath></defs>\n` +
    `  <g clip-path="url(#${id})">` +
    `<image href="${href}" x="${x + (w - longer) / 2}" y="${y + (h - longer) / 2}" width="${longer}" height="${longer}"/>` +
    `</g>`
  );
}

/** Contador para dar identificadores unicos a los recortes. */
let clipSequence = 0;

/**
 * Variable donde se coloca la referencia a la imagen del logo.
 *
 * El SVG tiene que ser un unico archivo, sin dependencias externas. Por eso la
 * imagen viaja incrustada como datos, no como un enlace. Lo rellena el backend
 * de exportacion, que es el unico sitio donde se puede leer el archivo.
 */
let href = '';

/**
 * Indica el contenido que se incrustara en el hueco de la imagen del logo.
 *
 * @param dataUrl - La imagen del logo como URL de datos.
 */
export function setLogoDataUrl(dataUrl: string): void {
  href = attribute(dataUrl);
}

/**
 * Genera el SVG completo.
 *
 * @param list - Lista de instrucciones.
 * @param style - Estilo, para los dos colores.
 * @param scale - Pixels por modulo.
 * @param title - Texto alternativo, que es lo que lee un lector de pantalla.
 * @returns El documento SVG completo.
 */
export function toSvg(list: DrawList, style: QrStyle, scale: number, title: string): string {
  clipSequence = 0;
  const side = list.side * scale;
  // El fondo de la lista arranca en `-quietZone` módulos, para que el código
  // quede centrado. El `viewBox` tiene que arrancar en el mismo sitio: si
  // empieza en 0, la última zona silenciosa queda fuera del lienzo y el SVG
  // sale con el fondo cortado a la derecha y abajo. Es el mismo error que en el
  // canvas, y en los dos la zona silenciosa es lo que hace falta para que el
  // lector encuentre el código.
  const origin = -list.quietZone * scale;
  const body = list.ops
    .map((op) =>
      op.kind === 'shape'
        ? shapeToElement(op, scale, op.source === 'ink' ? style.foreground : style.background)
        : imageToElement(op, scale),
    )
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${origin} ${origin} ${side} ${side}" width="${side}" height="${side}" role="img" aria-label="${attribute(title)}">`,
    `  <title>${attribute(title)}</title>`,
    body,
    '</svg>',
    '',
  ].join('\n');
}
