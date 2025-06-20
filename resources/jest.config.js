module.exports = {
  collectCoverageFrom: ['src/**/*', '!src/index.ts', '!src/**/__*test*__/**'],
  coverageProvider: 'v8',
  testMatch: ['**/__tests__/**/*-test.ts'],
  transform: {
    '\\.[jt]sx?$': ['babel-jest', { rootMode: 'upward' }],
  },
};
