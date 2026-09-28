/**
 * Verificacion de lectura con jsQR.
 *
 * El codigo se dibuja en un lienzo, se leen sus pixeles y se los pasa a jsQR. Si
 * jsQR devuelve el mismo contenido, el codigo es de verdad legible por un
 * lector, y no solo "parece" un QR correcto segun la formula.
 *
 * Por que esto se carga con `import()` dinamico: jsQR pesa del orden de 40 KB
 * comprimidos, y la mayoria de quien abre la pagina no llega a generar nada.
 * Meterlo en el bundle inicial haria pagar ese peso a todo el mundo para
 * aplicarlo solo a una parte. Ademas no se usa `await` en el camino de dibujo:
 * la verificacion se dispara despues de pintar, y si el modulo todavia no ha
 * llegado, se hace cuando llegue.
 *
 * @module
 */

/** Resultado de intentar leer un codigo. */
export type VerifyResult =
  /** Se leyo y el contenido coincide con lo que se iba a codificar. */
  | { status: 'ok' }
  /** Se leyo, pero devuelve otra cosa: no es el codigo que se pintó. */
  | { status: 'mismatch'; decoded: string }
  /** se leyeron pixeles y jsQR no encontro ningun codigo. */
  | { status: 'notFound' }
  /** Todavia no se ha cargado la biblioteca, o se ha fallado al cargarla. */
  | { status: 'pending' };

/** Lo que hace falta de la biblioteca de lectura, sin importar el tipo del modulo. */
type JsQrLike = (data: Uint8ClampedArray, width: number, height: number) => { data: string } | null;

/** La biblioteca, una vez cargada. */
let reader: JsQrLike | null = null;
/** Lo que se estaba esperando cuando la biblioteca todavia no estaba. */
let waiting: ((reader: JsQrLike) => void) | null = null;
/** Si el modulo se pidio alguna vez. Evita repetir el intento tras un fallo. */
let attempted = false;

/**
 * Carga jsQR la primera vez que hace falta.
 *
 * Se cachea la promesa, de modo que varias comprobaciones seguidas compartan una
 * sola descarga. Si la carga falla, no se reintenta en cada verificacion.
 *
 * @returns La funcion de lectura, o `null` si no se pudo cargar.
 */
async function loadReader(): Promise<JsQrLike | null> {
  if (reader !== null) return reader;
  attempted = true;
  try {
    const modulo = await import('jsqr');
    // El modulo trae la funcion en `default` porque es un paquete sin ESM propio.
    const candidate = (modulo as { default?: unknown }).default ?? modulo;
    if (typeof candidate !== 'function') return null;
    reader = candidate as JsQrLike;
    waiting?.(reader);
    waiting = null;
    return reader;
  } catch {
    // Sin jsQR la aplicacion sigue funcionando: solo se pierde la verificacion.
    return null;
  }
}

/**
 * Arranca la carga sin esperarla.
 *
 * Se llama en el arranque de la aplicacion para que la biblioteca llegue por
 * detras mientras la persona esta escribiendo, sin retrasar el primer pintado.
 */
export function preloadReader(): void {
  void loadReader();
}

/** Indica si la biblioteca ya esta disponible. */
export function readerIsReady(): boolean {
  return reader !== null;
}

/** Indica si la carga se ha intentado alguna vez. */
export function readerWasAttempted(): boolean {
  return attempted;
}

/**
 * Lee un codigo de unos pixeles.
 *
 * @param pixels - Imagen plana, la que devuelve `getImageData`.
 * @param expected - Lo que deberia devolver el lector si el codigo es correcto.
 * @returns Que se ha leido, o que no se ha podido leer todavia.
 */
export function verifyPixels(pixels: ImageData, expected: string): VerifyResult {
  const current = reader;
  if (current === null) {
    // Si la carga ya fallo antes, no se reintenta sin parar: se responde que sigue
    // pendiente y la interfaz lo muestra como "sin verificar".
    if (!attempted) void loadReader();
    return { status: 'pending' };
  }

  const found = current(pixels.data, pixels.width, pixels.height);
  if (found === null) return { status: 'notFound' };
  if (found.data === expected) return { status: 'ok' };
  return { status: 'mismatch', decoded: found.data };
}

/**
 * Lee un codigo esperando a que la biblioteca este disponible.
 *
 * Se usa en los tests de extremo a extremo, donde si hay tiempo de esperar, y no
 * en la interfaz, que no debe bloquear el hilo principal.
 *
 * @returns La funcion de lectura, o `null` si no se pudo cargar nunca.
 */
export function whenReaderReady(): Promise<JsQrLike | null> {
  if (reader !== null) return Promise.resolve(reader);
  return new Promise<JsQrLike | null>((resolve) => {
    waiting = (loaded) => resolve(loaded);
    if (!attempted)
      void loadReader().then((loaded) => {
        if (loaded === null) resolve(null);
      });
  });
}
