/**
 * Diagnostico de escaneabilidad.
 *
 * Aqui no se opina sobre el estilo: se mide. Cada comprobacion devuelve un
 * numero, y el veredicto sale de comparar ese numero con los umbrales de
 * `SCAN_LIMITS`. Que los numeros esten medidos y no_estimados importa, porque
 * el usuario va a poner este codigo en una puerta y volver manana.
 *
 * Los umbrales vienen de la norma ISO/IEC 18004 y de la practica medida con
 * telefonos reales, no de una sensacion de que "se ve bien".
 *
 * @module
 */

import { SCAN_LIMITS } from '../config';
import type { DrawList } from './draw-list';
import type { Ecc } from './types';

/** Como de seguro es un codigo. */
export type Verdict = 'safe' | 'caution' | 'blocked';

/** Una comprobacion individual. */
export interface Check {
  /** Identificador estable, para enlazar con la traduccion. */
  readonly id: 'logoArea' | 'finderClearance' | 'contrast' | 'moduleSize' | 'inkLoss' | 'quietZone';
  /** si la comprobacion pasa sin avisar. */
  readonly ok: boolean;
  /** Si la comprobacion no pasa pero todavia es utilizable. */
  readonly warning: boolean;
  /** Datos para que la interfaz rellene el mensaje. `null` significa "no aplica". */
  readonly values: Readonly<Record<string, string | number | boolean | null>>;
}

/** Resultado completo del diagnostico. */
export interface Diagnosis {
  readonly verdict: Verdict;
  readonly checks: readonly Check[];
  /** Lado de un modulo en pixeles, a la resolucion de pantalla actual. */
  readonly modulePx: number;
  /** Lado de un modulo en milimetros, con el ancho de impresion elegido. */
  readonly moduleMm: number;
}

/**
 * Luminancia relativa de un color, segun la formula de WCAG 2.1.
 *
 * Devuelve un numero entre 0 (negro) y 1 (blanco).
 *
 * @param color - Componentes RGB de 0 a 255.
 * @returns Luminancia relativa.
 */
export function relativeLuminance(color: readonly [number, number, number]): number {
  const channel = (value: number): number => {
    const srgb = value / 255;
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(color[0]) + 0.7152 * channel(color[1]) + 0.0722 * channel(color[2]);
}

/**
 * Convierte un color CSS a sus componentes RGB.
 *
 * Solo se admiten colores solidos. Un degradado no tiene un unico color, y
 * medir el contraste de uno exigiria mirar el punto mas claro y el mas oscuro,
 * que es lo que haria el comprobador de degradado si se llegara a soportar.
 *
 * @param color - Color en notacion hexadecimal o `rgb()`.
 * @returns Componentes de 0 a 255, o `null` si no se reconoce.
 */
export function parseCssColor(color: string): readonly [number, number, number] | null {
  const text = color.trim();

  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text);
  const digits = hex?.[1];
  if (digits !== undefined) {
    // El patron admite tres o seis digitos. Con tres, cada digito va repetido,
    // porque en CSS `#abc` es exactamente `#aabbcc`.
    const full =
      digits.length === 3
        ? digits
            .split('')
            .map((char) => char + char)
            .join('')
        : digits;
    return [Number.parseInt(full.slice(0, 2), 16), Number.parseInt(full.slice(2, 4), 16), Number.parseInt(full.slice(4, 6), 16)];
  }

  const rgb = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i.exec(text);
  if (rgb !== null) {
    return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  }

  return null;
}

/**
 * Ratio de contraste entre dos colores, segun WCAG 2.1.
 *
 * Va de 1 (iguales) a 21 (negro sobre blanco). El orden no importa: siempre
 * devuelve el mismo numero, porque el ratio se define sobre el mas claro y el
 * mas oscuro.
 *
 * @returns El ratio, o `null` si alguno de los colores no se reconoce.
 */
