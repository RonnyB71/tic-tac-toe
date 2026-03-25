const plugin = require('@typescript-eslint/eslint-plugin');

module.exports = [
  { ignores: ['dist/**'] },
  ...plugin.configs['flat/recommended'],
];
