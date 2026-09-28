/**
 * Superficie publica del modulo de payloads.
 *
 * Los imports dentro de `src/` deben apuntar aqui, no a `builders.ts` ni a
 * `types.ts`. Concentrar la reexportacion en un solo archivo hace que cambiar
 * la organizacion interna no obligue a tocar a todos los llamadores.
 *
 * @packageDocumentation
 */

export { buildPayload, buildEmail, buildSms, buildTel, buildText, buildVCard, buildWifi } from './builders';
export {
  buildTelUri,
  escapeVCardValue,
  escapeWifiValue,
  isPlausiblePhone,
  normalizePhone,
  normalizeUrl,
  percentEncode,
  requireText,
  splitPhone,
  type PhoneParts,
} from './escape';
export { splitFullName, type ParsedName } from './name';
export { describePayload, VERBATIM_LIMIT, type LinkParts, type Preview } from './preview';
export {
  emptyFields,
  PAYLOAD_KINDS,
  type EmailFields,
  type EmailMode,
  type FieldsOf,
  type PayloadError,
  type PayloadInput,
  type PayloadKind,
  type PayloadResult,
  type SmsFields,
  type TelFields,
  type TextFields,
  type VCardFields,
  type WifiFields,
  type WifiSecurity,
} from './types';
