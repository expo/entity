module.exports = {
  transform: { '\\.[jt]sx?$': ['babel-jest', { rootMode: 'upward' }] },
  collectCoverage: true,
  collectCoverageFrom: [
    'packages/*/src/**',
    '!packages/*/src/index.ts',
    '!packages/entity-example/**',
    '!packages/entity-codemod/**',
    '!packages/entity-testing-utils/**',
    '!**/__*test*__/**',
  ],
  coverageProvider: 'v8',
  randomize: true,
  testEnvironmentOptions: { globalsCleanupMode: 'on' },
  workerThreads: true,
  projects: [
    { displayName: 'unit', testMatch: ['**/__tests__/**/*-test.ts'] },
    {
      displayName: 'integration',
      globalSetup: '<rootDir>/setup.mjs',
      testMatch: ['**/__integration-tests__/**/*-test.ts'],
    },
  ],
};
