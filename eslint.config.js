const { defineConfig, globalIgnores } = require('eslint/config');
const universeNodeConfig = require('eslint-config-universe/flat/node');
const universeSharedTypescriptAnalysisConfig = require('eslint-config-universe/flat/shared/typescript-analysis');
const tsdoc = require('eslint-plugin-tsdoc');

module.exports = defineConfig([
  globalIgnores(['packages/entity-codemod/**/__testfixtures__/**']),
  universeNodeConfig,
  universeSharedTypescriptAnalysisConfig,
  {
    plugins: {
      tsdoc,
    },
    rules: {
      'no-restricted-imports': ['error', { paths: ['.', '..', '../..'] }],
      'tsdoc/syntax': 'warn',
      'no-console': 'warn',
      'handle-callback-err': 'off',
    },
  },
  {
    settings: {
      jest: {
        version: 29,
      },
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.d.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      'no-void': [
        'warn',
        {
          allowAsStatement: true,
        },
      ],
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        {
          allowExpressions: true,
        },
      ],
      '@typescript-eslint/naming-convention': [
        'warn',
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'enumMember',
          format: ['UPPER_CASE'],
        },
        // async functions must have names ending with 'Async'
        {
          selector: ['function', 'classMethod', 'typeMethod'],
          format: ['camelCase'],
          modifiers: ['async'],
          suffix: ['Async'],
        },
      ],
      'no-dupe-class-members': 'off',
      '@typescript-eslint/no-dupe-class-members': ['error'],
    },
  },
  {
    files: ['**/__tests__/**/*.ts', '**/__tests__/**/*.tsx', '**/__tests__/**/*.d.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      // ts-mockito verify function needs void functions within verify which is a void function
      '@typescript-eslint/no-confusing-void-expression': 'off',
    },
  },
]);
