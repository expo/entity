const { defineConfig, globalIgnores } = require('eslint/config');
const universeNodeConfig = require('eslint-config-universe/flat/node');
const universeSharedTypescriptAnalysisConfig = require('eslint-config-universe/flat/shared/typescript-analysis');
const tsdoc = require('eslint-plugin-tsdoc');

module.exports = defineConfig([
  globalIgnores([
    'packages/entity-codemod/**/__testfixtures__/**',
    'packages/*/build',
    'coverage',
    'coverage-integration',
    'doc',
  ]),
  universeNodeConfig,
  universeSharedTypescriptAnalysisConfig,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      tsdoc,
    },
    rules: {
      'no-restricted-imports': ['error', { paths: ['.', '..', '../..'] }],
      'tsdoc/syntax': 'warn',
      'no-console': 'warn',
      'handle-callback-err': 'off',
      eqeqeq: ['warn', 'always'],
      'no-restricted-properties': [
        'warn',
        {
          object: 'it',
          property: 'only',
          message: 'it.only should not be committed to main.',
        },
        {
          object: 'test',
          property: 'only',
          message: 'test.only should not be committed to main.',
        },
        {
          object: 'describe',
          property: 'only',
          message: 'describe.only should not be committed to main.',
        },
        {
          object: 'it',
          property: 'skip',
          message: 'it.skip should not be committed to main.',
        },
        {
          object: 'test',
          property: 'skip',
          message: 'test.skip should not be committed to main.',
        },
        {
          object: 'describe',
          property: 'skip',
          message: 'describe.skip should not be committed to main.',
        },
      ],
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
    files: ['**/*.ts', '**/*.tsx', '**/*.d.ts'],
    ignores: ['**/*tests__/**', 'packages/entity-codemod/src/transforms/**'],
    rules: {
      'no-restricted-exports': ['error', { restrictDefaultExports: { direct: true } }],
    },
  },
  {
    files: ['**/__tests__/**/*.ts', '**/__tests__/**/*.tsx', '**/__tests__/**/*.d.ts'],
    rules: {
      // ts-mockito verify function needs void functions within verify which is a void function
      '@typescript-eslint/no-confusing-void-expression': 'off',
    },
  },
]);
