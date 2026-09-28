/**
 * Constructores de payload.
 *
 * Cada funcion recibe los campos del formulario y devuelve exactamente la
 * cadena de texto que se codificara en el QR. Ninguna aplica correccion de
 * errores, seguridad ni estilo: eso vive en las capas siguientes. La unica
 * responsabilidad aqui es producir una cadena que el telefono vaya a entender.
 *
 * `buildPayload` es el punto de entrada unico. La UI nunca llama a un
 * constructor concreto, asi el despacho queda en un solo sitio y anadir un tipo
 * de contenido son dos archivos y no tres.
 *
 * @packageDocumentation
 */

import {
  buildTelUri,
  escapeVCardValue,
  escapeWifiValue,
  isPlausiblePhone,
  normalizeUrl,
  percentEncode,
  requireText,
  splitPhone,
} from './escape';
import { splitFullName } from './name';
import type {
  EmailFields,
  PayloadInput,
  PayloadResult,
  SmsFields,
  TelFields,
  TextFields,
  VCardFields,
  WifiFields,
} from './types';

/* -------------------------------------------------------------------------- */
/* Texto                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Texto libre o enlace.
 *
 * El texto se pasa tal cual, sin recortar. Recortarlo seria una sorpresa: quien
 * pega codigo o una plantilla con saltos de linea finales quiere que se escanee
 * exactamente eso. Un QR de texto es un espejo.
 */
export function buildText(fields: TextFields): PayloadResult {
  if (fields.text === '') return { ok: false, error: 'incomplete' };
  return { ok: true, payload: fields.text };
}

/* -------------------------------------------------------------------------- */
/* WiFi                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Red WiFi, en el formato de facto `WIFI:T:..;S:..;P:..;H:..;;`
 *
 * El doble punto y coma final es obligatorio en la implementacion de referencia
 * de ZXing: sin el, el ultimo campo se interpreta como parte del anterior en
 * parte de los lectores.
 */
export function buildWifi(fields: WifiFields): PayloadResult {
  const ssid = requireText(fields.ssid);
  if (ssid === null) return { ok: false, error: 'incomplete' };

  const parts: string[] = [`T:${fields.security}`, `S:${escapeWifiValue(ssid)}`];

  // Una red abierta no lleva clave. Enviarla vacia haria que algunos lectores
  // pidieran una contrasena en blanco en vez de conectarse directamente.
  if (fields.security !== 'nopass') {
    const password = requireText(fields.password);
    if (password === null) return { ok: false, error: 'incomplete' };
    parts.push(`P:${escapeWifiValue(password)}`);
  }

  parts.push(`H:${fields.hidden ? 'true' : 'false'}`);
  return { ok: true, payload: `WIFI:${parts.join(';')};;` };
}

/* -------------------------------------------------------------------------- */
/* Correo                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Direccion de correo electronico.
 *
 * Dos modos porque hacen cosas distintas en el telefono:
 *
 *  - `mailto:` abre la app de correo con destinatario, asunto y cuerpo ya
 *    puestos. Exige percent-codificar asunto y cuerpo.
 *  - `text` devuelve la direccion tal cual, para verla sin abrir nada.
 */
export function buildEmail(fields: EmailFields): PayloadResult {
  const to = requireText(fields.to);
  if (to === null) return { ok: false, error: 'incomplete' };
  if (!isPlausibleEmail(to)) return { ok: false, error: 'invalid' };

  if (fields.mode === 'text') return { ok: true, payload: to };

  const query: string[] = [];
  const subject = requireText(fields.subject);
  if (subject !== null) query.push(`subject=${percentEncode(subject)}`);
  const body = fields.body.trim();
  if (body !== '') query.push(`body=${percentEncode(body)}`);

  const suffix = query.length > 0 ? `?${query.join('&')}` : '';
  return { ok: true, payload: `mailto:${to}${suffix}` };
}

/* -------------------------------------------------------------------------- */
/* SMS y telefonia                                                              */
/* -------------------------------------------------------------------------- */

/**
 * SMS con numero y texto prellenados.
 *
 * Se usa el esquema URI `sms:` y no el atajo `SMSTO:`. La razon es el
 * escapado: `SMSTO:123:hola` no define ninguna codificacion para el cuerpo, de
 * modo que un texto con dos puntos rompe el analisis en todos los lectores, y
 * percent-codificarlo solo funciona en los que lo hacen por extensions. El
 * esquema `sms:` define una query string, y `encodeURIComponent` es exactamente
 * la codificacion de una query string.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc5724}
 */
export function buildSms(fields: SmsFields): PayloadResult {
  const number = requireText(fields.number);
  if (number === null) return { ok: false, error: 'incomplete' };
  // La extension se descarta a proposito: un SMS va a un numero, no a una
  // extension, y el esquema sms: no tiene forma de transportarla.
  const { number: main, extension } = splitPhone(number);
  if (extension !== null) {
    return { ok: false, error: 'invalid' };
  }
  if (!isPlausiblePhone(main)) return { ok: false, error: 'invalid' };

  const message = fields.message.trim();
  if (message === '') return { ok: true, payload: `sms:${main}` };
  return { ok: true, payload: `sms:${main}?body=${percentEncode(message)}` };
}

