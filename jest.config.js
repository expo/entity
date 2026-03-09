export default {
  transform: { '\\.[jt]sx?$': ['babel-jest', { rootMode: 'upward' }] },
  extensionsToTreatAsEsm: ['.ts'],
  collectCoverageFrom: [
    'packages/*/src/**',
    '!packages/*/src/index.ts',
    '!packages/entity-example/**',
    '!packages/entity-codemod/**',
    '!packages/entity-testing-utils/**',
    '!**/__*test*__/**',
  ],
  coverageProvider: 'v8',
  testMatch: ['**/__tests__/**/*-test.ts'],
};
