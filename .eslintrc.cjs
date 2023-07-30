/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution');

module.exports = {
  root: true,
  parser: 'vue-eslint-parser',
  parserOptions: {
    extraFileExtensions: ['.vue'],
    parser: '@typescript-eslint/parser',
    ecmaVersion: 'latest',
    sourceType: 'module',
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.eslint.json', './tsconfig.app.json', './tsconfig.node.json']
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'standard',
    'eslint:recommended',
    'plugin:@typescript-eslint/strict-type-checked',
    'plugin:@typescript-eslint/stylistic-type-checked',
    'plugin:vue/vue3-essential',
    'plugin:vue/vue3-strongly-recommended',
    'plugin:vue/vue3-recommended'
  ],
  rules: {
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'variable',
        format: ['camelCase', 'UPPER_CASE', 'PascalCase']
      }
    ],
    '@typescript-eslint/object-curly-spacing': ['error', 'always'],
    '@typescript-eslint/indent': ['error', 2, { SwitchCase: 1 }],
    '@typescript-eslint/quotes': ['warn', 'single'],
    '@typescript-eslint/no-magic-numbers': 'off',
    '@typescript-eslint/space-before-function-paren': 'off',
    quotes: ['warn', 'single'],
    semi: ['warn', 'always', { omitLastInOneLineBlock: true }],
    'comma-dangle': ['error', 'never'],
    indent: ['error', 2, { SwitchCase: 1 }],
    'space-before-function-paren': 'off',
    'prefer-template': 'error',
    'no-magic-numbers': 'off',
    'no-mixed-operators': 'off',
    'max-statements': ['error', { max: 30 }],
    'generator-star-spacing': ['error', { before: false, after: true }],
    'vue/multi-word-component-names': 'off',
    'vue/script-setup-uses-vars': 'error',
    'vue/max-attributes-per-line': ['error', {
      singleline: {
        max: 3
      },
      multiline: {
        max: 1
      }
    }],
    'vue/padding-lines-in-component-definition': 'error',
    'vue/require-typed-object-prop': 'error',
    'vue/max-len': ['error', {
      code: 110,
      template: 110,
      tabWidth: 2,
      comments: 110,
      ignorePattern: '',
      ignoreComments: true,
      ignoreTrailingComments: true,
      ignoreUrls: true,
      ignoreStrings: false,
      ignoreTemplateLiterals: false,
      ignoreRegExpLiterals: false,
      ignoreHTMLAttributeValues: true,
      ignoreHTMLTextContents: true
    }]
  },
  overrides: [
    {
      files: ['*.vue'],
      rules: {
        '@typescript-eslint/no-unsafe-assignment': 'off'
      }
    }
  ]
};
