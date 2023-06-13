/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution');

module.exports = {
  root: true,
  parser: 'vue-eslint-parser',
  parserOptions: {
    extraFileExtensions: ['.vue'],
    parser: '@typescript-eslint/parser',
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint', 'prettier'],
  extends: [
    'standard',
    'eslint:all',
    'plugin:@typescript-eslint/recommended',
    'plugin:vue/vue3-essential',
    'plugin:vue/vue3-strongly-recommended',
    'plugin:vue/vue3-recommended',
    '@vue/eslint-config-prettier/skip-formatting',
    '@vue/typescript/recommended',
    '@vue/eslint-config-typescript',
    '@vue/eslint-config-prettier'
  ],
  rules: {
    quotes: ['warn', 'single'],
    semi: ['warn', 'always', { omitLastInOneLineBlock: true }],
    'space-before-function-paren': 'off',
    'prettier/prettier': 'error',
    'vue/multi-word-component-names': 'off',
    'vue/script-setup-uses-vars': 'error',
    'vue/max-attributes-per-line': 'off',
    'prefer-template': 'warn',
    'no-plusplus': 'off',
    'sort-imports': 'off',
    'no-magic-numbers': 'off',
    'sort-keys': 'off',
    'no-shadow': 'off',
    '@typescript-eslint/no-shadow': 'error',
    'max-statements': ['error', { max: 20 }],
    'func-style': 'off',
    'no-ternary': 'off'
  }
};
