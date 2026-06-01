const { createSharedEslintConfig } = require('../tooling/eslint.shared.cjs');

module.exports = createSharedEslintConfig({
  browser: true,
  node: true,
  ignores: [
    'node_modules/**',
    '.next/**',
    'coverage/**',
    'scripts/**',
  ],
});
