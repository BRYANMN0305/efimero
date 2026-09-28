/**
 * Punto de entrada de Efímero.
 *
 * Toda la logica de negocio vive en modulos con tests. Este archivo se limita a
 * tres cosas: leer el formulario, pintar lo que le devuelven los modulos y
 * escribir el resultado. Si aparece una regla aqui, es que deberia estar en un
 * modulo con tests al lado.
 *
 * No hay `innerHTML` con datos de usuario en ninguna parte. El contenido del
 * codigo se pinta con `textContent`. Con una CSP de `script-src 'self'` el
 * riesgo de inyeccion es bajo, pero quitarlo de raiz es mas barato que confiar
 * en que la CSP no cambie nunca.
 *
 * @module
 */

import { BRAND, EXPORT_SIZES, LOGO_MAX_BYTES, URLS } from './config';
import { BUILD_INFO } from './build-info';
import {
  buildPayload,
  describePayload,
  emptyFields,
  PAYLOAD_KINDS,
  VERBATIM_LIMIT,
  type PayloadInput,
  type PayloadKind,
  type TextFields,
} from './payload';
import {
  buildDrawList,
  countUtf8Bytes,
  createTarget,
  DEFAULT_PRESET,
  diagnose,
  ECC_LEVELS,
  encodeText,
  FINDER_SHAPES,
  MODULE_SHAPES,
  paint,
  PRESETS,
  preloadReader,
  presetById,
  readPixels,
  setLogoDataUrl,
  toSvg,
  verifyPixels,
  whenReaderReady,
  type Check,
  type Diagnosis,
  type DrawList,
  type Ecc,
  type FinderShape,
  type LogoPlacement,
  type LogoShape,
  type ModuleShape,
  type QrStyle,
  type Target,
  type VerifyResult,
} from './qr';
import { intakeBytes, isBlockedScheme } from './security';
import { formatBytes, initialLocale, storeLocale, t, type Locale, type MessageKey } from './i18n';

/* -------------------------------------------------------------------------- */
/* Utilidades de DOM                                                            */
/* -------------------------------------------------------------------------- */

/** Busca un elemento que tiene que existir, y falla ruidosamente si no. */
function el<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (found === null) throw new Error(`Falta el elemento #${id} en el documento.`);
  return found as T;
}

/** Traduce usando el idioma activo. */
function tr(key: MessageKey, params: Readonly<Record<string, string | number>> = {}): string {
  return t(state.locale, key, params);
}

/**
 * Descarta los valores nulos de una comprobacion antes de traducirla.
 *
 * `null` significa "esta comprobacion no aplica". Meterlo en un marcador
 * imprimiria la palabra "null" en pantalla, asi que se quita antes.
 */
function params(values: Readonly<Record<string, string | number | boolean | null>>): Record<string, string | number> {
  const limpio: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value !== null && typeof value !== 'boolean') limpio[key] = value;
  }
  return limpio;
}

/** Crea un elemento con texto, sin pasar por el HTML. */
function node<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  return element;
}

/** Vacia un elemento de todos sus hijos. */
function clear(element: Element): void {
  while (element.firstChild !== null) element.removeChild(element.firstChild);
}

/** Los campos del tipo activo, como objeto indexable. */
function fieldsAs(): Record<string, unknown> {
  return state.fields as unknown as Record<string, unknown>;
}

/**
 * Valor de un campo como texto.
 *
 * Los campos solo guardan cadenas o booleanos. Un booleano en un control de
 * texto daria la palabra "true", y un objeto daria "[object Object]", asi que
 * aqui solo se acepta lo que de verdad puede aparecer y lo demas se trata como
 * campo vacio.
 */
function fieldText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}

/* -------------------------------------------------------------------------- */
/* Estado                                                                       */
/* -------------------------------------------------------------------------- */

/** Un logo ya validado, cargado y listo para dibujar. */
interface LoadedLogo {
  readonly format: string;
  readonly image: HTMLImageElement;
  readonly dataUrl: string;
}

/** Todo el estado mutable de la aplicacion, en un solo sitio. */
interface State {
  locale: Locale;
  kind: PayloadKind;
  fields: PayloadInput['fields'];
  style: QrStyle;
  ecc: Ecc;
  quietZone: number;
  displayPx: number;
  printWidthMm: number;
  logo: LoadedLogo | null;
  logoSide: number;
  logoMargin: number;
  logoShape: LogoShape;
  /** Ultimo resultado de lectura, para no releer el mismo lienzo. */
  lastVerify: VerifyResult | null;
  /** Ultimo diagnostico numerico, para decidir si se puede descargar. */
  diagnosis: Diagnosis | null;
  /** Ultima lista de dibujo, para exportar sin volver a construirla. */
  list: DrawList | null;
  /** Ultimo contenido codificado: lo que el lector debe devolver. */
  encoded: string | null;
}

const state: State = {
  locale: initialLocale(),
  kind: 'texto',
  fields: initialFields(),
  style: DEFAULT_PRESET.style,
  ecc: 'medium',
  quietZone: 4,
  displayPx: 512,
  printWidthMm: 60,
  logo: null,
  logoSide: 5,
  logoMargin: 1,
  logoShape: 'rounded',
  lastVerify: null,
  diagnosis: null,
  list: null,
  encoded: null,
};

/* -------------------------------------------------------------------------- */
/* Los campos de cada tipo de contenido                                         */
/* -------------------------------------------------------------------------- */

