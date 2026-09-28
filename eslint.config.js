/**
 * Configuracion de ESLint.
 *
 * La lista de reglas no es una lista al arbitrio: cada grupo lleva el motivo de
 * estar aqui, y se dice explicitamente cuando una regla se relaja y por que.
 *
 * Lo que mas importa de este archivo es el alcance. Las reglas que necesitan
 * informacion de tipos solo se aplican a los archivos de TypeScript. Si se
 * dejaran sobre los scripts de Node, que son JavaScript plano, cada linea
 * daria un `any` y el resultado seria del ruido que esconde los errores de
 * verdad.
 */

import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** Solo TypeScript. El JavaScript plano de `scripts/` no entra aqui. */
const TYPESCRIPT_FILES = ['**/*.ts'];
/** JavaScript que se ejecuta en Node: scripts de build y archivos de config. */
const NODE_SCRIPTS = ['scripts/**/*.mjs', '*.config.ts', 'eslint.config.js'];

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'public/vendor/**',
      'src/vendor/**',
    ],
  },

  js.configs.recommended,

  /* --- TypeScript, con informacion de tipos --- */
  {
    files: TYPESCRIPT_FILES,
    extends: [...tseslint.configs.recommendedTypeChecked, ...tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      /* --- Correccion comun --- */

      // Los parametros que no se usan se renombran con `_` en vez de apagar la
      // regla entera, que esconderia tambien los parametros olviados de verdad
      // en el resto del archivo.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

      // Nada de `any`. Si hace falta afirmar algo que el compilador no sabe, el
      // motivo va escrito y el compilador lo revisa.
      '@typescript-eslint/no-explicit-any': 'error',

      // Nada de aserciones sin comprobar. Una asercion es un punto donde el
      // compilador deja de mirar, y aqui una asercion falsa significa un codigo
      // que parece valido y no escanea.
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',

      // Las comparaciones laxas cambian el significado con los `null`.
      eqeqeq: ['error', 'always', { null: 'ignore' }],

      // Una promesa sin await explicito es un error silencioso en una aplicacion
      // sin servidor, donde no hay reintentos ni cola que la salve.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',

      // `let` solo cuando la variable cambia de verdad.
      'prefer-const': 'error',
      'no-var': 'error',

      // Espacios no imprimibles: se delatan en los diff.
      'no-irregular-whitespace': 'error',

      /* --- Seguridad --- */

      // Nunca se construye HTML a partir de texto. El contenido de un QR es
      // entrada no confiable por definicion: lo escribe quien va a escanear, no
      // quien usa la aplicacion. Un `innerHTML` con un nombre de archivo mal
      // puesto seria un ataque de script cruzando el origen de la pagina.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.property.name="innerHTML"]',
          message: 'No se usa innerHTML. Se inserta texto con textContent, o se construye el nodo.',
        },
        {
          selector: 'CallExpression[callee.property.name="outerHTML"]',
          message: 'No se usa outerHTML.',
        },
        {
          selector: 'CallExpression[callee.property.name="insertAdjacentHTML"]',
          message: 'No se usa insertAdjacentHTML.',
        },
        {
          selector: 'CallExpression[callee.name="eval"]',
          message: 'No se usa eval. Es incompatible con una CSP sin unsafe-eval.',
        },
        {
          selector: 'NewExpression[callee.name="Function"]',
          message: 'No se construye codigo con Function. Es incompatible con la CSP.',
        },
      ],
    },
  },

  /* --- Codigo queborra los caracteres de control a proposito --- */
  {
    // Estas expresiones existen precisamente para detectar y quitar caracteres
    // de control. La regla que las prohibe impide justamente el trabajo del
    // modulo, que es neutralizar entradas sospechosas. El analisis con
    // informacion de tipos sigue aplicando, que es lo que importa.
    files: ['src/security/schemes.ts', 'src/security/signals.ts'],
    rules: { 'no-control-regex': 'off' },
  },

  /* --- Tests --- */
  {
    files: ['tests/**/*.ts'],
    rules: {
      // Un test construye dobles y lee estructuras ajenas a proposito. El tipo
      // no aporta nada ahi, y las reglas de `any` solo taparian los errores.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      // Los tests ejecutan el codigo de terceros tal cual viene, asi que tienen
      // que poder construir una funcion a partir de su texto.
      'no-restricted-syntax': 'off',
      '@typescript-eslint/no-implied-eval': 'off',
    },
  },

  /* --- Scripts de Node --- */
  {
    files: NODE_SCRIPTS,
    languageOptions: {
      globals: { ...globals.node },
    },
  },
);
