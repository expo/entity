module.exports = {
  preset: 'ts-jest',
  testMatch: ['**/__integration-tests__/**/*-test.ts'],
  coverageReporters: ['clover'],
  coverageDirectory: 'coverage-integration',
};