export function contrastRatio(a: string, b: string): number | null {
  const first = parseCssColor(a);
  const second = parseCssColor(b);
  if (first === null || second === null) return null;

  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Comprueba un codigo y dice si se podra escanear.
 *
 * @param list - Lista de dibujo, que ya lleva la perdida de tinta calculada.
 * @param foreground - Color de los modulos.
 * @param background - Color de fondo.
 * @param pixels - Lado en pixeles con el que se va a mostrar o descargar.
 * @param printWidthMm - Ancho de impresion en milimetras, para el calculo en
 *   papel. Un codigo que en pantalla se lee bien puede no leerse impreso.
 * @param ecc - Nivel de correccion de errores pedido. Decide cuanto margen de
 *   tinta puede gastarse el estilo sin que el codigo deje de leerse.
 * @param logoMargin - Margen de aire alrededor del logo, en modulos. Cuenta para
 *   el despeje: con un margen grande, el logo puede tocar el localizador aunque
 *   su lado sea pequeno.
 * @returns El veredicto y el detalle de cada comprobacion.
 */
export function diagnose(
  list: DrawList,
  foreground: string,
  background: string,
  pixels: number,
  printWidthMm: number,
  ecc: Ecc = 'medium',
  logoMargin = 0,
): Diagnosis {
  const checks: Check[] = [];
  let blocked = false;
  let caution = false;

  /** Registra el resultado de una comprobacion y actualiza el veredicto. */
  const record = (
    id: Check['id'],
    ok: boolean,
    warning: boolean,
    values: Record<string, string | number | boolean | null>,
  ): void => {
    checks.push({ id, ok, warning, values });
    if (!ok) blocked = true;
    if (warning) caution = true;
  };

  /* --- Contraste --- */
  // El suelo de `ok` es el minimo de la norma. El aviso usa el umbral de
  // poco margen, que es mas alto. Asi el codigo funciona pero avisa de que va
  // justo, en vez de aprobar solo porque pasa por los pelos.
  const ratio = contrastRatio(foreground, background);
  // Un codigo claro sobre fondo oscuro es un caso aparte: el ratio sale bien, y
  // muchos lectores lo leen sin problema. Pero otros solo saben leer tinta
  // oscura sobre fondo claro, asi que avisa en vez de bloquear: la norma no lo
  // prohibe, y hay quien lo necesita de verdad para fondos oscuros.
  const fg = parseCssColor(foreground);
  const bg = parseCssColor(background);
  const inverted = fg !== null && bg !== null && relativeLuminance(fg) > relativeLuminance(bg);
  record(
    'contrast',
    ratio !== null && ratio >= SCAN_LIMITS.contrastBlocked,
    ratio === null || ratio < SCAN_LIMITS.contrastCaution || inverted,
    {
      ratio: ratio === null ? 0 : Math.round(ratio * 10) / 10,
      min: SCAN_LIMITS.contrastCaution,
      safe: SCAN_LIMITS.contrastSafe,
      inverted,
    },
  );

  /* --- Tamano de modulo --- */
  const modulePx = pixels / list.side;
  const moduleMm = printWidthMm / list.side;
  record(
    'moduleSize',
    modulePx >= SCAN_LIMITS.modulePxBlocked && moduleMm >= SCAN_LIMITS.moduleMmBlocked,
    modulePx < SCAN_LIMITS.modulePxCaution || moduleMm < SCAN_LIMITS.moduleMmCaution,
    {
      px: Math.round(modulePx * 100) / 100,
      mm: Math.round(moduleMm * 100) / 100,
      size: pixels,
      minPx: SCAN_LIMITS.modulePxCaution,
      min: SCAN_LIMITS.modulePxCaution,
      minMm: SCAN_LIMITS.moduleMmCaution,
    },
  );

  /* --- Zona silenciosa --- */
  // Cuatro modulos es lo que fija la norma y lo que trae el valor por defecto.
  // Seis dan mas margen, pero no es un defecto, asi que no se avisa: un aviso
  // aqui solo haria dudar de un codigo que ya funciona.
  record('quietZone', list.quietZone >= SCAN_LIMITS.quietZoneBlocked, list.quietZone < SCAN_LIMITS.quietZoneCaution, {
    n: list.quietZone,
    min: SCAN_LIMITS.quietZoneBlocked,
    safe: SCAN_LIMITS.quietZoneSafe,
  });

  /* --- Perdida de tinta --- */
  // Aqui no hay bloqueo, y el motivo es concreto: un modulo con forma de rombo
  // sigue codificando el mismo bit, solo que ocupa menos area. El presupuesto de
  // correccion de errores mide bits estropeados, no tinta ausente, asi que
  // compararlos seria medir dos cosas distintas. El riesgo real de un estilo
  // agrietado no es la tinta que falta, sino que los modulos vecinos se toquen
  // cuando el modulo es pequeno en pantalla, y eso lo mide el tamano de modulo.
  // Asi que esto avisa y no bloquea.
  const inkLoss = list.inkLoss;
  record('inkLoss', true, inkLoss > 0.12, { loss: Math.round(inkLoss * 100), percent: Math.round(inkLoss * 100) });

  /* --- Cobertura del logo y despeje de las esquinas --- */
  // Se lee de la lista: el logo siempre va centrado, y su placa es un cuadrado
  // de lado `side + 2 * margin`. Los localizadores ocupan 7x7 en cada esquina.
  const logo = list.ops.find((op) => op.kind === 'image');
  if (logo !== undefined) {
    // Aqui si que el nivel de correccion manda, y no por gusto: un logo borra
    // modulos de verdad. Su presupuesto es el que puede reconstruir el nivel
    // pedido, asi que un 20% de cobertura es problema con nivel M o Q, y solo
    // un aviso con nivel H. Eso es exactamente lo que dice el manual de la
    // aplicacion, y ahora el codigo lo comprueba en vez de prometerlo.
    //
    // Se mide el area de la tinta del logo, no la de su placa: el margen de aire
    // no quita informacion, y el reader lo resamplea hasta el margen igualmente.
    const recovery = SCAN_LIMITS.eccRecovery[ecc];
    const areaFraction = (logo.w * logo.h) / (list.modules * list.modules);
    record('logoArea', areaFraction <= recovery, areaFraction > recovery / 2, {
      area: Math.round(areaFraction * 1000) / 10,
      recovery: Math.round(recovery * 100),
    });

    // El margen de aire que rodea al logo no puede pisar ningun localizador.
    // Con un codigo pequeno el margen se come la esquina y el lector ya no
    // encuentra el patron localizador, que es el punto de partida de todo.
    // La geometria: el logo va centrado, asi que su borde exterior queda a
    // `logo.w / 2 + margen` del centro. El patron localizador ocupa 7x7 pegado a
    // cada esquina, o sea que su borde interior esta a `centro - 7` del centro.
    // Lo que se compara son esas dos distancias, y basta con que se toquen para
    // que el lector no encuentre el punto de partida.
    //
    // El margen cuenta. Un logo pequeno con un margen de 3 modulos es un tapon
    // grande, y midiendo solo el logo se dira que cabe cuando no cabe.
    //
    // Antes se sumaba un 3.5 fijo que no significaba nada aqui y hacia que
    // hasta un logo de un solo modulo saliera bloqueado, con lo que ninguna
    // marca se podia usar.
    const reach = logo.w / 2 + logoMargin;
    const centre = list.modules / 2;
    const libre = centre - 7;
    record('finderClearance', reach < libre, reach < libre + 1.5, { modules: Math.round((libre - reach) * 10) / 10 });
  } else {
    // Sin logo, la comprobacion vale: se dice que no aplica en vez de callarse.
    record('finderClearance', true, false, { modules: null });
  }

  const verdict: Verdict = blocked ? 'blocked' : caution ? 'caution' : 'safe';
  return { verdict, checks, modulePx: Math.round(modulePx * 100) / 100, moduleMm: Math.round(moduleMm * 100) / 100 };
}