/**
 * Contenido de partida de la pagina.
 *
 * Se abre con un ejemplo, la direccion de la propia aplicacion, y no con el
 * campo vacio. La razon es que un generador que arranca sin nada parece roto:
 * no hay lienzo, no hay diagnostico y no hay nada que ensenar. Con un ejemplo,
 * la pagina teaches sola en cuanto carga y quien llega ve que funciona.
 *
 * El ejemplo es inocuo a proposito: es la direccion del proyecto, asi que
 * escanearlo no lleva a ningun sitio raro y no se ha inventado ningun destino.
 * Para que no se confunda con algo que ha escrito la persona, el campo viene
 * seleccionado entero y el primer cambio lo sustituye.
 */
function initialFields(): TextFields {
  return { ...emptyFields('texto'), text: URLS.canonical };
}

/** Un campo del formulario, con su clave de traduccion. */
interface FieldSpec {
  /** Clave dentro del objeto de campos del tipo activo. */
  readonly name: string;
  /** Clave de la etiqueta. */
  readonly label: MessageKey;
  /** Clave del texto de ejemplo dentro del control. Sin marcadores: no cambia. */
  readonly placeholder?: MessageKey;
  /**
   * Clave de una nota viva bajo el control, que se recalcula en cada refresco.
   *
   * Es distinto del placeholder a proposito. Un placeholder desaparece en
   * cuanto se escribe, asi que no puede llevar datos: en cuanto la persona
   * teclea, deja de verse. Una nota vive al lado del campo y se actualiza sola.
   * Aqui va lo que cambia con lo que se escribe, como cuantos bytes ocupa.
   */
  readonly hint?: MessageKey;
  /** Tipo de control. */
  readonly control: 'text' | 'email' | 'tel' | 'url' | 'password' | 'textarea' | 'select' | 'checkbox';
  /** Opciones de un selector, como pares de valor y texto sin traducir. */
  readonly options?: readonly (readonly [string, MessageKey])[];
  /** Valor inicial. */
  readonly initial?: string | boolean;
  /** Sugerencia para el navegador, que mejora el relleno automatico. */
  readonly autocomplete?: 'url' | 'name' | 'organization';
}

/** Los campos de cada tipo de contenido, en el orden en que se muestran. */
const FIELDS: Readonly<Record<PayloadKind, readonly FieldSpec[]>> = {
  texto: [
    {
      name: 'text',
      label: 'field.text.label',
      placeholder: 'field.text.placeholder',
      hint: 'field.text.help',
      control: 'textarea',
      autocomplete: 'url',
    },
  ],
  wifi: [
    { name: 'ssid', label: 'field.wifi.ssid.label', placeholder: 'field.wifi.ssid.placeholder', control: 'text' },
    {
      name: 'security',
      label: 'field.wifi.security.label',
      control: 'select',
      options: [
        ['WPA', 'field.wifi.security.wpa'],
        ['WEP', 'field.wifi.security.wep'],
        ['nopass', 'field.wifi.security.open'],
      ],
      initial: 'WPA',
    },
    { name: 'password', label: 'field.wifi.password.label', control: 'password' },
    { name: 'hidden', label: 'field.wifi.hidden.label', control: 'checkbox', initial: false },
  ],
  email: [
    {
      name: 'mode',
      label: 'field.email.mode.label',
      control: 'select',
      options: [
        ['mailto', 'field.email.mode.mailto'],
        ['text', 'field.email.mode.text'],
      ],
      initial: 'mailto',
    },
    { name: 'to', label: 'field.email.to.label', placeholder: 'field.email.to.placeholder', control: 'email' },
    { name: 'subject', label: 'field.email.subject.label', placeholder: 'field.email.subject.placeholder', control: 'text' },
    { name: 'body', label: 'field.email.body.label', placeholder: 'field.email.body.placeholder', control: 'textarea' },
  ],
  sms: [
    { name: 'number', label: 'field.sms.number.label', placeholder: 'field.sms.number.placeholder', control: 'tel' },
    { name: 'message', label: 'field.sms.message.label', placeholder: 'field.sms.message.placeholder', control: 'textarea' },
  ],
  tel: [{ name: 'number', label: 'field.tel.number.label', placeholder: 'field.tel.number.placeholder', control: 'tel' }],
  vcard: [
    {
      name: 'fullName',
      label: 'field.vcard.name.label',
      placeholder: 'field.vcard.name.placeholder',
      control: 'text',
      autocomplete: 'name',
    },
    {
      name: 'organization',
      label: 'field.vcard.org.label',
      placeholder: 'field.vcard.org.placeholder',
      control: 'text',
      autocomplete: 'organization',
    },
    { name: 'jobTitle', label: 'field.vcard.title.label', placeholder: 'field.vcard.title.placeholder', control: 'text' },
    { name: 'phone', label: 'field.vcard.phone.label', placeholder: 'field.vcard.phone.placeholder', control: 'tel' },
    { name: 'email', label: 'field.vcard.email.label', placeholder: 'field.vcard.email.placeholder', control: 'email' },
    { name: 'website', label: 'field.vcard.website.label', placeholder: 'field.vcard.website.placeholder', control: 'url' },
  ],
};

/* -------------------------------------------------------------------------- */
/* Construccion de los controles                                                 */
/* -------------------------------------------------------------------------- */

/** Rellena un selector con opciones ya traducidas. */
function fillSelect(select: HTMLSelectElement, options: readonly (readonly [string, string])[]): void {
  clear(select);
  for (const [value, label] of options) {
    const option = node('option', label);
    option.value = value;
    select.append(option);
  }
}

