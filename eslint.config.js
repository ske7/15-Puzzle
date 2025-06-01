import eslint from '@eslint/js';
import eslintPluginVue from 'eslint-plugin-vue';
import globals from 'globals';
import typescriptEslint from 'typescript-eslint';
import neostandard from 'neostandard';
import stylistic from '@stylistic/eslint-plugin';

export default typescriptEslint.config(
  { ignores: ['*.d.ts', '**/dist'] },
  {
    extends: [
      eslint.configs.recommended,
      ...neostandard(),
      ...typescriptEslint.configs.strictTypeChecked,
      ...typescriptEslint.configs.stylisticTypeChecked,
      ...eslintPluginVue.configs['flat/recommended'],
    ],
    plugins: {
      '@stylistic': stylistic
    },
    files: ['**/*.{ts,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: {
        parser: typescriptEslint.parser,
        projectService: true,
        extraFileExtensions: ["vue"]
      },
    },
    rules: {
      "camelcase": "off",
      "no-void": "off",
      "@stylistic/generator-star-spacing": [
        "error",
        {
          "before": false,
          "after": true
        }
      ],
      "@stylistic/semi": [
        "warn",
        "always",
        {
          "omitLastInOneLineBlock": true,
          "omitLastInOneLineClassBody": false
        }
      ],
      "@stylistic/space-before-function-paren": ["error", {
        "anonymous": "always",
        "named": "never",
        "asyncArrow": "always"
      }],
      "@stylistic/no-mixed-operators": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          "args": "all",
          "argsIgnorePattern": "^_",
          "caughtErrors": "all",
          "caughtErrorsIgnorePattern": "^_",
          "destructuredArrayIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "ignoreRestSiblings": true
        }
      ],
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        {
          "allowAny": false,
          "allowBoolean": true,
          "allowNullish": true,
          "allowNumber": true,
          "allowRegExp": true
        }
      ],
      "@typescript-eslint/naming-convention": [
        "error",
        {
          "selector": "variable",
          "format": ["camelCase", "UPPER_CASE", "PascalCase"]
        }
      ],
      "vue/multi-word-component-names": "off",
      "vue/max-attributes-per-line": [
        "error",
        {
          "singleline": {
            "max": 3
          },
          "multiline": {
            "max": 1
          }
        }
      ],
      "vue/padding-lines-in-component-definition": "error",
      "vue/require-typed-object-prop": "error",
      "vue/require-typed-ref": "error",
      "vue/define-props-declaration": ["error", "type-based"],
      "vue/define-emits-declaration": ["error", "type-based"],
      "vue/no-ref-object-reactivity-loss": "error",
      "vue/html-button-has-type": "error",
      "vue/max-len": [
        "error",
        {
          "code": 160,
          "template": 120,
          "tabWidth": 2,
          "comments": 120,
          "ignorePattern": "",
          "ignoreComments": true,
          "ignoreTrailingComments": true,
          "ignoreUrls": true,
          "ignoreStrings": true,
          "ignoreTemplateLiterals": false,
          "ignoreRegExpLiterals": true,
          "ignoreHTMLAttributeValues": true,
          "ignoreHTMLTextContents": true
        }
      ]
    },
  }
);