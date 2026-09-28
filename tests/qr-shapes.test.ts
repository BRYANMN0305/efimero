import { describe, expect, it } from 'vitest';
import { shapeArea, shapeContains, shapeCoverage, shapeToSvgPath, type Shape } from '../src/qr/shapes';

/** Formas de un modulo y de un patron localizador, con esquinas redondeadas de verdad. */
const SHAPES: readonly (readonly [string, Shape])[] = [
  ['cuadrado', { kind: 'rect', radius: 0 }],
  ['redondeado suave', { kind: 'rect', radius: 0.2 }],
  ['redondeado casi entero', { kind: 'rect', radius: 0.5 }],
  ['circulo', { kind: 'circle' }],
  ['rombo', { kind: 'diamond' }],
  ['hoja', { kind: 'leaf' }],
];

/**
 * Muestrea la forma en una rejilla y cuenta la fraccion de casillas dentro.
 *
 * Sirve para contrastar el predicado `shapeContains` con el area calculada por
 * formula: si las dos cosas no coinciden, alguna de las dos esta mal, y solo
 * compararlas entre si lo detecta.
 */
function sampledCoverage(shape: Shape, w: number, h: number, grid = 600): number {
  let inside = 0;
  for (let i = 0; i < grid; i++) {
    for (let j = 0; j < grid; j++) {
      if (shapeContains(shape, 0, 0, w, h, ((i + 0.5) * w) / grid, ((j + 0.5) * h) / grid)) {
        inside++;
      }
    }
  }
  return inside / (grid * grid);
}

/**
 * Indica si un punto cae tan cerca del borde de la forma que el resultado del
 * predicado depende del redondeo.
 *
 * En la frontera exacta, la diferencia entre `3.5 + 3.4125 - 3.5` y
 * `3.5 - 3.4125 - 3.5` es del orden de la ultima cifra representable. Son
 * puntos de medida cero, irrelevantes al dibujar, pero hacen fallar cualquier
 * comprobacion de simetria. Se descartan en vez de relajar la tolerancia, que
 * dejaria pasar errores de verdad.
 *
 * Hay que sondear en las cuatro direcciones. Un punto que queda fuera por dos
 * unidades de la ultima cifra no cambia de resultado al avanzar en positivo,
 * porque ya estaba fuera; solo se detecta acercandose desde el lado contrario.
 */
function isOnBoundary(shape: Shape, w: number, h: number, px: number, py: number): boolean {
  const d = 1e-6;
  const here = shapeContains(shape, 0, 0, w, h, px, py);
  for (const [ox, oy] of [
    [d, 0],
    [-d, 0],
    [0, d],
    [0, -d],
  ] as const) {
    if (shapeContains(shape, 0, 0, w, h, px + ox, py + oy) !== here) return true;
  }
  return false;
}