/** Monta las pestanias de tipo de contenido. */
function buildTabs(): void {
  const tabs = el<HTMLDivElement>('pestanias');
  clear(tabs);
  for (const kind of PAYLOAD_KINDS) {
    const button = node('button', tr(`tabs.${kind}` as MessageKey));
    button.type = 'button';
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', String(kind === state.kind));
    button.addEventListener('click', () => {
      if (state.kind === kind) return;
      state.kind = kind;
      state.fields = emptyFields(kind);
      buildTabs();
      buildFieldPanel();
      refresh();
    });
    tabs.append(button);
  }
}

/**
 * Notas vivas de los campos, para poder refrescarlas sin volver a montarlos.
 *
 * Remontar el panel en cada pulsacion moveria el foco y borraria la posicion
 * del cursor, que es la peor forma de fastidiar a quien esta escribiendo. Asi
 * que el panel se monta una vez y solo se actualizan los numeros.
 */
const hintElements = new Map<string, HTMLParagraphElement>();

/**
 * Valores de los marcadores de la nota viva de un campo.
 *
 * Se calculan aqui y no en la traduccion porque son datos, no palabras: el
 * catalogo solo decide como contarlos.
 */
function hintParams(spec: FieldSpec): Record<string, string | number> {
  switch (spec.name) {
    case 'text':
      return { n: countUtf8Bytes(fieldText(fieldsAs().text)) };
    default:
      return {};
  }
}

/** Vuelca en pantalla la nota viva de un campo. */
function updateHint(spec: FieldSpec): void {
  const element = hintElements.get(spec.name);
  if (element === null || element === undefined || spec.hint === undefined) return;
  element.textContent = tr(spec.hint, hintParams(spec));
}

/** Monta los campos del tipo de contenido activo. */
function buildFieldPanel(): void {
  const panel = el<HTMLDivElement>('campos');
  clear(panel);
  hintElements.clear();

  for (const spec of FIELDS[state.kind]) {
    const wrapper = node('div');
    wrapper.className = spec.control === 'checkbox' ? 'campo interruptor' : 'campo';
    const id = `campo-${spec.name}`;
    const current = fieldsAs()[spec.name] ?? spec.initial ?? '';

    if (spec.control === 'checkbox') {
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.id = id;
      input.checked = Boolean(current);
      input.addEventListener('change', () => {
        fieldsAs()[spec.name] = input.checked;
        refresh();
      });
      const label = node('label', tr(spec.label));
      label.htmlFor = id;
      wrapper.append(input, label);
      panel.append(wrapper);
      continue;
    }

    const label = node('label', tr(spec.label));
    label.htmlFor = id;
    let field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

    if (spec.control === 'select') {
      const select = document.createElement('select');
      select.id = id;
      fillSelect(
        select,
        (spec.options ?? []).map(([value, key]) => [value, tr(key)]),
      );
      select.value = fieldText(current);
      select.addEventListener('change', () => {
        fieldsAs()[spec.name] = select.value;
        refresh();
      });
      field = select;
    } else if (spec.control === 'textarea') {
      const area = document.createElement('textarea');
      area.id = id;
      area.value = fieldText(current);
      area.spellcheck = false;
      if (spec.placeholder !== undefined) area.placeholder = tr(spec.placeholder);
      area.addEventListener('input', () => {
        fieldsAs()[spec.name] = area.value;
        refresh();
      });
      field = area;
    } else {
      const input = document.createElement('input');
      input.id = id;
      input.type = spec.control;
      input.value = fieldText(current);
      // Se asigna como atributo y no como propiedad: la biblioteca de tipos de
      // TypeScript declara `autocomplete` con la forma de un nombre de seccion,
      // que no es lo que significa aqui. El valor de la especificacion es texto libre.
      if (spec.autocomplete !== undefined) input.setAttribute('autocomplete', spec.autocomplete);
      if (spec.placeholder !== undefined) input.placeholder = tr(spec.placeholder);
      input.addEventListener('input', () => {
        fieldsAs()[spec.name] = input.value;
        refresh();
      });
      field = input;
    }

    wrapper.append(label, field);
    if (spec.hint !== undefined) {
      const nota = node('p', '');
      nota.className = 'nota-campo';
      hintElements.set(spec.name, nota);
      wrapper.append(nota);
      updateHint(spec);
    }
    panel.append(wrapper);
  }

  el('pista').textContent = tr(`hint.${state.kind}` as MessageKey);
}

/** Monta los selectores de estilo y opciones. */
function buildStyleControls(): void {
  const preset = el<HTMLSelectElement>('preajuste');
  fillSelect(
    preset,
    PRESETS.map((item) => [item.id, tr(`style.preset.${item.id}` as MessageKey)]),
  );
  preset.value = DEFAULT_PRESET.id;
  preset.addEventListener('change', () => {
    state.style = presetById(preset.value).style;
    applyStyleToControls();
    refresh();
  });

  fillSelect(
    el<HTMLSelectElement>('forma-modulos'),
    MODULE_SHAPES.map((shape) => [shape, tr(`style.modules.${shape}` as MessageKey)]),
  );
  fillSelect(
    el<HTMLSelectElement>('forma-localizadores'),
    FINDER_SHAPES.map((shape) => [shape, tr(`style.finders.${shape}` as MessageKey)]),
  );
  fillSelect(
    el<HTMLSelectElement>('correccion'),
    ECC_LEVELS.map((level) => [level, tr(`options.ecc.${level[0]}` as MessageKey)]),
  );
  fillSelect(
    el<HTMLSelectElement>('tamano-visualizacion'),
    EXPORT_SIZES.map((size) => [String(size), `${size} px`]),
  );
  fillSelect(
    el<HTMLSelectElement>('logo-forma'),
    (
      [
        ['none', 'logo.shape.rect'],
        ['plain', 'logo.shape.rect'],
        ['rounded', 'logo.shape.rounded'],
        ['circle', 'logo.shape.circle'],
      ] as const
    ).map(([value, key]) => [value, tr(key)]),
  );
  applyStyleToControls();
}

