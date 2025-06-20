module.exports = {
  collectCoverageFrom: [
    'packages/*/src/**',
    '!packages/entity-example/**',
    '!packages/entity-codemod/**',
    '!packages/entity-testing-utils/**',
    '!**/__*test*__/**',
  ],
  testMatch: ['**/__tests__/**/*-test.ts'],
};
