import { describe, expect, it } from 'vitest';

import { encodeBytes, encodeText, QrEncodeError } from '../src/qr/encode';
import type { EncodedQr } from '../src/qr/types';

/** Cuenta los módulos oscuros de un símbolo. */
function countDarkModules(qr: EncodedQr): number {
  let dark = 0;
  for (let y = 0; y < qr.size; y++) {
    for (let x = 0; x < qr.size; x++) {
      if (qr.getModule(x, y)) dark++;
    }
  }
  return dark;
}

describe('encode', () => {
  describe('forma del símbolo', () => {
    it('el tamaño en módulos corresponde a la versión', () => {
      // La norma fija el tamaño de cada versión: 17 mas 4 por cada escalon.
      for (const text of ['A', 'Hola', 'x'.repeat(200), 'y'.repeat(800)]) {
        const qr = encodeText(text, 'medium');
        expect(qr.size).toBe(qr.version * 4 + 17);
      }
    });

    it('la version 1 son 21 modulos de lado', () => {
      const qr = encodeText('A', 'medium');
      expect(qr.version).toBe(1);
      expect(qr.size).toBe(21);
    });

    it('el contenido mas largo necesita una version mayor', () => {
      const corto = encodeText('A'.repeat(20), 'medium');
      const largo = encodeText('A'.repeat(400), 'medium');
      expect(largo.version).toBeGreaterThan(corto.version);
    });
  });

  describe('corrección de errores', () => {
    it('nunca devuelve un nivel mas debil que el pedido', () => {
      // La libreria sube el nivel de correccion cuando el contenido cabe igual
      // de bien, y con un contenido corto casi siempre cabe. Por eso la
      // garantia no es "devuelve exactamente lo pedido" sino "devuelve al menos
      // lo pedido": el codigo nunca tendra menos proteccion de la exigida.
      const orden = { low: 0, medium: 1, quartile: 2, high: 3 } as const;
      for (const ecc of ['low', 'medium', 'quartile', 'high'] as const) {
        const qr = encodeText('contenido de prueba', ecc);
        expect(orden[qr.ecc]).toBeGreaterThanOrEqual(orden[ecc]);
      }
    });

    it('devuelve exactamente lo pedido cuando no cabe subirlo', () => {
      // Con contenido largo, subir de nivel obligaria a una version mayor, y
      // entonces la libreria respeta el nivel pedido.
      const qr = encodeText('contenido largo '.repeat(80), 'low');
      expect(qr.ecc).toBe('low');
    });

    it('sube el nivel si el contenido cabe en el mismo tamaño', () => {
      // Un texto corto con correccion baja se puede codificar con mas
      // redundancia sin cambiar de version. La libreria lo hace y avisar del
      // nivel real evita que la interfaz prometa menos proteccion de la que hay.
      const qr = encodeText('A', 'low');
      expect(qr.ecc).not.toBe('low');
    });

    it('mas correccion de errores produce un simbolo mas grande', () => {
      const bajo = encodeText('contenido de longitud media para comparar', 'low');
      const alto = encodeText('contenido de longitud media para comparar', 'high');
      expect(alto.size).toBeGreaterThan(bajo.size);
    });
  });

  describe('designador ECI', () => {
    it('no lo anade si el texto es solo ASCII', () => {
      const qr = encodeText('Hello world', 'medium');
      expect(qr.hasEci).toBe(false);
    });

    it('lo anade si el texto lleva un acento', () => {
      const qr = encodeText('Hola, señor', 'medium');
      expect(qr.hasEci).toBe(true);
    });

    it('lo anade si el texto lleva un emoji', () => {
      // El emoji se escribe con su escapes de Unicode, y no con el caracter
      // literal, para que el archivo fuente se quede en ASCII. Asi el guard de
      // integridad puede seguir prohibiendo alfabetos no latinos sin
      // excepciones, y el test sigue probando exactamente lo mismo.
      const qr = encodeText('Hola \u{1F44B}', 'medium');
      expect(qr.hasEci).toBe(true);
    });

    it('el ECI ocupa sitio, y eso se nota en el tamaño', () => {
      // Un texto con acento no puede ocupar menos que el mismo texto en ASCII
      // con la misma longitud, porque el designador y los bytes multibyte suman.
      const conAcento = encodeText('aaaaaaaaaaá', 'medium');
      const sinAcento = encodeText('aaaaaaaaaaaa', 'medium');
      expect(conAcento.size).toBeGreaterThanOrEqual(sinAcento.size);
    });
  });

  describe('modos de codificación', () => {
    it('un texto numerico usa un simbolo mas pequeño que si fuera binario', () => {
      // El modo numerico empaqueta tres digitos en diez bits, frente a los ocho
      // del modo byte. Con el mismo contenido, codificar como texto debe salir
      // mas compacto o igual.
      const texto = '12345678901234567890';
      const comoTexto = encodeText(texto, 'medium');
      const comoBytes = encodeBytes([...new TextEncoder().encode(texto)], 'medium');
      expect(comoTexto.size).toBeLessThanOrEqual(comoBytes.size);
    });

    it('marca el contenido binario como tal', () => {
      const bytes = [0x00, 0x01, 0xfe, 0xff];
      const qr = encodeBytes(bytes, 'high');
      expect(qr.isBinary).toBe(true);
      expect(qr.hasEci).toBe(false);
    });

    it('codifica bytes arbitrarios sin lanzar', () => {
      const bytes = Array.from({ length: 200 }, (_, i) => i % 256);
      const qr = encodeBytes(bytes, 'medium');
      expect(qr.size).toBe(qr.version * 4 + 17);
    });
  });

  describe('contenido que no cabe', () => {
    it('avisa de forma reconocible cuando el texto es demasiado largo', () => {
      const enorme = 'a'.repeat(8000);
      expect(() => encodeText(enorme, 'low')).toThrow(QrEncodeError);
    });

    it('el error dice que no cabe, y no es un fallo generico', () => {
      try {
        encodeText('a'.repeat(8000), 'low');
        expect.unreachable('deberia haber lanzado');
      } catch (error) {
        expect(error).toBeInstanceOf(QrEncodeError);
        expect((error as QrEncodeError).reason).toBe('tooLong');
      }
    });

    it('el limite depende del nivel de correccion de errores', () => {
      // En modo byte, la version 40 admite unos 2953 bytes con correccion baja
      // y unos 1273 con correccion alta. Un contenido entre esos dos limites
      // cabe con una opcion y no con la otra, que es justo lo que hay que
      // comprobar: que el mensaje de error no es aleatorio.
      const texto = 'b'.repeat(2000);
      expect(() => encodeText(texto, 'high')).toThrow(QrEncodeError);
      expect(() => encodeText(texto, 'low')).not.toThrow();
    });
  });

  describe('acceso a la matriz', () => {
    it('fuera del rango devuelve falso en vez de lanzar', () => {
      const qr = encodeText('A', 'medium');
      expect(qr.getModule(-1, 0)).toBe(false);
      expect(qr.getModule(0, -1)).toBe(false);
      expect(qr.getModule(qr.size, 0)).toBe(false);
      expect(qr.getModule(0, qr.size)).toBe(false);
    });

    it('tiene un modulo oscuro en la esquina superior izquierda', () => {
      // El patron localizador de la esquina superior izquierda empieza siempre
      // con un modulo oscuro. Si esto falla, la matriz esta desplazada.
      const qr = encodeText('A', 'medium');
      expect(qr.getModule(0, 0)).toBe(true);
    });

    it('coloca los tres patrones localizadores donde dice la norma', () => {
      const qr = encodeText('contenido de prueba', 'medium');
      const ultimo = qr.size - 1;
      // Cada localizador es un anillo: oscuro por fuera, claro en el anillo
      // intermedio, oscuro en el centro. Se comprueban las tres esquinas.
      for (const [cx, cy] of [
        [0, 0],
        [ultimo - 6, 0],
        [0, ultimo - 6],
      ] as const) {
        expect(qr.getModule(cx, cy)).toBe(true);
        expect(qr.getModule(cx + 1, cy + 1)).toBe(false);
        expect(qr.getModule(cx + 3, cy + 3)).toBe(true);
        expect(qr.getModule(cx + 6, cy + 6)).toBe(true);
      }
    });

    it('deja el separador claro alrededor de cada localizador', () => {
      // El separador es una franja clara que rodea a los localizadores para que
      // no se toquen con los modulos de datos. Solo los rodea a ellos: el resto
      // de la fila 7 y de la columna 7 lleva datos, y comprobarla entera daria
      // un falso positivo.
      const qr = encodeText('contenido', 'medium');
      const ultimo = qr.size - 1;
      const anteUltimo = qr.size - 8;

      // Localizador superior izquierdo: franja a su derecha y franja debajo.
      for (let i = 0; i <= 7; i++) {
        expect(qr.getModule(7, i)).toBe(false);
        expect(qr.getModule(i, 7)).toBe(false);
      }
      // Localizador superior derecho: franja debajo, y franja a su izquierda.
      // Localizador inferior izquierdo: franja a su derecha, y encima.
      for (let i = anteUltimo; i <= ultimo; i++) {
        expect(qr.getModule(7, i)).toBe(false);
        expect(qr.getModule(i, 7)).toBe(false);
      }
      for (let i = 0; i <= 7; i++) {
        expect(qr.getModule(anteUltimo, i)).toBe(false);
      }
    });

    it('el patron de temporizacion alterna a lo largo de la fila 6', () => {
      // El patron de temporizacion es una secuencia alterna entre los
      // localizadores. Empieza y acaba en oscuro. Si un lector pierde la
      // sincronia, es justo este patron el que lo detecta.
      const qr = encodeText('contenido', 'medium');
      for (let x = 8; x < qr.size - 8; x++) {
        expect(qr.getModule(x, 6)).toBe(x % 2 === 0);
      }
    });

    it('el modulo oscuro fijo esta en su sitio en cualquier version', () => {
      // La norma obliga a que haya un modulo siempre oscuro en una posicion
      // fija, para que un lector distinga un QR valido de un recticulo a medio
      // construir. Es un invariante de todas las versiones, de la 1 a la 40, y
      // no depende ni del contenido ni de la mascara.
      for (const texto of ['A', 'contenido de longitud media', 'z'.repeat(600)]) {
        const qr = encodeText(texto, 'medium');
        expect(qr.getModule(8, qr.size - 8)).toBe(true);
      }
    });

    it('dibuja una proporcion razonable de modulos', () => {
      // Un codigo sobre tiene en torno a la mitad de modulos oscuros. Si el
      // valor se sale de este margen, algo va mal en la codificacion.
      const qr = encodeText('contenido', 'medium');
      const ratio = countDarkModules(qr) / (qr.size * qr.size);
      expect(ratio).toBeGreaterThan(0.3);
      expect(ratio).toBeLessThan(0.7);
    });

    it('dos codificaciones del mismo texto dan el mismo símbolo', () => {
      // La eleccion de mascara debe ser estable entre llamadas: si no, el
      // usuario veria un codigo que cambia al mover un control.
      const a = encodeText('mismo contenido', 'quartile');
      const b = encodeText('mismo contenido', 'quartile');
      expect(a.size).toBe(b.size);
      expect(a.mask).toBe(b.mask);
      for (let y = 0; y < a.size; y++) {
        for (let x = 0; x < a.size; x++) {
          expect(a.getModule(x, y)).toBe(b.getModule(x, y));
        }
      }
    });
  });
});
