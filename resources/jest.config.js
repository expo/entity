module.exports = {
  collectCoverageFrom: ['src/**/*', 'src/*', '!src/**/__*test*__/**'],
  testMatch: ['**/__tests__/**/*-test.ts'],
  transform: {
    '\\.[jt]sx?$': ['babel-jest', { rootMode: 'upward' }],
  },
};
