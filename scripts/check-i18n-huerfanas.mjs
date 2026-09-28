/**
 * Detecta claves de traduccion que no se usan en ninguna parte.
 *
 * Reparte en dos grupos, y no los mezcla, porque no es lo mismo: una clave
 * referenciada con una plantilla como `tr('hint.' + tipo)` no aparece escrita en
 * ningun sitio, pero sigue viva. Marcar eso como muerta seria un falso positivo
 * y acabaria borrando texto que se usa.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');

/** Recoge todos los archivos de texto del proyecto, saltando lo generado. */
function collect(dir, skip, out = []) {
  for (const entry of readdirSync(dir)) {
    if (skip.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collect(full, skip, out);
    else if (/\.(ts|html|css|mjs)$/.test(entry)) out.push(full);
  }
  return out;
}

const SKIP = new Set(['node_modules', 'dist', '.git', 'coverage', 'playwright-report', 'test-results', 'vendor']);

/** Claves declaradas en el catalogo de espanol, que es la fuente de verdad. */
const es = readFileSync(join(ROOT, 'src/i18n/es.ts'), 'utf8');
const claves = [...es.matchAll(/^\s*'([\w.]+)':/gm)].map((m) => m[1]);

/** Todo el codigo que puede pedir una traduccion. */
const codigo = collect(ROOT, SKIP)
  .filter((f) => !f.endsWith(join('src', 'i18n', 'es.ts')))
  .filter((f) => !f.endsWith(join('src', 'i18n', 'en.ts')))
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n');

/** Registra que hay un grupo de claves que se pide con una plantilla. */
const gruposVistos = new Set();
function encontradaDynamica(prefijo) {
  gruposVistos.add(prefijo);
}
const muertas = [];

for (const clave of claves) {
  if (codigo.includes(`'${clave}'`)) continue;
  // Puede aparecer dentro de una plantilla: `tr('hint.' + tipo)`. Se marca
  // como dinamica y se resuelve mas abajo, donde se comprueba que existan TODOS
  // los valores del grupo.
  const puntos = clave.split('.');
  let encontrado = false;
  for (let i = puntos.length - 1; i > 0; i--) {
    const prefijo = puntos.slice(0, i).join('.');
    if (codigo.includes(`\`${prefijo}.`) || codigo.includes(`'${prefijo}.'`) || codigo.includes(`\`${prefijo}`)) {
      encontradaDynamica(prefijo);
      encontrado = true;
      break;
    }
  }
  if (!encontrado) muertas.push(clave);
}

/**
 * Grupos de claves que se piden con una plantilla, con todos los valores que
 * tienen que existir.
 *
 * Estas claves no aparecen escritas en ningun sitio: el codigo hace
 * `tr('hint.' + tipo)`. Por eso el simple hecho de que no se usen no dice nada
 * sobre si existen, y aqui es donde se rompio: faltaba `hint.texto` y la pagina
 * pintaba la clave en crudo, en medio del formulario, sin que nada fallara.
 *
 * La tabla es una copia de las enumeraciones del codigo (`PAYLOAD_KINDS`,
 * `Ecc`, `ModuleShape`, `LogoRejection`, los identificadores de `Check`...). Se
 * actualiza a mano y por eso hay que acordarse: si se anade un valor a una
 * enumeracion, hay que anadirlo aqui. Es el precio de no duplicar la
 * comprobacion en cada sitio; la alternativa es un mapa explicito en el codigo
 * por tipo, que si compila, pero toca todos los puntos de uso.
 */
const GRUPOS_DINAMICOS = {
  tabs: ['texto', 'wifi', 'email', 'sms', 'tel', 'vcard'],
  hint: ['texto', 'wifi', 'email', 'sms', 'tel', 'vcard'],
  'options.ecc': ['l', 'm', 'q', 'h'],
  'safety.level': ['safe', 'caution', 'blocked'],
  'safety.check': ['logoArea', 'finderClearance', 'contrast', 'moduleSize', 'inkLoss', 'quietZone'],
  'style.modules': ['square', 'rounded', 'extraRounded', 'dots', 'diamond', 'barH', 'barV'],
  'style.finders': ['square', 'rounded', 'circle', 'leaf'],
  'style.preset': ['classic', 'minimal', 'dots', 'classy', 'brand', 'night', 'vibrant', 'earth', 'contrast'],
  'logo.error': ['tooLarge', 'format', 'dimensions', 'corrupt'],
  help: ['contenido', 'estilo', 'opciones', 'logo', 'vista', 'seguridad'],
};

/** Faltan claves de un grupo que el codigo construye con una plantilla. */
const incompletos = [];
for (const [prefijo, valores] of Object.entries(GRUPOS_DINAMICOS)) {
  for (const valor of valores) {
    if (!claves.includes(`${prefijo}.${valor}`)) incompletos.push(`${prefijo}.${valor}`);
  }
}

// Las FAQs se piden por indice, asi que se comprueba que van en pareja y sin
// huecos: si hay una `faq.q3` y no su `faq.a3`, al abrir esa pregunta se
// muestra la clave en crudo.
const preguntas = claves.filter((c) => /^faq\.q\d+$/.test(c)).map((c) => c.slice(-1));
for (const indice of preguntas) {
  if (!claves.includes(`faq.a${indice}`)) incompletos.push(`faq.a${indice} (falta la respuesta de faq.q${indice})`);
}

console.log(`Claves declaradas: ${claves.length}`);

if (muertas.length > 0) {
  console.log(`\nSin usar (${muertas.length}):`);
  for (const clave of muertas) console.log(`  ${clave}`);
} else {
  console.log('\nSin usar: ninguna.');
}

if (incompletos.length > 0) {
  console.log(`\nGrupos INCOMPLETOS: se piden con una plantilla y no existen (${incompletos.length}):`);
  for (const clave of incompletos) console.log(`  ${clave}`);
  console.log('\nLa pagina las pinta tal cual, con el nombre de la clave, en vez del texto.');
} else {
  console.log(
    `Grupos dinamicos: ${Object.keys(GRUPOS_DINAMICOS).length} completos, y las ${preguntas.length} preguntas con respuesta.`,
  );
}

if (muertas.length > 0 || incompletos.length > 0) {
  process.exit(1);
}
