/**
 * Construccion de la lista de dibujo.
 *
 * Este es el nucleo del proyecto: aqui se decide, una sola vez, como se ve cada
 * pixel del codigo. Los tres backends de salida (el lienzo de la pantalla, el PNG
 * que se descarga y el SVG) no toman ninguna decision propia, se limitan a
 * recorrer la lista que sale de aqui.
 *
 * Las coordenadas van en unidades de modulo. El factor de escala lo aplica cada
 * backend, y por eso la misma lista sirve para un icono de 64 pixeles y para
 * una impresion de 2000.
 *
 * @module
 */

import type { EncodedQr, LogoPlacement, QrStyle } from './types';
import { shapeArea, type Shape } from './shapes';

/** De donde sale el color de una operacion. */
export type DrawSource = 'ink' | 'background';

/** Una forma rellena de un color plano. */
export interface ShapeOp {
  readonly kind: 'shape';
  readonly shape: Shape;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly source: DrawSource;
}

/** Una imagen recortada a una forma. */
export interface ImageOp {
  readonly kind: 'image';
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly shape: Shape;
  readonly image: CanvasImageSource;
}

/** Una instruccion de dibujo. */
export type DrawOp = ShapeOp | ImageOp;

/**
 * El codigo completo, listo para dibujar en cualquier backend.
 */
export interface DrawList {
  /** Instrucciones en orden de pintado. */
  readonly ops: readonly DrawOp[];
  /** Lado de la zona codificada, en modulos. */
  readonly modules: number;
  /** Zona silenciosa alrededor, en modulos. */
  readonly quietZone: number;
  /** Lado total, en modulos, con la zona silenciosa incluida. */
  readonly side: number;
  /** Version del simbolo, para mostrarla en la interfaz. */
  readonly version: number;
  /**
   * Fraccion de tinta que el estilo se ha comido con respecto a una rejilla de
   * modulos cuadrados, entre 0 y 1.
   *
   * No es una estimacion: sale de sumar el area real de cada operacion de tinta y
   * dividirla entre el area que ocuparia una rejilla normal. Un codigo de
   * puntos vale alrededor de 0,21.
   */
  readonly inkLoss: number;
}

/** Lado de un patron localizador, en modulos. */
const FINDER_SIZE = 7;
/** Lado del anillo claro interior de un localizador. */
const FINDER_INNER = 5;
/** Lado del nucleo oscuro interior de un localizador. */
const FINDER_CORE = 3;

/** Devuelve la forma que corresponde a un modulo segun el estilo elegido. */
function moduleShape(style: QrStyle): Shape {
  switch (style.module) {
    case 'square':
      return { kind: 'rect', radius: 0 };
    case 'rounded':
      // Un cuarto de modulo: se nota el redondeo sin que los modulos vecinos
      // lleguen a tocarse ni a dejar un hueco que rompa la lectura.
      return { kind: 'rect', radius: 0.25 };
    case 'extraRounded':
      return { kind: 'rect', radius: 0.4 };
    case 'dots':
      return { kind: 'circle' };
    case 'diamond':
      return { kind: 'diamond' };
    case 'barH':
      return { kind: 'bar', horizontal: true, fill: 0.5 };
    case 'barV':
      return { kind: 'bar', horizontal: false, fill: 0.5 };
  }
}

/** Devuelve la forma que corresponde a un patron localizador. */
function finderShape(style: QrStyle): Shape {
  switch (style.finder) {
    case 'square':
      return { kind: 'rect', radius: 0 };
    case 'rounded':
      return { kind: 'rect', radius: 1.5 };
    case 'circle':
      return { kind: 'circle' };
    case 'leaf':
      return { kind: 'leaf' };
  }
}

/**
 * Dice si un modulo forma parte del patron de temporizacion.
 *
 * Las filas y columnas 6 son un patron alterno fijo que usan los lectores para
 * sincronizarse con la rejilla. Si se dibuja con la forma del modulo elegido, un
 * codigo de puntos produce una fila de puntos separados, y hay lectores que no
 * la recuperan. Por eso aqui siempre son cuadrados macizos, se estilice lo que
 * se estilice el resto.
 */
function isTimingModule(x: number, y: number, size: number): boolean {
  const onRow = y === 6 && x >= 8 && x <= size - 9;
  const onColumn = x === 6 && y >= 8 && y <= size - 9;
  return onRow || onColumn;
}

/** Posicion de la esquina superior izquierda de cada patron localizador. */
function finderOrigins(size: number): readonly (readonly [number, number])[] {
  return [
    [0, 0],
    [size - FINDER_SIZE, 0],
    [0, size - FINDER_SIZE],
  ];
}

/** Indica si un modulo cae dentro de un patron localizador. */
function insideFinder(x: number, y: number, size: number): boolean {
  for (const [ox, oy] of finderOrigins(size)) {
    if (x >= ox && x < ox + FINDER_SIZE && y >= oy && y < oy + FINDER_SIZE) return true;
  }
  return false;
}

