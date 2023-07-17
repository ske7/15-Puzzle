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
