/**
 * Salida a lienzo.
 *
 * Recorre la lista de dibujo sobre un `CanvasRenderingContext2D`. No decide
 * nada: toda la decision sobre que se dibuja y en que color esta en
 * `draw-list.ts`. Este archivo solo sabe pintar formas y recortar imagenes.
 *
 * Se usa el mismo camino para lo que se ve en pantalla, para el PNG que se
 * descarga y para los pixeles que se le pasan al verificador. Un solo camino
 * significa que lo que se comprueba es exactamente lo que se entrega.
 *
 * @module
 */

import type { DrawList, DrawOp } from './draw-list';
import { shapeToSvgPath } from './shapes';
import type { QrStyle } from './types';

/** Un lienzo y su contexto, ya configurados. */
export interface Target {
  readonly canvas: HTMLCanvasElement;
  readonly context: CanvasRenderingContext2D;
}

/**
 * Crea un lienzo del tamano pedido, en pixeles reales del dispositivo.
 *
 * @param pixels - Lado en pixeles logicos.
 * @returns El lienzo y su contexto, ya con la matriz de escala aplicada.
 */
export function createTarget(pixels: number): Target {
  const side = Math.max(1, Math.round(pixels));
  const canvas = document.createElement('canvas');
  canvas.width = side;
  canvas.height = side;
  const context = canvas.getContext('2d');
  if (context === null) throw new Error('Este navegador no admite un contexto de lienzo 2D.');
  return { canvas, context };
}

/** Pinta una operacion de forma. */
function paintShape(context: CanvasRenderingContext2D, op: DrawOp & { kind: 'shape' }, color: string): void {
  if (op.w <= 0 || op.h <= 0) return;
  context.fillStyle = color;
  context.beginPath();
  // El trazado sale de la misma funcion que usa el SVG, de modo que las dos
  // salidas comparten una unica definicion de cada forma.
  const path = new Path2D(shapeToSvgPath(op.shape, op.x, op.y, op.w, op.h));
  context.fill(path);
}

/**
 * Pinta una operacion de imagen, recortada a su forma.
 *
 * El recorte se hace con `clip()` y no con `drawImage`, porque `drawImage` solo
 * admite esquinas redondeadas en algunos navegadores y aqui se quiere el mismo
 * resultado que en el SVG, incluidas las formas que no son rectangulo.
 */
function paintImage(context: CanvasRenderingContext2D, op: DrawOp & { kind: 'image' }): void {
  if (op.w <= 0 || op.h <= 0) return;
  context.save();
  context.beginPath();
  context.clip(new Path2D(shapeToSvgPath(op.shape, op.x, op.y, op.w, op.h)));
  // Se dibuja un poco mas grande que la caja y centrado, para que una imagen
  // que no sea cuadrada se llene en vez de deformarse. El recorte es lo que
  // decide donde se ve.
  const width = op.w;
  const height = op.h;
  const longer = Math.max(width, height);
  context.drawImage(op.image, op.x + (width - longer) / 2, op.y + (height - longer) / 2, longer, longer);
  context.restore();
}

/**
 * Dibuja una lista completa.
 *
 * @param target - Lienzo destino, ya del tamano correcto.
 * @param list - Lista de instrucciones.
 * @param style - Estilo, para saber los dos colores.
 * @param scale - Pixels por modulo.
 * @param offset - Desplazamiento del origen de la zona codificada, en pixeles.
 */
export function paint(target: Target, list: DrawList, style: QrStyle, scale: number, offset: number): void {
  const { context } = target;
  context.save();
  context.clearRect(0, 0, target.canvas.width, target.canvas.height);

  for (const op of list.ops) {
    context.save();
    context.translate(offset, offset);
    context.scale(scale, scale);
    if (op.kind === 'shape') {
      paintShape(context, op, op.source === 'ink' ? style.foreground : style.background);
    } else {
      paintImage(context, op);
    }
    context.restore();
  }
  context.restore();
}

/**
 * Convierte los pixeles del lienzo en una imagen plana.
 *
 * El resultado es el formato que espera el verificador de lectura, y tambien el
 * que necesita la exportacion a PNG cuando se quieren los pixeles exactos y no
 * los que el navegador decida codificar.
 */
export function readPixels(target: Target): ImageData {
  return target.context.getImageData(0, 0, target.canvas.width, target.canvas.height);
}
