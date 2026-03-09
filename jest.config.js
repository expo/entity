export default {
  // This is an absolute path determined at runtime so that running `yarn test`
  // both from each package's directory and from root works correctly.
  transform: { '\\.[jt]sx?$': new URL('./jest-transform.js', import.meta.url).toString() },
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
