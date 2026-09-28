/**
 * English messages.
 *
 * The compiler enforces key parity: this object is typed as
 * `Record<MessageKey, string>`, so a key missing here, or a key that does not
 * exist in `es.ts`, is a type error. See `es.ts`, which is the source of truth.
 *
 * @packageDocumentation
 */

import type { MessageKey } from './es';

/** English messages. */
export const en: Record<MessageKey, string> = {
  /* ---------------------------------------------------------------------- */
  /* Brand                                                                  */
  /* ---------------------------------------------------------------------- */
  'brand.tagline': 'QR codes for your brand that never expire',
  'brand.heroTitle': 'QR codes that scan first time',
  'brand.heroSubtitle':
    'Set your colours, shape and logo, then check it will actually scan before you print it. No accounts, no servers, nothing sent anywhere.',
  'badge.openSource': 'Open source · MIT',
  'badge.noServer': 'Zero servers',
  'badge.noAccount': 'No sign-up',
  'badge.noExpiry': 'Never expires',
  'badge.worksOffline': 'Works offline',

  /* ---------------------------------------------------------------------- */
  /* Content type tabs                                                      */
  /* ---------------------------------------------------------------------- */
  'tabs.label': 'Content type',
  'tabs.texto': 'Text or link',
  'tabs.wifi': 'WiFi',
  'tabs.email': 'Email',
  'tabs.sms': 'SMS',
  'tabs.tel': 'Phone',
  'tabs.vcard': 'Contact',

  /* ---------------------------------------------------------------------- */
  /* Form                                                                   */
  /* ---------------------------------------------------------------------- */
  'form.region': 'Content',
  'hint.texto':
    'It is scanned exactly as entered. If you include a link starting with https://, phones will offer to open it; if you type an email address, they may suggest drafting a message to it.',
  'hint.wifi': 'When scanned, the phone joins the network without you typing the password.',
  'hint.email':
    'With “Open mail app” the phone opens its mail app with the recipient ready. With “Show only” you just see the address as plain text.',
  'hint.sms': 'When scanned, the phone opens Messages with the number and text already filled in, ready to send.',
  'hint.tel': 'When scanned, the phone offers to start a call to that number.',
  'hint.vcard': 'When scanned, the phone shows the contact card with a button to save it to the address book.',

  'field.text.label': 'Text or link',
  'field.text.placeholder': 'https://example.com or any text',
  'field.text.help': 'Takes {n} bytes when encoded as UTF-8.',

  'field.wifi.ssid.label': 'Network name (SSID)',
  'field.wifi.ssid.placeholder': 'My_WiFi_Network',
  'field.wifi.password.label': 'Password',
  'field.wifi.security.label': 'Security',
  'field.wifi.security.wpa': 'WPA, WPA2 or WPA3',
  'field.wifi.security.wep': 'WEP',
  'field.wifi.security.open': 'No password (open network)',
  'field.wifi.hidden.label': 'Hidden network',

  'field.email.mode.label': 'Behaviour when scanned',
  'field.email.mode.mailto': 'Open the mail app to draft a message',
  'field.email.mode.text': 'Show the address only, take no action',
  'field.email.to.label': 'Recipient',
  'field.email.to.placeholder': 'someone@example.com',
  'field.email.subject.label': 'Subject (optional)',
  'field.email.subject.placeholder': 'Message subject',
  'field.email.body.label': 'Message (optional)',
  'field.email.body.placeholder': 'Message body',

  'field.sms.number.label': 'Phone number',
  'field.sms.number.placeholder': '+1 555 123 4567',
  'field.sms.message.label': 'Message (optional)',
  'field.sms.message.placeholder': 'Pre-filled SMS text',

  'field.tel.number.label': 'Phone number',
  'field.tel.number.placeholder': '+1 555 123 4567',

  'field.vcard.name.label': 'Full name',
  'field.vcard.name.placeholder': 'Jane Doe',
  'field.vcard.org.label': 'Organisation (optional)',
  'field.vcard.org.placeholder': 'Example Ltd.',
  'field.vcard.title.label': 'Job title (optional)',
  'field.vcard.title.placeholder': 'Head of sales',
  'field.vcard.phone.label': 'Phone (optional)',
  'field.vcard.phone.placeholder': '+1 555 123 4567',
  'field.vcard.email.label': 'Email (optional)',
  'field.vcard.email.placeholder': 'jane@example.com',
  'field.vcard.website.label': 'Website (optional)',
  'field.vcard.website.placeholder': 'https://example.com',

  /* ---------------------------------------------------------------------- */
  /* Technical options                                                      */
  /* ---------------------------------------------------------------------- */
  'options.label': 'Code options',
  'options.ecc.label': 'Error correction',
  'options.ecc.l': 'Low (L), fits the most data',
  'options.ecc.m': 'Medium (M), recommended',
  'options.ecc.q': 'Quartile (Q)',
  'options.ecc.h': 'High (H), most robust',
  'options.ecc.help':
    'Sets how much data may be damaged before the code stops scanning. A code with a logo needs level H: it is the only level with enough budget to cover the centre.',
  'options.size.label': 'Download size',
  'options.size.help':
    'Higher resolution means more pixels per module. You need at least {min} px per module for a reader to tell modules apart.',

  /* ---------------------------------------------------------------------- */
  /* Style                                                                  */
  /* ---------------------------------------------------------------------- */
  'style.region': 'Style',
  'style.presets.label': 'Quick styles',
  'style.presets.help': 'All of these pass the scannability check.',
  'style.preset.classic': 'Classic',
  'style.preset.minimal': 'Minimal',
  'style.preset.dots': 'Dots',
  'style.preset.classy': 'Classy',
  'style.preset.brand': 'Corporate',
  'style.preset.night': 'Midnight',
  'style.preset.vibrant': 'Vibrant',
  'style.preset.earth': 'Earth',
  'style.preset.contrast': 'Maximum contrast',

  'style.modules.label': 'Module shape',
  'style.modules.square': 'Square',
  'style.modules.rounded': 'Rounded',
  'style.modules.extraRounded': 'Extra rounded',
  'style.modules.dots': 'Circles',
  'style.modules.diamond': 'Diamond',
  'style.modules.barH': 'Horizontal bars',
  'style.modules.barV': 'Vertical bars',

  'style.finders.label': 'Corner shape',
  'style.finders.square': 'Square',
  'style.finders.rounded': 'Rounded',
  'style.finders.circle': 'Circle',
  'style.finders.leaf': 'Leaf',

  'style.color.label': 'Colours',
  'style.color.foreground': 'Code colour',
  'style.color.background': 'Background colour',
  'style.color.contrast': 'Contrast',
  'style.quiet.label': 'Quiet zone',
  'style.quiet.help':
    'The clear margin around the code. ISO/IEC 18004 requires 4 modules; rounded shapes are better at 6, because ink pulls inwards along curves.',

  /* ---------------------------------------------------------------------- */
  /* Logo                                                                   */
  /* ---------------------------------------------------------------------- */
  'logo.label': 'Centre logo',
  'logo.dropzone': 'Drag your logo here, or click to choose a file',
  'logo.formats': 'PNG, JPEG or WebP. Up to {size}. SVG is not accepted.',
  'logo.whyNoSvg':
    'An SVG can contain executable code, and drawing one into a canvas has a history of security problems. Accepting them would mean bundling an HTML sanitiser into the browser, and this project does not want dependencies that widen the attack surface.',
  'logo.size': 'Size',
  'logo.sizeHelp': 'Measured as a percentage of the code’s WIDTH, not its area. The safe limit is {safe}% wide.',
  'logo.shape': 'Shape',
  'logo.shape.rect': 'Rectangular',
  'logo.shape.circle': 'Circle',
  'logo.shape.rounded': 'Rounded',
  'logo.plate': 'Solid plate behind the logo',
  'logo.plateHelp':
    'A rectangle in the background colour behind the logo guarantees contrast, but it covers more area and spends part of the error-correction budget.',
  'logo.remove': 'Remove logo',
  'logo.error.tooLarge': 'The file is larger than {size}.',
  'logo.error.dimensions': 'The image is {w}×{h} px. The maximum is {max} px per side.',
  'logo.error.format': 'Unsupported format. Use PNG, JPEG or WebP.',
  'logo.error.corrupt': 'The image could not be read. It may be damaged.',
  'logo.error.decal': 'That image is too large to accept: decompressing it would need more memory than the browser can reserve.',
  'logo.error.ecc': 'A logo needs High or Maximum error correction to leave enough budget. It has been switched to High (H).',

  /* ---------------------------------------------------------------------- */
  /* Scannability check                                                     */
  /* ---------------------------------------------------------------------- */
  'safety.label': 'Scannability check',
  'safety.level.safe': 'Safe to scan',
  'safety.level.caution': 'Review before use',
  'safety.level.blocked': 'Download blocked',
  'safety.check.logoArea': 'Logo coverage',
  'safety.check.logoArea.detail': 'Covers {area}% of the code’s area; this error correction level rebuilds up to {recovery}%.',
  'safety.check.finderClearance': 'Corner clearance',
  'safety.check.finderClearance.detail':
    'The logo does not touch the corner patterns. This is the one condition error correction cannot fix.',
  'safety.check.finderClearance.violated':
    'The logo overlaps the corner patterns. A reader locates the code from those before it applies error correction, so the code is unusable however high the correction level is.',
  'safety.check.contrast': 'Contrast',
  'safety.check.contrast.detail': '{ratio}:1 between code and background; the minimum is {min}:1.',
  'safety.check.contrast.inverted':
    'The code is lighter than the background. Many camera readers only read dark ink on a light background.',
  'safety.check.moduleSize': 'Module size',
  'safety.check.moduleSize.detail': 'Each module is {px} px across at a {size} px export.',
  'safety.check.moduleSize.tooSmall':
    'Each module would be {px} px. Below {min} px a reader stops telling adjacent modules apart. Raise the download size, or shorten the content.',
  'safety.check.moduleSize.print': 'Each module would be {mm} mm when printed.',
  'safety.check.moduleSize.printTooSmall':
    'Each module would be {mm} mm when printed. The reliable minimum for print is {min} mm.',
  'safety.check.inkLoss': 'Ink loss from the style',
  'safety.check.inkLoss.detail':
    'The chosen shape covers {loss}% less area. Not a problem on its own, but the smaller the module on screen, the easier the edges are to touch.',
  'safety.check.quietZone': 'Quiet zone',
  'safety.check.quietZone.detail': '{n} modules around the code; the minimum is {min}.',
  'safety.check.quietZone.tooSmall': 'With {n} modules a reader may fail to find the code at all. The standard requires 4.',
  'safety.blocked.title': 'Download blocked',
  'safety.blocked.body':
    'This configuration would produce a code that probably does not scan. Fix the points above and the download re-enables itself.',
  'safety.caution.title': 'It works, but the margin is thin',
  'safety.caution.body': 'This configuration is right at the limit. For print or signage, move the values into the safe range.',

  /* ---------------------------------------------------------------------- */
  /* Content safety                                                         */
  /* ---------------------------------------------------------------------- */
  'security.blocked.title': 'Content blocked for safety',
  'security.blocked.scheme': 'This kind of content can run code on the phone that scans it. It cannot be generated.',
  'security.blocked.body':
    'A QR code pointing at javascript: or data: is the most direct way to distribute phishing or malware, because the victim sees a harmless image and the code runs on open. That is why this block cannot be bypassed.',
  'security.blocked.advice': 'If you need to share a link, paste the full address starting with https://.',

  /* ---------------------------------------------------------------------- */
  /* Preview and download                                                   */
  /* ---------------------------------------------------------------------- */
  'preview.label': 'Preview',
  'preview.empty': 'Enter some information to generate your QR code.',
  'preview.emptyPrivacy': 'Nothing is stored, and nothing is sent to a server.',
  'preview.canvasLabel': 'QR code generated with the {style} style',
  'preview.download': 'Download PNG',
  'preview.downloadSvg': 'Download SVG',
  'preview.print': 'Print',
  'preview.zoomIn': 'Zoom in',
  'preview.zoomOut': 'Zoom out',

  'status.ready': 'Ready. Version {version}, {bytes} bytes, {ecc} error correction.',
  'status.readyAscii': 'Ready. Version {version}, {bytes} bytes.',
  'status.incomplete': 'Fill in the required fields to generate the code.',
  'status.tooLong': 'That information is too long for a single QR code. Shorten the content, or use a shorter link.',
  'status.blocked': 'This content cannot be generated.',
  'status.readable': 'Checked: a real reader returns the same content.',
  'status.notFound':
    'No reader recognises this image, so downloading is disabled. Lower the output size or raise the error correction.',
  'status.mismatch':
    'The image returns different content from the one that was going to be encoded. You can still download it, but check the text above.',
  'status.verifying': 'Checking with a real reader...',
  'preview.verbatim': 'What the code contains',
  'preview.verbatimEmpty': 'There is no content yet.',
  'preview.dangerousScheme': 'Careful: it starts with {scheme}:, which can run code when opened.',
  'preview.truncated': 'Showing {shown} of {total} characters. The code carries the whole text.',
  'options.printWidth.label': 'Printed width',
  'options.printWidth.help': 'Module size on paper depends on this, not on the screen pixels.',
  'logo.file': 'Image file',
  'logo.margin': 'Clearance',
  'export.filename': 'efimero-{kind}-{preset}',
  'export.preparing': 'Preparing the image…',
  'export.failed': 'The image could not be generated. Try again at a smaller size.',
  'faq.title': 'Frequently asked questions',
  'faq.q1': 'Is my information stored?',
  'faq.a1':
    'No. Everything runs in your browser and the code is drawn on a canvas on your own screen. The content travels inside the image you download and never leaves your device. And that is not just a promise: this page’s content security policy forbids any network request from the page, and an automated test verifies it on every build.',
  'faq.q2': 'Do I need internet access?',
  'faq.a2':
    'Only to load the page the first time. After that you can disconnect: the generator keeps working fully, export included.',
  'faq.q3': 'Why will my codes not scan?',
  'faq.a3':
    'It is almost always one of three things: contrast that is too low, a module that is too small on screen, or a centre logo that is too large. The check tells you which of the three it is.',
  'faq.q4': 'Why can I not use an SVG logo?',
  'faq.a4':
    'An SVG can contain executable code. Accepting one would mean loading an HTML sanitiser into the browser, and this project does not want that. Export your logo to PNG with transparency and you are done.',
  'faq.q5': 'Why is there no JPEG?',
  'faq.a5':
    'JPEG compression introduces artefacts along module edges, which is exactly what a reader uses to locate the code. A JPEG can look perfect and still fail to scan. Use PNG or SVG.',
  'faq.q6': 'What is the difference between PNG and SVG?',
  'faq.a6':
    'SVG is vector, so it stays sharp at any size and weighs little: ideal for print. PNG is a bitmap: ideal for sharing in social media and messaging.',
  'faq.q7': 'Can I use this for my business?',
  'faq.a7': 'Yes. The licence is MIT, which allows commercial use, modification and redistribution.',
  'faq.q8': 'How do I report an abusive code?',
  'faq.a8':
    'On the report page. Only the hash of the content is sent, so it can be looked up, which means the report does not expose whatever was generated.',

  /* ---------------------------------------------------------------------- */
  /* Footer and legal pages                                                 */
  /* ---------------------------------------------------------------------- */
  'help.label': 'What this section does',
  'help.contenido':
    'Type or paste what the code should open: a web address, some text, a contact or a wifi network. It is encoded exactly as written, with no character changed.',
  'help.estilo':
    'Pick a preset, or set the colours and module shape by hand. Presets combine values that already read well together; if you change them, the checks will tell you.',
  'help.opciones':
    'Technical settings: error correction, quiet zone and sizes. You do not need to touch them in normal use, but they matter when printing, where module size is measured in millimetres.',
  'help.logo':
    'An image to place in the centre of the code. It covers part of the information, so raise the error correction and do not make it too large.',
  'help.vista':
    'The code exactly as it will be downloaded, with what it contains written above it. It is tested with a real reader before being called good.',
  'help.seguridad':
    'We check contrast, module size, quiet zone and the logo before letting you download. If something falls short we warn you; if the risk is real, downloading is blocked.',
  'footer.builtWith': 'Free, open source and with no usage limits. The codes you create are yours for good.',
  'footer.source': 'Source code',
  'footer.issues': 'Issues',
  'footer.license': 'Licence',
  'footer.privacy': 'Privacy',
  'footer.thirdParty': 'Credits',
  'footer.security': 'Security policy',
  'footer.report': 'Report abuse',
  'footer.version': 'Version {version}',
  'footer.ctaTitle': 'Start building your QR code',
  'footer.ctaBody': 'No sign-up, no subscription, no expiry. Whatever you download is yours for good.',
  'footer.ctaButton': 'Create my code',
};