/** Refleja el estilo del estado en los controles que lo editan. */
function applyStyleToControls(): void {
  el<HTMLInputElement>('color-texto').value = state.style.foreground;
  el<HTMLInputElement>('color-fondo').value = state.style.background;
  el<HTMLSelectElement>('forma-modulos').value = state.style.module;
  el<HTMLSelectElement>('forma-localizadores').value = state.style.finder;
}

/* -------------------------------------------------------------------------- */
/* Vista previa del contenido exacto                                            */
/* -------------------------------------------------------------------------- */

/**
 * Pinta el contenido literal del codigo.
 *
 * No califica el enlace. Un detector de phishing se equivoca en las dos
 * direcciones, y uno que marca sitios de verdad hace que la gente deje de mirar
 * los avisos. Lo que si funciona es la visibilidad: el telefono abre lo que
 * este codigo lleva, asi que se enseña entero, con el esquema a la vista y sin
 * adornos. Quien comparte es quien puede juzgar.
 */
function renderVerbatim(): void {
  const output = el<HTMLOutputElement>('que-texto');
  const aviso = el<HTMLParagraphElement>('que-aviso');
  const nota = el<HTMLParagraphElement>('que-nota');
  clear(output);
  aviso.hidden = true;
  nota.hidden = true;

  const raw = fieldText(fieldsAs().text).trim();
  if (state.kind !== 'texto' || raw === '') {
    output.textContent = tr('preview.verbatimEmpty');
    return;
  }

  const preview = describePayload(raw);
  if (preview.isLink) {
    // Solo se separa el esquema cuando de verdad hay algo delante. En un texto
    // suelto no hay esquema que destacar, y anteponer un dos puntos sin nada
    // delante seria cambiar lo que la persona escribio.
    //
    // Detras del esquema va el texto TAL CUAL, no lo troceado. `preview.rest`
    // es solo la ruta: el host se guarda aparte para poder resaltar el dominio,
    // y usarlo aqui dejaria la URL a la vista como "https: /qr", que no es lo
    // que se va a escanear.
    const scheme = node('span', `${preview.scheme}:`);
    scheme.className = 'esquema';
    const cuerpo = node('span', preview.verbatim.slice(preview.scheme.length + 1));
    output.append(scheme, cuerpo);
  } else {
    output.append(node('span', preview.verbatim));
  }

  if (preview.schemeIsDangerous) {
    aviso.textContent = tr('preview.dangerousScheme', { scheme: preview.scheme });
    aviso.hidden = false;
  }

  if (!preview.isShortEnoughToShowWhole) {
    nota.textContent = tr('preview.truncated', { shown: VERBATIM_LIMIT, total: preview.length });
    nota.hidden = false;
  }
}

/* -------------------------------------------------------------------------- */
/* Diagnostico                                                                  */
/* -------------------------------------------------------------------------- */

/** Texto de una comprobacion, con sus numeros ya dentro. */
function checkText(check: Check): string {
  const v = params(check.values);
  switch (check.id) {
    case 'contrast':
      return check.values.inverted === true
        ? tr('safety.check.contrast.inverted')
        : tr(check.warning ? 'safety.check.contrast' : 'safety.check.contrast.detail', v);
    case 'moduleSize':
      return [
        tr(check.warning ? 'safety.check.moduleSize.tooSmall' : 'safety.check.moduleSize.detail', v),
        tr(
          Number(check.values.mm) < Number(v.minMm) ? 'safety.check.moduleSize.printTooSmall' : 'safety.check.moduleSize.print',
          v,
        ),
      ].join(' ');
    case 'quietZone':
      return tr(check.ok ? 'safety.check.quietZone.detail' : 'safety.check.quietZone.tooSmall', v);
    case 'inkLoss':
      return tr('safety.check.inkLoss.detail', v);
    case 'logoArea':
      return tr('safety.check.logoArea.detail', v);
    case 'finderClearance':
      if (check.values.modules === null) return '';
      return tr(check.ok ? 'safety.check.finderClearance.detail' : 'safety.check.finderClearance.violated', v);
    default:
      return '';
  }
}

function renderDiagnosis(diagnosis: Diagnosis): void {
  const banner = el<HTMLParagraphElement>('veredicto');
  banner.dataset.nivel = diagnosis.verdict;
  banner.textContent = tr(`safety.level.${diagnosis.verdict}` as MessageKey);

  const list = el<HTMLUListElement>('comprobaciones');
  clear(list);
  for (const check of diagnosis.checks) {
    const item = node('li');
    item.dataset.tipo = check.ok ? (check.warning ? 'aviso' : 'ok') : 'fallo';

    const mark = node('span', check.ok ? (check.warning ? '!' : 'OK') : 'X');
    mark.className = 'marca-estado';
    mark.setAttribute('aria-hidden', 'true');

    const body = node('span');
    body.append(node('strong', tr(`safety.check.${check.id}` as MessageKey)));
    const detail = checkText(check);
    if (detail !== '') {
      const small = node('span', detail);
      small.className = 'detalle';
      body.append(node('br'), small);
    }
    item.append(mark, body);
    list.append(item);
  }
}

/* -------------------------------------------------------------------------- */
/* Verificacion de lectura                                                      */
/* -------------------------------------------------------------------------- */

