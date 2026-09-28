/**
 * Formas geometricas parametricas.
 *
 * Una forma se describe de forma abstracta y sin coordenadas absolutas: es un
 * rectangulo junto con lo que la distingue de un cuadrado. De ahi salen las
 * tres representaciones que hacen falta, todas derivadas de la misma
 * definicion y por tanto iguales entre si por construccion:
 *
 * - un predicado `shapeContains`, que usa el rasterizador interno;
 * - un trazado SVG, que usan el exportador y el vector;
 * - el mismo trazado, que se pasa tal cual a `Path2D` en el lienzo.
 *
 * Si el rectangulo, el circulo o el rombo tuvieran tres definiciones distintas,
 * el PNG y el SVG de una misma lista de instrucciones acabarian siendo
 * imagenes diferentes. Al definir cada forma una sola vez, lo que se ve en
 * pantalla es por construccion lo que se descarga.
 *
 * Todas las medidas van en unidades de modulo, nunca en pixeles.
 *
 * @module
 */

/** Forma descrita de forma abstracta, sin posicion. */
export type Shape =
  | { readonly kind: 'rect'; readonly radius: number }
  | { readonly kind: 'circle' }
  | { readonly kind: 'diamond' }
  | { readonly kind: 'leaf' }
  | { readonly kind: 'bar'; readonly horizontal: boolean; readonly fill: number };

/** Caja que ocupa una barra dentro de la suya, con sus extremos redondeados. */
function barBox(shape: Extract<Shape, { kind: 'bar' }>, w: number, h: number): readonly [number, number, number, number] {
  return shape.horizontal
    ? [0, ((1 - shape.fill) / 2) * h, w, shape.fill * h]
    : [((1 - shape.fill) / 2) * w, 0, shape.fill * w, h];
}

/**
 * Desplazamiento del centro de los dos circulos que forman la hoja, en
 * fraccion del lado de la caja.
 *
 * Con cero la hoja seria un circulo; con valores altos los dos circulos se
 * separan tanto que la interseccion se afila demasiado y el patron localizador
 * deja de leerse. Este valor es un termino medio: se distinguia a simple vista
 * de un cuadrado y todavia conserva el punto de referencia para el lector.
 */
const LEAF_OFFSET = 0.12;

/** Devuelve el desplazamiento de los centros, en modulos. */
function leafOffset(side: number): number {
  return side * LEAF_OFFSET;
}

/** Devuelve el radio de los circulos que forman la hoja, en modulos. */
function leafRadius(side: number): number {
  return side / 2;
}

/**
 * Indica si un punto cae dentro de la forma.
 *
 * @param shape - Forma que se quiere comprobar.
 * @param x - Borde izquierdo de la caja.
 * @param y - Borde superior de la caja.
 * @param w - Ancho de la caja.
 * @param h - Alto de la caja.
 * @param px - Coordenada horizontal del punto, en modulos.
 * @param py - Coordenada vertical del punto, en modulos.
 * @returns `true` si el punto esta dentro de la forma.
 */
