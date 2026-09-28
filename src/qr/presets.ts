/**
 * Estilos y preajustes de un vistazo.
 *
 * Un preajuste es un punto de partida, no una imposicion. Todos los controles
 * siguen editables: lo que hacen es que la primera pantalla no sea un formulario
 * vacio con doce decisiones por tomar.
 *
 * @module
 */

import type { Ecc, FinderShape, ModuleShape, QrStyle } from './types';

/** Preajustes listos para usar. */
export interface Preset {
  /** Identificador estable, que es tambien la clave de traduccion. */
  readonly id: string;
  /** Estilo visual completo. */
  readonly style: QrStyle;
}

/**
 * Los preajustes.
 *
 * Ninguno queda bloqueado, que es la unica garantia que se les pide: se pueden
 * descargar siempre. En cuanto al color, todos llegan al minimo de contraste de
 * la norma, y los de formas redondeadas avisan, porque pierden tinta de verdad.
 * Un preajuste que saliera limpio del todo por evitar la alarma seria una
 * mentira: el canje de estilo por robustez existe, y lo honesto es nombrarlo
 * con un aviso en vez de esconderlo.
 */
export const PRESETS: readonly Preset[] = [
  {
    id: 'classic',
    style: { foreground: '#000000', background: '#ffffff', finder: 'square', module: 'square' },
  },
  {
    id: 'minimal',
    style: { foreground: '#1f2933', background: '#ffffff', finder: 'rounded', module: 'rounded' },
  },
  {
    id: 'dots',
    style: { foreground: '#2b2d42', background: '#ffffff', finder: 'circle', module: 'dots' },
  },
  {
    id: 'classy',
    style: { foreground: '#1a1a2e', background: '#f7f7fb', finder: 'leaf', module: 'extraRounded' },
  },
  {
    id: 'brand',
    style: { foreground: '#1e3a8a', background: '#ffffff', finder: 'rounded', module: 'rounded' },
  },
  {
    id: 'night',
    style: { foreground: '#f5f5f7', background: '#11131a', finder: 'rounded', module: 'rounded' },
  },
  {
    id: 'vibrant',
    style: { foreground: '#6d28d9', background: '#fdf4ff', finder: 'rounded', module: 'barH' },
  },
  {
    id: 'earth',
    style: { foreground: '#3f6212', background: '#f7fee7', finder: 'leaf', module: 'diamond' },
  },
  {
    id: 'contrast',
    style: { foreground: '#000000', background: '#ffffff', finder: 'square', module: 'square' },
  },
];

/** El preajuste con el que arranca la aplicacion. */
export const DEFAULT_PRESET = PRESETS[0]!;

/** Devuelve un preajuste por su identificador, o el de partida. */
export function presetById(id: string): Preset {
  return PRESETS.find((preset) => preset.id === id) ?? DEFAULT_PRESET;
}

/**
 * Forma de modulos que menos margen consume en cada nivel de correccion.
 *
 * No es una regla dura, solo el punto de partida que menos problemas da. Con
 * correccion alta el presupuesto de errores es amplio y los estilos vistosos
 * siguen funcionando; con correccion baja, cualquier redondeo se nota.
 */
export function suggestedModuleShape(ecc: Ecc): ModuleShape {
  return ecc === 'low' ? 'square' : 'rounded';
}

/** Formas disponibles para los patrones localizadores. */
export const FINDER_SHAPES: readonly FinderShape[] = ['square', 'rounded', 'circle', 'leaf'];

/** Formas disponibles para los modulos de datos. */
export const MODULE_SHAPES: readonly ModuleShape[] = ['square', 'rounded', 'extraRounded', 'dots', 'diamond', 'barH', 'barV'];

/** Niveles de correccion, en el orden en que se explican al usuario. */
export const ECC_LEVELS: readonly Ecc[] = ['low', 'medium', 'quartile', 'high'];
