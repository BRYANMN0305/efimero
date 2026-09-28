/**
 * Tipos de los campos de entrada y de los payloads construidos.
 *
 * @packageDocumentation
 */

/** Tipos de contenido que se pueden codificar. */
export const PAYLOAD_KINDS = ['texto', 'wifi', 'email', 'sms', 'tel', 'vcard'] as const;

/** Tipo de contenido seleccionado. */
export type PayloadKind = (typeof PAYLOAD_KINDS)[number];

/** Texto libre o enlace. */
export interface TextFields {
  text: string;
}

/** Seguridad de una red WiFi. */
export type WifiSecurity = 'WPA' | 'WEP' | 'nopass';

/** Campos de una red WiFi. */
export interface WifiFields {
  ssid: string;
  security: WifiSecurity;
  password: string;
  hidden: boolean;
}

/** Que debe ocurrir al escanear una direccion de correo. */
export type EmailMode = 'mailto' | 'text';

/** Campos de correo electronico. */
export interface EmailFields {
  mode: EmailMode;
  to: string;
  subject: string;
  body: string;
}

/** Campos de SMS. */
export interface SmsFields {
  number: string;
  message: string;
}

/** Campos de una llamadaTelefonica. */
export interface TelFields {
  number: string;
}

/** Campos de una tarjeta de contacto. */
export interface VCardFields {
  fullName: string;
  organization: string;
  jobTitle: string;
  phone: string;
  email: string;
  website: string;
}

/** Union discriminada: cada tipo de contenido con sus campos. */
export type PayloadInput =
  | { kind: 'texto'; fields: TextFields }
  | { kind: 'wifi'; fields: WifiFields }
  | { kind: 'email'; fields: EmailFields }
  | { kind: 'sms'; fields: SmsFields }
  | { kind: 'tel'; fields: TelFields }
  | { kind: 'vcard'; fields: VCardFields };

/** Los campos de entrada que corresponden a un tipo de contenido dado. */
export type FieldsOf<K extends PayloadKind> = Extract<PayloadInput, { kind: K }>['fields'];

/** Campos vacios de cada tipo, indexed por tipo. */
const EMPTY_FIELDS = {
  texto: { text: '' },
  wifi: { ssid: '', security: 'WPA', password: '', hidden: false },
  email: { mode: 'mailto', to: '', subject: '', body: '' },
  sms: { number: '', message: '' },
  tel: { number: '' },
  vcard: {
    fullName: '',
    organization: '',
    jobTitle: '',
    phone: '',
    email: '',
    website: '',
  },
} as const satisfies { [K in PayloadKind]: FieldsOf<K> };

/**
 * Campos de entrada vacios para un tipo de contenido.
 *
 * Es generica para que `emptyFields('wifi')` devuelva `WifiFields` y no la
 * union de los seis tipos. Sin el parametro generico, quien llame tendria que
 * convertir el resultado antes de pasarlo a `buildPayload`.
 *
 * La tabla se declara con `satisfies` para que el compilador compruebe que las
 * seis formas coinciden con sus tipos, y la conversion que hace falta al leer
 * de la tabla es segura precisamente por eso.
 */
export function emptyFields<K extends PayloadKind>(kind: K): FieldsOf<K> {
  return EMPTY_FIELDS[kind] as FieldsOf<K>;
}

/** Por que no se pudo construir un payload. */
export type PayloadError =
  /** Falta un campo obligatorio. */
  | 'incomplete'
  /** Hay un campo con un formato que no es valido. */
  | 'invalid';

/** Resultado de construir un payload. */
export type PayloadResult = { ok: true; payload: string } | { ok: false; error: PayloadError };