export function shapeContains(shape: Shape, x: number, y: number, w: number, h: number, px: number, py: number): boolean {
  switch (shape.kind) {
    case 'rect': {
      const radius = Math.min(shape.radius, w / 2, h / 2);
      if (radius <= 0) return px >= x && px < x + w && py >= y && py < y + h;
      // Se colapsa cada punto a la esquina de la caja mas cercana y se
      // comprueba la distancia. Es el test estandar de rectangulo redondeado.
      const cx = Math.min(Math.max(px, x + radius), x + w - radius);
      const cy = Math.min(Math.max(py, y + radius), y + h - radius);
      const dx = px - cx;
      const dy = py - cy;
      return dx * dx + dy * dy <= radius * radius;
    }
    case 'circle': {
      const r = Math.min(w, h) / 2;
      const dx = px - (x + w / 2);
      const dy = py - (y + h / 2);
      return dx * dx + dy * dy <= r * r;
    }
    case 'diamond': {
      const dx = Math.abs(px - (x + w / 2)) / (w / 2);
      const dy = Math.abs(py - (y + h / 2)) / (h / 2);
      return dx + dy <= 1;
    }
    case 'leaf': {
      // Interseccion de dos circulos iguales cuyos centros se separan en la
      // diagonal. La union daria un ocho; la interseccion recorta las esquinas
      // opuestas y deja la hoja apuntando en diagonal.
      const side = Math.min(w, h);
      const r = leafRadius(side);
      const d = leafOffset(side);
      const cx = x + w / 2;
      const cy = y + h / 2;
      const ax = px - (cx - d);
      const ay = py - (cy - d);
      const bx = px - (cx + d);
      const by = py - (cy + d);
      return ax * ax + ay * ay <= r * r && bx * bx + by * by <= r * r;
    }
    case 'bar': {
      // La barra es un rectangulo redondeado hasta ser un stadium, ocupando la
      // franja central de su caja. El radio es la mitad de su lado corto, asi
      // que los extremos quedan siempre redondos y no hay que recortarlo.
      const [ox, oy, bw, bh] = barBox(shape, w, h);
      const r = Math.min(bw, bh) / 2;
      const cx = Math.min(Math.max(px, x + ox + r), x + ox + bw - r);
      const cy = Math.min(Math.max(py, y + oy + r), y + oy + bh - r);
      const dx = px - cx;
      const dy = py - cy;
      return dx * dx + dy * dy <= r * r;
    }
  }
}

/**
 * Area que ocupa la forma dentro de su caja.
 *
 * Se calcula con formula cerrada, no por integracion aproximada, porque el
 * valor alimenta el aviso de escaneabilidad y no debe depender de la resolucion
 * a la que se calcule.
 *
 * @returns Area en modulos al cuadrado.
 */
export function shapeArea(shape: Shape, w: number, h: number): number {
  // Sin esta proteccion, la hoja dividiria por cero al evaluar su formula.
  if (w <= 0 || h <= 0) return 0;

  switch (shape.kind) {
    case 'rect': {
      const radius = Math.min(shape.radius, w / 2, h / 2);
      // Lo que se pierde son las cuatro esquinas menos el cuarto de circulo que
      // las sustituye.
      return w * h - (4 - Math.PI) * radius * radius;
    }
    case 'circle': {
      const r = Math.min(w, h) / 2;
      return Math.PI * r * r;
    }
    case 'diamond': {
      return (w * h) / 2;
    }
    case 'leaf': {
      // Dos segmentos circulares menos el rombo que forman en el centro.
      //
      // Los centros se separan `offset` en horizontal y en vertical, asi que la
      // distancia entre ellos es el desplazamiento por la diagonal Y por dos,
      // no solo por la diagonal. Omitir ese factor descuadra el area en mas de
      // veinte puntos porcentuales.
      const side = Math.min(w, h);
      const r = leafRadius(side);
      const d = 2 * leafOffset(side) * Math.SQRT2;
      const half = Math.min(1, d / (2 * r));
      return 2 * r * r * Math.acos(half) - 0.5 * d * Math.sqrt(Math.max(0, 4 * r * r - d * d));
    }
    case 'bar': {
      const [, , bw, bh] = barBox(shape, w, h);
      const r = Math.min(bw, bh) / 2;
      return bw * bh - (4 - Math.PI) * r * r;
    }
  }
}

/**
 * Fraccion del area de la caja que ocupa la forma.
 *
 * @returns Cobertura entre 0 y 1. Un cuadrado da 1; un circulo inscrito, 0,785.
 */
export function shapeCoverage(shape: Shape, w: number, h: number): number {
  if (w <= 0 || h <= 0) return 0;
  return shapeArea(shape, w, h) / (w * h);
}

/**
 * Convierte una forma en un trazado SVG.
 *
 * @param shape - Forma que se quiere trazar.
 * @param x - Borde izquierdo de la caja.
 * @param y - Borde superior de la caja.
 * @param w - Ancho de la caja.
 * @param h - Alto de la caja.
 * @returns Atributo `d` de un elemento `<path>`, en las mismas unidades.
 */
