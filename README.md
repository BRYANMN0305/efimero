# Efímero

**Crea códigos QR con tu marca, y comprueba que se leen antes de imprimirlos.**

Efímero es un generador de códigos QR que funciona entero en el navegador y
que se niega a entregarte un código sin comprobarlo antes. La mayoría de
generadores te dan una imagen y te dejan en la mano la responsabilidad. Este te
dice si se lee.

Sin cuentas. Sin servidor. Sin caducidad. Tus códigos son tuyos para siempre.

---

## El problema que resuelve

Un código QR mal hecho falla en el peor momento: cuando ya está impreso en un
cartel, en una etiqueta o en una octavilla, y miles de personas lo apuntan y no
pasa nada.

Las causas son siempre las mismas, y ninguna es visible a simple vista:

- Contraste insuficiente, o colores que parecen Validos y en papel no lo son.
- Módulos demasiado pequeños para la distancia a la que se va a escanear.
- Zona silenciosa recortada por un logo demasiado grande.
- Un logo que se come justo la parte del código que sostiene la lectura.

Efímero las mide todas y te avisa **antes** de que gastes la tinta. Y no se
limita a decirte que algo está mal: te explica qué comprobación falla, con qué
número, y qué hacer para arreglarlo.

## Qué lo hace distinto

**Comprueba el código con un lector real.** No estima: cuando terminas de
diseñar, Efímero lee la imagen que has visto con un decodificador de verdad
(jsQR) y te dice si devuelve el contenido que querías. Eso es mejor que
cualquier fórmula, porque es el mismo trabajo que hará el teléfono de quien
lo escanee.

**Seis comprobaciones, con su número.** Contraste según WCAG, tamaño del módulo
en pantalla y en milímetros de papel, zona silenciosa, cobertura del logo,
despeje de los patrones de las esquinas y pérdida de tinta por el estilo
elegido. Cada una con su resultado y su motivo.

**No te bloquea por gusto.** Distingue entre lo que es un riesgo real —donde la
descarga se desactiva— y lo que es solo un aviso. El rombo y las barras son
estilos decorativos que muchos lectores no reconocen; Efímero te avisa, no te
quita la opción.

**Se lee en el móvil y funciona sin internet.** Sin conexión, con la primera
visita o a la milésima.

## Qué puedes crear

| Tipo           | Para qué                                           |
| -------------- | -------------------------------------------------- |
| Texto o enlace | Una dirección, un texto, lo que quieras            |
| WiFi           | Que el móvil se conecte sin escribir la contraseña |
| Correo         | Mensaje nuevo con destinatario y asunto            |
| SMS            | Mensaje con número y texto ya escritos             |
| Teléfono       | Llamar a un número                                 |
| Contacto       | Ficha de contacto para la agenda                   |

**Estilo:** 9 preajustes listos para usar, 7 formas de módulo, 4 de esquina,
4 niveles de corrección de errores, y los colores que quieras.

**Logo:** PNG, JPEG o WebP en el centro, con tamaño y margen ajustables. El
archivo se valida por su contenido real, no por su extensión, y se procesa en
tu equipo: no se sube a ningún sitio.

**Exportación:** PNG para compartir y digital, SVG vectorial para imprenta,
que se ve nítido a cualquier tamaño y pesa poco.

## Privacidad, sin letra pequeña

- Todo se procesa en el navegador. **El contenido de tus códigos no se envía a
  ningún sitio**, porque no hay servidor al que enviarlo.
- Sin cuentas, sin registro, sin analítica, sin cookies, sin huella digital.
- Lo único que se guarda en tu equipo es tu preferencia de idioma, en el
  almacenamiento local del navegador. Puedes borrarlo cuando quieras.
- La página se sirve con `connect-src 'none'`: no es una promesa, es una
  restricción que aplica el propio navegador. Un guard comprueba en cada
  compilación que el código publicado no contiene ninguna API de red —ni
  `fetch`, ni `XMLHttpRequest`, ni `WebSocket`—, y ese guard lee el bundle ya
  compilado, así que también caza lo que se cuele por una dependencia.
- Código abierto bajo licencia MIT. Puedes leer exactamente lo que hace.

El detalle está en [`PRIVACY.md`](PRIVACY.md).

## Cómo se usa

1. Escribe o pega el contenido en la pestaña que corresponda.
2. Elige un preajuste o ajusta colores, formas y logo a tu gusto.
3. Mira el veredicto. Si pone «Seguro para escanear», descarga el PNG o el SVG.

No hay más. No hay registro, ni asistente de varios pasos, ni prueba
gratuta que se acaba.

## Empezar a usarlo

Solo entra en <https://efimero-qr.vercel.app> y ya funciona. Puedes añadirlo a la
pantalla de inicio y se abrirá sin barra de navegador.

## Compilar desde el código

Necesitas **Node.js 22 o superior**.

```sh
npm install          # instala las dependencias
npm run dev          # servidor de desarrollo en http://localhost:5173
npm run build        # compila el sitio estático a dist/
npm run preview      # sirve el build, igual que se verá en producción
npm test             # 196 tests unitarios
npm run test:e2e     # 36 tests de extremo a extremo, en Chrome y Edge
npm run verify       # lint, formato, tests, compilación y guardas
```

Un par de notas sobre las guardas del proyecto, porque no es lo habitual y
tienen motivo:

- `check:no-network` lee el **bundle ya compilado** y falla si aparece
  cualquier API de red o de almacenamiento. Así también caza lo que se cuela
  por una dependencia.
- `check:vendor` comprueba el SHA-256 de la librería de QR de terceros, para
  que siga siendo la copia sin modificar y no una versión introducida a mano.
- `check:i18n-huerfanas` falla si queda una traducción sin usar o si falta
  alguna de las que se piden con una plantilla.
- Los tests de extremo a extremo usan el Chrome y el Edge del sistema, no un
  navegador descargado, para que probar el proyecto no dependa de la red.

## Cómo está montado

```
src/
  qr/        motor: codificación, lista de dibujo, formas, seguridad, export
  payload/   construcción y escapado de los distintos tipos de contenido
  security/  bloqueo de esquemas peligrosos e ingesta de logos
  i18n/      catálogos de español e inglés
scripts/     guardas de compilación
tests/       unitarios (Node) y extremo a extremo (navegador)
public/
  vendor/    copia verificada de la librería de QR de Project Nayuki
```

La idea de fondo: una **única lista de instrucciones** decide qué se dibuja, y
de ahí sale lo que se ve en pantalla, el PNG, el SVG y lo que se comprueba con
el lector. Una sola definición, cuatro salidas, y no pueden dejar de
coincidir entre sí.

## Licencia y créditos

MIT. Puedes usarlo, modificarlo y venderlo.

La codificación de QR usa [**Project Nayuki**](https://www.nayuki.io/page/qr-code-generator-library)
(1.8.0, MIT), como copia sin modificar y con el checksum verificado en cada
compilación. La lectura de códigos usa [**jsQR**](https://github.com/cozmo/jsQR)
(1.4.0, Apache-2.0). Los avisos de licencia están en
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

## Problemas o sugerencias

Abre una incidencia en <https://github.com/BRYANMN0305/efimero/issues>.