/** Vuelca el resultado de la verificacion en el texto de estado. */
function renderVerifyStatus(result: VerifyResult): void {
  const status = el<HTMLParagraphElement>('estado');
  if (result.status === 'ok') {
    status.textContent = tr('status.readable');
    status.dataset.tono = 'ok';
  } else if (result.status === 'pending') {
    status.textContent = tr('status.verifying');
    status.dataset.tono = 'aviso';
  } else if (result.status === 'notFound') {
    status.textContent = tr('status.notFound');
    status.dataset.tono = 'aviso';
  } else {
    status.textContent = tr('status.mismatch');
    status.dataset.tono = 'peligro';
  }
}

/** Lee el lienzo con jsQR si la biblioteca ya esta disponible. */
function runVerification(): void {
  const canvas = el<HTMLCanvasElement>('lienzo');
  const { encoded } = state;
  if (encoded === null || canvas.hidden) return;

  const result = verifyPixels(readPixels({ canvas, context: ctxOf(canvas) }), encoded);
  state.lastVerify = result;
  renderVerifyStatus(result);
  updateDownloadGate();
}

/** Contexto 2D del lienzo de pantalla, comprobando que exista. */
function ctxOf(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d');
  if (context === null) throw new Error('Este navegador no admite un contexto de lienzo 2D.');
  return context;
}

/* -------------------------------------------------------------------------- */
/* Ciclo principal                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Activa o desactiva los botones de descarga.
 *
 * Bloquea en dos casos, y solo en dos. El primero es que no haya nada que
 * descargar: faltan campos, o el contenido esta prohibido. Ese bloqueo es
 * duro, y tiene que serlo, porque en el caso del esquema peligroso reactiva los
 * botones al vaciar el estado y dejaria descargar justo lo que se prohibe.
 *
 * El segundo es el diagnostico numerico: contraste insuficiente, modulo
 * imposible de imprimir, zona silenciosa corta, logo encima de un localizador.
 * Eso no depende de quien lea el codigo, asi que se puede decidir aqui.
 *
 * Lo que NO bloquea es que la lectura automatica falle. Los estilos con barras
 * y el rombo son legibles para muchas camaras pero jsQR no los reconoce, asi que
 * bloquear por eso deja fuera de uso la mitad de los estilos sin que el codigo
 * este realmente roto. Ahi se avisa con todas sus letras y se deja descargar:
 * quien elige un estilo decorativo es quien sabe si le sirve para su caso.
 */
function updateDownloadGate(): void {
  const vacio = state.list === null || state.encoded === null;
  const bloqueado = vacio || state.diagnosis?.verdict === 'blocked';
  for (const id of ['descargar-png', 'descargar-svg']) {
    el<HTMLButtonElement>(id).disabled = bloqueado;
  }
}

/** Deja el resultado en blanco, con el motivo en el texto de estado. */
function blank(messageKey: MessageKey): void {
  state.list = null;
  state.encoded = null;
  state.lastVerify = null;
  el<HTMLCanvasElement>('lienzo').hidden = true;
  clear(el<HTMLUListElement>('comprobaciones'));
  el<HTMLParagraphElement>('veredicto').textContent = '';
  el<HTMLParagraphElement>('veredicto').removeAttribute('data-nivel');
  el<HTMLParagraphElement>('estado').textContent = tr(messageKey);
  el<HTMLParagraphElement>('estado').dataset.tono = 'aviso';
  state.diagnosis = null;
  updateDownloadGate();
  renderVerbatim();
}

/**
 * Vuelve a pintar todo a partir del estado, como mucho una vez por fotograma.
 *
 * Codificar, pintar y comprobar con jsQR son trabajo caro, y cada tecla los
 * dispara. Con `requestAnimationFrame` se agrupan las pulsaciones seguidas en
 * una sola pasada: quien escribe deprisa genera un codigo, no cuarenta. Un
 * fotograma es 16 ms, por debajo de lo que se nota, asi que no parece un
 * retardo.
 */
let frame: number | null = null;

function refresh(): void {
  if (frame !== null) return;
  frame = requestAnimationFrame(() => {
    frame = null;
    renderNow();
  });
}

/** Trabajo real de `refresh`, separado para poder agrupar las llamadas. */
function renderNow(): void {
  const canvas = el<HTMLCanvasElement>('lienzo');
  const result = buildPayload({ kind: state.kind, fields: state.fields } as PayloadInput);

  if (!result.ok) {
    el<HTMLDivElement>('bloqueo').hidden = true;
    blank('status.incomplete');
    return;
  }

  const payload = result.payload;

  // El unico bloqueo: un esquema que ejecuta codigo en el telefono de quien
  // escanea. No hay avisos heuristicos, y el motivo esta escrito en el aviso.
  if (isBlockedScheme(payload)) {
    el<HTMLDivElement>('bloqueo').hidden = false;
    blank('status.blocked');
    return;
  }
  el<HTMLDivElement>('bloqueo').hidden = true;

  let encoded: ReturnType<typeof encodeText>;
  try {
    encoded = encodeText(payload, state.ecc);
  } catch (error) {
    canvas.hidden = true;
    state.diagnosis = null;
    updateDownloadGate();
    el<HTMLParagraphElement>('estado').textContent = error instanceof Error ? error.message : tr('status.tooLong');
    el<HTMLParagraphElement>('estado').dataset.tono = 'peligro';
    renderVerbatim();
    return;
  }

  const logo: LogoPlacement | null =
    state.logo === null
      ? null
      : { side: state.logoSide, margin: state.logoMargin, shape: state.logoShape, image: state.logo.image };

  const list = buildDrawList(encoded, state.style, state.quietZone, logo);
  state.list = list;
  state.encoded = payload;
  state.lastVerify = null;
  setLogoDataUrl(state.logo?.dataUrl ?? '');

  const scale = state.displayPx / list.side;
  const context = ctxOf(canvas);
  canvas.width = state.displayPx;
  canvas.height = state.displayPx;
  canvas.hidden = false;
  paint({ canvas, context }, list, state.style, scale, quietOffset(list, scale));
  canvas.setAttribute('aria-label', tr('preview.canvasLabel', { style: el<HTMLSelectElement>('preajuste').value }));

  const diagnosis = diagnose(
    list,
    state.style.foreground,
    state.style.background,
    state.displayPx,
    state.printWidthMm,
    state.ecc,
    state.logoMargin,
  );
  state.diagnosis = diagnosis;
  renderDiagnosis(diagnosis);

  el<HTMLParagraphElement>('estado').textContent = tr(encoded.hasEci ? 'status.ready' : 'status.readyAscii', {
    version: encoded.version,
    bytes: encoded.isBinary ? '—' : new TextEncoder().encode(payload).length,
    ecc: encoded.ecc,
  });
  el<HTMLParagraphElement>('estado').dataset.tono = '';

  for (const spec of FIELDS[state.kind]) updateHint(spec);
  renderVerbatim();
  runVerification();
  updateDownloadGate();
}