export function shapeToSvgPath(shape: Shape, x: number, y: number, w: number, h: number): string {
  /** Redondea a cuatro decimales y quita los ceros sobrantes. */
  const n = (value: number): string => Number(value.toFixed(4)).toString();

  switch (shape.kind) {
    case 'rect': {
      const radius = Math.min(shape.radius, w / 2, h / 2);
      if (radius <= 0) {
        return `M${n(x)} ${n(y)}H${n(x + w)}V${n(y + h)}H${n(x)}Z`;
      }
      return (
        `M${n(x + radius)} ${n(y)}` +
        `H${n(x + w - radius)}A${n(radius)} ${n(radius)} 0 0 1 ${n(x + w)} ${n(y + radius)}` +
        `V${n(y + h - radius)}A${n(radius)} ${n(radius)} 0 0 1 ${n(x + w - radius)} ${n(y + h)}` +
        `H${n(x + radius)}A${n(radius)} ${n(radius)} 0 0 1 ${n(x)} ${n(y + h - radius)}` +
        `V${n(y + radius)}A${n(radius)} ${n(radius)} 0 0 1 ${n(x + radius)} ${n(y)}Z`
      );
    }
    case 'circle': {
      const r = Math.min(w, h) / 2;
      const cx = x + w / 2;
      const cy = y + h / 2;
      // Dos arcos de 180 grados. Se evita la forma abreviada de circulo porque
      // no todos los lectores de SVG la aceptan igual.
      return `M${n(cx - r)} ${n(cy)}A${n(r)} ${n(r)} 0 0 1 ${n(cx + r)} ${n(cy)}A${n(r)} ${n(r)} 0 0 1 ${n(cx - r)} ${n(cy)}Z`;
    }
    case 'diamond': {
      const cx = x + w / 2;
      const cy = y + h / 2;
      return `M${n(cx)} ${n(y)}L${n(x + w)} ${n(cy)}L${n(cx)} ${n(y + h)}L${n(x)} ${n(cy)}Z`;
    }
    case 'leaf': {
      // Los dos puntos de corte de la interseccion estan sobre la mediatriz de
      // la linea de centros, a una distancia igual a la media cuerda.
      const side = Math.min(w, h);
      const r = leafRadius(side);
      const d = leafOffset(side);
      const cx = x + w / 2;
      const cy = y + h / 2;
      const half = Math.sqrt(Math.max(0, r * r - 2 * d * d));
      const px = cx - half / Math.SQRT2;
      const py = cy + half / Math.SQRT2;
      // El punto simetrico respecto del centro es el otro extremo de la hoja.
      const qx = 2 * cx - px;
      const qy = 2 * cy - py;
      // El indicador de arco grande se queda a cero porque el desplazamiento
      // nunca supera la mitad del radio, y entonces los dos arcos son
      // menores de 180 grados. El barrido va en sentidos opuestos porque son
      // las dos mitades de la misma curva vistas desde circunferencias
      // distintas.
      return `M${n(px)} ${n(py)}` + `A${n(r)} ${n(r)} 0 0 0 ${n(qx)} ${n(qy)}` + `A${n(r)} ${n(r)} 0 0 1 ${n(px)} ${n(py)}Z`;
    }
    case 'bar': {
      // Se traza como un rectangulo cuyo radio es medio lado corto, que es lo
      // que produce el stadium. Los dos arcos de los extremos van en sentidos
      // opuestos para cerrar la figura.
      const [ox, oy, bw, bh] = barBox(shape, w, h);
      const r = Math.min(bw, bh) / 2;
      const x0 = x + ox;
      const y0 = y + oy;
      const x1 = x0 + bw;
      const y1 = y0 + bh;
      if (r <= 0) return `M${n(x0)} ${n(y0)}H${n(x1)}V${n(y1)}H${n(x0)}Z`;
      return (
        `M${n(x0 + r)} ${n(y0)}` +
        `H${n(x1 - r)}A${n(r)} ${n(r)} 0 0 1 ${n(x1)} ${n(y0 + r)}` +
        `V${n(y1 - r)}A${n(r)} ${n(r)} 0 0 1 ${n(x1 - r)} ${n(y1)}` +
        `H${n(x0 + r)}A${n(r)} ${n(r)} 0 0 1 ${n(x0)} ${n(y1 - r)}` +
        `V${n(y0 + r)}A${n(r)} ${n(r)} 0 0 1 ${n(x0 + r)} ${n(y0)}Z`
      );
    }
  }
}
