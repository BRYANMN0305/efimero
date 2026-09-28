/**
 * Tests de los constructores de payload.
 *
 * Aqui se fijan los casos que rompen la interaccion con el telefono: escapado
 * de caracteres que reservan significado, division de nombres, y el orden
 * de los campos de WiFi. Son fallos que no se ven en la imagen del QR, solo se
 * ven al escanear, asi que el unico forma de evitarlos es fijarlos con tests.
 *
 * @packageDocumentation
 */

import { describe, expect, it } from 'vitest';

import {
  buildEmail,
  buildPayload,
  buildSms,
  buildTel,
  buildText,
  buildVCard,
  buildWifi,
  escapeVCardValue,
  escapeWifiValue,
  emptyFields,
  isPlausiblePhone,
  normalizePhone,
  normalizeUrl,
  percentEncode,
  splitFullName,
} from '../src/payload/index';

describe('buildText', () => {
  it('devuelve el texto sin modificar', () => {
    expect(buildText({ text: 'Hola mundo' })).toEqual({ ok: true, payload: 'Hola mundo' });
  });

  it('conserva los espacios y los saltos de linea del pegado', () => {
    // Un QR de texto es un espejo: si recortamos, el codigo pegado deja de
    // funcionar y el usuario no tiene forma de saber por que.
    const texto = '  linea 1\nlinea 2  \n';
    expect(buildText({ text: texto })).toEqual({ ok: true, payload: texto });
  });

  it('no confunde un texto de un solo espacio con texto vacio', () => {
    expect(buildText({ text: ' ' }).ok).toBe(true);
  });

  it('rechaza el campo vacio', () => {
    expect(buildText({ text: '' })).toEqual({ ok: false, error: 'incomplete' });
  });
});

describe('buildWifi', () => {
  const base = { security: 'WPA', password: 'secreto', hidden: false } as const;

  it('arma el formato WIFI con doble punto y coma final', () => {
    expect(buildWifi({ ...base, ssid: 'MiRed' })).toEqual({
      ok: true,
      payload: 'WIFI:T:WPA;S:MiRed;P:secreto;H:false;;',
    });
  });

  it('marca las redes ocultas', () => {
    expect(buildWifi({ ...base, ssid: 'Red', hidden: true })).toEqual({
      ok: true,
      payload: 'WIFI:T:WPA;S:Red;P:secreto;H:true;;',
    });
  });

  it('omite la clave en redes abiertas', () => {
    // Enviarla vacia haria que el lector pidiera escribir una contrasena en
    // blanco en vez de conectarse directamente.
    const resultado = buildWifi({ ssid: 'Abierta', security: 'nopass', password: '', hidden: false });
    expect(resultado).toEqual({ ok: true, payload: 'WIFI:T:nopass;S:Abierta;H:false;;' });
  });

  it('descarta la clave escrita aunque la red sea abierta', () => {
    const resultado = buildWifi({
      ssid: 'Abierta',
      security: 'nopass',
      password: 'se ignora',
      hidden: false,
    });
    expect(resultado.ok && resultado.payload).not.toContain('se ignora');
  });

  it('exige clave en redes protegidas', () => {
    expect(buildWifi({ ssid: 'Red', security: 'WPA', password: '', hidden: false })).toEqual({
      ok: false,
      error: 'incomplete',
    });
  });

  it('exige nombre de red', () => {
    expect(buildWifi({ ...base, ssid: '   ' })).toEqual({ ok: false, error: 'incomplete' });
  });

  it('escapa los caracteres que separan campos dentro del SSID', () => {
    // Una red llamada "Cafe; Free" sin escapar romperia el analisis: el lector
    // creeria que "Free" es el valor de la clave.
    const resultado = buildWifi({ ...base, ssid: 'Cafe; Free', password: 'a,b:c"d\\e' });
    expect(resultado.ok && resultado.payload).toBe('WIFI:T:WPA;S:Cafe\\; Free;P:a\\,b\\:c\\"d\\\\e;H:false;;');
  });

  it('soporta WEP', () => {
    expect(buildWifi({ ssid: 'Vieja', security: 'WEP', password: 'x', hidden: false })).toEqual({
      ok: true,
      payload: 'WIFI:T:WEP;S:Vieja;P:x;H:false;;',
    });
  });
});

