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
  plugins: ['@typescript-eslint'],
  extends: [
    'standard',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:vue/vue3-essential',
    'plugin:vue/vue3-strongly-recommended',
    'plugin:vue/vue3-recommended'
  ],
  rules: {
    quotes: ['warn', 'single'],
    semi: ['warn', 'always', { omitLastInOneLineBlock: true }],
    'comma-dangle': ['error', 'never'],
    indent: ['error', 2, { SwitchCase: 1 }],
    'space-before-function-paren': 'off',
    'vue/multi-word-component-names': 'off',
    'vue/script-setup-uses-vars': 'error',
    'vue/max-attributes-per-line': 'off',
    'vue/padding-lines-in-component-definition': 'error',
    'prefer-template': 'warn',
    'no-plusplus': 'off',
    'sort-imports': 'off',
    'no-magic-numbers': 'off',
    'sort-keys': 'off',
    'no-shadow': 'off',
    '@typescript-eslint/no-shadow': 'error',
    'max-statements': ['error', { max: 20 }],
    'func-style': 'off',
    'no-ternary': 'off',
    'generator-star-spacing': ['error', { before: false, after: true }],
    'vue/max-len': ['error', {
      code: 100,
      template: 100,
      tabWidth: 2,
      comments: 100,
      ignorePattern: '',
      ignoreComments: true,
      ignoreTrailingComments: true,
      ignoreUrls: true,
      ignoreStrings: false,
      ignoreTemplateLiterals: false,
      ignoreRegExpLiterals: false,
      ignoreHTMLAttributeValues: false,
      ignoreHTMLTextContents: true
    }]
  }
};
