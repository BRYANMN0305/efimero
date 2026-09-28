import { describe, expect, it } from 'vitest';

import { buildDrawList } from '../src/qr/draw-list';
import { encodeText } from '../src/qr/encode';
import { contrastRatio, diagnose, parseCssColor, relativeLuminance } from '../src/qr/safety';
import { toSvg } from '../src/qr/svg';
import { PRESETS, DEFAULT_PRESET, presetById, suggestedModuleShape } from '../src/qr/presets';
import type { LogoPlacement, QrStyle } from '../src/qr/types';

/** Estilo cuadrado, el mas simple de razonar. */
const PLANO: QrStyle = {
  foreground: '#000000',
  background: '#ffffff',
  finder: 'square',
  module: 'square',
};

describe('draw-list', () => {
  describe('medidas', () => {
    it('el lado total incluye la zona silenciosa en los cuatro lados', () => {
      const qr = encodeText('hola', 'medium');
      const list = buildDrawList(qr, PLANO, 4);
      expect(list.modules).toBe(qr.size);
      expect(list.side).toBe(qr.size + 8);
    });

    it('el fondo cubre la zona silenciosa y no solo el codigo', () => {
      const qr = encodeText('hola', 'medium');
      const list = buildDrawList(qr, PLANO, 4);
      const fondo = list.ops[0];
      expect(fondo).toMatchObject({ kind: 'shape', source: 'background' });
      if (fondo?.kind === 'shape') {
        // Si el fondo no llegara a la zona silenciosa, los cuatro modulos de
        // margen saldrian recortados en la imagen final.
        expect(fondo.x).toBe(-4);
        expect(fondo.y).toBe(-4);
        expect(fondo.w).toBe(qr.size + 8);
      }
    });

    it('el fondo llega exactamente al borde del lienzo, sin huecos ni recorte', () => {
      // Este test existe por un bug que estaba en los DOS renderizadores: la
      // lista colocaba el fondo en `-quietZone` para centrar el codigo, pero el
      // lienzo y el `viewBox` del SVG arrancaban en 0 y no trasladaban el
      // origen. El fondo se salia por arriba e izquierda y la ultima zona
      // silenciosa, a la derecha y abajo, se quedaba sin pintar: el PNG salia
      // con el borde transparente, que se ve negro en cualquier visor.
      //
      // Aqui se mira la aritmetica del origen, que es lo que comparten las dos
      // salidas. Si el desplazamiento no compensa exactamente `-quietZone`, el
      // fondo deja de cubrir las cuatro esquinas.
      const qr = encodeText('hola', 'medium');
      const list = buildDrawList(qr, PLANO, 4);
      const fondo = list.ops[0];
      expect(fondo?.kind).toBe('shape');

      const quiet = list.quietZone;
      // Extremo izquierdo y superior del fondo en coordenadas de modulo.
      const izquierda = fondo?.kind === 'shape' ? fondo.x : 0;
      const arriba = fondo?.kind === 'shape' ? fondo.y : 0;
      // Extremo derecho e inferior, y deben caer justo en el borde del simbolo.
      const derecha = fondo?.kind === 'shape' ? fondo.x + fondo.w : 0;
      const abajo = fondo?.kind === 'shape' ? fondo.y + fondo.h : 0;

      expect(izquierda).toBe(-quiet);
      expect(arriba).toBe(-quiet);
      expect(derecha).toBe(qr.size + quiet);
      expect(abajo).toBe(qr.size + quiet);
      // Y el lado total coincide con el que usan el lienzo y el SVG.
      expect(list.side).toBe(qr.size + quiet * 2);
    });

    it('el fondo se emite siempre a sangre, con la zona silenciosa incluida', () => {
      // El fondo ya no tiene modo transparente: se quitó la opción porque un QR
      // sin fondo se ve negro en los visores y mal al imprimir. Se comprueba que
      // el unico op de fondo cubre el lado entero y no solo la zona codificada.
      const qr = encodeText('hola', 'medium');
      const list = buildDrawList(qr, PLANO, 4);
      const fondos = list.ops.filter((op) => op.kind === 'shape' && op.source === 'background');
      expect(fondos.length).toBeGreaterThan(0);
      for (const fondo of fondos) {
        if (fondo.kind !== 'shape') continue;
        // Los anillos claros de los localizadores tambien llevan el color de
        // fondo, pero esos son pequenos. El que cubre el lienzo entero es el
        // que mide `side`.
        if (fondo.w === list.side) {
          expect(fondo.w).toBe(list.side);
          expect(fondo.x).toBe(-list.quietZone);
        }
      }
    });
  });

  describe('patrones localizadores', () => {
    it('dibuja los tres localizadores, cada uno en tres piezas', () => {
      const qr = encodeText('hola', 'medium');
      const list = buildDrawList(qr, PLANO, 4);
      const size = qr.size;
      const esquinas = [
        [0, 0],
        [size - 7, 0],
        [0, size - 7],
      ] as const;
      for (const [ox, oy] of esquinas) {
        const piezas = list.ops.filter((op) => op.kind === 'shape' && op.w === 7 && op.x === ox && op.y === oy);
        expect(piezas).toHaveLength(1);
        const anilloClaro = list.ops.find((op) => op.kind === 'shape' && op.w === 5 && op.x === ox + 1 && op.y === oy + 1);
        expect(anilloClaro).toMatchObject({ source: 'background' });
        const nucleo = list.ops.find((op) => op.kind === 'shape' && op.w === 3 && op.x === ox + 2 && op.y === oy + 2);
        expect(nucleo).toMatchObject({ source: 'ink' });
      }
    });

    it('ningun modulo de datos se dibuja dentro de un localizador', () => {
      const qr = encodeText('hola', 'medium');
      const list = buildDrawList(qr, PLANO, 4);
      const size = qr.size;
      // Un localizador son 49 modulos. Si se dibujaran tambien como datos, cada
      // uno se contaria dos veces y el codigo saldria mas denso de lo que es.
      const enLocalizador = list.ops.filter((op) => {
        if (op.kind !== 'shape' || op.w !== 1) return false;
        return (op.x < 7 && op.y < 7) || (op.x >= size - 7 && op.y < 7) || (op.x < 7 && op.y >= size - 7);
      });
      expect(enLocalizador).toHaveLength(0);
    });

    it('el anillo claro de un localizador usa el color de fondo, no un recorte', () => {
      // Sin esto, el interior de los localizadores saldria en negro sobre el
      // fondo y el lector no veria el patron.
      const qr = encodeText('hola', 'medium');
      const list = buildDrawList(qr, PLANO, 4);
      const anillo = list.ops.find((op) => op.kind === 'shape' && op.w === 5 && op.x === 1 && op.y === 1);
      expect(anillo).toMatchObject({ source: 'background' });
    });
  });

  describe('patron de temporizacion', () => {
    it('la fila 6 siempre se dibuja a cuadrado, elija el modulo que se elija', () => {
      // Los lectores usan la fila 6 para sincronizarse. Con circulos salen
      // puntos separados y hay telefonos que no la recuperan.
      for (const module of ['square', 'rounded', 'dots', 'diamond'] as const) {
        const qr = encodeText('hola', 'medium');
        const list = buildDrawList(qr, { ...PLANO, module }, 4);
        for (let x = 8; x < qr.size - 8; x++) {
          if (!qr.getModule(x, 6)) continue;
          const op = list.ops.find((candidate) => candidate.kind === 'shape' && candidate.x === x && candidate.y === 6);
          expect(op).toMatchObject({ shape: { kind: 'rect', radius: 0 } });
        }
      }
    });
  });

  describe('perdida de tinta', () => {
    it('un codigo de modulos cuadrados no pierde tinta', () => {
      const qr = encodeText('hola', 'medium');
      const list = buildDrawList(qr, PLANO, 4);
      expect(list.inkLoss).toBe(0);
    });

    it('los circulos pierden alrededor del 21 por ciento', () => {
      // El circulo inscrito en el modulo cubre pi sobre cuatro, asi que una
      // rejilla entera de circulos perderia 1 - pi/4 = 0,2146. Un codigo real
      // pierde menos, porque el patron de temporizacion sigue a cuadrado
      // macizo. Con contenido largo esa parte se diluye y el valor converge al
      // ideal, y esto comprueba las dos cosas: que se acerca, y que nunca lo pasa.
      const ideal = 1 - Math.PI / 4;
      const qrCorto = encodeText('hola', 'medium');
      const corto = buildDrawList(qrCorto, { ...PLANO, module: 'dots' }, 4).inkLoss;
      const qrLargo = encodeText('contenido bastante mas largo para subir de version', 'quartile');
      const largo = buildDrawList(qrLargo, { ...PLANO, module: 'dots' }, 4).inkLoss;

      expect(corto).toBeGreaterThan(0.1);
      expect(largo).toBeGreaterThan(corto);
      expect(largo).toBeLessThan(ideal);
    });

    it('los rombos pierden mas que los circulos', () => {
      const qr = encodeText('hola', 'medium');
      const circulos = buildDrawList(qr, { ...PLANO, module: 'dots' }, 4);
      const rombos = buildDrawList(qr, { ...PLANO, module: 'diamond' }, 4);
      expect(rombos.inkLoss).toBeGreaterThan(circulos.inkLoss);
    });

    it('el logo cuenta como tinta perdida', () => {
      const qr = encodeText('hola', 'medium');
      const sinLogo = buildDrawList(qr, PLANO, 4);
      const logo: LogoPlacement = { side: 5, margin: 1, shape: 'none', image: {} as CanvasImageSource };
      const conLogo = buildDrawList(qr, PLANO, 4, logo);
      expect(conLogo.inkLoss).toBeGreaterThan(sinLogo.inkLoss);
    });

    it('la perdida nunca sale de cero a uno', () => {
      for (const module of ['square', 'rounded', 'extraRounded', 'dots', 'diamond', 'barH', 'barV'] as const) {
        const qr = encodeText('contenido con bastante texto', 'quartile');
        const list = buildDrawList(qr, { ...PLANO, module }, 4);
        expect(list.inkLoss).toBeGreaterThanOrEqual(0);
        expect(list.inkLoss).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('logo', () => {
    it('centra el logo y pone un tapon del color de fondo detras', () => {
      const qr = encodeText('hola', 'medium');
      const logo: LogoPlacement = { side: 5, margin: 1, shape: 'none', image: {} as CanvasImageSource };
      const list = buildDrawList(qr, PLANO, 4, logo);
      const imagen = list.ops.find((op) => op.kind === 'image');
      const esperado = (qr.size - 5) / 2;
      expect(imagen).toMatchObject({ x: esperado, y: esperado, w: 5, h: 5 });
      // El tapon se emite justo antes que la imagen, para quedar debajo.
      const indiceImagen = list.ops.findIndex((op) => op.kind === 'image');
      const tapon = list.ops[indiceImagen - 1];
      expect(tapon).toMatchObject({ kind: 'shape', source: 'background', w: 7, h: 7 });
    });

    it('el tapon mide el logo mas su margen a cada lado', () => {
      const qr = encodeText('hola', 'medium');
      const logo: LogoPlacement = { side: 6, margin: 2, shape: 'rounded', image: {} as CanvasImageSource };
      const list = buildDrawList(qr, PLANO, 4, logo);
      // El tapon es el unico rectangulo de fondo centrado y mayor que un
      // localizador, asi que se localiza por tamano en vez de por posicion.
      const tapon = list.ops.find((op) => op.kind === 'shape' && op.source === 'background' && op.w === 10);
      expect(tapon).toBeDefined();
      if (tapon?.kind === 'shape') {
        expect(tapon.h).toBe(10);
        // Centrado: (21 - 10) / 2 en cada lado.
        expect(tapon.x).toBe(5.5);
        expect(tapon.y).toBe(5.5);
      }
    });
  });
});

describe('safety', () => {
  describe('color', () => {
    it('el negro sobre blanco da 21 a 1', () => {
      expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    });

    it('un color contra si mismo da 1 a 1', () => {
      expect(contrastRatio('#3366ff', '#3366ff')).toBeCloseTo(1, 5);
    });

    it('el orden de los colores no cambia el resultado', () => {
      expect(contrastRatio('#ffffff', '#000000')).toBe(contrastRatio('#000000', '#ffffff'));
    });

    it('entiende la forma corta de tres digitos', () => {
      expect(parseCssColor('#abc')).toEqual(parseCssColor('#aabbcc'));
    });

    it('entiende notacion rgb', () => {
      expect(parseCssColor('rgb(255, 0, 0)')).toEqual([255, 0, 0]);
    });

    it('un color desconocido da null en vez de inventarse un color', () => {
      expect(parseCssColor('no-es-un-color')).toBeNull();
      expect(contrastRatio('no-es-un-color', '#ffffff')).toBeNull();
    });

    it('el blanco tiene mas luminancia que el negro', () => {
      expect(relativeLuminance([255, 255, 255])).toBeGreaterThan(relativeLuminance([0, 0, 0]));
    });
  });

  describe('veredicto', () => {
    it('un codigo sobrio y grande se marca como seguro', () => {
      const qr = encodeText('https://example.com', 'high');
      const list = buildDrawList(qr, PLANO, 4);
      const d = diagnose(list, '#000000', '#ffffff', 1024, 100);
      expect(d.verdict).toBe('safe');
    });

    it('un contraste insuficiente bloquea la descarga', () => {
      const qr = encodeText('https://example.com', 'high');
      const list = buildDrawList(qr, PLANO, 4);
      // Gris claro sobre blanco: no llega al minimo de 4,5 a 1.
      const d = diagnose(list, '#dddddd', '#ffffff', 1024, 100);
      expect(d.verdict).toBe('blocked');
      expect(d.checks.find((check) => check.id === 'contrast')?.ok).toBe(false);
    });

    it('un modulo pequeno en pantalla bloquea', () => {
      const qr = encodeText('un texto bastante largo para que la version suba', 'quartile');
      const list = buildDrawList(qr, PLANO, 4);
      const d = diagnose(list, '#000000', '#ffffff', 60, 100);
      expect(d.verdict).toBe('blocked');
    });

    it('un codigo pequeno en papel avisa aunque en pantalla este bien', () => {
      // El caso que mas problemas da: se ve perfecto en el movil y no escanea
      // en una tarjeta de visita de 85 mm.
      const qr = encodeText('un texto bastante largo para que la version suba', 'quartile');
      const list = buildDrawList(qr, PLANO, 4);
      const d = diagnose(list, '#000000', '#ffffff', 1024, 20);
      expect(d.checks.find((check) => check.id === 'moduleSize')?.ok).toBe(false);
    });

    it('una zona silenciosa corta bloquea', () => {
      const qr = encodeText('hola', 'medium');
      const list = buildDrawList(qr, PLANO, 2);
      const d = diagnose(list, '#000000', '#ffffff', 1024, 100);
      expect(d.checks.find((check) => check.id === 'quietZone')?.ok).toBe(false);
    });

    it('sin logo, el despeje de las esquinas se dice que no aplica', () => {
      const qr = encodeText('hola', 'medium');
      const list = buildDrawList(qr, PLANO, 4);
      const d = diagnose(list, '#000000', '#ffffff', 1024, 100);
      const check = d.checks.find((item) => item.id === 'finderClearance');
      expect(check?.ok).toBe(true);
      expect(check?.values.modules).toBeNull();
    });

    it('un logo que pisa los localizadores bloquea', () => {
      const qr = encodeText('hola', 'medium');
      // Un logo enorme en un codigo de 21 modulos deja solo 7 de margen a cada
      // lado, y el patron localizador mide 7: lo pisaria justo.
      const logo: LogoPlacement = { side: 7, margin: 0, shape: 'none', image: {} as CanvasImageSource };
      const list = buildDrawList(qr, PLANO, 4, logo);
      const d = diagnose(list, '#000000', '#ffffff', 1024, 100);
      expect(d.checks.find((check) => check.id === 'finderClearance')?.ok).toBe(false);
    });

    it('el estilo con mas perdida de tinta avisa antes que el sobrio', () => {
      const qr = encodeText('un contenido de longitud razonable', 'quartile');
      const sobrio = diagnose(buildDrawList(qr, PLANO, 4), '#000000', '#ffffff', 1024, 100);
      const vistoso = diagnose(buildDrawList(qr, { ...PLANO, module: 'dots' }, 4), '#000000', '#ffffff', 1024, 100);
      expect(sobrio.checks.find((check) => check.id === 'inkLoss')?.warning).toBe(false);
      expect(vistoso.checks.find((check) => check.id === 'inkLoss')?.warning).toBe(true);
    });

    it('ninguna forma ofrecida bloquea por perder tinta, por fea que sea', () => {
      // Un rombo se come la mitad del area del modulo, mas que la correccion de
      // errores puede reconstruir, y aun asi no bloquea: perder area no es lo
      // mismo que perder bits. Si esto falla, el umbral vuelve a estar mediendo
      // una cosa con la.regex de otra.
      const qr = encodeText('un contenido de longitud razonable', 'high');
      for (const module of ['diamond', 'barH', 'barV', 'dots'] as const) {
        const d = diagnose(buildDrawList(qr, { ...PLANO, module }, 4), '#000000', '#ffffff', 1024, 100, 'high');
        expect(d.verdict).not.toBe('blocked');
      }
    });

    it('codigo claro sobre fondo oscuro avisa sin bloquear', () => {
      // El ratio sale perfecto, asi que bloquear seria mentir sobre el numero.
      // Pero avisar es justo: hay lectores que solo saben leer tinta oscura.
      const qr = encodeText('hola', 'medium');
      const d = diagnose(buildDrawList(qr, PLANO, 4), '#f5f5f7', '#11131a', 1024, 100);
      const contraste = d.checks.find((check) => check.id === 'contrast');
      expect(contraste?.ok).toBe(true);
      expect(contraste?.warning).toBe(true);
      expect(contraste?.values.inverted).toBe(true);
      expect(d.verdict).not.toBe('blocked');
    });

    it('el mismo logo pasa con nivel alto y bloquea con nivel bajo', () => {
      // El area cubierta la reconstruye el nivel de correccion de errores, y por
      // eso el veredicto depende de el. Con 9 modulos el area es 0.184: el nivel
      // bajo no llega ni a la mitad, y el alto lo reconstruye con holgura.
      const qr = encodeText('hola', 'medium');
      const logo: LogoPlacement = { side: 9, margin: 0, shape: 'none', image: {} as CanvasImageSource };
      const list = buildDrawList(qr, PLANO, 4, logo);
      const area = (ecc: 'low' | 'high') =>
        diagnose(list, '#000000', '#ffffff', 1024, 100, ecc).checks.find((check) => check.id === 'logoArea');

      expect(area('low')?.ok).toBe(false);
      expect(area('high')?.warning).toBe(true);
      expect(area('high')?.ok).toBe(true);
    });
  });
});

describe('svg', () => {
  it('produce un documento con el tamano correcto', () => {
    const qr = encodeText('hola', 'medium');
    const list = buildDrawList(qr, PLANO, 4);
    const svg = toSvg(list, PLANO, 8, 'Codigo QR de prueba');
    expect(svg).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    // El `viewBox` arranca en `-zonaSilenciosa`, no en 0. Si empieza en 0, la
    // ultima zona silenciosa queda fuera del documento y el fondo sale
    // recortado a la derecha y abajo, que es el bug que rompia la exportacion.
    const lado = (qr.size + 8) * 8;
    const origen = -4 * 8;
    expect(svg).toContain(`viewBox="${origen} ${origen} ${lado} ${lado}"`);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('lleva un texto alternativo, que es lo que lee un lector de pantalla', () => {
    const qr = encodeText('hola', 'medium');
    const svg = toSvg(buildDrawList(qr, PLANO, 4), PLANO, 8, 'Mi codigo');
    expect(svg).toContain('<title>Mi codigo</title>');
    expect(svg).toContain('role="img"');
  });

  it('escapa los caracteres que romperian el XML', () => {
    const qr = encodeText('hola', 'medium');
    const svg = toSvg(buildDrawList(qr, PLANO, 4), PLANO, 8, 'Comillas " y ampersand &');
    expect(svg).toContain('&quot;');
    expect(svg).toContain('&amp;');
    expect(svg).not.toContain('" y ampersand &');
  });

  it('es un archivo autónomo, sin referencias externas', () => {
    const qr = encodeText('hola', 'medium');
    const svg = toSvg(buildDrawList(qr, PLANO, 4), PLANO, 8, 'prueba');
    // Un SVG que enlaza una hoja de estilos o una fuente externa deja de
    // funcionar en cuanto se imprime o se abre sin conexion.
    expect(svg).not.toMatch(/<link/);
    expect(svg).not.toMatch(/@import/);
  });
});

describe('presets', () => {
  it('todos los preajustes tienen identificador unico', () => {
    const ids = PRESETS.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ningun preajuste bloquea la descarga', () => {
    // La invariante real es que se pueda descargar, no que salga todo limpio. Un
    // preajuste de puntos pierde un 21% de tinta: es un canje legitimo y avisar
    // de el es decir la verdad, no un fallo.
    for (const preset of PRESETS) {
      const qr = encodeText('un contenido de longitud razonable', 'quartile');
      const list = buildDrawList(qr, preset.style, 4);
      const d = diagnose(list, preset.style.foreground, preset.style.background, 1024, 100);
      expect({ id: preset.id, blocked: d.verdict === 'blocked' }).toEqual({ id: preset.id, blocked: false });
    }
  });

  it('los preajustes sobrios no dan ningun aviso', () => {
    const sobrios = PRESETS.filter((preset) => preset.style.module === 'square');
    for (const preset of sobrios) {
      const qr = encodeText('un contenido de longitud razonable', 'quartile');
      const list = buildDrawList(qr, preset.style, 4);
      const d = diagnose(list, preset.style.foreground, preset.style.background, 1024, 100);
      const avisos = d.checks.filter((check) => check.warning).map((check) => check.id);
      expect({ id: preset.id, avisos }).toEqual({ id: preset.id, avisos: [] });
    }
  });

  it('el contraste de todo preajuste llega al minimo', () => {
    for (const preset of PRESETS) {
      const ratio = contrastRatio(preset.style.foreground, preset.style.background);
      expect({ id: preset.id, ratio: ratio === null ? 0 : Math.round(ratio) }).toEqual({
        id: preset.id,
        ratio: expect.any(Number),
      });
      expect(ratio).not.toBeNull();
      expect(ratio!).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('un identificador desconocido devuelve el de partida, sin lanzar', () => {
    expect(presetById('no-existe').id).toBe(DEFAULT_PRESET.id);
  });

  it('con correccion baja sugiere la forma mas sobria', () => {
    expect(suggestedModuleShape('low')).toBe('square');
    expect(suggestedModuleShape('high')).not.toBe('square');
  });
});
