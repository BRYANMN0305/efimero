/**
 * Division de un nombre completo en los campos estructurados de vCard.
 *
 * vCard separa el nombre en `apellido;nombre`, no en un unico texto. Casi
 * ningun formulario de contacto pide ese par, asi que hay que deducirlo, y la
 * deduccion tiene trampas.
 *
 * @packageDocumentation
 */

/** Particulas que se anteponen al apellido y que forman parte de el. */
const PARTICLES: ReadonlySet<string> = new Set([
  // espanol
  'de',
  'del',
  'la',
  'las',
  'los',
  'das',
  'dos',
  'van',
  // italiano
  'di',
  'da',
  'della',
  'delle',
  'dei',
  'degli',
  'dello',
  // portugues
  'da',
  'das',
  'dos',
  'e',
  // frances
  'le',
  'les',
  'la',
  'de',
  'du',
  'des',
  // particulas onomasticas frecuentes
  'van',
  'von',
  'der',
  'den',
  'ten',
  'ter',
  'op',
  'zu',
  'af',
  'av',
]);

/** Abreviaturas de tratamiento que van al campo PREFIX. */
const PREFIXES: ReadonlySet<string> = new Set([
  'dr',
  'dr.',
  'dra',
  'dra.',
  'lic',
  'lic.',
  'ing',
  'ing.',
  'sr',
  'sr.',
  'sra',
  'sra.',
  'srta',
  'srta.',
  'prof',
  'prof.',
  'mx',
  'mx.',
  'mxc',
  'mxc.',
]);

/** Nombre separado en sus partes estructuradas. */
export interface ParsedName {
  /** Apellidos, con las particulas pegadas al final: "Pérez de la Cruz". */
  family: string;
  /** Nombres de pila: "Ana María". */
  given: string;
  /** Tratamiento, sin punto: "Dr". Vacio si no hay. */
  prefix: string;
}

/**
 * Deduce `apellido`, `nombre` y `tratamiento` a partir de un nombre completo.
 *
 * Tres casos, en este orden:
 *
 *  1. Hay una coma. Entonces el orden ya viene dado: "García López, Ana María"
 *     es apellido y nombre, no al reves. Es la unica forma no ambigua, y la
 *     primera que hay que mirar.
 *  2. El ultimo elemento es una particula ("Ana Pérez de la Cruz"). Entonces el
 *     apellido empieza mas atras y se lleva las particulas: quedarse en "Cruz"
 *     seria incorrecto.
 *  3. Cualquier otro caso multi-palabra. El ultimo termino es el apellido y el
 *     resto es el nombre de pila.
 *
 * @param full - Nombre completo tal como lo escribio la persona.
 * @returns Los campos deducidos. Un nombre de una sola palabra devuelve ese
 *   mismo texto como apellido y el nombre de pila vacio, que es lo menos roto
 *   que se puede hacer sin inventar nada.
 */
export function splitFullName(full: string): ParsedName {
  const trimmed = full.trim();
  if (trimmed === '') return { family: '', given: '', prefix: '' };

  // Caso 1: la coma resuelve el orden de forma explicita.
  const comma = trimmed.indexOf(',');
  if (comma !== -1) {
    const family = trimmed.slice(0, comma).trim();
    const given = trimmed.slice(comma + 1).trim();
    return { family, given, prefix: '' };
  }

  const tokens = trimmed.split(/\s+/).filter((token) => token !== '');

  // Extraccion del tratamiento inicial, si lo hay.
  let prefix = '';
  while (tokens.length > 1) {
    const first = tokens[0]!;
    const key = first.toLowerCase();
    if (!PREFIXES.has(key)) break;
    prefix = key.replace(/\.$/, '');
    tokens.shift();
  }

  if (tokens.length === 1) {
    return { family: tokens[0]!, given: '', prefix };
  }

  /*
   * Caso 2: el apellido se traga las particiones que hay justo antes de la
   * ultima palabra.
   *
   * "Ana María Pérez de la Cruz" termina en la palabra "Cruz", pero el
   * apellido es "Pérez de la Cruz". Se localiza el bloque de particiones
   * contiguas inmediatamente anterior a la ultima palabra y, si existe, se
   * incorpora tambien la palabra que lo precede, que es el apellido en si.
   *
   * El limite inferior del bucle es 1 y no 0 para que el nombre de pila nunca
   * se quede vacio: en "Juan De la Cruz" se parte como "De la Cruz" / "Juan",
   * que es la lectura correcta, en vez de tragarse el nombre de pila.
   */
  let start = tokens.length - 1;
  let cursor = start - 1;
  while (cursor >= 0 && PARTICLES.has(tokens[cursor]!.toLowerCase())) {
    cursor -= 1;
  }
  if (cursor < start - 1) {
    start = Math.max(1, cursor);
  }

  const family = tokens.slice(start).join(' ');
  const given = tokens.slice(0, start).join(' ');
  return { family, given, prefix };
}