describe('escapeWifiValue', () => {
  it('escapa la barra invertida antes que nada', () => {
    // Si se hiciese en otro orden, un valor con ";" pasaria a "\\;" y al releer
    // se obtendria una barra y un punto y coma.
    expect(escapeWifiValue('a\\;b')).toBe('a\\\\\\;b');
  });

  it('sustituye tabuladores y saltos de linea por espacios', () => {
    expect(escapeWifiValue('a\tb\nc')).toBe('a b c');
  });
});

describe('buildEmail', () => {
  it('crea un mailto sin parametros cuando solo hay destinatario', () => {
    expect(buildEmail({ mode: 'mailto', to: 'ana@ejemplo.com', subject: '', body: '' })).toEqual({
      ok: true,
      payload: 'mailto:ana@ejemplo.com',
    });
  });

  it('percent-codifica asunto y cuerpo', () => {
    const resultado = buildEmail({
      mode: 'mailto',
      to: 'ana@ejemplo.com',
      subject: 'Reunión & Acuerdos',
      body: 'Hola Ana, ¿confirmamos?',
    });
    expect(resultado.ok && resultado.payload).toBe(
      'mailto:ana@ejemplo.com?subject=Reuni%C3%B3n%20%26%20Acuerdos&body=Hola%20Ana%2C%20%C2%BFconfirmamos%3F',
    );
  });

  it('omite los parametros vacios en vez de enviarlos vacios', () => {
    const resultado = buildEmail({ mode: 'mailto', to: 'ana@ejemplo.com', subject: '  ', body: '' });
    expect(resultado.ok && resultado.payload).toBe('mailto:ana@ejemplo.com');
  });

  it('en modo texto devuelve solo la direccion', () => {
    expect(buildEmail({ mode: 'text', to: 'ana@ejemplo.com', subject: 'se ignora', body: 'se ignora' })).toEqual({
      ok: true,
      payload: 'ana@ejemplo.com',
    });
  });

  it('rechaza destinatarios mal formados', () => {
    const invalidos = ['ana', 'ana@', '@ejemplo.com', 'ana@@ejemplo.com', 'ana@localhost', 'a@b.'];
    for (const to of invalidos) {
      expect(buildEmail({ mode: 'mailto', to, subject: '', body: '' })).toEqual({
        ok: false,
        error: 'invalid',
      });
    }
  });
});

describe('buildSms', () => {
  it('usa el esquema sms con cuerpo percent-codificado', () => {
    const resultado = buildSms({ number: '+52 55 1234 5678', message: 'Hola & bienvenido' });
    expect(resultado).toEqual({ ok: true, payload: 'sms:+525512345678?body=Hola%20%26%20bienvenido' });
  });

  it('omite el parametro body si el mensaje esta vacio', () => {
    expect(buildSms({ number: '5551234567', message: '   ' })).toEqual({
      ok: true,
      payload: 'sms:5551234567',
    });
  });

  it('sobrevive a los dos puntos en el mensaje', () => {
    // Este es el motivo de usar sms: en vez de SMSTO: un cuerpo con "12:30"
    // parte el analisis del lector en un esquema que no define escapado.
    const resultado = buildSms({ number: '5551234', message: 'Reunion 12:30' });
    expect(resultado.ok && resultado.payload).toContain('12%3A30');
  });

  it('rechaza una extension, que el esquema sms no puede transportar', () => {
    expect(buildSms({ number: '5551234 ext. 99', message: '' })).toEqual({
      ok: false,
      error: 'invalid',
    });
  });
});