/* -------------------------------------------------------------------------- */
/* Exportacion                                                                  */
/* -------------------------------------------------------------------------- */

/** Lanza la descarga de un archivo generado en memoria. */
function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = node('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

/** Nombre de archivo con el tipo de contenido, el preajuste y la extension. */
function fileName(extension: string): string {
  const preset = el<HTMLSelectElement>('preajuste').value;
  return `${tr('export.filename', { kind: state.kind, preset })}.${extension}`;
}

/**
 * Desplazamiento del origen, en pixeles, para un tamaño de módulo dado.
 *
 * La lista de dibujo coloca el fondo en `-quietZone`, en módulos, para que el
 * código quede centrado con la zona silenciosa a ambos lados. El lienzo empieza
 * en 0, así que hay que trasladar el origen esa misma cantidad o el fondo se
 * sale por la izquierda y arriba y deja sin pintar la última zona silenciosa, a
 * la derecha y abajo. Con el fondo sin pintar, el PNG sale con el borde
 * transparente, que se ve negro en cualquier visor.
 */
function quietOffset(list: DrawList, scale: number): number {
  return list.quietZone * scale;
}

/** Dibuja el codigo del tamaño pedido y devuelve el lienzo. */
function renderAtSize(size: number): Target {
  const { list, encoded } = state;
  if (list === null || encoded === null) throw new Error(tr('export.failed'));
  const target = createTarget(size);
  const scale = size / list.side;
  paint(target, list, state.style, scale, quietOffset(list, scale));
  return target;
}

function exportPng(): void {
  const status = el<HTMLParagraphElement>('estado-descarga');
  try {
    status.textContent = tr('export.preparing');
    const target = renderAtSize(Math.max(...EXPORT_SIZES));
    target.canvas.toBlob((blob) => {
      if (blob === null) {
        status.textContent = tr('export.failed');
        return;
      }
      download(blob, fileName('png'));
      status.textContent = '';
    }, 'image/png');
  } catch {
    status.textContent = tr('export.failed');
  }
}

function exportSvg(): void {
  const status = el<HTMLParagraphElement>('estado-descarga');
  const { list } = state;
  if (list === null) {
    status.textContent = tr('export.failed');
    return;
  }
  setLogoDataUrl(state.logo?.dataUrl ?? '');
  download(new Blob([toSvg(list, state.style, 8, BRAND.name)], { type: 'image/svg+xml;charset=utf-8' }), fileName('svg'));
  status.textContent = '';
}

/* -------------------------------------------------------------------------- */
/* Logo                                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Codifica bytes en base64.
 *
 * `btoa` solo acepta latin1 y no admite millones de argumentos, asi que se
 * trocea: un logo llega a 2 MiB y pasarlo entero de golpe revienta la pila.
 */
function bytesToBase64(bytes: Uint8Array): string {
  const chunk = 0x8000;
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
  }
  return btoa(binary);
}

/**
 * Carga una imagen elegida por la persona y la deja lista para dibujar.
 *
 * El intake va antes de decodificar a proposito: asi se descarta un archivo que
 * no sea una imagen admitida con la extension, sin llegar a crear un objeto de
 * imagen que despues no se podria pintar.
 */
async function loadLogo(file: File): Promise<void> {
  const error = el<HTMLParagraphElement>('logo-error');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const intake = intakeBytes(bytes);

  if (!intake.ok) {
    error.textContent = tr(`logo.error.${intake.reason}` as MessageKey);
    error.hidden = false;
    el<HTMLDivElement>('logo-controles').hidden = true;
    return;
  }

  // El data URL lleva el tipo de medio que ha validado el intake, y no el que
  // declara el archivo. Da igual: un PNG renombrado a .jpg sigue siendo un PNG,
  // y un SVG con un `type` de texto sigue siendo un SVG. Ademas hace falta el
  // data URL y no una URL de blob porque el SVG que se descarga tiene que ser
  // autonomo y abrirse sin conexion, y una URL de blob solo vive en la pestana
  // que la creo.
  const dataUrl = `data:${intake.format};base64,${bytesToBase64(bytes)}`;
  const image = new Image();
  image.src = dataUrl;
  try {
    await image.decode();
  } catch {
    error.textContent = tr('logo.error.corrupt');
    error.hidden = false;
    return;
  }

  error.hidden = true;
  state.logo = { format: intake.format, image, dataUrl };
  el<HTMLDivElement>('logo-controles').hidden = false;
  refresh();
}

