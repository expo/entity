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
  ],
  ignorePatterns: [
    'packages/entity-codemod/**/__testfixtures__/**',
    'packages/*/build',
    'coverage',
    'coverage-integration',
    'doc',
  ],
});
