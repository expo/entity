import { defineConfig } from 'oxlint';
import node from 'oxlint-config-universe/node';
import typescriptAnalysis from 'oxlint-config-universe/typescript-analysis';

export default defineConfig({
  extends: [node, typescriptAnalysis],
  plugins: ['jest'],
  options: {
    typeAware: true,
  },
  rules: {
    // Overrides from oxlint-config-universe defaults
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
    'no-console': 'warn',
    'no-void': ['warn', { allowAsStatement: true }],
    'no-restricted-imports': ['error', { paths: ['.', '..', '../..'] }],

    // TypeScript rules
    'typescript/ban-ts-comment': 'warn',
    'typescript/unbound-method': 'warn',
    'typescript/restrict-template-expressions': 'off',
    'typescript/no-base-to-string': 'off',
    'typescript/no-redundant-type-constituents': 'off',
    'typescript/require-array-sort-compare': 'off',
    'typescript/explicit-function-return-type': ['warn', { allowExpressions: true }],

    // Jest rules
    'jest/valid-title': 'off',
    'jest/expect-expect': 'off',
    'jest/no-conditional-expect': 'off',
    'jest/no-export': 'off',
    'jest/require-to-throw-message': 'off',
  },
  overrides: [
    {
      files: ['*.config.js'],
      env: { node: true },
      globals: { URL: 'readonly' },
    },
    {
      files: ['**/__tests__/**/*.ts', '**/__integration-tests__/**/*.ts'],
      rules: {
        'typescript/no-confusing-void-expression': 'off',
        'typescript/unbound-method': 'off',
      },
    },
    {
      files: ['packages/**/*.ts'],
      excludeFiles: ['**/*tests__/**', 'packages/entity-codemod/src/transforms/**'],
      rules: {
        'no-restricted-exports': ['error', { restrictDefaultExports: { direct: true } }],
      },
    },
  ],
  ignorePatterns: [
    'packages/entity-codemod/**/__testfixtures__/**',
    'packages/*/build',
    'coverage',
    'coverage-integration',
    'doc',
  ],
});