/* -------------------------------------------------------------------------- */
/* Textos fijos, tema y pie                                                     */
/* -------------------------------------------------------------------------- */

/** Etiquetas que se reapuntan al regenerar el formulario. */
const LABELS: readonly (readonly [string, MessageKey])[] = [
  ['preajuste', 'style.preset.classic'],
  ['color-texto', 'style.color.foreground'],
  ['color-fondo', 'style.color.background'],
  ['forma-modulos', 'style.modules.label'],
  ['forma-localizadores', 'style.finders.label'],
  ['correccion', 'options.ecc.label'],
  ['zona-silenciosa', 'style.quiet.label'],
  ['tamano-visualizacion', 'options.size.label'],
  ['ancho-impresion', 'options.printWidth.label'],
  ['logo-archivo', 'logo.file'],
  ['logo-lado', 'logo.size'],
  ['logo-margen', 'logo.margin'],
  ['logo-forma', 'logo.shape'],
  ['logo-quitar', 'logo.remove'],
];

/** Vuelca los textos que no dependen del estado. */
function renderStaticText(): void {
  el('marca-nombre').textContent = BRAND.name;
  el('marca-lema').textContent = tr('brand.tagline');
  el('hero-titulo').textContent = tr('brand.heroTitle');
  el('hero-descripcion').textContent = tr('brand.heroSubtitle');
  el('distintivo-abierto').textContent = tr('badge.openSource');
  el('distintivo-sin-servidor').textContent = tr('badge.noServer');
  el('distintivo-sin-cuenta').textContent = tr('badge.noAccount');
  el('distintivo-sin-caducidad').textContent = tr('badge.noExpiry');
  el('distintivo-offline').textContent = tr('badge.worksOffline');

  el('que-contiene-titulo').textContent = tr('preview.verbatim');
  el('titulo-seguridad').textContent = tr('safety.label');
  el('titulo-estilo').textContent = tr('style.region');
  el('titulo-opciones').textContent = tr('options.label');
  el('titulo-logo').textContent = tr('logo.label');
  el('titulo-vista').textContent = tr('preview.label');
  el('titulo-faq').textContent = tr('faq.title');
  el('pie-nombre').textContent = BRAND.name;
  el('pie-titulo').textContent = tr('footer.ctaTitle');
  el('pie-sub').textContent = tr('footer.ctaBody');
  el('pie-boton').textContent = tr('footer.ctaButton');
  el('titulo-contenido').textContent = tr('form.region');
  el('logo-ayuda').textContent = tr('logo.formats', { size: formatBytes(state.locale, LOGO_MAX_BYTES) });
  el('bloqueo-titulo').textContent = tr('security.blocked.title');
  el('bloqueo-esquema').textContent = tr('security.blocked.scheme');
  el('bloqueo-cuerpo').textContent = tr('security.blocked.body');
  el('bloqueo-consejo').textContent = tr('security.blocked.advice');
  el('pie-texto').textContent = tr('footer.builtWith');

  const faq = el<HTMLDivElement>('faq');
  clear(faq);
  for (let index = 1; index <= 8; index++) {
    const details = node('details');
    details.append(node('summary', tr(`faq.q${index}` as MessageKey)), node('p', tr(`faq.a${index}` as MessageKey)));
    faq.append(details);
  }

  /*
   * Cada enlace lleva su texto del catalogo, no el que hay escrito en el HTML.
   *
   * Antes el HTML traia las etiquetas en espanol y aqui solo se les ponia el
   * `href`, con lo que al cambiar de idioma el pie seguia diciendo "Codigo",
   * "Problemas" y "Licencia MIT" en las dos paginas. El texto va con la URL en
   * la misma tupla para que no se puedan volver a separar.
   */
  const enlaces: readonly (readonly [string, MessageKey, string])[] = [
    ['enlace-codigo', 'footer.source', URLS.repo],
    ['enlace-problemas', 'footer.issues', URLS.issues],
    ['enlace-seguridad', 'footer.security', URLS.security],
    ['enlace-abuso', 'footer.report', URLS.abuseReport],
    ['enlace-licencia', 'footer.license', `${URLS.repo}/blob/main/LICENSE`],
    ['enlace-privacidad', 'footer.privacy', `${URLS.repo}/blob/main/PRIVACY.md`],
    ['enlace-terceros', 'footer.thirdParty', `${URLS.repo}/blob/main/THIRD_PARTY_NOTICES.md`],
  ];
  for (const [id, key, href] of enlaces) {
    const enlace = el<HTMLAnchorElement>(id);
    enlace.href = href;
    enlace.textContent = tr(key);
  }

  el('pie-version').textContent = tr('footer.version', { version: BUILD_INFO.version });
  renderHelp();
}

/**
 * Rellena las ayudas de las tarjetas.
 *
 * El boton `?` de cada panel no necesita JavaScript para abrirse: aparece con
 * `:hover` y, al hacer clic, el boton recibe el foco y se muestra con `:focus`.
 * Aqui solo se pone el texto, que cambia con el idioma, y el nombre accesible
 * del boton, que de otro modo seria solo un interrogante.
 */
function renderHelp(): void {
  const secciones = ['contenido', 'estilo', 'opciones', 'logo', 'vista', 'seguridad'];
  for (const seccion of secciones) {
    el(`ayuda-${seccion}`).textContent = tr(`help.${seccion}` as MessageKey);
  }
  const nombre = tr('help.label');
  for (const boton of document.querySelectorAll<HTMLButtonElement>('.ayuda-boton')) {
    boton.setAttribute('aria-label', nombre);
  }
}

