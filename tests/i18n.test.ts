/**
 * Tests de la capa de traduccion.
 *
 * La paridad de claves ya la garantiza el typecheck (`en.ts` esta tipado como
 * `Record<MessageKey, string>`). Estos tests cubren lo que el compilador NO
 * puede ver:
 *
 *  1. Que los marcadores de interpolacion coincidan entre idiomas. Si el
 *     ingles dice `{bytes}` y el espanol no, el typecheck pasa y la UI muestra
 *     `{bytes}` literal en produccion.
 *  2. Que no se colen caracteres de alfabetos que no corresponden. Es un
 *     control de calidad de las cadenas, y protege contra textos corruptos.
 *  3. Que `t` lance si falta un parametro, en vez de imprimir `{nombre}`.
 *
 * @packageDocumentation
 */

import { describe, expect, it } from 'vitest';

import { en } from '../src/i18n/en';
import { es, type MessageKey } from '../src/i18n/es';
import { detectLocale, formatBytes, initialLocale, interpolate, isLocale, t } from '../src/i18n/index';

const CATALOGS = { es, en } as const;

/** Extrae los nombres de marcador `{...}` de una cadena, en orden. */
function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]!);
}

/**
 * Rangos de caracteres admitidos en los textos de la interfaz.
 *
 * Es una lista blanca de rangos, no una negra de scripts. Una lista negra
 * ("prohibir CJK") deja pasar cirilico, arabe o tailandés, que también están
 * fuera de lugar aquí. Con lista blanca, cualquier alfabeto no contemplado
 * falla de inmediato.
 *
 * Se cubren: ASCII, suplemento Latin-1 (á é í ó ú ñ ü ¿ ¡ ° ×),
 * Latin Extended-A (Œ œ Š š ž), puntuación general de Unicode (— – ' ' " " …),
 * y los símbolos tipográficos usados a propósito.
 */
const ALLOWED_RANGES: readonly (readonly [number, number])[] = [
  [0x0000, 0x007f], // ASCII
  [0x00a0, 0x00ff], // Latin-1 Supplement: á é í ó ú ñ ü ¿ ¡ ° × ÷
  [0x0100, 0x017f], // Latin Extended-A: Œ œ Š š ž ÿ
  [0x2010, 0x2027], // Guiones y comillas tipográficas
  [0x2030, 0x205e], // … ‰ « » y similar
  [0x20a0, 0x20bf], // Signos de moneda (se usa €)
  [0x2190, 0x21ff], // Flechas (se usa → en la verificación)
  [0x2212, 0x2212], // Signo menos
  [0x00b7, 0x00b7], // Middle dot ·
];

function isAllowed(char: string): boolean {
  const code = char.codePointAt(0);
  if (code === undefined) return false;
  return ALLOWED_RANGES.some(([low, high]) => code >= low && code <= high);
}

describe('paridad de traducciones', () => {
  it('es y en declaran exactamente el mismo conjunto de claves', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
  });

  it('ninguna traduccion esta vacia', () => {
    const vacias: string[] = [];
    for (const [locale, catalog] of Object.entries(CATALOGS)) {
      for (const [key, value] of Object.entries(catalog)) {
        if (value.trim() === '') vacias.push(`${locale}:${key}`);
      }
    }
    expect(vacias).toEqual([]);
  });

  it('los marcadores de interpolacion coinciden entre espanol e ingles', () => {
    const discrepancias: string[] = [];
    for (const key of Object.keys(es) as MessageKey[]) {
      const enPlaceholders = placeholders(en[key]).sort();
      const esPlaceholders = placeholders(es[key]).sort();
      if (enPlaceholders.join(',') !== esPlaceholders.join(',')) {
        discrepancias.push(`${key}: es=[${esPlaceholders.join(',')}] en=[${enPlaceholders.join(',')}]`);
      }
    }
    expect(discrepancias).toEqual([]);
  });

  it('los textos solo usan caracteres del alfabeto permitido', () => {
    const ofensores: string[] = [];
    for (const [locale, catalog] of Object.entries(CATALOGS)) {
      for (const [key, value] of Object.entries(catalog)) {
        for (const char of value) {
          if (!isAllowed(char)) {
            ofensores.push(
              `${locale}:${key} contiene ${JSON.stringify(char)} (U+${(char.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, '0')})`,
            );
          }
        }
      }
    }
    expect(ofensores).toEqual([]);
  });
});

