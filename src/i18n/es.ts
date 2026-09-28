/**
 * Mensajes en espanol. Este archivo es la FUENTE DE VERDAD del proyecto.
 *
 * El tipo `MessageKey` se deriva de las claves de aqui, y `en.ts` esta
 * obligado a declarar exactamente el mismo conjunto (`Record<MessageKey,string>`).
 * Consecuencia: si agregas una cadena aqui y no la agregas en `en.ts`,
 * `npm run typecheck` falla. No hace falta ningun script para detectarlo.
 *
 * Convencion de claves: `<dominio>.<seccion>.<elemento>` en camelCase, mas
 * `<dominio>.<seccion>.<elemento>.<variante>` cuando hace falta una variante.
 *
 * Idiomas: el default es espanol porque la herramienta esta disenada para el
 * mercado hispanohablante (los ejemplos de telefono usan prefijo +52). La
 * deteccion en `src/i18n/index.ts` respeta la preferencia del navegador.
 *
 * @packageDocumentation
 */

/** Mensajes en espanol (idioma por defecto). */
export const es = {
  /* ---------------------------------------------------------------------- */
  /* Marca                                                                  */
  /* ---------------------------------------------------------------------- */
  'brand.tagline': 'Códigos QR para tu marca, que no caducan',
  'brand.heroTitle': 'Códigos QR que se leen a la primera',
  'brand.heroSubtitle':
    'Personaliza el color, la forma y el logo, y comprueba que se va a leer antes de imprimirlo. Sin cuentas, sin servidor y sin enviar nada.',
  'badge.openSource': 'Código abierto · MIT',
  'badge.noServer': 'Cero servidores',
  'badge.noAccount': 'Sin registro',
  'badge.noExpiry': 'No caduca nunca',
  'badge.worksOffline': 'Funciona sin internet',

  /* ---------------------------------------------------------------------- */
  /* Navegacion por pestanas                                                */
  /* ---------------------------------------------------------------------- */
  'tabs.label': 'Tipo de contenido',
  'tabs.texto': 'Texto o enlace',
  'tabs.wifi': 'WiFi',
  'tabs.email': 'Correo',
  'tabs.sms': 'SMS',
  'tabs.tel': 'Teléfono',
  'tabs.vcard': 'Contacto',

  /* ---------------------------------------------------------------------- */
  /* Formulario                                                             */
  /* ---------------------------------------------------------------------- */
  'form.region': 'Contenido',
  'hint.texto':
    'Se muestra tal cual al escanear. Si incluyes un enlace con https://, el teléfono ofrecerá abrirlo; si escribes una dirección de correo, puede sugerir redactarla.',
  'hint.wifi': 'Al escanear, el teléfono se conecta a la red sin que tengas que escribir la contraseña.',
  'hint.email':
    'Con «Abrir la app de correo» el teléfono abre su app con el destinatario listo. Con «Solo mostrar» verás la dirección como texto plano.',
  'hint.sms': 'Al escanear, el teléfono abre Mensajes con el número y el texto ya escritos, listos para enviar.',
  'hint.tel': 'Al escanear, el teléfono ofrecerá iniciar una llamada a ese número.',
  'hint.vcard': 'Al escanear, el teléfono muestra la tarjeta de contacto con un botón para guardarla en la agenda.',

  'field.text.label': 'Texto o enlace',
  'field.text.placeholder': 'https://ejemplo.com o cualquier texto',
  'field.text.help': 'Ocupa {n} bytes al codificarse en UTF-8.',

  'field.wifi.ssid.label': 'Nombre de la red (SSID)',
  'field.wifi.ssid.placeholder': 'MiRed_WiFi',
  'field.wifi.password.label': 'Contraseña',
  'field.wifi.security.label': 'Seguridad',
  'field.wifi.security.wpa': 'WPA, WPA2 o WPA3',
  'field.wifi.security.wep': 'WEP',
  'field.wifi.security.open': 'Sin contraseña (red abierta)',
  'field.wifi.hidden.label': 'Red oculta',

  'field.email.mode.label': 'Comportamiento al escanear',
  'field.email.mode.mailto': 'Abrir la app de correo para redactar',
  'field.email.mode.text': 'Solo mostrar la dirección, sin acción',
  'field.email.to.label': 'Destinatario',
  'field.email.to.placeholder': 'correo@ejemplo.com',
  'field.email.subject.label': 'Asunto (opcional)',
  'field.email.subject.placeholder': 'Asunto del correo',
  'field.email.body.label': 'Mensaje (opcional)',
  'field.email.body.placeholder': 'Cuerpo del correo',

  'field.sms.number.label': 'Número de teléfono',
  'field.sms.number.placeholder': '+52 55 1234 5678',
  'field.sms.message.label': 'Mensaje (opcional)',
  'field.sms.message.placeholder': 'Texto prellenado del SMS',

  'field.tel.number.label': 'Número de teléfono',
  'field.tel.number.placeholder': '+52 55 1234 5678',

  'field.vcard.name.label': 'Nombre completo',
  'field.vcard.name.placeholder': 'Ana López García',
  'field.vcard.org.label': 'Organización (opcional)',
  'field.vcard.org.placeholder': 'Empresa S.A. de C.V.',
  'field.vcard.title.label': 'Cargo (opcional)',
  'field.vcard.title.placeholder': 'Gerente de ventas',
  'field.vcard.phone.label': 'Teléfono (opcional)',
  'field.vcard.phone.placeholder': '+52 55 1234 5678',
  'field.vcard.email.label': 'Correo (opcional)',
  'field.vcard.email.placeholder': 'ana@empresa.com',
  'field.vcard.website.label': 'Sitio web (opcional)',
  'field.vcard.website.placeholder': 'https://empresa.com',

  /* ---------------------------------------------------------------------- */
  /* Opciones tecnicas                                                      */
  /* ---------------------------------------------------------------------- */
  'options.label': 'Opciones del código',
  'options.ecc.label': 'Corrección de errores',
  'options.ecc.l': 'Baja (L), la que más texto admite',
  'options.ecc.m': 'Media (M), recomendada',
  'options.ecc.q': 'Alta (Q)',
  'options.ecc.h': 'Máxima (H), la más robusta',
  'options.ecc.help':
    'Define cuánta información puede perderse sin que el código deje de escanear. Un código con logo necesita nivel H: es el único con presupuesto suficiente para cubrir el centro.',
  'options.size.label': 'Tamaño de descarga',
  'options.size.help':
    'A mayor resolución, más píxeles por módulo. Se necesitan al menos {min} px por módulo para que el lector distinga los módulos sueltos.',

  /* ---------------------------------------------------------------------- */
  /* Estilo                                                                 */
  /* ---------------------------------------------------------------------- */
  'style.region': 'Estilo',
  'style.presets.label': 'Estilos rápidos',
  'style.presets.help': 'Todos pasan la verificación de escaneabilidad.',
  'style.preset.classic': 'Clásico',
  'style.preset.minimal': 'Minimal',
  'style.preset.dots': 'Puntos',
  'style.preset.classy': 'Elegante',
  'style.preset.brand': 'Corporativo',
  'style.preset.night': 'Noche',
  'style.preset.vibrant': 'Vibrante',
  'style.preset.earth': 'Tierra',
  'style.preset.contrast': 'Máximo contraste',

  'style.modules.label': 'Forma de los módulos',
  'style.modules.square': 'Cuadrado',
  'style.modules.rounded': 'Redondeado',
  'style.modules.extraRounded': 'Muy redondeado',
  'style.modules.dots': 'Círculos',
  'style.modules.diamond': 'Rombo',
  'style.modules.barH': 'Barras horizontales',
  'style.modules.barV': 'Barras verticales',

  'style.finders.label': 'Forma de las esquinas',
  'style.finders.square': 'Cuadrada',
  'style.finders.rounded': 'Redondeada',
  'style.finders.circle': 'Círculo',
  'style.finders.leaf': 'Pétalo',

  'style.color.label': 'Colores',
  'style.color.foreground': 'Color del código',
  'style.color.background': 'Color de fondo',
  'style.color.contrast': 'Contraste',
  'style.quiet.label': 'Zona silenciosa',
  'style.quiet.help':
    'El margen claro alrededor del código. El estándar ISO/IEC 18004 exige 4 módulos; con formas redondeadas se recomiendan 6, porque la tinta se retrae hacia adentro en las curvas.',

  /* ---------------------------------------------------------------------- */
  /* Logo                                                                   */
  /* ---------------------------------------------------------------------- */
  'logo.label': 'Logo al centro',
  'logo.dropzone': 'Arrastra tu logo aquí o haz clic para elegirlo',
  'logo.formats': 'PNG, JPEG o WebP. Máximo {size}. No aceptamos SVG.',
  'logo.whyNoSvg':
    'El SVG puede contener código ejecutable, y dibujarlo en un canvas tiene un historial de problemas de seguridad. Aceptarlo obligaría a instalar un saneador de HTML en el navegador, y este proyecto no quiere dependencias que amplíen la superficie de ataque.',
  'logo.size': 'Tamaño',
  'logo.sizeHelp': 'Se mide en porcentaje del ANCHO del código, no de su área. El límite seguro es {safe}% de ancho.',
  'logo.shape': 'Forma',
  'logo.shape.rect': 'Rectangular',
  'logo.shape.circle': 'Círculo',
  'logo.shape.rounded': 'Redondeada',
  'logo.plate': 'Fondo sólido detrás del logo',
  'logo.plateHelp':
    'Poner un rectángulo del color de fondo detrás del logo garantiza el contraste, pero ocupa más área y gasta parte del presupuesto de corrección de errores.',
  'logo.remove': 'Quitar logo',
  'logo.error.tooLarge': 'El archivo supera {size}.',
  'logo.error.dimensions': 'La imagen mide {w}×{h} px. El máximo es {max} px por lado.',
  'logo.error.format': 'Formato no admitido. Usa PNG, JPEG o WebP.',
  'logo.error.corrupt': 'No se pudo leer la imagen. Puede estar dañada.',
  'logo.error.decal':
    'No se puede subir una imagen tan grande: al descomprimir ocuparía más memoria de la que el navegador puede reservar.',
  'logo.error.ecc':
    'Un logo necesita corrección de errores Alta o Máxima para dejar presupuesto suficiente. Se cambió a Máxima (H).',

  /* ---------------------------------------------------------------------- */
  /* Verificacion de escaneabilidad                                          */
  /* ---------------------------------------------------------------------- */
  'safety.label': 'Verificación de escaneabilidad',
  'safety.level.safe': 'Seguro para escanear',
  'safety.level.caution': 'Revisa antes de usar',
  'safety.level.blocked': 'No se puede descargar',
  'safety.check.logoArea': 'Cobertura del logo',
  'safety.check.logoArea.detail':
    'Cubre {area}% del área del código; este nivel de corrección de errores reconstruye hasta el {recovery}%.',
  'safety.check.finderClearance': 'Despeje de las esquinas',
  'safety.check.finderClearance.detail':
    'El logo no toca los patrones de las esquinas. Es la única condición que la corrección de errores no puede arreglar.',
  'safety.check.finderClearance.violated':
    'El logo invade los patrones de las esquinas. El lector localiza el código por ahí antes de aplicar corrección de errores, así que queda inservible aunque la corrección sea alta.',
  'safety.check.contrast': 'Contraste',
  'safety.check.contrast.detail': 'Ratio de {ratio}:1 entre el código y el fondo; el mínimo es {min}:1.',
  'safety.check.contrast.inverted':
    'El código es más claro que el fondo. Muchos lectores de cámara solo leen tinta oscura sobre fondo claro.',
  'safety.check.moduleSize': 'Tamaño de módulo',
  'safety.check.moduleSize.detail': 'Cada módulo mide {px} px de lado con una exportación de {size} px.',
  'safety.check.moduleSize.tooSmall':
    'Cada módulo mediría {px} px. Por debajo de {min} px el lector deja de distinguir módulos contiguos. Sube el tamaño de descarga o acorta el contenido.',
  'safety.check.moduleSize.print': 'Cada módulo mediría {mm} mm impreso.',
  'safety.check.moduleSize.printTooSmall': 'Cada módulo mediría {mm} mm impreso. El mínimo fiable para imprenta es {min} mm.',
  'safety.check.inkLoss': 'Pérdida de tinta por el estilo',
  'safety.check.inkLoss.detail':
    'La forma elegida ocupa un {loss}% menos de área. No es un problema en sí, pero cuanto menor sea el módulo en pantalla más fácil es que los bordes se toquen.',
  'safety.check.quietZone': 'Zona silenciosa',
  'safety.check.quietZone.detail': '{n} módulos alrededor del código; el mínimo es {min}.',
  'safety.check.quietZone.tooSmall': 'Con {n} módulos, el lector puede no encontrar el código. El estándar exige 4.',
  'safety.blocked.title': 'Descarga bloqueada',
  'safety.blocked.body':
    'Esta configuración produciría un código que probablemente no escanea. Corrige lo de arriba y la descarga se habilita sola.',
  'safety.caution.title': 'Funciona, pero con poco margen',
  'safety.caution.body':
    'Esta configuración está en el límite. Para imprenta o para letreros, sube los valores a la zona segura.',

  /* ---------------------------------------------------------------------- */
  /* Seguridad del contenido                                                */
  /* ---------------------------------------------------------------------- */
  'security.blocked.title': 'Contenido bloqueado por seguridad',
  'security.blocked.scheme':
    'Este tipo de contenido puede ejecutar código en el teléfono de quien lo escanee. No se puede generar.',
  'security.blocked.body':
    'Un código QR que apunta a javascript: o data: es la forma más directa de distribuir phishing o malware, porque la víctima ve una imagen inocente y el código se ejecuta al abrirlo. Por eso no hay forma de saltarse este bloqueo.',
  'security.blocked.advice': 'Si necesitas compartir un enlace, pega la dirección completa empezando por https://.',

  /* ---------------------------------------------------------------------- */
  /* Vista previa y descarga                                                */
  /* ---------------------------------------------------------------------- */
  'preview.label': 'Vista previa',
  'preview.empty': 'Escribe la información para generar tu código QR.',
  'preview.emptyPrivacy': 'Nada se guarda ni se envía a ningún servidor.',
  'preview.canvasLabel': 'Código QR generado con el estilo {style}',
  'preview.download': 'Descargar PNG',
  'preview.downloadSvg': 'Descargar SVG',
  'preview.print': 'Imprimir',
  'preview.zoomIn': 'Acercar',
  'preview.zoomOut': 'Alejar',

  'status.ready': 'Listo. Versión {version}, {bytes} bytes, corrección {ecc}.',
  'status.readyAscii': 'Listo. Versión {version}, {bytes} bytes.',
  'status.incomplete': 'Completa los campos obligatorios para generar el código.',
  'status.tooLong': 'La información es demasiado larga para un solo código QR. Reduce el contenido o usa un enlace más corto.',
  'status.blocked': 'No se puede generar este contenido.',
  'status.readable': 'Comprobado: un lector real devuelve el mismo contenido.',
  'status.notFound':
    'Ningún lector reconoce esta imagen, así que la descarga está desactivada. Baja el tamaño de salida o sube la corrección de errores.',
  'status.mismatch':
    'La imagen devuelve un contenido distinto al que se iba a codificar. Se puede descargar, pero revisa el texto de arriba.',
  'status.verifying': 'Comprobando con un lector real…',
  'preview.verbatim': 'Lo que lleva el código',
  'preview.verbatimEmpty': 'Todavía no hay contenido.',
  'preview.dangerousScheme': 'Atención: empieza por {scheme}:, que puede ejecutar código al abrirlo.',
  'preview.truncated': 'Se muestran {shown} de {total} caracteres. El código lleva el texto entero.',
  'options.printWidth.label': 'Ancho impreso',
  'options.printWidth.help': 'El tamaño del módulo en papel depende de esto, no de los píxeles de la pantalla.',
  'logo.file': 'Archivo de imagen',
  'logo.margin': 'Margen de aire',
  'export.filename': 'efimero-{kind}-{preset}',
  'export.preparing': 'Preparando la imagen…',
  'export.failed': 'No se pudo generar la imagen. Inténtalo de nuevo con un tamaño menor.',
  'faq.title': 'Preguntas frecuentes',
  'faq.q1': '¿Se guarda mi información?',
  'faq.a1':
    'No. Todo el procesamiento ocurre en tu navegador y el código se dibuja en un lienzo de tu propia pantalla. El contenido viaja dentro de la imagen que descargas y en ningún momento sale de tu equipo. Y no es una promesa: la política de seguridad de contenido de esta página prohíbe cualquier conexión de red desde la página, y una prueba automatizada lo verifica en cada compilación.',
  'faq.q2': '¿Necesito internet?',
  'faq.a2':
    'Solo para cargar la página la primera vez. Después puedes desconectarte: el generador sigue funcionando por completo, incluida la exportación.',
  'faq.q3': '¿Por qué mis códigos no escanean?',
  'faq.a3':
    'Casi siempre es una de tres cosas: contraste insuficiente, un módulo demasiado pequeño en pantalla, o un logo central demasiado grande. La verificación te dice cuál de las tres es, en concreto.',
  'faq.q4': '¿Por qué no puedo poner un SVG como logo?',
  'faq.a4':
    'Un SVG puede contener código ejecutable. Aceptarlo obligaría a cargar un saneador de HTML en el navegador, y este proyecto no quiere eso. Exporta tu logo a PNG con transparencia y listo.',
  'faq.q5': '¿Por qué no hay JPEG?',
  'faq.a5':
    'La compresión JPEG crea artefactos en los bordes de los módulos, que es justo lo que el lector usa para encontrar el código. Un JPEG puede verse perfecto y no escanear. Usa PNG o SVG.',
  'faq.q6': '¿Qué diferencia hay entre PNG y SVG?',
  'faq.a6':
    'El SVG es vectorial: se ve nítido a cualquier tamaño y pesa poco, ideal para imprenta. El PNG es una imagen, ideal para compartir en redes y mensajería.',
  'faq.q7': '¿Puedo usarlo en mi negocio?',
  'faq.a7': 'Sí. La licencia es MIT, que permite uso comercial, modificar y redistribuir.',
  'faq.q8': '¿Cómo reporto un código abusivo?',
  'faq.a8':
    'En la página de denuncia. Se envía solo el hash del contenido para poder buscarlo, nunca el contenido en sí, así que el aviso no expone lo que se generó.',

  /* ---------------------------------------------------------------------- */
  /* Pie y paginas legales                                                   */
  /* ---------------------------------------------------------------------- */
  'help.label': 'Qué hace esta sección',
  'help.contenido':
    'Escribe o pega aquí lo que debe abrir el código: una dirección, un texto, un contacto o una red wifi. Se codifica tal cual, sin cambiar un solo carácter.',
  'help.estilo':
    'Elige un preajuste o ajusta los colores y la forma de los módulos a mano. Los preajustes combinan valores que ya se leen bien entre sí; si los cambias, la verificación te avisa.',
  'help.opciones':
    'Ajustes técnicos: corrección de errores, zona silenciosa y tamaños. No hace falta tocarlos en un uso normal, pero sí al imprimir, donde el tamaño del módulo se mide en milímetros.',
  'help.logo':
    'Una imagen para poner en el centro del código. Tapa parte de la información, así que conviene subir la corrección de errores y no hacerlo demasiado grande.',
  'help.vista':
    'El código tal como se va a descargar, y encima lo que lleva escrito exactamente. Se prueba con un lector real antes de darlo por bueno.',
  'help.seguridad':
    'Comprobamos contraste, tamaño del módulo, zona silenciosa y el logo antes de dejarte descargar. Si algo no llega al mínimo te avisamos; si el riesgo es real, la descarga se bloquea.',
  'footer.builtWith': 'Gratis, de código abierto y sin límites de uso. Los códigos que crees son tuyos para siempre.',
  'footer.source': 'Código fuente',
  'footer.issues': 'Problemas',
  'footer.license': 'Licencia',
  'footer.privacy': 'Privacidad',
  'footer.thirdParty': 'Créditos',
  'footer.security': 'Política de seguridad',
  'footer.report': 'Denunciar abuso',
  'footer.version': 'Versión {version}',
  'footer.ctaTitle': 'Empieza a crear tu código QR',
  'footer.ctaBody': 'Sin registro, sin suscripción y sin caducidad. Lo que descargas es tuyo para siempre.',
  'footer.ctaButton': 'Crear mi código',
} as const satisfies Record<string, string>;

/**
 * Clave de tradaccion valida. Se deriva de {@link es}, asi que no puede
 * desincronizarse de la fuente de verdad.
 */
export type MessageKey = keyof typeof es;

/** Los dos idiomas soportados. */
export const LOCALES = ['es', 'en'] as const satisfies readonly string[];

/** Idioma de la interfaz. */
export type Locale = (typeof LOCALES)[number];

/** Idioma por defecto, usado cuando no se puede detectar preferencia alguna. */
export const DEFAULT_LOCALE: Locale = 'es';
