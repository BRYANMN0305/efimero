/**
 * Vista previa del contenido exacto que se va a codificar.
 *
 * Este modulo es la respuesta a una pregunta que se opto por no responder con
 * heuristicas: "¿es legitimo este enlace?". Ningun patron de texto demuestra
 * que un enlace sea una ESTafa. Los detectores automaticos de phishing se
 * equivocan en las dos direcciones, y uno que marca sitios de verdad hace que
 * la gente deje de mirar los avisos que si valen.
 *
 * Lo que si funciona es esto: un codigo QR esconde su contenido. Al escanearlo,
 * el telefono abre algo sin previo aviso, y quien lo ve ya no tiene forma de
 * compararlo con lo que creia. El problema real no es de analisis, es de
 * visibilidad. Por eso, en vez de calificar el enlace, esta vista previa enseña
 * byte a byte lo que ira dentro del codigo, con el esquema y el dominio
 * separados y en grande, antes de generar nada.
 *
 * Quien decide es la persona, y la persona tiene algo concreto delante. Este
 * archivo no emite juicios, solo separa las partes para que se puedan leer.
 *
 * @module
 */

/** Como se descompone un enlace para mostrarlo. */
export interface LinkParts {
  /** Que se ha reconocido como enlace. Si `false`, no se descompone. */
  readonly isLink: boolean;
  /** Esquema sin dos puntos, o cadena vacia si el texto no lleva. */
  readonly scheme: string;
  /** Si el esquema es de los que no deberian aparecer en un QR. */
  readonly schemeIsDangerous: boolean;
  /** Host sin las barras, o cadena vacia. */
  readonly host: string;
  /** Dominio registrable, que es la parte que delata a un imitador. */
  readonly registrable: string;
  /** Subdominios que preceden al registrable. */
  readonly subdomains: readonly string[];
  /** Ruta, consulta y fragmento tal cual van. */
  readonly rest: string;
}

/** Resultado de separar un enlace. */
export type Preview = LinkParts & {
  /** El texto tal cual se escribio, sin tocar ni un caracter. */
  readonly verbatim: string;
  /** Numero de caracteres, que es lo que ve quien escanea. */
  readonly length: number;
  /** Si el texto cabe cómodo en la version mas pequena de un QR. */
  readonly isShortEnoughToShowWhole: boolean;
};

/** Longitud a partir de la cual hay que truncar en pantalla. */
export const VERBATIM_LIMIT = 120;

/** Sufijos de primer nivel compuestos, que son una sola unidad. */
const COMPOUND_TLDS = new Set([
  'co.uk',
  'org.uk',
  'ac.uk',
  'gov.uk',
  'co.jp',
  'ne.jp',
  'or.jp',
  'com.au',
  'net.au',
  'org.au',
  'com.br',
  'com.mx',
  'com.ar',
  'com.co',
  'com.pe',
  'com.uy',
  'com.ec',
  'com.ve',
  'com.py',
  'com.bo',
  'com.do',
  'com.gt',
  'co.in',
  'co.kr',
  'co.nz',
  'co.za',
  'com.sg',
  'com.my',
  'com.ph',
  'co.il',
  'com.tr',
  'com.tw',
  'com.hk',
  'com.cn',
  'com.sa',
  'com.eg',
  'com.ng',
  'com.pk',
  'com.pl',
  'com.ua',
  'com.vn',
  'ac.jp',
  'com.pt',
  'com.es',
]);

/** Ultimo TLD simple de la lista publica, para trocear el host. */
const SIMPLE_TLDS = new Set([
  'com',
  'org',
  'net',
  'edu',
  'gov',
  'mil',
  'int',
  'info',
  'biz',
  'name',
  'pro',
  'app',
  'dev',
  'io',
  'co',
  'ai',
  'me',
  'tv',
  'ly',
  'sh',
  'gl',
  'ws',
]);

/** Esquemas que jamas deberian ir dentro de un codigo escaneable. */
const DANGEROUS_SCHEMES = new Set(['javascript', 'data', 'vbscript', 'file', 'blob', 'about', 'view-source']);

/** Corta un texto para mostrarlo entero, marcando el recorte. */
function truncate(value: string, limit: number): { text: string; truncated: boolean } {
  if (value.length <= limit) return { text: value, truncated: false };
  return { text: value.slice(0, limit), truncated: true };
}

/** Trocea un host en subdominios y dominio registrable. */
function splitHost(host: string): { subdomains: string[]; registrable: string } {
  const labels = host.split('.').filter((label) => label.length > 0);
  if (labels.length <= 2) return { subdomains: [], registrable: host };

  const lastTwo = labels.slice(-2).join('.');
  const lastThree = labels.slice(-3).join('.');
  const registrable = COMPOUND_TLDS.has(lastTwo) || (lastThree.endsWith('.uk') && labels.length > 2) ? lastThree : lastTwo;

  if (registrable.length === 0) return { subdomains: [], registrable: host };
  if (SIMPLE_TLDS.has(registrable.split('.').pop() ?? '')) {
    return { subdomains: labels.slice(0, -1), registrable };
  }
  // Un TLD exotico de nivel superior. Se toma el ultimo label, que es lo
  // correcto para ".app" o ".dev", y se deja el resto como subdominio.
  return { subdomains: labels.slice(0, -1), registrable };
}

/**
 * Descompone un texto para mostrarlo.
 *
 * No lanza errores y nunca devuelve `null`: si no reconoce un enlace, devuelve
 * el texto tal cual con `isLink: false`, que la interfaz dibuja de otra forma.
 * Es mejor mostrar una URL sin descomponer que no mostrar nada.
 *
 * @param text - El contenido exacto que se va a codificar.
 * @returns La descomposicion, mas el texto verbatim.
 */
export function describePayload(text: string): Preview {
  const trimmed = text.trim();
  // Se exige "algo:" antes de "://" para no partir un texto que solo lleve
  // dos puntos, y se busca el esquema entero para que "view-source:" se
  // reconozca como lo que es.
  const match = /^([A-Za-z][A-Za-z0-9+.-]*):(\/\/)?/.exec(trimmed);
  const scheme = match?.[1]?.toLowerCase() ?? '';
  const rest = match?.[0] === undefined ? '' : trimmed.slice(match[0].length);

  if (scheme === '' || match?.[2] !== '//') {
    const corta = truncate(trimmed, VERBATIM_LIMIT);
    return {
      isLink: false,
      scheme: '',
      schemeIsDangerous: false,
      host: '',
      registrable: '',
      subdomains: [],
      rest: corta.text,
      verbatim: trimmed,
      length: trimmed.length,
      isShortEnoughToShowWhole: !corta.truncated,
    };
  }

  const sinQuery = rest.split(/[?#]/, 1)[0] ?? '';
  const afterQuery = rest.slice(sinQuery.length);
  const host = sinQuery.split('/')[0] ?? '';
  const ruta = sinQuery.slice(host.length) + afterQuery;
  const { subdomains, registrable } = splitHost(host);
  const corta = truncate(trimmed, VERBATIM_LIMIT);

  return {
    isLink: true,
    scheme,
    schemeIsDangerous: DANGEROUS_SCHEMES.has(scheme),
    host,
    registrable,
    subdomains,
    rest: ruta,
    verbatim: trimmed,
    length: trimmed.length,
    isShortEnoughToShowWhole: !corta.truncated,
  };
}
