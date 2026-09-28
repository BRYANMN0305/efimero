/**
 * Runtime de traduccion: deteccion de idioma, interpolacion y persistencia.
 *
 * La funcion `t` es pura y recibe el idioma como parametro, en vez de leer un
 * global. Asi los tests no dependen del estado del navegador y el renderizado es
 * reproducible.
 *
 * @packageDocumentation
 */

import { DEFAULT_LOCALE, LOCALES, es, type Locale, type MessageKey } from './es';
import { en } from './en';

/** Catalogos de traduccion por idioma. */
const CATALOG: Record<Locale, Record<MessageKey, string>> = { es, en };

/** Clave bajo la que se guarda la preferencia de idioma. */
const STORAGE_KEY = 'efimero.locale';

/** Comprueba si un string cualquiera es un idioma soportado. */
export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/**
 * Sustituye marcadores `{nombre}` por valores.
 *
 * Se recorre con `replace` sobre una expresion regular construida a partir de
 * las claves, en vez de con un bucle `split`/`join`, para que un valor que
 * contenga un marcador literal no se interprete a si mismo y genere recursión.
 *
 * @throws {Error} Si se pasa un marcador que no existe en la cadena original.
 *   Es un error de programacion, no de usuario: un texto sin traducir debe
 *   romper el build en los tests, no aparecer en produccion.
 *
 * Se exporta para poder probarla directamente: ninguna clave del catalogo
 * repite hoy un marcador, asi que a traves de `t()` esta propiedad no se puede
 * observar, y un `replace` sin el flag `g` pasaria los tests sin que nadie se
 * entere.
 */
export function interpolate(template: string, params: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = params[key];
    if (value === undefined) {
      throw new Error(
        `Falta el parametro "${key}" para la plantilla "${template}". ` +
          'Revisa que todos los marcadores de la traduccion tengan valor.',
      );
    }
    return String(value);
  });
}

/**
 * Traduce una clave al idioma indicado.
 *
 * Siempre interpola, aunque no se pasen parametros. Asi, llamar `t('es',
 * 'field.text.help')` sin `n` lanza en vez de imprimir `{n}` en pantalla: un
 * marcador sin valor es un error de programacion y debe saltar en los tests, no
 * aparecer en produccion.
 *
 * @param locale - Idioma destino.
 * @param key - Clave definida en `es.ts`.
 * @param params - Valores para los marcadores `{nombre}`.
 * @throws {Error} Si la plantilla tiene un marcador sin valor correspondiente.
 */
export function t(locale: Locale, key: MessageKey, params: Readonly<Record<string, string | number>> = {}): string {
  const template = CATALOG[locale][key] ?? CATALOG[DEFAULT_LOCALE][key] ?? key;
  return interpolate(template, params);
}

/**
 * Formatea un numero de bytes en unidades legibles, en el idioma dado.
 *
 * El separador decimal se delega en `Intl` porque cambia con el idioma: en
 * español un byte se muestra como `2,0 KB` y en inglés como `2.0 KB`. Hardcodear
 * el punto dejaria un formato visiblemente ajeno en la version espanola.
 */
export function formatBytes(locale: Locale, bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kib = bytes / 1024;
  // Un decimal por debajo de 10 KB, ninguno por encima: a partir de ahi el
  // decimal es ruido y estorba mas de lo que informa.
  const digits = kib < 10 ? 1 : 0;
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(kib);
  return `${formatted} KB`;
}

/**
 * Elige el idioma inicial a partir de las preferencias del navegador.
 *
 * Solo se toma el idioma base (`es-MX` -> `es`). Buscar `es-MX` en el catalogo
 * no encontraria nada y cairia al default, que es justamente `es`.
 */
export function detectLocale(preferred: readonly string[] = readNavigatorLanguages()): Locale {
  for (const entry of preferred) {
    const base = entry.toLowerCase().split('-')[0];
    if (base !== undefined && isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}

/** Lee `navigator.languages`, tolerando que no exista. */
function readNavigatorLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return [];

  // No se comprueba con `Array.isArray`. Ese predicado estrecha a `any[]`
  // porque solo conoce arrays mutables, y al perder el tipo de los elementos
  // se pierde tambien la comprobacion. Ademas se copia con `...` para no
  // devolver el array vivo del navegador.
  const languages = navigator.languages;
  if (languages !== undefined && languages.length > 0) return [...languages];

  return navigator.language ? [navigator.language] : [];
}

/**
 * Devuelve el idioma inicial: la preferencia guardada si existe y sigue siendo
 * valida, si no el detectado del navegador.
 */
export function initialLocale(): Locale {
  const saved = readStoredLocale();
  if (saved) return saved;
  return detectLocale();
}

/** Lee la preferencia de idioma del almacenamiento local. */
function readStoredLocale(): Locale | null {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    return isLocale(raw) ? raw : null;
  } catch {
    // Modo privado de Safari y contextos con cookies bloqueadas lanzan aqui.
    // La falta de almacenamiento no es un motivo para fallar.
    return null;
  }
}

/**
 * Guarda la preferencia de idioma.
 *
 * @returns `true` si se pudo guardar. Un `false` no es un error: la preferencia
 *   simplemente no persistira entre visitas.
 */
export function storeLocale(locale: Locale): boolean {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, locale);
    return true;
  } catch {
    return false;
  }
}

export type { Locale, MessageKey };
export { DEFAULT_LOCALE, LOCALES };