/** Redondea a cuatro decimales, para que la lista sea estable y comparable. */
function round(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

/**
 * Construye la lista de dibujo de un codigo.
 *
 * @param qr - Simbolo ya codificado.
 * @param style - Estilo visual.
 * @param quietZone - Zona silenciosa, en modulos.
 * @param logo - Logo a superponer, o `null`.
 * @returns La lista de instrucciones, con la perdida de tinta calculada.
 */
export function buildDrawList(qr: EncodedQr, style: QrStyle, quietZone: number, logo: LogoPlacement | null = null): DrawList {
  const { size } = qr;
  const ops: DrawOp[] = [];

  {
    ops.push({
      kind: 'shape',
      shape: { kind: 'rect', radius: 0 },
      x: -quietZone,
      y: -quietZone,
      w: size + quietZone * 2,
      h: size + quietZone * 2,
      source: 'background',
    });
  }

  const dataShape = moduleShape(style);
  let inkArea = 0;
  let darkModules = 0;
  let knockouts = 0;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!qr.getModule(x, y)) continue;
      darkModules++;
      if (insideFinder(x, y, size)) continue;

      // El patron de temporizacion siempre a cuadrado macizo.
      const shape = isTimingModule(x, y, size) ? ({ kind: 'rect', radius: 0 } as const) : dataShape;
      ops.push({ kind: 'shape', shape, x, y, w: 1, h: 1, source: 'ink' });
    }
  }

  for (const [ox, oy] of finderOrigins(size)) {
    const outer = finderShape(style);
    // El anillo claro interior se dibuja con el color de fondo, no recortando.
    // Sin el, el interior del localizador saldria en negro, que es el fallo
    // clasico de los exportadores.
    ops.push({ kind: 'shape', shape: outer, x: ox, y: oy, w: FINDER_SIZE, h: FINDER_SIZE, source: 'ink' });
    ops.push({
      kind: 'shape',
      shape: outer,
      x: ox + 1,
      y: oy + 1,
      w: FINDER_INNER,
      h: FINDER_INNER,
      source: 'background',
    });
    // El anillo claro se pinta encima de la tinta del anillo oscuro, asi que
    // hay que restarlo. Sin esta cuenta, un codigo de circulos pierde un area
    // negativa y el aviso de tinta desaparece justo cuando deberia salir.
    knockouts += shapeArea(outer, FINDER_INNER, FINDER_INNER);
    ops.push({
      kind: 'shape',
      shape: outer,
      x: ox + 2,
      y: oy + 2,
      w: FINDER_CORE,
      h: FINDER_CORE,
      source: 'ink',
    });
  }

  if (logo !== null) {
    const plate = logo.side + logo.margin * 2;
    const origin = (size - plate) / 2;

    // Un tapon del color de fondo detras del logo. Garantiza el contraste sea
    // cual sea el color del logo, y su coste en area se cuenta en la perdida de
    // tinta para que el aviso de escaneabilidad lo tenga en cuenta.
    ops.push({
      kind: 'shape',
      shape: { kind: 'rect', radius: logo.shape === 'circle' ? plate / 2 : logo.shape === 'rounded' ? plate * 0.2 : 0 },
      x: round(origin),
      y: round(origin),
      w: round(plate),
      h: round(plate),
      source: 'background',
    });
    // El tapon tapa lo que hubiera debajo, y ni el tapon ni el logo cuentan
    // como tinta util: para el lector, esa zona esta perdida por igual.
    knockouts += plate * plate;

    const corner = (size - logo.side) / 2;
    ops.push({
      kind: 'image',
      x: round(corner),
      y: round(corner),
      w: round(logo.side),
      h: round(logo.side),
      shape:
        logo.shape === 'circle'
          ? { kind: 'circle' }
          : logo.shape === 'rounded'
            ? { kind: 'rect', radius: logo.side * 0.2 }
            : { kind: 'rect', radius: 0 },
      image: logo.image,
    });
  }

  // La tinta real es la que se ve. Se suman las formas oscuras, se resta lo que
  // encima se ha puesto en color de fondo, y el resultado se compara con el
  // numero de modulos oscuros de verdad. Los localizadores se comparan con los
  // 33 modulos oscuros que tienen, no con las 58 unidades de tinta que se pintan
  // antes de tapar el anillo claro.
  for (const op of ops) {
    if (op.kind !== 'shape' || op.source !== 'ink') continue;
    inkArea += shapeArea(op.shape, op.w, op.h);
  }

  const fullArea = Math.max(1, darkModules);
  const inkLoss = Math.max(0, Math.min(1, 1 - (inkArea - knockouts) / fullArea));

  return {
    ops,
    modules: size,
    quietZone,
    side: size + quietZone * 2,
    version: qr.version,
    inkLoss: round(inkLoss),
  };
}