/** Cambia el idioma de toda la pagina. */
function applyLocale(): void {
  document.documentElement.lang = state.locale;
  for (const id of ['idioma-es', 'idioma-en']) {
    el<HTMLButtonElement>(id).setAttribute(
      'aria-pressed',
      String((el<HTMLButtonElement>(id).dataset.locale ?? 'es') === state.locale),
    );
  }

  renderStaticText();
  buildTabs();
  buildFieldPanel();
  for (const [id, key] of LABELS) {
    const label = document.querySelector<HTMLLabelElement>(`label[for="${id}"]`);
    if (label !== null) label.textContent = tr(key);
  }
  el<HTMLButtonElement>('descargar-png').textContent = tr('preview.download');
  el<HTMLButtonElement>('descargar-svg').textContent = tr('preview.downloadSvg');
  el<HTMLParagraphElement>('estado-descarga').textContent = '';
  refresh();
}

/* -------------------------------------------------------------------------- */
/* Arranque                                                                     */
/* -------------------------------------------------------------------------- */

function wire(): void {
  buildStyleControls();

  el<HTMLInputElement>('color-texto').addEventListener('input', (event) => {
    state.style = { ...state.style, foreground: (event.target as HTMLInputElement).value };
    refresh();
  });
  el<HTMLInputElement>('color-fondo').addEventListener('input', (event) => {
    state.style = { ...state.style, background: (event.target as HTMLInputElement).value };
    refresh();
  });
  el<HTMLSelectElement>('forma-modulos').addEventListener('change', (event) => {
    state.style = { ...state.style, module: (event.target as HTMLSelectElement).value as ModuleShape };
    refresh();
  });
  el<HTMLSelectElement>('forma-localizadores').addEventListener('change', (event) => {
    state.style = { ...state.style, finder: (event.target as HTMLSelectElement).value as FinderShape };
    refresh();
  });
  el<HTMLSelectElement>('correccion').addEventListener('change', (event) => {
    state.ecc = (event.target as HTMLSelectElement).value as Ecc;
    refresh();
  });
  el<HTMLInputElement>('zona-silenciosa').addEventListener('input', (event) => {
    const value = Number.parseInt((event.target as HTMLInputElement).value, 10);
    if (Number.isFinite(value)) {
      state.quietZone = Math.max(0, Math.min(8, value));
      refresh();
    }
  });
  el<HTMLSelectElement>('tamano-visualizacion').addEventListener('change', (event) => {
    state.displayPx = Number.parseInt((event.target as HTMLSelectElement).value, 10);
    refresh();
  });
  el<HTMLInputElement>('ancho-impresion').addEventListener('input', (event) => {
    const value = Number.parseFloat((event.target as HTMLInputElement).value);
    if (Number.isFinite(value) && value > 0) {
      state.printWidthMm = value;
      refresh();
    }
  });

  el<HTMLInputElement>('logo-archivo').addEventListener('change', (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file !== undefined) void loadLogo(file);
  });
  el<HTMLInputElement>('logo-lado').addEventListener('input', (event) => {
    state.logoSide = Number.parseInt((event.target as HTMLInputElement).value, 10);
    refresh();
  });
  el<HTMLInputElement>('logo-margen').addEventListener('input', (event) => {
    state.logoMargin = Number.parseInt((event.target as HTMLInputElement).value, 10);
    refresh();
  });
  el<HTMLSelectElement>('logo-forma').addEventListener('change', (event) => {
    state.logoShape = (event.target as HTMLSelectElement).value as LogoShape;
    refresh();
  });
  el<HTMLButtonElement>('logo-quitar').addEventListener('click', () => {
    state.logo = null;
    el<HTMLDivElement>('logo-controles').hidden = true;
    el<HTMLInputElement>('logo-archivo').value = '';
    refresh();
  });

  el<HTMLButtonElement>('descargar-png').addEventListener('click', exportPng);
  el<HTMLButtonElement>('descargar-svg').addEventListener('click', exportSvg);

  for (const id of ['idioma-es', 'idioma-en']) {
    el<HTMLButtonElement>(id).addEventListener('click', () => {
      const next = (el<HTMLButtonElement>(id).dataset.locale ?? 'es') as Locale;
      if (next === state.locale) return;
      state.locale = next;
      storeLocale(next);
      applyLocale();
    });
  }
}

function start(): void {
  state.locale = initialLocale();
  wire();
  applyLocale();

  /*
   * Escape cierra el tooltip aunque el raton siga encima del boton.
   *
   * Con solo quitar el foco no basta: al abrirlo con un clic el puntero queda
   * sobre el boton, asi que `:hover` lo volveria a mostrar al instante y Escape
   * no pareceria hacer nada. Se marca la ayuda como descartada y se quita
   * cuando el raton sale, que es cuando vuelve a poder abrirse.
   */
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const abierto = document.activeElement;
    if (abierto instanceof HTMLElement && abierto.classList.contains('ayuda-boton')) abierto.blur();
    for (const ayuda of document.querySelectorAll<HTMLElement>('.ayuda')) {
      ayuda.dataset.oculto = 'true';
    }
  });

  for (const ayuda of document.querySelectorAll<HTMLElement>('.ayuda')) {
    ayuda.addEventListener('pointerleave', () => {
      delete ayuda.dataset.oculto;
    });
  }

  // jsQR entra en segundo plano: no se espera, porque quien esta escribiendo no
  // tiene por que pagar 40 KB hasta que de verdad quiera verificar.
  preloadReader();
  void whenReaderReady().then(() => {
    if (state.lastVerify?.status === 'pending') {
      state.lastVerify = null;
      runVerification();
    }
  });
}

start();
