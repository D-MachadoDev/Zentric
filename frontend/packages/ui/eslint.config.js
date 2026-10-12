import base from '@zentric/config/eslint/base.js';

// ESLint del design system. Sin reglas de DOM: packages/ui no toca window.
export default [
  ...base,
  {
    ignores: ['dist/**'],
  },
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    rules: {
      // Los componentes de un design system reexportan tipos por convencion.
      'react-refresh/only-export-components': 'off',
    },
  },
];
