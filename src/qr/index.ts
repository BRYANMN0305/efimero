/**
 * Superficie publica del subsistema de codigos QR.
 *
 * @module
 */

export { buildDrawList, type DrawList, type DrawOp, type DrawSource, type ImageOp, type ShapeOp } from './draw-list';
export { createTarget, paint, readPixels, type Target } from './canvas';
export { contrastRatio, diagnose, parseCssColor, relativeLuminance, type Check, type Diagnosis, type Verdict } from './safety';
export { setLogoDataUrl, toSvg } from './svg';
export {
  DEFAULT_PRESET,
  ECC_LEVELS,
  FINDER_SHAPES,
  MODULE_SHAPES,
  PRESETS,
  presetById,
  suggestedModuleShape,
  type Preset,
} from './presets';
export { encodeBytes, encodeText, QrEncodeError } from './encode';
export { shapeArea, shapeContains, shapeCoverage, shapeToSvgPath, type Shape } from './shapes';
export { countUtf8Bytes, needsEci, utf8Bytes } from './utf8';
export { preloadReader, verifyPixels, whenReaderReady, type VerifyResult } from './verify';
export type { Ecc, ExportFormat, FinderShape, LogoPlacement, LogoShape, ModuleShape, QrStyle } from './types';