describe('buildTel', () => {
  it('normaliza el numero a la forma internacional', () => {
    expect(buildTel({ number: '+52 (55) 1234-5678' })).toEqual({
      ok: true,
      payload: 'tel:+525512345678',
    });
  });

  it('no deja que la extension se funda con el numero', () => {
    // Sin separarla, "5551234 ext. 99" se reduciria a "555123499", que es un
    // numero distinto: se marca a la extension como si fuera parte del numero.
    expect(buildTel({ number: '5551234 ext. 99' })).toEqual({
      ok: true,
      payload: 'tel:5551234;ext=99',
    });
  });

  it('acepta la extension escrita con "x"', () => {
    expect(buildTel({ number: '+52 55 1234 5678 x42' })).toEqual({
      ok: true,
      payload: 'tel:+525512345678;ext=42',
    });
  });

  it('solo conserva el mas cuando es el primer caracter', () => {
    expect(buildTel({ number: '+52 55 1234 5678' })).toEqual({
      ok: true,
      payload: 'tel:+525512345678',
    });
    // Un "+" en medio no es prefijo internacional, asi que el signo se
    // descarta. Los digitos que le siguen si se leen como parte del numero,
    // porque es exactamente lo que se escribio.
    expect(buildTel({ number: '5551234+99' })).toEqual({ ok: true, payload: 'tel:555123499' });
  });

  it('rechaza un campo sin digitos', () => {
    expect(buildTel({ number: 'sin numero' })).toEqual({ ok: false, error: 'invalid' });
  });
});

describe('normalizePhone', () => {
  it('descarta todo lo que no sea digito ni un mas inicial', () => {
    expect(normalizePhone('+1 (555) 123-4567')).toBe('+15551234567');
    expect(normalizePhone('  555 123 4567  ')).toBe('5551234567');
  });

  it('rechaza longitudes imposibles', () => {
    expect(isPlausiblePhone('+12')).toBe(false);
    expect(isPlausiblePhone('+1234567890123456')).toBe(false);
    expect(isPlausiblePhone('+12345')).toBe(true);
  });
});

describe('splitFullName', () => {
  it('usa la coma cuando viene, porque el orden ya esta dado', () => {
    expect(splitFullName('García López, Ana María')).toEqual({
      family: 'García López',
      given: 'Ana María',
      prefix: '',
    });
  });

  it('toma el ultimo termino como apellido en el caso comun', () => {
    expect(splitFullName('Ana María Pérez')).toEqual({
      family: 'Pérez',
      given: 'Ana María',
      prefix: '',
    });
  });

  it('se traga las particiones del apellido', () => {
    // Quedarse en "Cruz" seria incorrecto: el apellido es "Pérez de la Cruz".
    expect(splitFullName('Ana María Pérez de la Cruz')).toEqual({
      family: 'Pérez de la Cruz',
      given: 'Ana María',
      prefix: '',
    });
  });

  it('extrae el tratamiento', () => {
    expect(splitFullName('Dra. Ana Pérez')).toEqual({ family: 'Pérez', given: 'Ana', prefix: 'dra' });
  });

  it('no inventa un nombre de pila cuando solo hay un termino', () => {
    expect(splitFullName('Ana')).toEqual({ family: 'Ana', given: '', prefix: '' });
  });

  it('devuelve campos vacios para una cadena vacia', () => {
    expect(splitFullName('   ')).toEqual({ family: '', given: '', prefix: '' });
  });
});

