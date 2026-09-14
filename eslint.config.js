import eslint from '@eslint/js';
import eslintPluginVue from 'eslint-plugin-vue';
import globals from 'globals';
import typescriptEslint from 'typescript-eslint';
import { defineConfig } from "eslint/config";
import stylistic from '@stylistic/eslint-plugin';
import sonarjs from "eslint-plugin-sonarjs";

export default defineConfig(
  // Flat config does not read .gitignore, so generated output has to be listed here too -
  // otherwise `npm run lint` (which runs --fix) rewrites vendored files such as the JS
  // Istanbul ships inside coverage/.
  {
    ignores: [
      '*.d.ts',
      '**/dist',
      '**/coverage',
      '**/.vitest',
      '**/playwright-report',
      '**/test-results',
      '**/blob-report',
      '**/.claude',
      'tempdata'
    ]
  },
  {
    extends: [
      eslint.configs.recommended,
      ...typescriptEslint.configs.recommendedTypeChecked,
      ...typescriptEslint.configs.stylisticTypeChecked,
      ...eslintPluginVue.configs['flat/recommended'],
    ],
    plugins: {
      '@stylistic': stylistic,
      sonarjs
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
      ...sonarjs.configs.recommended.rules,

      // tsconfig sets noPropertyAccessFromIndexSignature, so index-signature members
      // (document.documentElement.dataset.theme and friends) must use bracket access.
      // dot-notation infers that from the compiler options, but an editor running a stale
      // TypeScript program does not - and its autofix then strips the brackets on save,
      // reintroducing a TS4111 the CLI never reported. Stating it here removes the guess.
      "@typescript-eslint/dot-notation": ["error", { "allowIndexSignaturePropertyAccess": true }],

      "no-implicit-coercion": ["error", {
        "boolean": true,
        "number": true,
        "string": true
      }],

      // Formatting rules that shape nearly every file (formerly provided by neostandard)
      "@stylistic/arrow-spacing": ["error", { "before": true, "after": true }],
      "@stylistic/block-spacing": ["error", "always"],
      "@stylistic/brace-style": ["error", "1tbs", { "allowSingleLine": true }],
      "@stylistic/comma-dangle": ["warn", {
        "arrays": "ignore",
        "enums": "ignore",
        "exports": "ignore",
        "imports": "ignore",
        "objects": "ignore"
      }],
      "@stylistic/comma-spacing": ["error", { "before": false, "after": true }],
      "@stylistic/eol-last": "error",
      "@stylistic/indent": ["error", 2, {
        "SwitchCase": 1,
        "VariableDeclarator": 1,
        "outerIIFEBody": 1,
        "MemberExpression": 1,
        "FunctionDeclaration": { "parameters": 1, "body": 1 },
        "FunctionExpression": { "parameters": 1, "body": 1 },
        "CallExpression": { "arguments": 1 },
        "ArrayExpression": 1,
        "ObjectExpression": 1,
        "ImportDeclaration": 1,
        "flatTernaryExpressions": false,
        "ignoreComments": false,
        "ignoredNodes": [
          "TemplateLiteral *",
          "JSXElement", "JSXElement > *", "JSXAttribute", "JSXIdentifier",
          "JSXNamespacedName", "JSXMemberExpression", "JSXSpreadAttribute",
          "JSXExpressionContainer", "JSXOpeningElement", "JSXClosingElement",
          "JSXFragment", "JSXOpeningFragment", "JSXClosingFragment",
          "JSXText", "JSXEmptyExpression", "JSXSpreadChild"
        ],
        "offsetTernaryExpressions": true,
        "tabLength": 4
      }],
      "@stylistic/key-spacing": ["error", { "beforeColon": false, "afterColon": true }],
      "@stylistic/keyword-spacing": ["error", { "before": true, "after": true }],
      "@stylistic/no-multiple-empty-lines": ["error", { "max": 1, "maxBOF": 0, "maxEOF": 0 }],
      "@stylistic/no-trailing-spaces": "error",
      "@stylistic/object-curly-spacing": ["error", "always"],
      "@stylistic/quotes": ["error", "single", { "avoidEscape": true, "allowTemplateLiterals": "never" }],
      "@stylistic/semi": ["warn", "always", {
        "omitLastInOneLineBlock": true,
        "omitLastInOneLineClassBody": false
      }],
      "@stylistic/space-before-function-paren": ["error", {
        "anonymous": "always",
        "named": "never",
        "asyncArrow": "always"
      }],
      "@stylistic/space-infix-ops": "error",
      "@stylistic/template-curly-spacing": ["error", "never"],

      // TypeScript rules
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

      // Vue rules
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
      // The props-side counterpart: passing `props.x` straight into a composable
      // evaluates it once and silently drops reactivity at the call site.
      "vue/no-setup-props-reactivity-loss": "error",
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