describe('shapes', () => {
  describe('coherencia entre el predicado y el area', () => {
    for (const [name, shape] of SHAPES) {
      for (const [w, h] of [
        [1, 1],
        [7, 7],
        [3, 5],
      ] as const) {
        it(`el area calculada de "${name}" coincide con el muestreo en ${w}x${h}`, () => {
          const analytic = shapeCoverage(shape, w, h);
          const sampled = sampledCoverage(shape, w, h);
          // Tolerancia del 1%: suficiente para la rejilla de 600x600, que
          // redondea a pasos de 1/600, y no suficiente para tapar un error de
          // formula, que suele ser de varios puntos porcentuales.
          expect(Math.abs(analytic - sampled)).toBeLessThan(0.01);
        });
      }
    }
  });

  describe('formas concretas', () => {
    it('un cuadrado sin redondeo cubre exactamente su caja', () => {
      expect(shapeCoverage({ kind: 'rect', radius: 0 }, 1, 1)).toBe(1);
      expect(shapeArea({ kind: 'rect', radius: 0 }, 7, 7)).toBe(49);
    });

    it('un circulo inscrito en el modulo pierde el 21,5 por ciento', () => {
      // Es el dato que explica por que los codigos de puntos se leen peor.
      expect(shapeCoverage({ kind: 'circle' }, 1, 1)).toBeCloseTo(Math.PI / 4, 10);
    });

    it('un rombo cubre la mitad del area', () => {
      expect(shapeCoverage({ kind: 'diamond' }, 1, 1)).toBeCloseTo(0.5, 10);
    });

    it('las esquinas redondeadas quitan area pero nunca la anaden', () => {
      let previous = Number.POSITIVE_INFINITY;
      for (const radius of [0, 0.1, 0.25, 0.5]) {
        const coverage = shapeCoverage({ kind: 'rect', radius }, 1, 1);
        expect(coverage).toBeLessThanOrEqual(1);
        expect(coverage).toBeLessThanOrEqual(previous + 1e-12);
        previous = coverage;
      }
      expect(shapeCoverage({ kind: 'rect', radius: 0 }, 1, 1)).toBe(1);
    });

    it('el radio mayor que la mitad de la caja se recorta en vez de desbordar', () => {
      // Con radio 3 en una caja de 1 el rectangulo se vuelve un circulo. Si no
      // se recortara, el trazo se saldria de la caja y los modulos se tocarian.
      const coverage = shapeCoverage({ kind: 'rect', radius: 3 }, 1, 1);
      expect(coverage).toBeCloseTo(Math.PI / 4, 10);
    });
  });

  describe('simetria', () => {
    for (const [name, shape] of SHAPES) {
      it(`"${name}" es simetrica respecto al centro de su caja`, () => {
        // Los puntos se toman en el interior de la caja, nunca en el borde. El
        // predicado usa intervalos semiabiertos a proposito, para que las
        // casillas de una retícula se repartan sin solaparse, y eso hace que
        // el borde sea asimetrico por una medida de cero que no importa al
        // dibujar pero si haria fallar esta comprobacion.
        const w = 7;
        const h = 7;
        const cx = w / 2;
        const cy = h / 2;
        let checked = 0;
        for (let step = 1; step < 40; step++) {
          for (let other = 1; other < 40; other++) {
            const dx = (step / 40) * cx;
            const dy = (other / 40) * cy;
            const px = cx + dx;
            const py = cy + dy;
            if (isOnBoundary(shape, w, h, px, py)) continue;
            const forward = shapeContains(shape, 0, 0, w, h, px, py);
            const mirrored = shapeContains(shape, 0, 0, w, h, cx - dx, cy - dy);
            expect(forward).toBe(mirrored);
            checked++;
          }
        }
        // Si se descartara todo, la comprobacion no estaria probando nada.
        expect(checked).toBeGreaterThan(1000);
      });
    }
  });

  describe('contornos', () => {
    it('las formas redondas y angulosas no tocan las esquinas de la caja', () => {
      // Si un patron localizador llenara su caja hasta las esquinas, se
      // confundiria con la version cuadrada al solo mirarlo.
      for (const shape of [{ kind: 'circle' }, { kind: 'diamond' }, { kind: 'leaf' }] as const) {
        expect(shapeContains(shape, 0, 0, 7, 7, 0.01, 0.01)).toBe(false);
        expect(shapeContains(shape, 0, 0, 7, 7, 6.99, 0.01)).toBe(false);
        expect(shapeContains(shape, 0, 0, 7, 7, 0.01, 6.99)).toBe(false);
        expect(shapeContains(shape, 0, 0, 7, 7, 6.99, 6.99)).toBe(false);
      }
    });

    it('el cuadrado si llega a las esquinas', () => {
      expect(shapeContains({ kind: 'rect', radius: 0 }, 0, 0, 7, 7, 0.01, 0.01)).toBe(true);
    });

    it('la hoja se afila en una diagonal y se ensancha en la otra', () => {
      // A la misma distancia del centro, la hoja solo llega en una de las dos
      // diagonales. Eso es justo lo que la distingue de un circulo: un circulo
      // daria el mismo resultado en las dos direcciones.
      const leaf = { kind: 'leaf' } as const;
      const radius = 2.5;
      const step = radius / Math.SQRT2;
      expect(shapeContains(leaf, 0, 0, 7, 7, 3.5 - step, 3.5 - step)).toBe(false);
      expect(shapeContains(leaf, 0, 0, 7, 7, 3.5 - step, 3.5 + step)).toBe(true);
    });
  });

  describe('trazado SVG', () => {
    for (const [name, shape] of SHAPES) {
      it(`"${name}" produce un trazado cerrado y con comandos absolutos`, () => {
        const path = shapeToSvgPath(shape, 1.25, 2.5, 7, 7);
        expect(path.startsWith('M')).toBe(true);
        expect(path.endsWith('Z')).toBe(true);
        // Solo se emiten numeros y letras de comando: nada de coordenadas
        // relativas, que dependen del punto de partida anterior.
        expect(path).toMatch(/^[MLHVAZ0-9.\s-]+$/);
        expect(path).not.toContain('NaN');
        expect(path).not.toContain('Infinity');
      });
    }

    it('el trazado respeta la posicion de la caja', () => {
      const path = shapeToSvgPath({ kind: 'rect', radius: 0 }, 10, 20, 7, 7);
      expect(path).toBe('M10 20H17V27H10Z');
    });
  });

  describe('cajas degeneradas', () => {
    it('una caja de lado cero tiene area cero y no lanza', () => {
      for (const shape of [{ kind: 'rect', radius: 0.2 }, { kind: 'circle' }, { kind: 'diamond' }, { kind: 'leaf' }] as const) {
        expect(shapeCoverage(shape, 0, 0)).toBe(0);
        expect(shapeCoverage(shape, 0, 5)).toBe(0);
        expect(shapeArea(shape, 0, 0)).toBe(0);
      }
    });
  });
});