describe('buildVCard', () => {
  const completa = {
    fullName: 'Ana María Pérez',
    organization: 'Empresa S.A.',
    jobTitle: 'Gerente',
    phone: '+52 55 1234 5678',
    email: 'ana@empresa.com',
    website: 'empresa.com',
  };

  it('genera una vCard 3.0 valida con saltos CRLF', () => {
    const resultado = buildVCard(completa);
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.payload.startsWith('BEGIN:VCARD\r\nVERSION:3.0\r\n')).toBe(true);
    expect(resultado.payload.endsWith('END:VCARD\r\n')).toBe(true);
    // El salto de linea sin CR rompe la agenda: es el bug que se corrige aqui.
    expect(resultado.payload).not.toMatch(/(?<!\r)\n/);
  });

  it('descompone el nombre en el campo N', () => {
    const resultado = buildVCard(completa);
    expect(resultado.ok && resultado.payload).toContain('N:Pérez;Ana María;;;');
  });

  it('normaliza el telefono y anade el esquema a la URL', () => {
    const resultado = buildVCard(completa);
    // En vCard 3.0 el campo TEL lleva el numero DESNUDO. El URI "tel:+..." es
    // sintaxis de la 4.0 y una agenda que no ha migrado lo guardaria literal.
    expect(resultado.ok && resultado.payload).toContain('TEL;TYPE=CELL,VOICE:+525512345678');
    expect(resultado.ok && resultado.payload).toContain('URL:https://empresa.com');
  });

  it('deja el TEL sin esquema tel: y anota la extension aparte', () => {
    const resultado = buildVCard({ ...completa, phone: '5551234 ext 99' });
    expect(resultado.ok && resultado.payload).toContain('TEL;TYPE=CELL,VOICE:5551234');
    // La extension no cabe en el TEL de la 3.0 sin romper el escapado de ";" que
    // exige la RFC, asi que se conserva en un campo estandar en vez de inventar
    // una codificacion que solo leeria un parser permisivo.
    expect(resultado.ok && resultado.payload).toContain('NOTE:extensión 99');
  });

  it('respeta una URL que ya trae esquema', () => {
    const resultado = buildVCard({ ...completa, website: 'http://empresa.com' });
    expect(resultado.ok && resultado.payload).toContain('URL:http://empresa.com');
  });

  it('omite los campos opcionales vacios', () => {
    const resultado = buildVCard({
      fullName: 'Ana',
      organization: '',
      jobTitle: '  ',
      phone: '',
      email: '',
      website: '',
    });
    expect(resultado.ok && resultado.payload).not.toContain('ORG:');
    expect(resultado.ok && resultado.payload).not.toContain('TITLE:');
    expect(resultado.ok && resultado.payload).not.toContain('TEL');
    expect(resultado.ok && resultado.payload).not.toContain('EMAIL');
    expect(resultado.ok && resultado.payload).not.toContain('URL:');
  });

  it('exige el nombre completo', () => {
    expect(buildVCard({ ...completa, fullName: ' ' })).toEqual({ ok: false, error: 'incomplete' });
  });

  it('escapa los valores que romperian el formato', () => {
    // Una empresa llamada "Acero; Industrial, S.A." sin escapar inyectaria
    // propiedades falsas en la tarjeta.
    const resultado = buildVCard({ ...completa, organization: 'Acero; Industrial, S.A.' });
    expect(resultado.ok && resultado.payload).toContain('ORG:Acero\\; Industrial\\, S.A.');
  });
});

describe('escapeVCardValue', () => {
  it('escapa la barra invertida antes de los demas separadores', () => {
    expect(escapeVCardValue('a\\;b')).toBe('a\\\\\\;b');
  });

  it('convierte los saltos de linea en el escape previsto por la RFC', () => {
    expect(escapeVCardValue('linea 1\r\nlinea 2')).toBe('linea 1\\nlinea 2');
  });
});

describe('percentEncode', () => {
  it('escapa el mas, que en una query string significaria espacio', () => {
    // Sin esto, "1+1" llegaria al destinatario como "1 1".
    expect(percentEncode('1+1')).toBe('1%2B1');
  });
});

describe('normalizeUrl', () => {
  it('anade https a los dominios desnudos', () => {
    expect(normalizeUrl('ejemplo.com')).toBe('https://ejemplo.com');
  });

  it('no toca los esquemas ya presentes', () => {
    expect(normalizeUrl('http://ejemplo.com')).toBe('http://ejemplo.com');
    expect(normalizeUrl('mailto:ana@ejemplo.com')).toBe('mailto:ana@ejemplo.com');
  });
});

describe('buildPayload', () => {
  it('despacha a cada constructor', () => {
    expect(buildPayload({ kind: 'texto', fields: emptyFields('texto') })).toEqual({
      ok: false,
      error: 'incomplete',
    });
    expect(buildPayload({ kind: 'wifi', fields: emptyFields('wifi') })).toEqual({
      ok: false,
      error: 'incomplete',
    });
    expect(buildPayload({ kind: 'email', fields: emptyFields('email') })).toEqual({
      ok: false,
      error: 'incomplete',
    });
    expect(buildPayload({ kind: 'sms', fields: emptyFields('sms') })).toEqual({
      ok: false,
      error: 'incomplete',
    });
    expect(buildPayload({ kind: 'tel', fields: emptyFields('tel') })).toEqual({
      ok: false,
      error: 'incomplete',
    });
    expect(buildPayload({ kind: 'vcard', fields: emptyFields('vcard') })).toEqual({
      ok: false,
      error: 'incomplete',
    });
  });
});
