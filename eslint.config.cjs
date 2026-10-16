const globals = require('globals');

module.exports = [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'coverage/**',
      'scripts/**',
    ],
  },
  {
    files: ['**/*.{js,mjs,cjs,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2024,
      },
    },
    rules: {
      'no-debugger': 'error',
      'no-constant-binary-expression': 'error',
      'no-unreachable': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
];
