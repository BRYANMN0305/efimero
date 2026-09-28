/**
 * Superficie publica de la capa de seguridad.
 *
 * Aqui vive lo unico que la herramienta se niega a codificar: los esquemas que
 * ejecutan codigo en el telefono de quien escanea. No hay heuristicas de
 * phishing ni avisos sobre enlaces, y esa ausencia es una decision, no un
 * olvido. Ver el comentario de `tests/security.test.ts` para el motivo.
 *
 * @packageDocumentation
 */

export { BLOCKED_SCHEMES, findBlockedScheme, isBlockedScheme, normalizeForSchemeCheck, type BlockedScheme } from './schemes';
export {
  ACCEPTED_LOGO_FORMATS,
  intakeBytes,
  inspectLogo,
  readDimensions,
  sniffFormat,
  type LogoFormat,
  type LogoIntake,
  type LogoRejection,
} from './logo-intake';