describe('t()', () => {
  it('devuelve la cadena del idioma pedido', () => {
    expect(t('es', 'tabs.texto')).toBe(es['tabs.texto']);
    expect(t('en', 'tabs.texto')).toBe(en['tabs.texto']);
  });

  it('sustituye varios marcadores a la vez', () => {
    const resultado = t('es', 'status.ready', {
      version: '0.1.0',
      bytes: 128,
      ecc: 'M',
    });
    expect(resultado).toContain('0.1.0');
    expect(resultado).toContain('128');
    expect(resultado).toContain('M');
    expect(resultado).not.toContain('{');
  });

  it('sustituye el mismo marcador repetido en todas sus apariciones', () => {
    // Se prueba el interpolador y no `t()`, porque hoy ninguna clave del
    // catalogo repite un marcador y la propiedad no se veria. El riesgo es real:
    // quitar el flag `g` del `replace` dejaria el segundo marcador en pantalla.
    expect(interpolate('de {a} a {a} con {b}', { a: 'x', b: 'y' })).toBe('de x a x con y');
  });

  it('deja intacto un valor que contiene algo parecido a un marcador', () => {
    // Un valor con llaves debe insertarse tal cual, sin reinterpretarse.
    const resultado = t('es', 'field.text.help', { n: '{raro}' });
    expect(resultado).toContain('{raro}');
  });
});

describe('los marcadores sin valor lanzan error', () => {
  it('falla con un mensaje que nombra el parametro que falta', () => {
    expect(() => t('es', 'field.text.help')).toThrowError(/Falta el parametro/);
  });

  it('falla tambien en ingles', () => {
    expect(() => t('en', 'status.ready', { version: '1' })).toThrowError(/bytes/);
  });
});

describe('deteccion de idioma', () => {
  it('reconoce los dos idiomas soportados', () => {
    expect(isLocale('es')).toBe(true);
    expect(isLocale('en')).toBe(true);
    expect(isLocale('fr')).toBe(false);
    expect(isLocale(42)).toBe(false);
  });

  it('reduce una etiqueta regional a su idioma base', () => {
    expect(detectLocale(['es-MX'])).toBe('es');
    expect(detectLocale(['en-GB', 'es'])).toBe('en');
  });

  it('respeta el orden de las preferencias', () => {
    expect(detectLocale(['fr-FR', 'en-US', 'es'])).toBe('en');
  });

  it('cae al idioma por defecto si no hay ninguno conocido', () => {
    expect(detectLocale(['fr-FR', 'de'])).toBe('es');
    expect(detectLocale([])).toBe('es');
  });

  it('no le explota si el navegador no reporta idiomas', () => {
    expect(initialLocale()).toBe('es');
  });
});

describe('formatBytes()', () => {
  it('usa bytes exactos por debajo de 1 KB', () => {
    expect(formatBytes('es', 0)).toBe('0 B');
    expect(formatBytes('es', 512)).toBe('512 B');
  });

  it('usa el separador decimal del idioma', () => {
    expect(formatBytes('es', 2048)).toBe('2,0 KB');
    expect(formatBytes('en', 2048)).toBe('2.0 KB');
  });

  it('redondea a entero por encima de 10 KB', () => {
    expect(formatBytes('es', 40 * 1024)).toBe('40 KB');
    expect(formatBytes('en', 40 * 1024)).toBe('40 KB');
  });
});
