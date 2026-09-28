/**
 * Constantes globales de Efímero.
 *
 * Todas las constantes "magicas" del proyecto viven aqui con su justificacion,
 * para que ningun numero flotante quede sin explicar en la logica de negocio.
 * Si cambias un valor de aqui, cambia el comportamiento de la app; por eso este
 * modulo no importa nada y no depende de nada.
 *
 * @packageDocumentation
 */

/** Identidad del proyecto. Se usa en titulos, nombres de archivo y metadatos. */
export const BRAND = {
  name: 'Efímero',
  /** Descriptor en texto generico. "Generador de codigos QR" NO es una marca
   *  registrable por si solo, pero incluirlo reduce la exposicion a que alguien
   *  lo registre y reclame. Usar siempre junto al nombre, nunca separado. */
  tagline: 'Generador de codigos QR estatico y abierto',
} as const;

/** Origen del proyecto. Ajusta `REPO_OWNER` a tu usuario de GitHub. */
export const REPO_OWNER = 'BRYANMN0305';
export const REPO_NAME = 'efimero';

/**
 * URLs publicas.
 *
 * `canonical` se resuelve al compilar, no se escribe aqui. Con un literal
 * apunta a un dominio que Vercel puede reasignar a otra persona en cualquier
 * momento, y eso no da ningun error: simplemente el ejemplo acabaria
 * apuntando al sitio de un tercero. Se documenta en `scripts/build-info.mjs`.
 */
export const URLS = {
  /** Direccion del sitio ya desplegada. */
  canonical: __APP_SITE_URL__,
  repo: `https://github.com/${REPO_OWNER}/${REPO_NAME}`,
  issues: `https://github.com/${REPO_OWNER}/${REPO_NAME}/issues`,
  /** Plantilla de denuncia de QR abusivo. Solo recibe un hash SHA-256 del
   *  payload, nunca el payload en si. Ver `docs/para-contribuir.md`. */
  abuseReport: `https://github.com/${REPO_OWNER}/${REPO_NAME}/issues/new?template=abuse_report.yml`,
  security: `https://github.com/${REPO_OWNER}/${REPO_NAME}/security/advisories/new`,
} as const;

/* -------------------------------------------------------------------------- */
/* Limites de entrada                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Tamaño maximo del archivo de logo, en bytes (2 MB).
 *
 * El logo se decodifica en el hilo principal; un archivo mayor bloquea la
 * interfaz mientras se decodifica. 2 MB es holgado para un PNG de 1024 px.
 */
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;

/**
 * Dimension maxima por lado del logo, en pixeles.
 *
 * Esto es un guard de decompression bomb, no una preferencia. Un PNG de
 * 30000x30000 px comprime a unos pocos MB pero al decodificar reserva
 * ~3.6 GB de memoria y cuelga la pestana. Leemos las dimensiones desde el
 * header del archivo ANTES de crear el ImageBitmap, asi que este limite se
 * aplica sin decodificar un solo pixel.
 *
 * @see {@link file:src/security/logo-intake.ts} para la lectura de headers.
 */
export const LOGO_MAX_DIMENSION = 4096;

/* -------------------------------------------------------------------------- */
/* Limites de escaneabilidad                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Limites de seguridad de escaneo.
 *
 * Los valores de cobertura de logo NO salen de la teoria sino de una medicion
 * con un detector de codigos real, barriendo niveles de cobertura y
 * decodificando cada resultado. El acantilado esta entre 16% y 20% del area
 * cubierta: el consejo repetition de "un logo puede cubrir 20-30% con ECC H"
 * esta mal medido y produce codigos que no escanean.
 *
 * Esa medicion se hizo en un render digital limpio con zona silenciosa perfecta,
 * condiciones mas generosas que cualquier impresion. Por eso el limite de
 * "seguro" esta por debajo del acantilado.
 *
 * @see {@link file:docs/architecture.md} seccion "Por que estos numeros".
 */
export const SCAN_LIMITS = {
  /* --- Presupuesto de correccion de errores, por nivel --- */
  /**
   * Fraccion de modulos que cada nivel de correccion puede reconstruir.
   *
   * Estos son los valores de la norma ISO/IEC 18004, no una estimacion. Son los
   * que hacen que la perdida de tinta del estilo se pueda medir en lugar de
   * opinarse: un rombo se come la mitad del area, y con nivel H sigue
   * leyendose, mientras que con nivel M no. El aviso sale de comparar la perdida
   * con este numero, no de un umbral fijo.
   */
  eccRecovery: {
    low: 0.07,
    medium: 0.15,
    quartile: 0.25,
    high: 0.3,
  } as Record<'low' | 'medium' | 'quartile' | 'high', number>,

  /* --- Contraste, medido como ratio WCAG entre luminancia relativa --- */
  /** Minimo comodo. Por encima de esto hay margen de sobra. */
  contrastSafe: 7,
  /** Minimo funcional. Por debajo el lector empieza a fallar. */
  contrastCaution: 4.5,
  /** Por debajo de este valor se bloquea la descarga. */
  contrastBlocked: 4.5,

  /* --- Densidad de modulos --- */
  /** Minimo de pixeles por modulo en pantalla. */
  modulePxSafe: 4,
  /** Por debajo de esto, los estilos con curva (dots, classy, barras) se
   *  fusionan visualmente y el lector ya no distingue modulos contiguos. */
  modulePxCaution: 3,
  /** Bloqueo absoluto en pantalla. */
  modulePxBlocked: 3,
  /** Tamano fisico minimo por modulo para imprenta, en milimetros. */
  moduleMmBlocked: 0.5,
  /** Recomendado para imprenta; por debajo sigue funcionando pero con menos
   *  margen frente a la degradacion del papel y la tinta. */
  moduleMmCaution: 0.75,

  /* --- Zona silenciosa (quiet zone) --- */
  /** El estandar ISO/IEC 18004 exige 4 modulos. Menos que eso y muchos lectores
   *  no encuentran el simbolo. Con estilos redondeados se recommend 6 porque la
   *  tinta se retrae hacia adentro en las curvas. */
  quietZoneCaution: 4,
  quietZoneSafe: 6,
  quietZoneBlocked: 4,
} as const;

/**
 * Formatos de export admitidos.
 *
 * JPEG esta deliberadamente ausente. La compresion JPEG introduce anillos de
 * bloques (artefactos DCT) justo en los bordes de los modulos, que es
 * precisamente la informacion de transicion que el lector usa para localizar
 * el simbolo. El resultado es un PNG que se ve perfecto y un JPEG que no
 * escanea. Ver la seccion "Por que no JPEG" de docs/architecture.md.
 */
export const EXPORT_FORMATS = ['png', 'svg'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

/** Resoluciones ofrecidas para descarga, en pixeles del lado mayor. */
export const EXPORT_SIZES = [512, 1024, 2048] as const;
