# Aviso de privacidad

Última actualización: septiembre de 2026.

Este aviso dice qué datos recoge Efímero y quién es responsable de ellos. Es
breve a propósito: la aplicación está diseñada para no tener casi nada que
declarar, y un aviso largo contando que no pasa nada sería la forma rápida de
no leerse nada importante.

> **Proyecto personal y sin ánimo de lucro.** No hay actividad económica detrás,
> así que no hay empresa, ni número de identificación fiscal, ni dirección
> comercial que declarar. El contacto es público y va por el repositorio.

## Quién es el responsable

- Responsable: **Bryan Dev**
- Contacto: por los canales públicos del repositorio, en
  https://github.com/BRYANMN0305/efimero/issues
  (y, para avisos de seguridad, por el canal privado que indica el propio
  repositorio)
- Sin domicilio: es un proyecto personal, sin actividad económica. El contacto
  por el repositorio es suficiente y evita publicar un dato personal que no hace
  falta dar.

## Qué datos recogemos

**Ninguno. La aplicación no tiene servidor, cuentas ni registro.** Todo lo que
escribes se procesa en tu navegador mediante JavaScript y no sale de tu
equipo. No hay analítica, ni píxeles, ni huella digital, ni seguimiento.

La única información que se guarda en tu equipo es tu **preferencia de idioma**
(español o inglés), en el almacenamiento local del navegador, bajo la clave
`efimero.locale`. No se envía a ningún sitio. Puedes borrarla desde los datos
del sitio en tu navegador en cualquier momento; el efecto es que la próxima
visita vuelva a español.

El contenido de los códigos QR que generes no se guarda, ni se registra, ni se
puede recuperar: en el momento en que recargas la página, desaparece.

## Controles técnicos

La página se sirve con una política de seguridad de contenido (CSP) que incluye
`connect-src 'none'`. Eso no es una promesa: es una restricción que aplica el
propio navegador y que impide técnicamente que el código de la página realice
cualquier petición de red. Un guard del repositorio
(`scripts/check-no-network.mjs`) comprueba en cada compilación que el código
publicado no contiene ninguna API de red.

Los códigos se generan en tu equipo y se descargan como archivo. El sitio no
sabe qué contienen.

## Qué recoge el alojamiento

Como en cualquier sitio web, el proveedor de alojamiento —Vercel Inc.— puede
registrar temporalmente la dirección IP y el agente de usuario de cada visita,
como parte de servir el contenido y de protegerse de ataques. Ese registro lo
gobierna Vercel conforme a sus propias condiciones, fuera del control de este
proyecto.

Base legal: interés legítimo en garantizar la seguridad y la disponibilidad del
servicio. Conservación: el tiempo que Vercel determine en sus condiciones.

## Tus derechos

Puedes pedir acceso, rectificación, supresión, limitación u oposición sobre tus
datos escribiendo al responsable por los canales indicados arriba. Responderemos
en el plazo que fija la normativa aplicable.

En la práctica no hay datos personales almacenados por este proyecto, así que
normalmente no habrá nada que exportar ni que borrar de nuestro lado. Si borras
los datos del sitio en tu navegador, no queda rastro en ninguna parte.

## Cambios

Si este aviso cambia, se actualizará la fecha de arriba y el cambio se verá en
el historial del repositorio, que es público.

## Licencia

Efímero es software libre bajo licencia MIT. Puedes auditar lo que hace: todo el
código está en el repositorio y la página se construye con scripts abiertos que
puedes revisar antes de confiar en ella.
