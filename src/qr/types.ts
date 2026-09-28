/**
 * Tipos publicos del subsistema de codificacion y dibujo.
 *
 * Todo el dibujo se expresa en unidades de modulo, nunca en pixeles. Un
 * modulo es la unidad de la rejilla del codigo: la version 1 tiene 21 módulos
 * de lado. Trabajar en módulos y no en píxeles es lo que permite que la misma
 * lista de instrucciones sirva para el lienzo en pantalla, para el PNG
 * exportado, para el SVG y para el rasterizador interno que comprueba que el
 * resultado se puede leer. El factor de escala lo aplica cada backend.
 *
 * @module
 */

/** Nivel de correccion de errores del codigo. */
export type Ecc = 'low' | 'medium' | 'quartile' | 'high';

/**
 * Forma de cada modulo de datos.
 *
 * Se eligieron siete y no mas porque cada forma distinta resta margen de
 * escaneabilidad, y el usuario tiene que poder ver ese coste. Las opciones que
 * de verdad consumen margen de lectura se avisan con numeros, no con adjetivos.
 */
export type ModuleShape = 'square' | 'rounded' | 'extraRounded' | 'dots' | 'diamond' | 'barH' | 'barV';

/** Forma de los tres patrones localizadores de las esquinas. */
export type FinderShape = 'square' | 'rounded' | 'circle' | 'leaf';

/** Contorno del logo superpuesto. */
export type LogoShape = 'none' | 'circle' | 'rounded' | 'plain';

/** Formatos de archivo que se pueden descargar. */
export type ExportFormat = 'png' | 'svg';

/** Estilo visual completo de un codigo. */
export interface QrStyle {
  /** Color de los modulos oscuros, en cualquier notacion de color del navegador. */
  readonly foreground: string;
  /** Color de fondo. Siempre opaco: un QR se imprime y se lee sobre papel. */
  readonly background: string;
  /** Forma de los patrones localizadores. */
  readonly finder: FinderShape;
  /** Forma de los modulos de datos. */
  readonly module: ModuleShape;
}

/** Como se coloca un logo en el centro del codigo. */
export interface LogoPlacement {
  /** Lado del logo medido en módulos. */
  readonly side: number;
  /** Margen de aire alrededor del logo, en módulos. */
  readonly margin: number;
  /** Contorno aplicado. */
  readonly shape: LogoShape;
  /** Imagen ya cargada y lista para dibujar. */
  readonly image: CanvasImageSource;
}

/**
 * Cuanto de la imagen original conserva un modulo al aplicar una forma.
 *
 * Una rejilla normal de modulos cuadrados cubre el area completa: la perdida es
 * cero. Un punto del tamano de un modulo solo cubre el circulo inscrito, un
 * 21,5% menos. Esa fraccion de tinta perdida es la que hace que los codigos con
 * puntos se lean peor, y por eso el aviso de seguridad la calcula y la enseña en
 * lugar de limitarse a opinion.
 *
 * @returns Fraccion de cobertura del area, entre 0 y 1.
 */
export type InkCoverage = number;

/** Un codigo ya codificado, junto con los datos de como se genero. */
export interface EncodedQr {
  /** Matriz de modulos: `true` es un módulo oscuro. */
  readonly size: number;
  /** Version del simbolo, de 1 a 40. El tamano en modulos sale de aqui. */
  readonly version: number;
  /** Nivel de correccion de errores efectivo, que puede ser mejor que el pedido. */
  readonly ecc: Ecc;
  /** Numero de mascara aplicado, de 0 a 7. */
  readonly mask: number;
  /** Si el contenido lleva designador ECI. */
  readonly hasEci: boolean;
  /** Si el contenido va codificado en modo binario y no como texto legible. */
  readonly isBinary: boolean;
  /** Lectura de un modulo. Coordenadas desde 0, fuera del rango devuelve `false`. */
  getModule(x: number, y: number): boolean;
}