/** Llamada telefonica. */
export function buildTel(fields: TelFields): PayloadResult {
  const number = requireText(fields.number);
  if (number === null) return { ok: false, error: 'incomplete' };
  const parts = splitPhone(number);
  if (!isPlausiblePhone(parts.number)) return { ok: false, error: 'invalid' };
  return { ok: true, payload: buildTelUri(parts) };
}

/* -------------------------------------------------------------------------- */
/* vCard                                                                       */
/* -------------------------------------------------------------------------- */

/** Separador de lineas obligatorio en vCard: CR LF, nunca LF a secas. */
const CRLF = '\r\n';

/**
 * Tarjeta de contacto vCard 3.0.
 *
 * Se genera la 3.0 y no la 4.0 porque la 4.0 cambio el modelo de datos (`TEL`
 * pasa a `TEL;VALUE=uri:tel:+...`) y buena parte de las agendas de telefono,
 * iOS y Android incluidas, siguen leyendo 3.0 sin conversiones. Un QR que la
 * camara de un iPhone no importa es un QR que no sirve.
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc2426}
 */
export function buildVCard(fields: VCardFields): PayloadResult {
  const fullName = requireText(fields.fullName);
  if (fullName === null) return { ok: false, error: 'incomplete' };

  const { family, given, prefix } = splitFullName(fullName);

  const lines: string[] = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    // N: es apellido;nombre;adicional;prefijo;sufijo, en ese orden fijo.
    `N:${escapeVCardValue(family)};${escapeVCardValue(given)};;${escapeVCardValue(prefix)};`,
    // FN: es obligatorio, y es lo que la agenda muestra.
    `FN:${escapeVCardValue(fullName)}`,
  ];

  const org = requireText(fields.organization);
  if (org !== null) lines.push(`ORG:${escapeVCardValue(org)}`);

  const jobTitle = requireText(fields.jobTitle);
  if (jobTitle !== null) lines.push(`TITLE:${escapeVCardValue(jobTitle)}`);

  const phone = requireText(fields.phone);
  if (phone !== null) {
    const parts = splitPhone(phone);
    if (isPlausiblePhone(parts.number)) {
      // El campo TEL lleva el numero DESNUDO. El URI "tel:+..." es sintaxis de
      // vCard 4.0 y una agenda sin migrar lo guardaria literalmente.
      lines.push(`TEL;TYPE=CELL,VOICE:${parts.number}`);
    }

    /*
     * La extension no va en el TEL. La vCard 3.0 no define ningun sitio para
     * ella, y la convencion no estandar de pegarla como ";ext=99" obliga a
     * dejar un punto y coma SIN escapar dentro de un valor, que es justo lo
     * que el escapado de la RFC 6350 prohibe. Con el punto y coma escapado la
     * extension no se reconoce; sin escapar, un parser estricto guarda un
     * numero roto en la agenda. Entre las dos opciones, guardar el numero
     * principal correctamente y anotar la extension es la que menos daña.
     */
    if (parts.extension !== null) {
      lines.push(`NOTE:${escapeVCardValue(`extensión ${parts.extension}`)}`);
    }
  }

  const email = requireText(fields.email);
  if (email !== null && isPlausibleEmail(email)) lines.push(`EMAIL;TYPE=INTERNET:${email}`);

  const website = requireText(fields.website);
  if (website !== null) lines.push(`URL:${normalizeUrl(website)}`);

  lines.push('END:VCARD');

  // El salto de linea final tras END:VCARD es parte del formato.
  return { ok: true, payload: lines.join(CRLF) + CRLF };
}

/* -------------------------------------------------------------------------- */
/* Utilidades compartidas                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Comprobacion de forma minima de una direccion de correo.
 *
 * No es un validador RFC 5322. Solo evita el error obvio: un destinatario sin
 * arroba o sin dominio, que casi siempre es un campo mal capturado. Rechazar
 * direcciones validas pero inusuales seria peor que dejar pasar una errata.
 */
function isPlausibleEmail(value: string): boolean {
  const parts = value.split('@');
  if (parts.length !== 2) return false;
  const [local, domain] = parts as [string, string];
  if (local === '' || domain === '') return false;
  return domain.includes('.') && !domain.startsWith('.') && !domain.endsWith('.');
}

/* -------------------------------------------------------------------------- */
/* Despacho                                                                    */
/* -------------------------------------------------------------------------- */

/** Construye el payload del tipo de contenido indicado. */
export function buildPayload(input: PayloadInput): PayloadResult {
  switch (input.kind) {
    case 'texto':
      return buildText(input.fields);
    case 'wifi':
      return buildWifi(input.fields);
    case 'email':
      return buildEmail(input.fields);
    case 'sms':
      return buildSms(input.fields);
    case 'tel':
      return buildTel(input.fields);
    case 'vcard':
      return buildVCard(input.fields);
  }
}
